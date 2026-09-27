<?php

use App\Models\Settlement;
use App\Models\User;
use App\Services\SettlementService;
use App\Support\PlanPricing;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 90-day Pro trial khatam → Free (15%). PlanPricing::effectivePlan() waise bhi expiry dekhta hai; ye DB ko saaf rakhta hai.
Artisan::command('plans:expire', function () {
    $this->info(PlanPricing::expireTrials() . ' trial(s) moved to Free.');
})->purpose('Downgrade creators whose Pro trial has ended');

Schedule::command('plans:expire')->daily();

/*
 | Settlements — creator ko payout request nahi karni padti. Cycle roz chalti hai aur
 | har creator ke eligible orders (paid + T+2 purane) ko ek batch me group kar deti hai.
 */
Artisan::command('settlements:run {--creator= : sirf is creator id ke liye} {--dry-run : sirf dikhao, banao mat}', function (SettlementService $settlements) {
    $creatorId = $this->option('creator');

    if ($this->option('dry-run')) {
        $creators = $creatorId
            ? User::whereKey($creatorId)->get()
            : User::whereIn('id', \App\Models\Order::where('status', 'success')->whereNull('settlement_id')->distinct()->pluck('creator_id'))->get();

        $this->line('Cutoff (is date tak ke orders eligible): ' . SettlementService::cutoffDate()->toDateString());

        foreach ($creators as $creator) {
            $eligible = $settlements->eligibleOrders($creator->id);
            $count = (clone $eligible)->count();
            $net = (float) (clone $eligible)->sum('net_payout_amount');
            $blocked = $settlements->blockedReason($creator);

            $this->line(sprintf(
                '#%d %s — %d order(s), net %.2f%s',
                $creator->id, $creator->name, $count, $net, $blocked ? "  [BLOCKED: {$blocked}]" : ''
            ));
        }

        return;
    }

    if ($creatorId) {
        $settlement = $settlements->settleCreator(User::findOrFail($creatorId));
        $this->info($settlement
            ? "{$settlement->number}: {$settlement->orders_count} order(s), net {$settlement->net_amount}"
            : 'Kuch settle karne layak nahi mila.');

        return;
    }

    $result = $settlements->runAll();
    $this->info("{$result['settlements']} settlement(s) banaye, {$result['orders']} order(s) settle hue, {$result['blocked']} creator blocked (KYC / payout method).");
})->purpose('Group eligible paid orders into settlements (T+2)');

// Bank transfer ke baad UTR ke saath close karo. Yahi seam hai jahan aage RazorpayX Payouts plug hoga.
Artisan::command('settlements:mark-paid {settlement : STL-… number} {reference : bank UTR} {--notes=}', function (SettlementService $settlements) {
    $settlement = Settlement::where('number', $this->argument('settlement'))->firstOrFail();
    $settlements->markPaid($settlement, $this->argument('reference'), $this->option('notes'));
    $this->info("{$settlement->number} paid — {$this->argument('reference')}");
})->purpose('Mark a settlement as paid with its bank reference');

// Fail hone par uske orders wapas free ho jaate hain aur agli cycle me apne aap aa jaate hain.
Artisan::command('settlements:mark-failed {settlement : STL-… number} {reason}', function (SettlementService $settlements) {
    $settlement = Settlement::where('number', $this->argument('settlement'))->firstOrFail();
    $released = $settlement->orders()->count();
    $settlements->markFailed($settlement, $this->argument('reason'));
    $this->warn("{$settlement->number} failed — {$released} order(s) agli cycle me wapas aayenge.");
})->purpose('Mark a settlement as failed and release its orders');

Schedule::command('settlements:run')->dailyAt('02:00');
