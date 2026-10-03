<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\AdminAuditLog;
use App\Models\Certificate;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\Enrollment;
use App\Models\KycVerification;
use App\Models\Order;
use App\Models\PayoutMethod;
use App\Models\Product;
use App\Models\Settlement;
use App\Models\User;
use App\Services\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/**
 * Creator ne account delete kiya (soft) — kharidaar ka maal chalta rahe, paisa atke nahi,
 * aur admin use dekh / restore kar sake.
 */
class DeletedCreatorTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        $this->creator = $this->seller('guru', ['name' => 'Guru Academy']);
    }

    private function admin(): Admin
    {
        $admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();

        return $admin;
    }

    /** Payout ke liye tayyar: KYC + verified UPI. */
    private function payoutReady(User $creator): void
    {
        KycVerification::create(['user_id' => $creator->id, 'legal_name' => 'Guru', 'pan_number' => 'ABCDE1234F', 'status' => 'verified']);
        PayoutMethod::create(['user_id' => $creator->id, 'type' => 'upi', 'upi_id' => 'guru@okaxis', 'is_default' => true])->markVerified();
    }

    // ---------------------------------------------------------------- kharidaar

    public function test_buyers_keep_everything_they_bought_after_the_creator_deletes_their_account(): void
    {
        $course = $this->product($this->creator, 'course', ['slug' => 'design-basics'], ['certificate_enabled' => true]);
        $module = CourseModule::create(['course_id' => $course->courseDetail->id, 'title' => 'M1', 'sort_order' => 1]);
        $lesson = CourseLesson::create(['module_id' => $module->id, 'title' => 'Only lesson', 'type' => 'text_image', 'is_published' => true, 'sort_order' => 1]);
        $order = $this->buy($course);
        $this->asBuyer()->postJson("/me/lessons/{$lesson->uuid}/complete")->assertOk();
        $certificate = Certificate::firstOrFail();
        $enrollment = Enrollment::firstOrFail();

        $this->creator->delete(); // Settings → Delete account jaisa (soft)

        $this->asBuyer()->get('/me/courses')->assertOk()->assertInertia(fn (Assert $page) => $page->where('courses.0.creator.name', 'Guru Academy'));
        $this->asBuyer()->get("/me/courses/{$enrollment->uuid}/learn/{$lesson->uuid}")->assertOk();
        $this->asBuyer()->get('/me/purchases')->assertOk()->assertInertia(fn (Assert $page) => $page->where('orders.0.creator.name', 'Guru Academy'));
        $this->asBuyer()->get("/me/purchases/{$order->uuid}/invoice")->assertOk()->assertSee('Guru Academy');
        $this->asBuyer()->get("/me/certificates/{$certificate->uuid}")->assertOk()->assertSee($certificate->certificate_number);

        // nayi bikri band — public page pehle jaisa chhupa
        $this->get('/c/design-basics')->assertNotFound();
    }

    // ---------------------------------------------------------------- delete se pehle rok

    public function test_a_creator_with_money_waiting_cannot_delete_their_account(): void
    {
        $this->buy($this->product($this->creator, 'book')); // ₹1000 − 15% (Free) = ₹850 abhi clearing me

        $this->app['auth']->shouldUse('web');
        $this->actingAs($this->creator)->from('/settings/profile')->delete('/settings/profile', ['password' => 'password'])
            ->assertSessionHasErrors(['password' => 'You have ₹850.00 waiting to be paid out. You can delete your account once it has been settled.']);

        $this->assertNull($this->creator->fresh()->deleted_at);
    }

    public function test_a_pending_adjustment_also_blocks_deletion_and_a_clean_account_deletes(): void
    {
        $adjustment = app(SettlementService::class)->addAdjustment($this->creator, 'manual_debit', 50, 'Refund recovery');

        $this->actingAs($this->creator)->delete('/settings/profile', ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertNull($this->creator->fresh()->deleted_at);

        $adjustment->delete();
        $this->actingAs($this->creator)->delete('/settings/profile', ['password' => 'password'])->assertSessionHasNoErrors()->assertRedirect('/');
        $this->assertSoftDeleted($this->creator);
    }

    // ---------------------------------------------------------------- settlement

    public function test_the_settlement_cycle_still_pays_out_a_deleted_creator(): void
    {
        $this->payoutReady($this->creator);
        $product = $this->product($this->creator, 'book');
        Order::create([
            'order_number' => 'ORD-0001', 'creator_id' => $this->creator->id, 'product_id' => $product->id, 'buyer_phone' => '9876543210',
            'base_amount' => 1000, 'total_amount' => 1000, 'commission_rate' => 10, 'platform_fee' => 100, 'net_payout_amount' => 900,
            'status' => 'success', 'paid_at' => now()->subDays(3),
        ]);
        $this->creator->delete(); // purana delete (rok se pehle ka) — paisa phir bhi nikle

        $result = app(SettlementService::class)->runAll();

        $this->assertSame(1, $result['settlements']);
        $settlement = Settlement::firstOrFail();
        $this->assertSame('900.00', $settlement->net_amount);
        $this->assertSame('Guru Academy', $settlement->creator->name); // relation delete hue creator ko bhi laata hai
    }

    // ---------------------------------------------------------------- admin

    public function test_admin_finds_deleted_creators_and_restores_them(): void
    {
        $other = $this->seller('active-one');
        $this->creator->delete();
        $admin = $this->admin();

        $this->actingAs($admin, 'admin')->get('/admin/creators')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('creators.data', 1)
            ->where('creators.data.0.uuid', $other->uuid)
        );
        $this->actingAs($admin, 'admin')->get('/admin/creators?status=deleted')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('creators.data', 1)
            ->where('creators.data.0.uuid', $this->creator->uuid)
            ->has('creators.data.0.deleted_at')
        );
        $this->actingAs($admin, 'admin')->get("/admin/creators/{$this->creator->uuid}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->has('creator.deleted_at')
            ->has('balance.ready')
        );
        $this->actingAs($admin, 'admin')->get("/admin/creators/{$this->creator->id}")->assertNotFound(); // numeric id

        // delete hue account pe suspend nahi — pehle restore
        $this->actingAs($admin, 'admin')->post("/admin/creators/{$this->creator->uuid}/suspend", ['reason' => 'x'])->assertStatus(422);

        $this->actingAs($admin, 'admin')->post("/admin/creators/{$this->creator->uuid}/restore")->assertSessionHasNoErrors();
        $this->assertNull($this->creator->fresh()->deleted_at);
        $this->assertTrue(AdminAuditLog::where('action', 'creator.restored')->where('admin_id', $admin->id)->exists());

        // ab login hota hai
        $this->app['auth']->shouldUse('web');
        $this->post('/login', ['email' => $this->creator->email, 'password' => 'password'])->assertSessionHasNoErrors();

        // jo delete nahi hai uspe restore 422
        $this->actingAs($admin, 'admin')->post("/admin/creators/{$other->uuid}/restore")->assertStatus(422);
    }

    public function test_only_admins_can_restore(): void
    {
        $this->creator->delete();
        $someone = $this->seller('someone');

        $this->post("/admin/creators/{$this->creator->uuid}/restore")->assertRedirect();
        $this->actingAs($someone)->post("/admin/creators/{$this->creator->uuid}/restore")->assertRedirect();

        $this->assertNotNull(User::withTrashed()->find($this->creator->id)->deleted_at);
    }
}
