<?php

namespace Tests\Feature;

use App\Mail\CourseCompletedMail;
use App\Mail\NewSaleMail;
use App\Mail\WeeklyDigestMail;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\NotificationPreference;
use App\Models\Product;
use App\Models\User;
use App\Services\WeeklyDigest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Creator ke email switches — screen se save hote hain aur sach me emails rokte/chalaate hain. */
class NotificationPreferencesTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        $this->creator = $this->seller();
    }

    private function prefs(array $values): void
    {
        NotificationPreference::updateOrCreate(['user_id' => $this->creator->id], $values);
        $this->creator->unsetRelation('notificationPreference');
    }

    private function course(): Product
    {
        $course = $this->product($this->creator, 'course');
        $module = CourseModule::create(['course_id' => $course->courseDetail->id, 'title' => 'M1', 'sort_order' => 1]);
        CourseLesson::create(['module_id' => $module->id, 'title' => 'Only lesson', 'type' => 'text_image', 'is_published' => true, 'sort_order' => 1]);

        return $course;
    }

    public function test_page_shows_the_four_switches_with_defaults_and_saves_one_at_a_time(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/settings/notifications')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('settings/notifications')
            ->where('preferences', ['payment_received' => true, 'course_enrollment' => true, 'course_completion' => true, 'weekly_digest' => false])
            ->missing('preferences.new_messages')
        );

        $this->actingAs($this->creator)->put('/dashboard/settings/notifications', ['weekly_digest' => true])->assertSessionHasNoErrors();
        $this->actingAs($this->creator)->put('/dashboard/settings/notifications', ['payment_received' => false])->assertSessionHasNoErrors();

        $prefs = NotificationPreference::where('user_id', $this->creator->id)->firstOrFail();
        $this->assertTrue($prefs->weekly_digest);
        $this->assertFalse($prefs->payment_received);
        $this->assertTrue($prefs->course_enrollment); // chhua nahi
    }

    public function test_team_members_do_not_get_this_screen(): void
    {
        $member = User::factory()->createOne(['role' => 'sub_admin', 'parent_creator_id' => $this->creator->id, 'username' => 'helper']);

        $this->actingAs($member)->get('/dashboard/settings/notifications')->assertForbidden();
    }

    public function test_course_sales_follow_the_enrollment_switch_and_other_sales_the_payment_switch(): void
    {
        $this->prefs(['course_enrollment' => false, 'payment_received' => true]);

        $this->buy($this->course());
        Mail::assertNotSent(NewSaleMail::class);

        $this->buy($this->product($this->creator, 'book'), ['email' => 'meera@test.com', 'phone' => '9820144321']);
        Mail::assertSent(NewSaleMail::class, 1);

        $this->prefs(['course_enrollment' => true, 'payment_received' => false]);
        $this->buy($this->product($this->creator, 'book'), ['email' => 'asha@test.com', 'phone' => '9820144322']);
        Mail::assertSent(NewSaleMail::class, 1); // book ki sale, payment switch band
    }

    public function test_finishing_a_course_emails_the_creator_once_unless_switched_off(): void
    {
        $course = $this->course();
        $this->buy($course);
        $lesson = CourseLesson::firstOrFail();

        $this->asBuyer()->postJson("/me/lessons/{$lesson->uuid}/complete")->assertOk();
        Mail::assertSent(CourseCompletedMail::class, fn ($mail) => $mail->hasTo($this->creator->email));

        // dobara complete karne pe dobara mail nahi
        $this->asBuyer()->postJson("/me/lessons/{$lesson->uuid}/complete")->assertOk();
        Mail::assertSent(CourseCompletedMail::class, 1);
    }

    public function test_no_completion_email_when_the_switch_is_off(): void
    {
        $this->prefs(['course_completion' => false]);
        $this->buy($this->course());

        $this->asBuyer()->postJson('/me/lessons/' . CourseLesson::firstOrFail()->uuid . '/complete')->assertOk();

        Mail::assertNotSent(CourseCompletedMail::class);
    }

    public function test_weekly_digest_goes_only_to_opted_in_creators_with_activity(): void
    {
        $this->prefs(['weekly_digest' => true]);
        $quiet = $this->seller('quiet');
        NotificationPreference::create(['user_id' => $quiet->id, 'weekly_digest' => true]);
        $optedOut = $this->seller('busy');

        $this->travelTo(now()->setTimezone('Asia/Kolkata')->startOfWeek()->subWeek()->addDays(2)->setTime(12, 0)); // pichhle hafte ka budhvaar
        $this->buy($this->course());
        $this->buy($this->product($optedOut, 'book'), ['email' => 'meera@test.com', 'phone' => '9820144321']);
        $this->travelBack();

        $sent = app(WeeklyDigest::class)->sendAll();

        $this->assertSame(1, $sent);
        Mail::assertSent(WeeklyDigestMail::class, fn (WeeklyDigestMail $mail) => $mail->hasTo($this->creator->email)
            && $mail->stats['sales'] === 1 && $mail->stats['enrollments'] === 1 && $mail->stats['earned'] > 0);
        Mail::assertNotSent(WeeklyDigestMail::class, fn ($mail) => $mail->hasTo($quiet->email) || $mail->hasTo($optedOut->email));
    }
}
