<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\StorePageView;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function creator(): User
    {
        return User::factory()->createOne(['role' => 'creator', 'username' => 'maker' . User::count()]);
    }

    private function sale(User $creator, Product $product, float $net, $paidAt, string $status = 'success'): Order
    {
        return Order::create([
            'order_number' => 'ORD' . Order::count() . uniqid(),
            'creator_id' => $creator->id,
            'product_id' => $product->id,
            'buyer_name' => 'Buyer',
            'buyer_phone' => '9999999999',
            'base_amount' => $net,
            'total_amount' => $net,
            'commission_rate' => 0,
            'platform_fee' => 0,
            'net_payout_amount' => $net,
            'status' => $status,
            'paid_at' => $paidAt,
        ]);
    }

    private function product(User $creator, string $type = 'book', string $title = 'Guide'): Product
    {
        return Product::create(['creator_id' => $creator->id, 'type' => $type, 'title' => $title, 'slug' => 'p-' . Product::count()]);
    }

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs($user = User::factory()->create());

        $this->get('/dashboard')->assertOk();
    }

    public function test_period_defaults_to_30_days_and_accepts_whitelist_only()
    {
        $this->actingAs($this->creator());

        $this->get('/dashboard')->assertInertia(fn (Assert $page) => $page->component('Dashboard/Index')->where('days', 30)->has('chart', 30));
        $this->get('/dashboard?days=7')->assertInertia(fn (Assert $page) => $page->where('days', 7)->has('chart', 7));
        $this->get('/dashboard?days=13')->assertInertia(fn (Assert $page) => $page->where('days', 30));
    }

    public function test_stats_chart_and_top_products_reflect_real_orders()
    {
        $creator = $this->creator();
        $book = $this->product($creator, 'book', 'Best Book');
        $course = $this->product($creator, 'course', 'Big Course');
        $store = Store::create(['user_id' => $creator->id, 'username' => $creator->username, 'display_name' => 'Shop']);

        $this->sale($creator, $book, 100, now());
        $this->sale($creator, $course, 300, now()->subDay());
        $this->sale($creator, $book, 999, now(), 'failed');           // failed ginna nahi
        $this->sale($creator, $book, 50, now()->subDays(10));          // previous 7-din window
        StorePageView::create(['store_id' => $store->id, 'page_path' => '/', 'viewed_at' => now()]);

        $this->actingAs($creator)->get('/dashboard?days=7')->assertInertia(fn (Assert $page) => $page
            ->where('stats.revenue.value', 400)
            ->where('stats.revenue.previous', 50)
            ->where('stats.revenue.change', 700)
            ->where('stats.sales.value', 2)
            ->where('stats.visits.value', 1)
            ->where('chart.6.revenue', 100)
            ->where('chart.6.visits', 1)
            ->where('chart.5.revenue', 300)
            ->where('topProducts.0.title', 'Big Course')
            ->has('revenueByType', 2)
            ->where('totals.products', 2)
            ->where('balance.earned', 450)
        );
    }

    public function test_other_creators_data_does_not_leak()
    {
        $other = $this->creator();
        $this->sale($other, $this->product($other), 500, now());

        $this->actingAs($this->creator())->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('stats.revenue.value', 0)
            ->where('stats.revenue.change', null)
            ->has('topProducts', 0)
            ->has('recentOrders', 0)
        );
    }
}
