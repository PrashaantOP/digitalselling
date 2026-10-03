<?php

namespace App\Services;

use App\Mail\SettlementStatusMail;
use App\Models\Admin;
use App\Models\NotificationPreference;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Settlement;
use App\Models\SettlementAdjustment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Auto-settlement engine. Creator kuch request nahi karta — `settlements:run` roz chalta hai
 * aur har creator ke eligible orders ko ek batch me group kar deta hai.
 *
 * Hold period calendar-based hai (rolling ghante nahi), taaki rule bolne me simple rahe:
 * "Monday ki saari bookings Wednesday ko settle hongi" — chahe order raat 11 baje aaya ho.
 *
 * Agar kuch din settlement na bane (KYC pending, payout method nahi ya unverified), orders jama hote rehte
 * hain aur jis din cycle chalti hai us din sab ek hi settlement me chale jaate hain.
 */
class SettlementService
{
    /** Order paid hone ke itne din baad wo settle hone layak hota hai (T+2). */
    public const HOLD_DAYS = 2;

    /** Admin ka custom settlement: order paid hone ke itne ghante baad hi usme liya ja sakta hai (refund window). */
    public const CUSTOM_HOLD_HOURS = 24;

    /** Jis din ke orders aaj settle ho sakte hain uska last date (inclusive). */
    public static function cutoffDate(): Carbon
    {
        return now()->subDays(self::HOLD_DAYS)->startOfDay();
    }

    /** Agli cycle kab chalegi (schedule: roz 02:00). */
    public static function nextRunAt(): Carbon
    {
        $today = now()->startOfDay()->addHours(2);

        return $today->isFuture() ? $today : $today->addDay();
    }

