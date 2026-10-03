<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\FeedbackReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Dashboard ka "Bug report / feature request" — creator bhejta hai, admin padhta aur jawab deta hai. */
class FeedbackReportTest extends TestCase
{
    use RefreshDatabase;

    private User $creator;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->creator = User::factory()->createOne(['role' => 'creator', 'username' => 'maker']);
    }

    private function admin(): Admin
    {
        $admin = new Admin(['name' => 'Ops', 'email' => 'ops@platform.test']);
        $admin->forceFill(['password' => 'Sup3r$ecretPass', 'is_active' => true])->save();

        return $admin;
    }

    private function report(User $by, array $extra = [])
    {
        return $this->actingAs($by)->post('/dashboard/feedback', $extra + [
            'type' => 'bug', 'title' => 'Avatar upload does nothing', 'details' => 'I pick a photo on the Store page and nothing happens.',
        ]);
    }

    public function test_creator_sends_a_bug_report_with_a_screenshot_and_sees_it_listed(): void
    {
        $this->report($this->creator, ['screenshot' => UploadedFile::fake()->image('bug.png'), 'page_url' => '/dashboard/store'])
            ->assertSessionHasNoErrors()->assertSessionHas('success');

        $report = FeedbackReport::firstOrFail();
        $this->assertSame('open', $report->status);
        $this->assertSame($this->creator->id, $report->creator_id);
        Storage::disk('local')->assertExists($report->screenshot_path);

        $this->actingAs($this->creator)->get('/dashboard/feedback')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Feedback/Index')
            ->has('reports', 1)
            ->where('reports.0.uuid', $report->uuid)
            ->where('reports.0.has_screenshot', true)
            ->missing('reports.0.id')
        );
        $this->actingAs($this->creator)->get("/dashboard/feedback/{$report->uuid}/screenshot")->assertOk();
    }

    public function test_reports_need_a_type_title_and_real_details(): void
    {
        $this->report($this->creator, ['type' => 'spam'])->assertSessionHasErrors('type');
        $this->report($this->creator, ['title' => ''])->assertSessionHasErrors('title');
        $this->report($this->creator, ['details' => 'short'])->assertSessionHasErrors('details');
        $this->report($this->creator, ['screenshot' => UploadedFile::fake()->create('virus.exe', 10)])->assertSessionHasErrors('screenshot');

        $this->assertSame(0, FeedbackReport::count());
    }

    public function test_a_team_member_reports_for_their_store_and_other_stores_see_nothing(): void
    {
        $member = User::factory()->createOne(['role' => 'sub_admin', 'parent_creator_id' => $this->creator->id, 'username' => 'helper']);
        $this->report($member)->assertSessionHasNoErrors();
        $report = FeedbackReport::firstOrFail();

        $this->assertSame($this->creator->id, $report->creator_id);
        $this->assertSame($member->id, $report->user_id);
        $this->actingAs($this->creator)->get('/dashboard/feedback')->assertInertia(fn (Assert $page) => $page->has('reports', 1));

        $rival = User::factory()->createOne(['role' => 'creator', 'username' => 'rival']);
        $this->actingAs($rival)->get('/dashboard/feedback')->assertInertia(fn (Assert $page) => $page->has('reports', 0));
        $this->actingAs($rival)->get("/dashboard/feedback/{$report->uuid}/screenshot")->assertNotFound();
        $this->actingAs($this->creator)->get("/dashboard/feedback/{$report->id}/screenshot")->assertNotFound(); // numeric id
    }

    public function test_admin_sees_open_reports_and_replies_which_the_creator_then_sees(): void
    {
        $this->report($this->creator)->assertSessionHasNoErrors();
        $report = FeedbackReport::firstOrFail();
        $admin = $this->admin();

        $this->actingAs($admin, 'admin')->get('/admin/feedback')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Feedback/Index')
            ->where('openCount', 1)
            ->where('items.data.0.uuid', $report->uuid)
            ->where('items.data.0.creator.uuid', $this->creator->uuid)
        );

        $this->actingAs($admin, 'admin')->put("/admin/feedback/{$report->uuid}", ['status' => 'resolved', 'admin_note' => 'Fixed — please refresh.'])->assertSessionHasNoErrors();
        $this->actingAs($admin, 'admin')->put("/admin/feedback/{$report->uuid}", ['status' => 'bogus'])->assertSessionHasErrors('status');

        $this->assertSame('resolved', $report->fresh()->status);

        $this->app['auth']->shouldUse('web');
        $this->actingAs($this->creator)->get('/dashboard/feedback')->assertInertia(fn (Assert $page) => $page
            ->where('reports.0.status', 'resolved')
            ->where('reports.0.admin_note', 'Fixed — please refresh.')
        );
    }

    public function test_creators_cannot_reach_the_admin_feedback_pages(): void
    {
        $this->report($this->creator);
        $report = FeedbackReport::firstOrFail();

        $this->actingAs($this->creator)->get('/admin/feedback')->assertRedirect();
        $this->actingAs($this->creator)->put("/admin/feedback/{$report->uuid}", ['status' => 'closed'])->assertRedirect();
        $this->assertSame('open', $report->fresh()->status);
    }
}
