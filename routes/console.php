<?php

use App\Models\PayoutMethod;
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

        $this->line('Cutoff (orders paid on or before this date are eligible): ' . SettlementService::cutoffDate()->toDateString());

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
            : 'Nothing eligible to settle.');

        return;
    }

    $result = $settlements->runAll();
    $this->info("{$result['settlements']} settlement(s) created, {$result['orders']} order(s) settled, {$result['blocked']} creator(s) blocked (KYC / payout method / unverified method).");
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
    $this->warn("{$settlement->number} failed — {$released} order(s) will return in the next cycle.");
})->purpose('Mark a settlement as failed and release its orders');

Schedule::command('settlements:run')->dailyAt('02:00');

/*
 | Payout methods — settlement sirf verified method pe jaata hai. Abhi verification manual hai
 | (UPI/bank check karke yahan approve karo); aage gateway ka penny-drop / VPA validation yahin plug hoga.
 */
Artisan::command('payout-methods:pending', function () {
    $pending = PayoutMethod::with('user:id,name,email')->whereNull('verified_at')->oldest('updated_at')->get();

    if ($pending->isEmpty()) {
        $this->info('No unverified payout methods.');

        return;
    }

    $this->table(
        ['ID', 'Creator', 'Type', 'Destination', 'Holder', 'Default', 'Updated'],
        $pending->map(fn (PayoutMethod $m) => [
            $m->id,
            "#{$m->user_id} {$m->user?->name} <{$m->user?->email}>",
            $m->type,
            $m->type === 'upi' ? $m->upi_id : "{$m->account_number} / {$m->ifsc}",
            $m->account_holder_name ?? '—',
            $m->is_default ? 'yes' : '',
            $m->updated_at?->toDateTimeString(),
        ])
    );
})->purpose('List payout methods waiting for verification');

Artisan::command('payout-methods:verify {method : payout_methods.id}', function () {
    $method = PayoutMethod::findOrFail($this->argument('method'));

    if ($method->isVerified()) {
        $this->line("#{$method->id} is already verified ({$method->verified_at->toDateTimeString()}).");

        return;
    }

    $method->markVerified();
    \App\Support\AdminAudit::log('payout_method.verified', $method, ['creator_id' => $method->user_id]);
    $this->info("#{$method->id} verified — settlements for creator #{$method->user_id} will now go here.");
})->purpose('Mark a payout method as verified so settlements can be sent to it');

/*
 | KYC review — creator form submit karta hai (status pending), yahan se approve/reject hota hai.
 | Approve hote hi agli settlement cycle me uska ruka hua paisa nikal jaata hai.
 */
Artisan::command('kyc:pending', function () {
    $pending = \App\Models\KycVerification::with('user:id,name,email')->where('status', 'pending')->oldest('submitted_at')->get();

    if ($pending->isEmpty()) {
        $this->info('No KYC submissions pending review.');

        return;
    }

    $this->table(
        ['User', 'Legal name', 'PAN', 'GSTIN', 'Bank', 'Document', 'Submitted'],
        $pending->map(fn ($k) => [
            "#{$k->user_id} {$k->user?->name} <{$k->user?->email}>",
            $k->legal_name,
            $k->pan_number,
            $k->gst_number ?? '—',
            "{$k->bank_account_holder} · {$k->bank_account_number} / {$k->ifsc}",
            $k->id_document_path ?? '—',
            $k->submitted_at,
        ])
    );
})->purpose('List KYC submissions waiting for review');

Artisan::command('kyc:verify {user : creator user id}', function (\App\Services\KycReviewService $review) {
    $kyc = \App\Models\KycVerification::where('user_id', $this->argument('user'))->firstOrFail();
    $review->approve($kyc);
    $this->info("KYC verified — creator #{$kyc->user_id} ({$kyc->legal_name}).");
})->purpose('Approve a creator KYC submission');

Artisan::command('kyc:reject {user : creator user id} {reason}', function (\App\Services\KycReviewService $review) {
    $kyc = \App\Models\KycVerification::where('user_id', $this->argument('user'))->firstOrFail();
    $review->reject($kyc, $this->argument('reason'));
    $this->warn("KYC rejected — creator #{$kyc->user_id} will see the reason and can submit again.");
})->purpose('Reject a creator KYC submission with a reason');

/*
 | Platform admins — sirf server se bante hain (koi public register / email reset nahi).
 | Login: /admin/login → password → email OTP.
 */
$adminPasswordRule = fn () => [\Illuminate\Validation\Rules\Password::min(12)->mixedCase()->numbers()->symbols()];

Artisan::command('admin:create', function () use ($adminPasswordRule) {
    $name = trim((string) $this->ask('Name'));
    $email = \Illuminate\Support\Str::lower(trim((string) $this->ask('Email')));

    if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || \App\Models\Admin::where('email', $email)->exists()) {
        $this->error('Name is required, the email must be valid, and no admin may already use it.');

        return 1;
    }

    $password = (string) $this->secret('Password (min 12 chars, upper + lower + number + symbol)');
    $validator = \Illuminate\Support\Facades\Validator::make(['password' => $password], ['password' => $adminPasswordRule()]);

    if ($validator->fails() || $password !== $this->secret('Confirm password')) {
        $this->error($validator->errors()->first('password') ?: 'Passwords do not match.');

        return 1;
    }

    $admin = new \App\Models\Admin(['name' => $name, 'email' => $email]);
    $admin->forceFill(['password' => $password, 'is_active' => true])->save();
    \App\Support\AdminAudit::log('admin.created', $admin, ['email' => $email]);

    $this->info("Admin created: {$email}. Sign in at " . url('/admin/login'));
})->purpose('Create a platform admin account');

Artisan::command('admin:reset-password {email}', function () use ($adminPasswordRule) {
    $admin = \App\Models\Admin::where('email', \Illuminate\Support\Str::lower($this->argument('email')))->firstOrFail();
    $password = (string) $this->secret('New password (min 12 chars, upper + lower + number + symbol)');
    $validator = \Illuminate\Support\Facades\Validator::make(['password' => $password], ['password' => $adminPasswordRule()]);

    if ($validator->fails()) {
        $this->error($validator->errors()->first('password'));

        return 1;
    }

    $admin->forceFill(['password' => $password])->save();
    \App\Support\AdminAudit::log('admin.password_reset', $admin);
    $this->info("Password updated for {$admin->email}.");
})->purpose('Reset a platform admin password');

Artisan::command('admin:deactivate {email}', function () {
    $admin = \App\Models\Admin::where('email', \Illuminate\Support\Str::lower($this->argument('email')))->firstOrFail();
    $admin->forceFill(['is_active' => false])->save();
    \App\Support\AdminAudit::log('admin.deactivated', $admin);
    $this->warn("{$admin->email} can no longer sign in. Open sessions end on their next request.");
})->purpose('Disable a platform admin account');