    /**
     * Wo orders jo abhi settle ho sakte hain: paid, kisi settlement me nahi,
     * aur hold window paar kar chuke.
     */
    public function eligibleOrders(int $creatorId): Builder
    {
        return Order::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'success')
            ->whereNull('settlement_id')
            ->whereNotNull('paid_at')
            ->whereDate('paid_at', '<=', self::cutoffDate()->toDateString());
    }

    /** Success orders jo abhi hold window me hain (settle hone ka intezaar kar rahe hain). */
    public function clearingOrders(int $creatorId): Builder
    {
        return Order::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'success')
            ->whereNull('settlement_id')
            ->where(fn ($q) => $q->whereNull('paid_at')->orWhereDate('paid_at', '>', self::cutoffDate()->toDateString()));
    }

    /**
     * Creator settle ho sakta hai ya nahi — nahi to reason batao (UI me banner dikhane ke liye).
     * Blocked hone par orders jama hote rehte hain, kuch kho nahi jaata.
     */
    public function blockedReason(User $creator): ?string
    {
        if ($creator->kycVerification?->status !== 'verified') {
            return 'kyc';
        }

        $method = $this->payoutMethodFor($creator);

        if (! $method) {
            return 'payout_method';
        }

        return $method->isVerified() ? null : 'payout_unverified';
    }

    /**
     * Settlement isi method pe jaata hai — default, warna sabse naya.
     * Default unverified ho to dusre verified method pe fallback nahi karte;
     * creator ne jo chuna hai paisa wahi jaana chahiye.
     */
    public function payoutMethodFor(User $creator): ?PayoutMethod
    {
        return PayoutMethod::where('user_id', $creator->id)
            ->orderByDesc('is_default')->orderByDesc('id')->first();
    }

    /**
     * Ek creator ke saare eligible orders ka ek settlement banao.
     * Kuch settle karne layak na ho ya creator blocked ho to null.
     */
    public function settleCreator(User $creator): ?Settlement
    {
        if ($this->blockedReason($creator) !== null) {
            return null;
        }

        $method = $this->payoutMethodFor($creator);

        if (! $method?->isVerified()) {
            return null;
        }

        return DB::transaction(function () use ($creator, $method) {
            // Creator row pe lock — do parallel run (cron + manual) double settlement na banayein.
            User::withTrashed()->whereKey($creator->id)->lockForUpdate()->first();

            // ids transaction ke andar hi lo, warna beech me aaya naya order chhoot ya dobara aa sakta hai
            $orders = $this->eligibleOrders($creator->id)
                ->lockForUpdate()
                ->get(['id', 'paid_at', 'total_amount', 'platform_fee', 'net_payout_amount']);

            // adjustments (refund wapas lena, manual debit/credit) isi settlement me lag jaate hain
            $adjustments = $this->pendingAdjustments($creator->id)->lockForUpdate()->get(['id', 'amount']);
            $adjustment = round((float) $adjustments->sum('amount'), 2);

            if ($orders->isEmpty() && $adjustments->isEmpty()) {
                return null;
            }

            $net = round((float) $orders->sum('net_payout_amount') + $adjustment, 2);

            // debit orders se zyada ho to kuch mat banao — adjustment aur orders dono agli cycle tak rukte hain
            if ($net <= 0) {
                return null;
            }

            return $this->createSettlement($creator, $method, $orders, $adjustments);
        });
    }

    /**
     * Wo saare paid orders jo abhi kisi settlement me nahi hain — hold me hon ya hold paar kar chuke.
     * Admin custom settlement me inhi me se chunta hai.
     */
    public function unsettledOrders(int $creatorId): Builder
    {
        return Order::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'success')
            ->whereNull('settlement_id')
            ->whereNotNull('paid_at');
    }

    /**
     * Custom settlement: admin ke chune hue orders (aur adjustments) ka ek settlement. Cycle ka T+2 hold yahan
     * nahi lagta — admin 24 ghante (CUSTOM_HOLD_HOURS) purane order jaldi de sakta hai — par usse naye order
     * nahi, aur KYC / verified payout method zaroori hai.
     * Jo yahan nahi chuna gaya wo agli cycle (`settlements:run` / admin ka button) me apne aap aata hai.
     *
     * @param  int[]  $orderIds
     * @param  int[]  $adjustmentIds
     */
    public function settleCustom(User $creator, array $orderIds, array $adjustmentIds = []): Settlement
    {
        if ($reason = $this->blockedReason($creator)) {
            throw ValidationException::withMessages(['creator' => match ($reason) {
                'kyc' => 'This creator\'s KYC is not verified yet.',
                'payout_method' => 'This creator has not added a payout method.',
                default => 'This creator\'s payout method is not verified yet.',
            }]);
        }

        $method = $this->payoutMethodFor($creator);

        return DB::transaction(function () use ($creator, $method, $orderIds, $adjustmentIds) {
            User::withTrashed()->whereKey($creator->id)->lockForUpdate()->first();

            $orders = $this->unsettledOrders($creator->id)->whereIn('id', $orderIds)->lockForUpdate()
                ->get(['id', 'paid_at', 'total_amount', 'platform_fee', 'net_payout_amount']);
            $adjustments = $this->pendingAdjustments($creator->id)->whereIn('id', $adjustmentIds)->lockForUpdate()->get(['id', 'amount']);

            // beech me cycle chal gayi ya kisi aur admin ne le liye — aadha-adhura mat banao
            if ($orders->count() !== count(array_unique($orderIds)) || $adjustments->count() !== count(array_unique($adjustmentIds))) {
                throw ValidationException::withMessages(['orders' => 'Some of the selected items were just settled elsewhere. Reload and pick again.']);
            }

            if ($orders->isEmpty()) {
                throw ValidationException::withMessages(['orders' => 'Select at least one order.']);
            }

            if ($orders->contains(fn (Order $o) => $o->paid_at->gt(now()->subHours(self::CUSTOM_HOLD_HOURS)))) {
                throw ValidationException::withMessages(['orders' => 'An order can be settled only ' . self::CUSTOM_HOLD_HOURS . ' hours after it was paid.']);
            }

            if (round((float) $orders->sum('net_payout_amount') + (float) $adjustments->sum('amount'), 2) <= 0) {
                throw ValidationException::withMessages(['orders' => 'The amount to transfer must be more than zero — the selected debits are larger than the orders.']);
            }

            return $this->createSettlement($creator, $method, $orders, $adjustments);
        });
    }

    /** Orders + adjustments ko ek pending settlement me baandho (transaction ke andar hi bulao). */
    private function createSettlement(User $creator, PayoutMethod $method, Collection $orders, Collection $adjustments): Settlement
    {
        $adjustment = round((float) $adjustments->sum('amount'), 2);

        $settlement = Settlement::create([
            'number' => $this->nextNumber(),
            'creator_id' => $creator->id,
            'payout_method_id' => $method->id,
            'orders_count' => $orders->count(),
            'gross_amount' => round((float) $orders->sum('total_amount'), 2),
            'commission_amount' => round((float) $orders->sum('platform_fee'), 2),
            'adjustment_amount' => $adjustment,
            'net_amount' => round((float) $orders->sum('net_payout_amount') + $adjustment, 2),
            'period_start' => $orders->min('paid_at'),
            'period_end' => $orders->max('paid_at'),
            'status' => 'pending',
        ]);

        Order::whereIn('id', $orders->pluck('id'))->update(['settlement_id' => $settlement->id]);
        SettlementAdjustment::whereIn('id', $adjustments->pluck('id'))->update(['settlement_id' => $settlement->id]);

        return $settlement;
    }

    /**
     * Saare creators ke liye cycle chalao.
     *
     * @return array{settlements: int, orders: int, blocked: int}
     */
    public function runAll(): array
    {
        $result = ['settlements' => 0, 'orders' => 0, 'blocked' => 0];

        // sirf un creators pe kaam karo jinke paas kuch settle karne layak hai
        $creatorIds = Order::query()
            ->where('status', 'success')
            ->whereNull('settlement_id')
            ->whereNotNull('paid_at')
            ->whereDate('paid_at', '<=', self::cutoffDate()->toDateString())
            ->distinct()
            ->pluck('creator_id')
            // sirf credit adjustment pada ho (koi naya order nahi) tab bhi wo nikalna chahiye
            ->merge(SettlementAdjustment::whereNull('settlement_id')->distinct()->pluck('creator_id'))
            ->unique();

        // delete hue creator ka bacha paisa bhi settle ho — chupchaap atke nahi
        foreach (User::withTrashed()->whereIn('id', $creatorIds)->with('kycVerification')->cursor() as $creator) {
            if ($this->blockedReason($creator) !== null) {
                $result['blocked']++;

                continue;
            }

            if ($settlement = $this->settleCreator($creator)) {
                $result['settlements']++;
                $result['orders'] += $settlement->orders_count;
            }
        }

        return $result;
    }

    /**
     * Creator ka paisa kahan khada hai — dashboard aur settlements page dono isi ko dikhate hain.
     *
     * clearing   = paid orders jo abhi T+2 hold me hain
     * ready      = hold paar kar chuke, par KYC/payout method (missing ya unverified) ki wajah se ruke hain
     * in_transit = settlement ban gaya, bank transfer hona baaki
     * settled    = transfer ho chuka
     */
    public function balanceFor(User $creator): array
    {
        $settlementSum = fn (array $statuses) => (float) Settlement::where('creator_id', $creator->id)
            ->whereIn('status', $statuses)->sum('net_amount');

        return [
            'lifetime_earned' => (float) Order::where('creator_id', $creator->id)->where('status', 'success')->sum('net_payout_amount'),
            'settled' => $settlementSum(['paid']),
            'in_transit' => $settlementSum(['pending', 'processing']),
            'clearing' => (float) $this->clearingOrders($creator->id)->sum('net_payout_amount'),
            'ready' => (float) $this->eligibleOrders($creator->id)->sum('net_payout_amount'),
            // agle settlement me judne/katne wala (refund recovery, manual correction) — negative ho sakta hai
            'adjustments' => (float) $this->pendingAdjustments($creator->id)->sum('amount'),
            'blocked_reason' => $this->blockedReason($creator),
        ];
    }

    /** Adjustments jo abhi kisi settlement me nahi lage. */
    public function pendingAdjustments(int $creatorId): Builder
    {
        return SettlementAdjustment::query()->where('creator_id', $creatorId)->whereNull('settlement_id');
    }

    /**
     * Creator ke agle settlement me ek +/− line jodo. $amount hamesha positive do — direction type se aata hai.
     * `refund_reversal`: order settle hone ke baad refund hua, to wo net wapas lena hai (checkout/refund module yahin call karega).
     */
    public function addAdjustment(User $creator, string $type, float $amount, string $reason, ?Order $order = null, ?Admin $admin = null): SettlementAdjustment
    {
        $amount = round(abs($amount), 2);

        return SettlementAdjustment::create([
            'creator_id' => $creator->id,
            'order_id' => $order?->id,
            'type' => $type,
            'amount' => $type === 'manual_credit' ? $amount : -$amount,
            'reason' => $reason,
            'admin_id' => $admin?->id,
        ]);
    }

    /** Bank file nikal gayi, transfer chal raha hai — UTR aane tak `processing`. */
    public function markProcessing(Settlement $settlement): Settlement
    {
        if ($settlement->status === 'pending') {
            $settlement->update(['status' => 'processing']);
        }

        return $settlement;
    }

    /**
     * Bank transfer ho gaya — UTR ke saath close karo.
     * (Aage RazorpayX ka payout webhook bhi isi ko call karega.)
     */
    public function markPaid(Settlement $settlement, string $reference, ?string $notes = null): Settlement
    {
        $settlement->update([
            'status' => 'paid',
            'reference_number' => $reference,
            'failure_reason' => null,
            'notes' => $notes ?? $settlement->notes,
            'processed_at' => now(),
        ]);

        $this->notify($settlement);

        return $settlement;
    }

    /**
     * Transfer fail — orders ko chhod do taaki agli cycle me apne aap dobara aa jayein.
     * Settlement history me rehta hai (audit), bas uske orders free ho jaate hain.
     */
    public function markFailed(Settlement $settlement, string $reason): Settlement
    {
        DB::transaction(function () use ($settlement, $reason) {
            $settlement->orders()->update(['settlement_id' => null]);
            SettlementAdjustment::where('settlement_id', $settlement->id)->update(['settlement_id' => null]);

            // orders_count/amounts waise hi rehte hain — history me dikhna chahiye ki kitna attempt hua tha
            $settlement->update([
                'status' => 'failed',
                'failure_reason' => $reason,
                'processed_at' => now(),
            ]);
        });

        $this->notify($settlement->refresh());

        return $settlement;
    }

    /** Creator ko mail — "payment received" notification band ho to nahi. Mail fail hone se status nahi rukta. */
    private function notify(Settlement $settlement): void
    {
        try {
            $creator = $settlement->creator;

            if (! NotificationPreference::wants($creator, 'payment_received')) {
                return;
            }

            Mail::to($creator->email)->send(new SettlementStatusMail($settlement->loadMissing('payoutMethod')));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** STL-20260927-0001 — din ke andar sequential. */
    private function nextNumber(): string
    {
        $prefix = 'STL-' . now()->format('Ymd') . '-';
        $last = Settlement::where('number', 'like', $prefix . '%')->orderByDesc('number')->value('number');
        $next = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
