<?php

namespace Tests\Feature;

use App\Models\Buyer;
use App\Models\Certificate;
use App\Models\CertificateSetting;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\Enrollment;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreAppearance;
use App\Models\User;
use App\Services\CertificateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Course certificates: creator ki branding, snapshot, design templates, radd karna aur public verify. */
class CertificateTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private User $creator;

    private Product $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        Storage::fake('assets');

        $this->creator = $this->seller('guru', ['name' => 'Guru Academy']);
        $store = Store::create(['user_id' => $this->creator->id, 'username' => 'guru', 'display_name' => 'Guru Academy', 'avatar' => 'images/guru/store/avatar.png', 'is_live' => true]);
        StoreAppearance::create(['store_id' => $store->id, 'brand_color' => '#0E7A5C']);

        $this->course = $this->product($this->creator, 'course', ['title' => 'Design Basics'], ['certificate_enabled' => true]);
        $module = CourseModule::create(['course_id' => $this->course->courseDetail->id, 'title' => 'Module 1', 'sort_order' => 1]);
        CourseLesson::create(['module_id' => $module->id, 'title' => 'Only lesson', 'type' => 'text_image', 'is_published' => true, 'sort_order' => 1]);
    }

    /** Kharido, lesson poora karo → certificate. */
    private function earn(): Certificate
    {
        $this->buy($this->course);
        $this->asBuyer()->postJson('/me/lessons/' . CourseLesson::first()->uuid . '/complete')->assertOk()->assertJson(['course_completed' => true]);
        $this->app['auth']->shouldUse('web'); // actingAs(buyer) default guard badal deta hai — dashboard requests ke liye wapas

        return Certificate::firstOrFail();
    }

    private function buyerView(Certificate $certificate)
    {
        return $this->asBuyer()->get("/me/certificates/{$certificate->uuid}");
    }

    // ---------------------------------------------------------------- issue + snapshot

    public function test_finishing_the_course_issues_a_certificate_with_a_snapshot(): void
    {
        $certificate = $this->earn();

        $this->assertMatchesRegularExpression('/^CERT-[A-Z0-9]{10}$/', $certificate->certificate_number);
        $this->assertSame('Rohan Kulkarni', $certificate->student_name);
        $this->assertSame('Design Basics', $certificate->course_title);
        $this->assertSame('Guru Academy', $certificate->creator_name);
        $this->assertNotNull(Enrollment::first()->certificate_issued_at);
    }

    public function test_later_renames_do_not_change_an_issued_certificate(): void
    {
        $certificate = $this->earn();

        Buyer::first()->forceFill(['name' => 'Someone Else'])->save();
        $this->course->update(['title' => 'Renamed Course']);
        $this->creator->forceFill(['name' => 'New Brand'])->save();

        $this->buyerView($certificate)->assertOk()
            ->assertSee('Rohan Kulkarni')->assertSee('Design Basics')->assertSee('Guru Academy')
            ->assertDontSee('Someone Else')->assertDontSee('Renamed Course');
    }

    public function test_no_certificate_when_the_course_has_them_turned_off(): void
    {
        $this->course->courseDetail->update(['certificate_enabled' => false]);

        $this->buy($this->course);
        $this->asBuyer()->postJson('/me/lessons/' . CourseLesson::first()->uuid . '/complete')->assertOk();

        $this->assertSame(0, Certificate::count());
    }

    // ---------------------------------------------------------------- design

    public function test_without_settings_the_store_picture_and_brand_colour_are_used(): void
    {
        $design = app(CertificateService::class)->design($this->creator);

        $this->assertSame('classic', $design['template']);
        $this->assertSame('#0E7A5C', $design['accent']);
        $this->assertStringEndsWith('/assets/images/guru/store/avatar.png', $design['logo']);
        $this->assertSame('Guru Academy', $design['signatory_name']);
        $this->assertSame('Instructor', $design['signatory_title']);
        $this->assertNull($design['signature']);

        $this->buyerView($this->earn())->assertOk()
            ->assertSee('images/guru/store/avatar.png')->assertSee('#0E7A5C')
            ->assertSee('Issued via')->assertSee('/certificates/' . Certificate::first()->certificate_number);
    }

    public function test_every_template_renders_with_the_creators_branding(): void
    {
        $certificate = $this->earn();

        foreach (['classic', 'modern', 'minimal'] as $template) {
            CertificateSetting::updateOrCreate(['user_id' => $this->creator->id], [
                'template' => $template, 'accent_color' => '#B8434F', 'logo_path' => 'images/guru/certificate/logo.png',
                'signature_path' => 'images/guru/certificate/sign.png', 'signatory_name' => 'Asha Rao', 'signatory_title' => 'Founder',
            ]);
            $this->creator->unsetRelation('certificateSetting');

            $this->buyerView($certificate)->assertOk()
                ->assertSee("t-{$template}")
                ->assertSee('#B8434F')
                ->assertSee('images/guru/certificate/logo.png')->assertDontSee('images/guru/store/avatar.png')
                ->assertSee('images/guru/certificate/sign.png')
                ->assertSee('Asha Rao')->assertSee('Founder')
                ->assertSee('Rohan Kulkarni')->assertSee($certificate->certificate_number);
        }
    }

    public function test_design_page_saves_template_colour_signatory_and_images(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/courses/certificate')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Courses/Certificate')
            ->where('settings.template', 'classic')->where('settings.accent_color', null)->where('settings.has_logo', false)
            ->where('resolved.accent', '#0E7A5C')
            ->has('templates', 3)
        );

        $this->actingAs($this->creator)->put('/dashboard/courses/certificate', [
            'template' => 'modern', 'accent_color' => '#b8434f', 'signatory_name' => 'Asha Rao', 'signatory_title' => 'Founder',
            'logo' => UploadedFile::fake()->image('logo.png', 300, 120),
            'signature' => UploadedFile::fake()->image('sign.png', 300, 100),
        ])->assertSessionHasNoErrors();

        $settings = CertificateSetting::where('user_id', $this->creator->id)->firstOrFail();
        $this->assertSame('modern', $settings->template);
        $this->assertSame('#B8434F', $settings->accent_color);
        $this->assertSame('Asha Rao', $settings->signatory_name);
        Storage::disk('assets')->assertExists($settings->logo_path);
        Storage::disk('assets')->assertExists($settings->signature_path);
        $oldLogo = $settings->logo_path;

        // logo hatao, colour wapas store wala
        $this->actingAs($this->creator)->put('/dashboard/courses/certificate', ['template' => 'modern', 'accent_color' => null, 'remove_logo' => true])
            ->assertSessionHasNoErrors();

        $settings->refresh();
        $this->assertNull($settings->logo_path);
        $this->assertNull($settings->accent_color);
        $this->assertNotNull($settings->signature_path); // jo nahi chhua wo bacha
        Storage::disk('assets')->assertMissing($oldLogo);
    }

    public function test_bad_design_input_is_rejected(): void
    {
        $put = fn (array $data) => $this->actingAs($this->creator)->put('/dashboard/courses/certificate', $data + ['template' => 'classic']);

        $put(['template' => 'fancy'])->assertSessionHasErrors('template');
        $put(['accent_color' => 'red; background:url(x)'])->assertSessionHasErrors('accent_color');
        $put(['logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf')])->assertSessionHasErrors('logo');
        $put(['logo' => UploadedFile::fake()->image('big.png')->size(3000)])->assertSessionHasErrors('logo');

        $this->assertSame(0, CertificateSetting::count());
    }

    public function test_preview_shows_unsaved_choices_with_a_sample_student(): void
    {
        $this->actingAs($this->creator)->get('/dashboard/courses/certificate/preview?template=minimal&accent_color=%23123456&signatory_name=Asha')
            ->assertOk()->assertSee('t-minimal')->assertSee('#123456')->assertSee('Asha')->assertSee('SAMPLE')
            ->assertDontSee('Download PDF'); // iframe ke liye — toolbar nahi

        $this->assertSame(0, CertificateSetting::count()); // preview kuch save nahi karta
        $this->actingAs($this->creator)->get('/dashboard/courses/certificate/preview?accent_color=javascript')->assertSessionHasErrors('accent_color');
    }

    public function test_team_member_without_course_permission_cannot_change_the_design(): void
    {
        $member = User::factory()->createOne(['role' => 'sub_admin', 'parent_creator_id' => $this->creator->id, 'username' => 'helper']);

        $this->actingAs($member)->put('/dashboard/courses/certificate', ['template' => 'modern'])->assertForbidden();
    }

    // ---------------------------------------------------------------- creator: view / rename / revoke

    public function test_creator_can_view_rename_revoke_and_restore_a_certificate(): void
    {
        $certificate = $this->earn();
        $enrollment = Enrollment::firstOrFail();
        $base = "/dashboard/enrollments/{$enrollment->uuid}/certificate";

        $this->actingAs($this->creator)->get($base)->assertOk()->assertSee('Rohan Kulkarni');

        $this->actingAs($this->creator)->put($base, ['student_name' => 'Rohan S. Kulkarni'])->assertSessionHasNoErrors();
        $this->assertSame('Rohan S. Kulkarni', $certificate->fresh()->student_name);

        $this->actingAs($this->creator)->post("{$base}/revoke", [])->assertSessionHasErrors('reason');
        $this->actingAs($this->creator)->post("{$base}/revoke", ['reason' => 'Order refunded'])->assertSessionHasNoErrors();
        $this->assertTrue($certificate->fresh()->isRevoked());
        $this->actingAs($this->creator)->get($base)->assertSee('REVOKED');

        $this->actingAs($this->creator)->post("{$base}/restore")->assertSessionHasNoErrors();
        $this->assertFalse($certificate->fresh()->isRevoked());
    }

    public function test_another_creator_cannot_touch_the_certificate(): void
    {
        $this->earn();
        $enrollment = Enrollment::firstOrFail();
        $other = $this->seller('rival');

        $this->actingAs($other)->get("/dashboard/enrollments/{$enrollment->uuid}/certificate")->assertNotFound();
        $this->actingAs($other)->post("/dashboard/enrollments/{$enrollment->uuid}/certificate/revoke", ['reason' => 'x'])->assertNotFound();
        $this->assertFalse(Certificate::first()->isRevoked());
    }

    // ---------------------------------------------------------------- public verify

    public function test_anyone_can_verify_a_certificate_by_its_number(): void
    {
        $certificate = $this->earn();
        $this->app['auth']->forgetGuards();
        Inertia::flushShared(); // test ke andar pichhle /me request ke shared props bache rehte hain (asli request me nahi)

        $response = $this->get("/certificates/{$certificate->certificate_number}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Public/CertificateVerify')
            ->where('result.status', 'valid')
            ->where('result.student_name', 'Rohan Kulkarni')
            ->where('result.course_title', 'Design Basics')
            ->where('result.creator_name', 'Guru Academy')
        );

        // sirf naam/course/creator/date — email, phone kabhi nahi
        $this->assertStringNotContainsString('rohan@test.com', $response->getContent());
        $this->assertStringNotContainsString('9930412847', $response->getContent());

        // chhote akshar me likha number bhi chalta hai
        $this->get('/certificates/' . strtolower($certificate->certificate_number))->assertInertia(fn (Assert $page) => $page->where('result.status', 'valid'));
    }

    public function test_verify_page_reports_revoked_and_unknown_numbers(): void
    {
        $certificate = $this->earn();
        app(CertificateService::class)->revoke($certificate, 'Order refunded');
        $this->app['auth']->forgetGuards();
        Inertia::flushShared(); // test ke andar pichhle /me request ke shared props bache rehte hain (asli request me nahi)

        $response = $this->get("/certificates/{$certificate->certificate_number}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('result.status', 'revoked')->has('result.revoked_at'));
        $this->assertStringNotContainsString('Order refunded', $response->getContent()); // reason sirf creator ke liye

        $this->get('/certificates/CERT-DOESNOTEXIST')->assertOk()->assertInertia(fn (Assert $page) => $page->where('result.status', 'not_found')->missing('result.student_name'));

        // DB id se kuch nahi khulta
        $this->get("/certificates/{$certificate->id}")->assertNotFound();
    }

    public function test_verify_form_redirects_to_a_shareable_link(): void
    {
        $this->get('/certificates')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Public/CertificateVerify')->where('result', null));
        $this->get('/certificates?number=cert-abc1234567')->assertRedirect('/certificates/CERT-ABC1234567');
    }
}
