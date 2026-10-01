<?php

namespace Tests\Feature;

use App\Models\Buyer;
use App\Models\Certificate;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\Enrollment;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Customer portal (/me): buyer ko sirf apni kharid dikhti hai, aur poori dikhti hai. */
class CustomerPortalTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
    }

    /** Course jisme $count published lessons hain. */
    private function courseWithLessons(int $count = 2, array $detail = []): Product
    {
        $product = $this->product($this->seller('teach' . Product::count()), 'course', [], $detail);
        $module = CourseModule::create(['course_id' => $product->courseDetail->id, 'title' => 'Module 1', 'sort_order' => 1]);

        foreach (range(1, $count) as $i) {
            CourseLesson::create(['module_id' => $module->id, 'title' => "Lesson {$i}", 'type' => 'text_image', 'is_published' => true, 'sort_order' => $i]);
        }

        return $product;
    }

    public function test_purchases_from_different_creators_show_in_one_portal(): void
    {
        $this->buy($this->courseWithLessons());
        $this->buy($this->product($this->seller('writer'), 'book'));

        $this->asBuyer()->get('/me/courses')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Customer/MyCourses')->has('courses', 1));

        $this->asBuyer()->get('/me/purchases')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Customer/MyPurchases')
            ->has('orders', 2)
            ->has('orders.0.uuid')
            ->missing('orders.0.id') // numeric id frontend ko nahi
            ->where('orders.0.items.0.type', 'book')
        );
    }

    public function test_another_buyer_sees_none_of_it(): void
    {
        $course = $this->courseWithLessons();
        $order = $this->buy($course);
        $enrollment = Enrollment::firstOrFail();

        $this->buy($this->product($this->seller('elsewhere'), 'payment_page'), ['email' => 'meera@test.com', 'phone' => '9820144321']);

        $meera = fn () => $this->actingAs(Buyer::where('email', 'meera@test.com')->firstOrFail(), 'customer');

        $meera()->get('/me/courses')->assertInertia(fn (Assert $page) => $page->has('courses', 0));
        $meera()->get('/me/purchases')->assertInertia(fn (Assert $page) => $page->has('orders', 1));
        $meera()->get("/me/courses/{$enrollment->uuid}/learn")->assertNotFound();
        $meera()->get("/me/purchases/{$order->uuid}/invoice")->assertNotFound();
    }

    public function test_numeric_ids_never_open_anything(): void
    {
        $order = $this->buy($this->courseWithLessons());
        $enrollment = Enrollment::firstOrFail();

        $this->asBuyer()->get("/me/courses/{$enrollment->id}/learn")->assertNotFound();
        $this->asBuyer()->get("/me/purchases/{$order->id}/invoice")->assertNotFound();
        $this->asBuyer()->get("/me/courses/{$enrollment->uuid}/learn")->assertOk();
    }

    public function test_finishing_every_lesson_completes_the_course_and_issues_a_certificate(): void
    {
        $this->buy($this->courseWithLessons(2, ['certificate_enabled' => true]));
        $enrollment = Enrollment::firstOrFail();
        [$first, $second] = CourseLesson::orderBy('sort_order')->get()->all();

        $this->asBuyer()->get("/me/courses/{$enrollment->uuid}/learn")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Customer/LessonPlayer')->where('lesson.title', 'Lesson 1')->has('modules.0.lessons', 2));

        $this->asBuyer()->postJson("/me/lessons/{$first->uuid}/complete")->assertOk()->assertJson(['progress_percent' => 50, 'course_completed' => false]);
        $this->asBuyer()->postJson("/me/lessons/{$second->uuid}/complete")->assertOk()->assertJson(['progress_percent' => 100, 'course_completed' => true]);

        $certificate = Certificate::firstOrFail();
        $this->asBuyer()->get("/me/certificates/{$certificate->uuid}")->assertOk()->assertSee('Certificate of completion')->assertSee('Rohan Kulkarni');
    }

    public function test_expired_course_shows_a_buy_again_page_and_blocks_lessons(): void
    {
        $this->buy($this->courseWithLessons(1, ['access_type' => 'days', 'access_days' => 7]));
        $enrollment = Enrollment::firstOrFail();
        $lesson = CourseLesson::firstOrFail();

        $this->travel(8)->days();

        $this->asBuyer()->get("/me/courses/{$enrollment->uuid}/learn")->assertOk()->assertInertia(fn (Assert $page) => $page->component('Customer/CourseExpired')->has('buyUrl'));
        $this->asBuyer()->postJson("/me/lessons/{$lesson->uuid}/complete")->assertForbidden();
    }

    public function test_book_downloads_only_for_its_buyer(): void
    {
        $book = $this->product($this->seller('writer'), 'book');
        $this->buy($book);
        $this->buy($this->product($this->seller('elsewhere'), 'payment_page'), ['email' => 'meera@test.com', 'phone' => '9820144321']);

        $this->asBuyer()->get("/me/books/{$book->uuid}/download")->assertRedirect('https://files.example/book.pdf');
        $this->asBuyer('meera@test.com')->get("/me/books/{$book->uuid}/download")->assertForbidden();
    }

    public function test_unlocked_content_event_ticket_and_invoice_reach_the_buyer(): void
    {
        $creator = $this->seller('host');
        $this->buy($this->product($creator, 'locked_content'));
        $this->buy($this->product($creator, 'event'));
        $order = \App\Models\Order::latest('id')->firstOrFail();

        $this->asBuyer()->get('/me/purchases')->assertInertia(fn (Assert $page) => $page
            ->where('orders.0.items.0.event.join_link', 'https://meet.example/abc')
            ->where('orders.1.unlocked.0.hidden_message', 'The secret')
        );

        $this->asBuyer()->get("/me/purchases/{$order->uuid}/invoice")->assertOk()->assertSee($order->order_number);
    }

    public function test_account_and_bookings_pages_render(): void
    {
        $this->buy($this->product($this->seller(), 'payment_page'));

        $this->asBuyer()->get('/me/bookings')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Customer/MyBookings')->has('upcoming', 0));
        $this->asBuyer()->get('/me/account')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Customer/Account')->where('account.email', 'rohan@test.com')->where('account.phone_verified', false));
        $this->asBuyer()->put('/me/account', ['name' => 'Rohan K'])->assertSessionHasNoErrors();
        $this->assertSame('Rohan K', Buyer::first()->name);
    }
}
