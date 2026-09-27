<?php

namespace Tests\Feature;

use App\Models\KycVerification;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PaymentsTest extends TestCase
{
    use RefreshDatabase;

    private function creator(): User
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'seller' . User::count()]);

        return $creator;
    }

    private function order(User $creator, string $status = 'success'): Order
    {
        $product = Product::create([
            'creator_id' => $creator->id,
            'type' => 'course',
            'title' => 'Design Masterclass',
            'slug' => 'masterclass-' . Product::count(),
        ]);

        return Order::create([
            'order_number' => 'ORD-' . str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'creator_id' => $creator->id,
            'product_id' => $product->id,
            'buyer_name' => 'Aarav Sharma',
            'buyer_email' => 'aarav@test.com',
            'buyer_phone' => '9876543210',
            'base_amount' => 123456,
            'total_amount' => 123456,
            'commission_rate' => 10,
            'platform_fee' => 12345.6,
            'net_payout_amount' => 111110.4,
            'status' => $status,
            'paid_at' => $status === 'success' ? now() : null,
        ]);
    }

    public function test_invoice_opens_for_own_paid_order_only(): void
    {
        $creator = $this->creator();
        $paid = $this->order($creator);
        $pending = $this->order($creator, 'pending');

        $this->actingAs($creator)->get("/dashboard/payments/invoice/{$paid->uuid}")
            ->assertOk()
            ->assertSee($paid->order_number)
            ->assertSee('Aarav Sharma')
            ->assertSee('₹1,23,456.00');

        $this->actingAs($creator)->get("/dashboard/payments/invoice/{$pending->uuid}")->assertNotFound();

        // dusre creator ka order — 404, invoice leak nahi hona chahiye
        $this->actingAs($this->creator())->get("/dashboard/payments/invoice/{$paid->uuid}")->assertNotFound();
    }

    public function test_csv_export_downloads_readable_rows(): void
    {
        $creator = $this->creator();
        $this->order($creator);

        $response = $this->actingAs($creator)->get('/dashboard/payments/export?type=course');
        $response->assertOk()->assertDownload();

        $csv = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('Course', $csv);
        $this->assertStringContainsString('Paid', $csv);
    }

    public function test_kyc_page_renders_and_submission_goes_to_review(): void
    {
        Storage::fake('local');
        $creator = $this->creator();

        $this->actingAs($creator)->get('/dashboard/payments/account/kyc')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Payments/Kyc')->where('kyc.status', 'not_started'));

        $this->actingAs($creator)->post('/dashboard/payments/account/kyc', [
            'legal_name' => 'Test Creator',
            'pan_number' => 'ABCDE1234F',
            'bank_account_holder' => 'Test Creator',
            'bank_account_number' => '50100212345678',
            'ifsc' => 'HDFC0001234',
            'current_password' => 'password',
            'id_document' => UploadedFile::fake()->create('pan.pdf', 100, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $kyc = KycVerification::where('user_id', $creator->id)->first();
        $this->assertSame('pending', $kyc->status);
        Storage::disk('local')->assertExists($kyc->id_document_path);
    }
}
