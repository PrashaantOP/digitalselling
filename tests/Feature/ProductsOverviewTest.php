<?php

namespace Tests\Feature;

use App\Models\ProductCoverImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Dashboard → Products: saare types ek jagah — filters, summary, cover image, permissions. */
class ProductsOverviewTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->creator = $this->seller();
    }

    public function test_a_new_creator_gets_the_first_run_screen(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/products')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Products/Index')
            ->has('products.data', 0)
            ->where('counts.all', 0)
            ->where('types', ['course', 'event', 'book', 'locked_content', 'payment_page', 'booking'])
        );
    }

    public function test_summary_counts_and_totals(): void
    {
        $this->product($this->creator, 'course', ['status' => 'published', 'sales_count' => 3, 'revenue_total' => 2997]);
        $this->product($this->creator, 'book', ['status' => 'draft']);
        $this->product($this->creator, 'event', ['status' => 'unpublished', 'sales_count' => 1, 'revenue_total' => 499]);

        $this->actingAs($this->creator)->get('/dashboard/products')->assertInertia(fn (Assert $page) => $page
            ->where('counts.all', 3)
            ->where('statusCounts', ['published' => 1, 'draft' => 1, 'unpublished' => 1])
            ->where('totals.revenue', 3496)
            ->where('totals.sales', 4)
        );
    }

    public function test_type_status_and_search_filters(): void
    {
        $this->product($this->creator, 'course', ['title' => 'Figma basics', 'status' => 'published']);
        $this->product($this->creator, 'course', ['title' => 'Figma advanced', 'status' => 'draft']);
        $this->product($this->creator, 'book', ['title' => 'Figma e-book', 'status' => 'published']);

        $this->actingAs($this->creator)->get('/dashboard/products?type=course&status=published&search=figma')->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.title', 'Figma basics')
            ->where('filters', ['type' => 'course', 'status' => 'published', 'search' => 'figma'])
        );
    }

    public function test_unknown_filters_are_refused(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/products?type=hacker')->assertSessionHasErrors('type');
        $this->actingAs($this->creator)->get('/dashboard/products?status=deleted')->assertSessionHasErrors('status');
    }

    public function test_rows_carry_the_cover_url_and_links_by_uuid(): void
    {
        $course = $this->product($this->creator, 'course');
        ProductCoverImage::create(['product_id' => $course->id, 'image_path' => 'covers/abc.jpg', 'sort_order' => 0]);

        $this->actingAs($this->creator)->get('/dashboard/products')->assertInertia(fn (Assert $page) => $page
            ->where('products.data.0.coverImage', '/assets/covers/abc.jpg')
            ->where('products.data.0.editUrl', "/dashboard/courses/{$course->uuid}/edit")
            ->where('products.data.0.typeUrl', '/dashboard/courses')
            ->where('products.data.0.uuid', $course->uuid)
        );
    }

    public function test_other_creators_products_never_show(): void
    {
        $this->product($this->seller('rival'), 'course', ['title' => 'Not mine']);

        $this->actingAs($this->creator)->get('/dashboard/products')->assertInertia(fn (Assert $page) => $page->has('products.data', 0)->where('counts.all', 0));
    }
}
