<?php

namespace App\Support;

use App\Mail\BookingConfirmedMail;
use App\Mail\CourseCompletedMail;
use App\Mail\LoginOtpMail;
use App\Mail\NewBookingMail;
use App\Mail\NewDeviceLoginMail;
use App\Mail\NewSaleMail;
use App\Mail\OrderReceiptMail;
use App\Mail\OrderRefundedMail;
use App\Mail\PlanExpiringMail;
use App\Mail\PlanPurchasedMail;
use App\Mail\PlusPaymentFailedMail;
use App\Mail\PlusRenewedMail;
use App\Mail\SecurityNoticeMail;
use App\Mail\SettlementStatusMail;
use App\Mail\SubAdminInviteMail;
use App\Mail\TeamMemberRemovedMail;
use App\Mail\WeeklyDigestMail;
use App\Models\BillingInvoice;
use App\Models\Booking;
use App\Models\BookingResponse;
use App\Models\CourseDetail;
use App\Models\Customer;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\OrderAddonItem;
use App\Models\PaymentPageDetail;
use App\Models\PayoutMethod;
use App\Models\PlanPurchase;
use App\Models\Product;
use App\Models\Settlement;
use App\Models\Store;
use App\Models\SubAdmin;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Support\Renderable;

/**
 * Har email ka namoona — sample data se (DB me kuch save nahi hota). `/dev/mails` (sirf local) aur
 * MailDesignTest dono isi se render karte hain, taaki design badle to har email ek jagah dikh jaye.
 */
