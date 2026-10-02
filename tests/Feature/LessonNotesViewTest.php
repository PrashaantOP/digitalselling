<?php

namespace Tests\Feature;

use App\Models\Buyer;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\Enrollment;
use App\Models\LessonNote;
use App\Models\LessonNoteFile;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Notes lesson: PDF / txt player ke andar padhe jaate hain; download sirf creator ke allow karne par. */
class LessonNotesViewTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private Product $course;

    private CourseLesson $lesson;

    private LessonNote $note;

    private LessonNoteFile $pdf;

    private LessonNoteFile $slides;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();
        Storage::fake('local');

        $this->course = $this->product($this->seller(), 'course');
        $module = CourseModule::create(['course_id' => $this->course->courseDetail->id, 'title' => 'Module 1', 'sort_order' => 1]);
        $this->lesson = CourseLesson::create(['module_id' => $module->id, 'title' => 'Cheat sheet', 'type' => 'notes_pdf', 'is_published' => true, 'sort_order' => 1]);
        $this->note = LessonNote::create(['lesson_id' => $this->lesson->id, 'description' => 'Read this', 'allow_download' => false]);

        $this->pdf = $this->file('notes/sheet.pdf', 'sheet.pdf', 1);
        $this->slides = $this->file('notes/deck.pptx', 'deck.pptx', 2);

        $this->buy($this->course);
    }

    private function file(string $path, string $name, int $order): LessonNoteFile
    {
        Storage::disk('local')->put($path, '%PDF-1.4 sample');

        return LessonNoteFile::create(['lesson_note_id' => $this->note->id, 'file_path' => $path, 'original_name' => $name, 'sort_order' => $order]);
    }

    private function player()
    {
        return $this->asBuyer()->get('/me/courses/' . Enrollment::firstOrFail()->uuid . "/learn/{$this->lesson->uuid}")->assertOk();
    }

    public function test_with_downloads_off_a_pdf_can_be_read_in_the_player_but_not_downloaded(): void
    {
        $this->player()->assertInertia(fn (Assert $page) => $page
            ->has('lesson.content.files', 2)
            ->where('lesson.content.files.0.kind', 'pdf')
            ->where('lesson.content.files.0.view_url', url("/me/lesson-files/{$this->pdf->uuid}/view"))
            ->where('lesson.content.files.0.download_url', null)
            // pptx browser me nahi dikh sakta — na padhne ka link, na download ka
            ->where('lesson.content.files.1.kind', null)
            ->where('lesson.content.files.1.view_url', null)
            ->where('lesson.content.files.1.download_url', null)
            ->missing('lesson.content.files.0.file_path')
        );

        $view = $this->asBuyer()->get("/me/lesson-files/{$this->pdf->uuid}/view")->assertOk();
        $this->assertSame('application/pdf', $view->headers->get('Content-Type'));
        $this->assertStringStartsWith('inline', (string) $view->headers->get('Content-Disposition'));

        $this->asBuyer()->get("/me/lesson-files/{$this->pdf->uuid}")->assertForbidden();
        // band download ka chor darwaza nahi: jo file dikh nahi sakti wo view route se bhi nahi milti
        $this->asBuyer()->get("/me/lesson-files/{$this->slides->uuid}/view")->assertNotFound();
        $this->asBuyer()->get("/me/lesson-files/{$this->slides->uuid}")->assertForbidden();
    }

    public function test_with_downloads_on_every_file_can_be_downloaded_and_the_pdf_still_opens_in_app(): void
    {
        $this->note->update(['allow_download' => true]);

        $this->player()->assertInertia(fn (Assert $page) => $page
            ->where('lesson.content.files.0.view_url', url("/me/lesson-files/{$this->pdf->uuid}/view"))
            ->where('lesson.content.files.0.download_url', url("/me/lesson-files/{$this->pdf->uuid}"))
            ->where('lesson.content.files.1.view_url', null)
            ->where('lesson.content.files.1.download_url', url("/me/lesson-files/{$this->slides->uuid}"))
        );

        $this->asBuyer()->get("/me/lesson-files/{$this->slides->uuid}")->assertOk()->assertDownload('deck.pptx');
    }

    public function test_text_files_open_as_plain_text(): void
    {
        Storage::disk('local')->put('notes/readme.txt', '<script>alert(1)</script> hello');
        $txt = LessonNoteFile::create(['lesson_note_id' => $this->note->id, 'file_path' => 'notes/readme.txt', 'original_name' => 'readme.txt', 'sort_order' => 3]);

        $view = $this->asBuyer()->get("/me/lesson-files/{$txt->uuid}/view")->assertOk();
        $this->assertStringStartsWith('text/plain', (string) $view->headers->get('Content-Type')); // kabhi HTML ki tarah nahi chalta
        $this->assertSame('nosniff', $view->headers->get('X-Content-Type-Options'));
    }

    public function test_only_an_enrolled_buyer_can_read_and_never_by_numeric_id_or_when_unpublished(): void
    {
        $url = "/me/lesson-files/{$this->pdf->uuid}/view";

        $this->get($url)->assertRedirect(); // login nahi

        $this->buy($this->product($this->seller('elsewhere'), 'payment_page'), ['email' => 'meera@test.com', 'phone' => '9820144321']);
        $this->actingAs(Buyer::where('email', 'meera@test.com')->firstOrFail(), 'customer')->get($url)->assertNotFound();

        $this->asBuyer()->get("/me/lesson-files/{$this->pdf->id}/view")->assertNotFound();

        $this->lesson->update(['is_published' => false]);
        $this->asBuyer()->get($url)->assertNotFound();
    }
}
