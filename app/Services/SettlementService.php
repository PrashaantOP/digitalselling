<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Auto-settlement engine. Creator kuch request nahi karta — `settlements:run` roz chalta hai
 * aur har creator ke eligible orders ko ek batch me group kar deta hai.
 *
 * Hold period calendar-based hai (rolling ghante nahi), taaki rule bolne me simple rahe:
 * "Monday ki saari bookings Wednesday ko settle hongi" — chahe order raat 11 baje aaya ho.
 *
 * Agar kuch din settlement na bane (KYC pending, payout method nahi), orders jama hote rehte
 * hain aur jis din cycle chalti hai us din sab ek hi settlement me chale jaate hain.
 */
class SettlementService
{
    /** Order paid hone ke itne din baad wo settle hone layak hota hai (T+2). */
    public const HOLD_DAYS = 2;

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

        return PayoutMethod::where('user_id', $creator->id)->exists() ? null : 'payout_method';
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

        $method = PayoutMethod::where('user_id', $creator->id)
            ->orderByDesc('is_default')->orderByDesc('id')->first();

        if (! $method) {
            return null;
        }

        return DB::transaction(function () use ($creator, $method) {
            // Creator row pe lock — do parallel run (cron + manual) double settlement na banayein.
            User::whereKey($creator->id)->lockForUpdate()->first();

            // ids transaction ke andar hi lo, warna beech me aaya naya order chhoot ya dobara aa sakta hai
            $orders = $this->eligibleOrders($creator->id)
                ->lockForUpdate()
                ->get(['id', 'paid_at', 'total_amount', 'platform_fee', 'net_payout_amount']);

            if ($orders->isEmpty()) {
                return null;
            }

            $net = round((float) $orders->sum('net_payout_amount'), 2);

            if ($net <= 0) {
                return null;
            }

            $settlement = Settlement::create([
                'number' => $this->nextNumber(),
                'creator_id' => $creator->id,
                'payout_method_id' => $method->id,
                'orders_count' => $orders->count(),
                'gross_amount' => round((float) $orders->sum('total_amount'), 2),
                'commission_amount' => round((float) $orders->sum('platform_fee'), 2),
                'net_amount' => $net,
                'period_start' => $orders->min('paid_at'),
                'period_end' => $orders->max('paid_at'),
                'status' => 'pending',
            ]);

            Order::whereIn('id', $orders->pluck('id'))->update(['settlement_id' => $settlement->id]);

            return $settlement;
        });
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
            ->pluck('creator_id');

        foreach (User::whereIn('id', $creatorIds)->with('kycVerification')->cursor() as $creator) {
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
     * ready      = hold paar kar chuke, par KYC/payout method ki wajah se ruke hain
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
            'blocked_reason' => $this->blockedReason($creator),
        ];
    }

    /** Bank transfer ho gaya — UTR ke saath close karo. */
    public function markPaid(Settlement $settlement, string $reference, ?string $notes = null): Settlement
    {
        $settlement->update([
            'status' => 'paid',
            'reference_number' => $reference,
            'failure_reason' => null,
            'notes' => $notes ?? $settlement->notes,
            'processed_at' => now(),
        ]);

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

            // orders_count/amounts waise hi rehte hain — history me dikhna chahiye ki kitna attempt hua tha
            $settlement->update([
                'status' => 'failed',
                'failure_reason' => $reason,
                'processed_at' => now(),
            ]);
        });

        return $settlement->refresh();
    }

    /** STL-20260927-0001 — din ke andar sequential. */
    private function nextNumber(): string
    {
        $prefix = 'STL-' . now()->format('Ymd') . '-';
        $last = Settlement::where('number', 'like', $prefix . '%')->orderByDesc('number')->value('number');
        $next = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    // TODO (refund flow ke saath): order settle hone ke baad refund hua to agle settlement me
    // negative adjustment row jodna hoga. Abhi refund flow codebase me hai hi nahi.
}