class MailPreviews
{
    /** @return array<string, array{label: string, make: \Closure(): Renderable}> */
    public static function all(): array
    {
        return [
            'order-receipt' => ['label' => 'Buyer · Order receipt', 'make' => fn () => new OrderReceiptMail(self::order())],
            'order-receipt-files' => ['label' => 'Buyer · Receipt with files', 'make' => fn () => new OrderReceiptMail(self::order('payment_page'))],
            'booking-confirmed' => ['label' => 'Buyer · Booking confirmed', 'make' => fn () => new BookingConfirmedMail(self::booking(), 'Portfolio review call', 'Ria Sharma', 'Asia/Kolkata', 'https://calendar.google.com/calendar/render')],
            'order-refunded-buyer' => ['label' => 'Buyer · Refund', 'make' => fn () => new OrderRefundedMail(self::order(), forCreator: false)],
            'login-otp-buyer' => ['label' => 'Buyer · Sign-in code', 'make' => fn () => new LoginOtpMail('482193', 'Rohan', 'customer_login', '49.36.12.8', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1')],

            'new-sale' => ['label' => 'Creator · New sale', 'make' => fn () => new NewSaleMail(self::order())],
            'new-booking' => ['label' => 'Creator · New booking', 'make' => fn () => new NewBookingMail(self::booking(), 'Portfolio review call', 'Asia/Kolkata')],
            'course-completed' => ['label' => 'Creator · Course completed', 'make' => fn () => new CourseCompletedMail(self::enrollment())],
            'order-refunded-creator' => ['label' => 'Creator · Order refunded', 'make' => fn () => new OrderRefundedMail(self::order(settled: true), forCreator: true)],
            'settlement-paid' => ['label' => 'Creator · Settlement paid', 'make' => fn () => new SettlementStatusMail(self::settlement('paid'))],
            'settlement-failed' => ['label' => 'Creator · Settlement failed', 'make' => fn () => new SettlementStatusMail(self::settlement('failed'))],
            'weekly-digest' => ['label' => 'Creator · Weekly digest', 'make' => fn () => new WeeklyDigestMail(self::creator(), [
                'from' => now()->subDays(7)->format('j M'), 'to' => now()->subDay()->format('j M'), 'sales' => 14, 'revenue' => 18450.0,
                'earned' => 15682.5, 'enrollments' => 9, 'completions' => 3, 'top' => 'Figma for beginners',
            ])],
            'plan-purchased' => ['label' => 'Creator · Plus purchased (prepaid)', 'make' => fn () => new PlanPurchasedMail(self::purchase())],
            'plus-renewed-first' => ['label' => 'Creator · Plus auto-renew on', 'make' => fn () => new PlusRenewedMail(self::invoice(), true)],
            'plus-renewed' => ['label' => 'Creator · Plus renewed', 'make' => fn () => new PlusRenewedMail(self::invoice(), false)],
            'plan-expiring' => ['label' => 'Creator · Plus ending', 'make' => fn () => new PlanExpiringMail('Ria Sharma', 3, now()->addDays(3)->format('j F Y'), 10.0, 15.0)],
            'plus-payment-failed' => ['label' => 'Creator · Plus charge failed', 'make' => fn () => new PlusPaymentFailedMail(self::creator(), false)],
            'plus-payment-halted' => ['label' => 'Creator · Plus auto-renew stopped', 'make' => fn () => new PlusPaymentFailedMail(self::creator(), true)],
            'sub-admin-invite' => ['label' => 'Team · Invitation', 'make' => fn () => new SubAdminInviteMail(new SubAdmin(['role_name' => 'Support']), 'Ria Sharma', 'sample-token')],
            'team-member-removed' => ['label' => 'Team · Access removed', 'make' => fn () => new TeamMemberRemovedMail('Aman', 'Ria Sharma')],

            'login-otp' => ['label' => 'Security · Sign-in code', 'make' => fn () => new LoginOtpMail('482193', 'Ria Sharma', 'creator_login', '49.36.12.8', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0')],
            'new-device-login' => ['label' => 'Security · New device', 'make' => fn () => new NewDeviceLoginMail('Ria Sharma', '49.36.12.8', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0', now())],
            'security-notice' => ['label' => 'Security · Password changed', 'make' => fn () => new SecurityNoticeMail('password_changed', 'Ria Sharma', null, '49.36.12.8', 'Mozilla/5.0 (Macintosh) Safari/605.1')],
            'verify-email' => ['label' => 'Auth · Verify email', 'make' => fn () => (new VerifyEmail)->toMail(self::creator())],
            'reset-password' => ['label' => 'Auth · Reset password', 'make' => fn () => (new ResetPassword('sample-token'))->toMail(self::creator())],
        ];
    }

    private static function creator(): User
    {
        $creator = new User(['name' => 'Ria Sharma', 'email' => 'ria@example.com', 'username' => 'ria']);
        $creator->forceFill(['id' => 0, 'plan_expires_at' => now()->addDays(3)]);
        $creator->setRelation('store', new Store(['username' => 'ria', 'display_name' => 'Ria Designs']));

        return $creator;
    }

    private static function product(string $type = 'course'): Product
    {
        $product = new Product(['title' => $type === 'payment_page' ? 'Brand kit templates' : 'Figma for beginners', 'type' => $type, 'post_purchase_message' => 'Start with lesson 1 — it takes 10 minutes and sets up everything else.']);
        $product->setRelation('creator', self::creator());

        if ($type === 'payment_page') {
            $product->setRelation('paymentPageDetail', new PaymentPageDetail(['delivery_files' => [
                ['label' => 'Brand-kit.zip', 'url' => url('/assets/sample/brand-kit.zip')],
                ['label' => 'Usage guide.pdf', 'url' => url('/assets/sample/guide.pdf')],
            ]]));
        }

        return $product;
    }

    private static function order(string $type = 'course', bool $settled = false): Order
    {
        $order = new Order([
            'order_number' => 'ORD-2026-00042', 'buyer_name' => 'Rohan Kulkarni', 'buyer_email' => 'rohan@example.com',
            'total_amount' => 1499, 'platform_fee' => 224.85, 'net_payout_amount' => 1274.15,
        ]);
        $order->forceFill(['settlement_id' => $settled ? 1 : null]);
        $order->setRelation('product', self::product($type));
        $order->setRelation('creator', self::creator());

        $bonus = new OrderAddonItem;
        $bonus->setRelation('addonProduct', new Product(['title' => 'Icon pack bonus']));
        $order->setRelation('addonItems', collect($type === 'course' ? [$bonus] : []));

        return $order;
    }

    private static function booking(): Booking
    {
        $booking = new Booking(['duration_minutes' => 45, 'meeting_link' => 'https://meet.google.com/abc-defg-hij']);
        $booking->forceFill(['scheduled_at' => now()->addDays(2)->setTime(5, 0)]);
        $booking->setRelation('customer', new Customer(['name' => 'Rohan Kulkarni', 'email' => 'rohan@example.com', 'phone' => '+91 99304 12847']));
        $booking->setRelation('creator', self::creator());
        $booking->setRelation('responses', collect([new BookingResponse(['question_label' => 'What should we cover?', 'answer' => 'My portfolio case studies and how to price freelance work.'])]));

        return $booking;
    }

    private static function enrollment(): Enrollment
    {
        $course = new CourseDetail(['certificate_enabled' => true]);
        $course->setRelation('product', self::product());

        $enrollment = new Enrollment;
        $enrollment->forceFill(['uuid' => '00000000-0000-0000-0000-000000000000']);
        $enrollment->setRelation('course', $course);
        $customer = new Customer(['name' => 'Meera Iyer']);
        $customer->setRelation('buyer', null);
        $enrollment->setRelation('customer', $customer);

        return $enrollment;
    }

    private static function settlement(string $status): Settlement
    {
        $settlement = new Settlement(['number' => 'STL-2026-00018', 'net_amount' => 12840.5, 'orders_count' => 11, 'status' => $status,
            'reference_number' => $status === 'paid' ? 'UTR428193746512' : null, 'failure_reason' => $status === 'failed' ? 'Beneficiary account is closed' : null]);
        $settlement->forceFill(['uuid' => '00000000-0000-0000-0000-000000000000']);
        $settlement->setRelation('creator', self::creator());
        $settlement->setRelation('payoutMethod', new PayoutMethod(['type' => 'upi', 'upi_id' => 'ria@okaxis']));

        return $settlement;
    }

    private static function invoice(): BillingInvoice
    {
        $invoice = new BillingInvoice(['invoice_number' => 'INV-2627-000123', 'amount' => 499, 'period_end' => now()->addMonth()]);
        $invoice->forceFill(['uuid' => '00000000-0000-0000-0000-000000000000']);
        $invoice->setRelation('user', self::creator());

        return $invoice;
    }

    private static function purchase(): PlanPurchase
    {
        $purchase = new PlanPurchase(['months' => 3, 'amount_payable' => 1497]);
        $purchase->forceFill(['period_end' => now()->addMonths(3)]);
        $purchase->setRelation('user', self::creator());
        $purchase->setRelation('invoice', self::invoice());

        return $purchase;
    }
}
