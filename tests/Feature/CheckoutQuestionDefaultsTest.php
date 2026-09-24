<?php

namespace Tests\Feature;

use App\Models\CheckoutQuestion;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutQuestionDefaultsTest extends TestCase
{
    use RefreshDatabase;

    private function course(): Product
    {
        /** @var User $creator */
        $creator = User::factory()->createOne(['role' => 'creator']);
        $this->actingAs($creator);

        $this->post('/dashboard/courses', ['title' => 'Test course'])->assertSessionHasNoErrors();

        return Product::where('creator_id', $creator->id)->firstOrFail();
    }

    private function question(Product $product, string $label): CheckoutQuestion
    {
        return $product->checkoutQuestions()->where('label', $label)->firstOrFail();
    }

    public function test_a_new_course_seeds_the_four_default_checkout_questions(): void
    {
        $product = $this->course();

        $this->assertSame(
            ['Email address', 'Phone number', 'GSTIN', 'State'],
            $product->checkoutQuestions()->orderBy('sort_order')->pluck('label')->all(),
        );
    }

    public function test_email_and_phone_cannot_be_switched_off(): void
    {
        $product = $this->course();

        foreach (['Email address' => 'email', 'Phone number' => 'phone'] as $label => $type) {
            $question = $this->question($product, $label);

            $this->put("/dashboard/checkout-questions/{$question->id}", [
                'label' => $label,
                'field_type' => $type,
                'is_required' => false,
                'is_enabled' => false,
            ])->assertSessionHasNoErrors();

            $this->assertTrue($question->fresh()->is_enabled, "{$label} should stay enabled");
            $this->assertTrue($question->fresh()->is_required, "{$label} should stay required");
        }
    }

    public function test_email_cannot_be_deleted(): void
    {
        $product = $this->course();
        $question = $this->question($product, 'Email address');

        $this->delete("/dashboard/checkout-questions/{$question->id}")->assertStatus(422);

        $this->assertNotNull($question->fresh());
    }

    public function test_gstin_and_state_can_be_switched_off(): void
    {
        $product = $this->course();

        $gstin = $this->question($product, 'GSTIN');
        $this->put("/dashboard/checkout-questions/{$gstin->id}", [
            'label' => 'GSTIN',
            'field_type' => 'text',
            'is_required' => false,
            'is_enabled' => false,
        ])->assertSessionHasNoErrors();
        $this->assertFalse($gstin->fresh()->is_enabled);

        // Editor poori seeded list wapas bhejta hai (36 states + UTs), isliye test bhi wahi bheje —
        // chhoti list bhejne se options ka max limit wala bug chhup jaata hai.
        $state = $this->question($product, 'State');
        $this->put("/dashboard/checkout-questions/{$state->id}", [
            'label' => 'State',
            'field_type' => 'dropdown',
            'options' => $state->options,
            'is_required' => false,
            'is_enabled' => false,
        ])->assertSessionHasNoErrors();
        $this->assertFalse($state->fresh()->is_enabled);
    }

    public function test_new_course_button_text_defaults_to_enroll_now(): void
    {
        $this->assertSame('Enroll now', $this->course()->button_text);
    }
}
