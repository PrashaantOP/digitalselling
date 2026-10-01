<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\BookingServiceDetail;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Project rule: URL / route me kabhi numeric DB id nahi — jo record route me jaata hai uska uuid.
 * Naya route param jodo to ya to uuid param banao (routes/bindings.php ke $uuidParams me), ya agar
 * wo sach me id nahi hai (slug, username…) to NON_ID_PARAMS me jodo — soch samajh ke.
 */
class RouteKeysTest extends TestCase
{
    use RefreshDatabase;

    /** Aise params jo DB id nahi hain — inhe uuid ki zarurat nahi. */
    private const NON_ID_PARAMS = [
        'slug', 'serviceSlug', 'username',  // public, human-readable
        'type', 'page',                     // static pages / product type
        'token', 'hash', 'path',            // password reset, signed email verify, storage
        'certificateNumber',                // public verify: CERT-XXXX random code, DB id nahi
    ];

    /** Laravel ka signed email-verify link — framework standard, hash + signature se protected. */
    private const ALLOWED_ID_ROUTES = ['verification.verify'];

    public function test_every_route_parameter_is_a_uuid_or_an_allowed_non_id_key(): void
    {
        $uuidPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
        $problems = [];

        foreach (Route::getRoutes() as $route) {
            if (in_array($route->getName(), self::ALLOWED_ID_ROUTES, true)) {
                continue;
            }

            foreach ($route->parameterNames() as $param) {
                if (in_array($param, self::NON_ID_PARAMS, true)) {
                    continue;
                }

                // baaki har param uuid-only hona chahiye — numeric id route match hi na kare
                if (($route->wheres[$param] ?? null) !== $uuidPattern) {
                    $problems[] = "{$route->uri()}  {{$param}}";
                }
            }
        }

        $this->assertSame([], $problems, "Ye route params uuid pe nahi hain (routes/bindings.php \$uuidParams me jodo):\n" . implode("\n", $problems));
    }

    public function test_numeric_id_is_rejected_and_uuid_works(): void
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'coach1']);
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'booking', 'title' => 'Call', 'slug' => 'call-1', 'status' => 'published', 'pricing_type' => 'free', 'price' => 0]);
        $service = BookingServiceDetail::create(['product_id' => $product->id, 'duration_minutes' => 30, 'is_active' => true]);
        $customer = Customer::create(['creator_id' => $creator->id, 'name' => 'A', 'phone' => '9000000001']);
        $booking = Booking::create([
            'booking_service_id' => $service->id, 'creator_id' => $creator->id, 'customer_id' => $customer->id,
            'scheduled_at' => now()->addDay(), 'duration_minutes' => 30, 'status' => 'upcoming',
        ]);

        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $booking->uuid);

        $this->actingAs($creator)->put("/dashboard/bookings/{$booking->id}/status", ['status' => 'completed'])->assertNotFound();
        $this->assertSame('upcoming', $booking->fresh()->status);

        $this->actingAs($creator)->put("/dashboard/bookings/{$booking->uuid}/status", ['status' => 'completed'])->assertSessionHasNoErrors();
        $this->assertSame('completed', $booking->fresh()->status);
    }

    public function test_duplicating_a_product_gives_the_copy_a_new_uuid(): void
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator', 'username' => 'coach2']);
        $product = Product::create(['creator_id' => $creator->id, 'type' => 'booking', 'title' => 'Call', 'slug' => 'call-2', 'status' => 'draft', 'pricing_type' => 'free', 'price' => 0]);
        BookingServiceDetail::create(['product_id' => $product->id, 'duration_minutes' => 30, 'is_active' => true]);
        $question = $product->checkoutQuestions()->create(['label' => 'Goal', 'field_type' => 'text', 'is_required' => false, 'is_enabled' => true, 'sort_order' => 1]);

        $this->actingAs($creator)->post("/dashboard/bookings/sessions/{$product->uuid}/duplicate")->assertSessionHasNoErrors();

        $copy = Product::where('creator_id', $creator->id)->where('id', '!=', $product->id)->firstOrFail();
        $this->assertNotSame($product->uuid, $copy->uuid);
        $this->assertNotSame($question->uuid, $copy->checkoutQuestions()->where('label', 'Goal')->value('uuid'));
    }
}
