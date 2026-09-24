<?php

namespace Tests\Feature;

use App\Models\CourseDetail;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseDescriptionSanitizationTest extends TestCase
{
    use RefreshDatabase;

    private function course(): Product
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator']);

        $product = Product::create([
            'creator_id' => $creator->id,
            'type' => 'course',
            'title' => 'Test course',
            'slug' => 'test-course',
        ]);

        CourseDetail::create(['product_id' => $product->id]);

        $this->actingAs($creator);

        return $product;
    }

    public function test_script_payloads_are_stripped_from_the_description(): void
    {
        $product = $this->course();

        $this->put("/dashboard/courses/{$product->uuid}", [
            'description' => '<img src=x onerror="alert(1)"><p>Real <b>copy</b></p><script>alert(2)</script>',
        ])->assertSessionHasNoErrors();

        $this->assertSame('<p>Real <b>copy</b></p>', $product->fresh()->description);
    }

    public function test_attributes_are_stripped_from_allowed_tags(): void
    {
        $product = $this->course();

        $this->put("/dashboard/courses/{$product->uuid}", [
            'description' => '<p onclick="alert(1)" style="x">hi</p>',
        ])->assertSessionHasNoErrors();

        $this->assertSame('<p>hi</p>', $product->fresh()->description);
    }

    public function test_basic_formatting_survives(): void
    {
        $product = $this->course();

        $this->put("/dashboard/courses/{$product->uuid}", [
            'description' => '<p>Learn <b>fast</b></p><ul><li>one</li><li>two</li></ul>',
        ])->assertSessionHasNoErrors();

        $this->assertSame('<p>Learn <b>fast</b></p><ul><li>one</li><li>two</li></ul>', $product->fresh()->description);
    }

    public function test_tracking_ids_reject_markup(): void
    {
        $product = $this->course();

        $this->put("/dashboard/courses/{$product->uuid}", [
            'fb_pixel_id' => '"><script>alert(1)</script>',
        ])->assertSessionHasErrors('fb_pixel_id');
    }

    public function test_cover_video_url_rejects_javascript_scheme(): void
    {
        $product = $this->course();

        $this->put("/dashboard/courses/{$product->uuid}", [
            'cover_video_url' => 'javascript://comment%0aalert(1)',
        ])->assertSessionHasErrors('cover_video_url');
    }

    /** perm.product sub-resource routes pe laga hai — owner creator ke liye khulna chahiye. */
    public function test_owner_creator_can_still_manage_coupons(): void
    {
        $product = $this->course();

        $this->post("/dashboard/products/{$product->id}/coupons", [
            'code' => 'LAUNCH50',
            'discount_percent' => 50,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('coupons', ['product_id' => $product->id, 'code' => 'LAUNCH50']);
    }
}
