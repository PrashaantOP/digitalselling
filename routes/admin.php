<?php

/*
 | Platform admin panel — /admin
 | Alag guard (`admin`), alag table (`admins`). Creator ka session in routes ko kabhi nahi khol sakta.
 | Login = email + password + email OTP. URLs me sirf uuid (numeric id route match hi nahi karta).
 |
 | Bindings yahan tenant-scoped NAHI hain — admin poore platform ka data dekhta hai. Isliye param naam
 | dashboard wale (settlement, order…) se alag rakhe hain, warna routes/bindings.php ki tenant binding lag jaati.
 */

use App\Http\Controllers\Admin\AuditController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CreatorController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\BillingController;
use App\Http\Controllers\Admin\KycController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\PayoutMethodController;
use App\Http\Controllers\Admin\SettlementController;
use App\Models\BillingInvoice;
use App\Models\KycVerification;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Support\Facades\Route;

$uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

foreach (['creator', 'kyc', 'payoutMethod', 'adminSettlement', 'adminOrder', 'adminInvoice'] as $param) {
    Route::pattern($param, $uuid);
}

Route::bind('creator', fn ($v) => User::where('role', 'creator')->where('uuid', $v)->firstOrFail());
Route::bind('kyc', fn ($v) => KycVerification::where('uuid', $v)->firstOrFail());
Route::bind('payoutMethod', fn ($v) => PayoutMethod::where('uuid', $v)->firstOrFail());
Route::bind('adminSettlement', fn ($v) => Settlement::where('uuid', $v)->firstOrFail());
Route::bind('adminInvoice', fn ($v) => BillingInvoice::where('uuid', $v)->firstOrFail());
Route::bind('adminOrder', fn ($v) => Order::where('uuid', $v)->firstOrFail());

Route::prefix('admin')->name('admin.')->group(function () {
    // ---- login (password → email OTP) ----
    Route::middleware('guest:admin')->group(function () {
        Route::get('login', [AuthController::class, 'create'])->name('login');
        Route::post('login', [AuthController::class, 'store'])->middleware('throttle:login-ip');
        Route::get('login/verify', [AuthController::class, 'verifyForm'])->name('login.verify');
        Route::post('login/verify', [AuthController::class, 'verify'])->middleware('throttle:login-ip');
        Route::post('login/resend', [AuthController::class, 'resend'])->middleware('throttle:login-ip')->name('login.resend');
    });

    Route::middleware(['auth:admin', 'admin.active', 'admin.idle'])->group(function () {
        Route::post('logout', [AuthController::class, 'destroy'])->name('logout');

        Route::get('/', DashboardController::class)->name('dashboard');

        Route::get('creators', [CreatorController::class, 'index'])->name('creators.index');
        Route::get('creators/{creator}', [CreatorController::class, 'show'])->name('creators.show');
        Route::post('creators/{creator}/suspend', [CreatorController::class, 'suspend'])->name('creators.suspend');
        Route::post('creators/{creator}/activate', [CreatorController::class, 'activate'])->name('creators.activate');
        Route::put('creators/{creator}/plan', [CreatorController::class, 'updatePlan'])->name('creators.plan');
        Route::post('creators/{creator}/adjustments', [CreatorController::class, 'addAdjustment'])->name('creators.adjustments');
        Route::post('creators/{creator}/two-factor-reset', [CreatorController::class, 'resetTwoFactor'])->name('creators.two-factor-reset');

        Route::get('kyc', [KycController::class, 'index'])->name('kyc.index');
        Route::get('kyc/{kyc}', [KycController::class, 'show'])->name('kyc.show');
        Route::get('kyc/{kyc}/document', [KycController::class, 'document'])->name('kyc.document');
        Route::post('kyc/{kyc}/approve', [KycController::class, 'approve'])->name('kyc.approve');
        Route::post('kyc/{kyc}/reject', [KycController::class, 'reject'])->name('kyc.reject');

        Route::get('payout-methods', [PayoutMethodController::class, 'index'])->name('payout-methods.index');
        Route::post('payout-methods/{payoutMethod}/verify', [PayoutMethodController::class, 'verify'])->name('payout-methods.verify');
        Route::post('payout-methods/{payoutMethod}/revoke', [PayoutMethodController::class, 'revoke'])->name('payout-methods.revoke');

        Route::get('settlements', [SettlementController::class, 'index'])->name('settlements.index');
        Route::get('settlements/preview', [SettlementController::class, 'preview'])->name('settlements.preview');
        Route::post('settlements/run', [SettlementController::class, 'run'])->name('settlements.run');
        Route::get('settlements/create', [SettlementController::class, 'create'])->name('settlements.create');
        Route::post('settlements', [SettlementController::class, 'store'])->name('settlements.store');
        Route::post('settlements/export', [SettlementController::class, 'export'])->name('settlements.export');
        Route::post('settlements/bulk-paid', [SettlementController::class, 'bulkPaid'])->name('settlements.bulk-paid');
        Route::get('settlements/{adminSettlement}', [SettlementController::class, 'show'])->name('settlements.show');
        Route::post('settlements/{adminSettlement}/paid', [SettlementController::class, 'markPaid'])->name('settlements.paid');
        Route::post('settlements/{adminSettlement}/failed', [SettlementController::class, 'markFailed'])->name('settlements.failed');

        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{adminOrder}', [OrderController::class, 'show'])->name('orders.show');

        Route::get('billing', [BillingController::class, 'index'])->name('billing.index');
        Route::get('billing/invoices/{adminInvoice}', [BillingController::class, 'invoice'])->name('billing.invoice');

        Route::get('audit', [AuditController::class, 'index'])->name('audit.index');
    });
});
