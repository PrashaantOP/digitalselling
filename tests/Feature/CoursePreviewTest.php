<?php

namespace Tests\Feature;

use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\LessonNote;
use App\Models\LessonNoteFile;
use App\Models\LessonTextContent;
use App\Models\LessonVideo;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Course ka free preview: creator ke chune hue lessons bina kharide khulte hain, baaki nahi. */
class CoursePreviewTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private Product $course;

    private CourseModule $module;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();

        $this->course = $this->product($this->seller(), 'course', ['slug' => 'design-basics']);
        $this->module = CourseModule::create(['course_id' => $this->course->courseDetail->id, 'title' => 'Module 1', 'sort_order' => 1]);
    }

    private function lesson(string $type, bool $free, array $attrs = []): CourseLesson
    {
        return CourseLesson::create($attrs + [
            'module_id' => $this->module->id, 'title' => ucfirst($type) . ' lesson', 'type' => $type,
            'is_published' => true, 'is_free_preview' => $free, 'sort_order' => CourseLesson::count() + 1,
        ]);
    }

    public function test_course_page_exposes_uuids_only_for_free_preview_lessons(): void
    {
        $free = $this->lesson('video', true);
        $this->lesson('video', false);

        $this->get('/c/design-basics')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('product.course.modules.0.lessons.0.uuid', $free->uuid)
            ->where('product.course.modules.0.lessons.0.is_free_preview', true)
            ->where('product.course.modules.0.lessons.1.uuid', null) // locked lesson ka uuid bahar nahi jaata
        );
    }

    public function test_free_preview_video_and_text_open_without_buying(): void
    {
        $video = $this->lesson('video', true);
        LessonVideo::create(['lesson_id' => $video->id, 'video_url' => 'https://youtu.be/dQw4w9WgXcQ', 'video_source' => 'youtube', 'notes' => 'Watch this first']);
        $text = $this->lesson('text_image', true);
        LessonTextContent::create(['lesson_id' => $text->id, 'content' => '<p>Tokens explained</p>']);

        $this->getJson("/c/design-basics/preview/{$video->uuid}")->assertOk()
            ->assertJsonPath('lesson.type', 'video')
            ->assertJsonPath('lesson.content.video_url', 'https://youtu.be/dQw4w9WgXcQ')
            ->assertJsonPath('lesson.content.notes', 'Watch this first');

        $this->getJson("/c/design-basics/preview/{$text->uuid}")->assertOk()->assertJsonPath('lesson.content.content', '<p>Tokens explained</p>');
    }

    public function test_locked_draft_and_foreign_lessons_never_open(): void
    {
        $locked = $this->lesson('video', false);
        LessonVideo::create(['lesson_id' => $locked->id, 'video_url' => 'https://youtu.be/secret', 'video_source' => 'youtube']);
        $unpublished = $this->lesson('video', true, ['is_published' => false]);

        $this->getJson("/c/design-basics/preview/{$locked->uuid}")->assertNotFound();
        $this->getJson("/c/design-basics/preview/{$unpublished->uuid}")->assertNotFound();
        $this->getJson("/c/design-basics/preview/{$locked->id}")->assertNotFound(); // numeric id

        // doosre course ka free lesson is course ke URL se nahi khulta
        $other = $this->product($this->seller('other'), 'course', ['slug' => 'other-course']);
        $otherModule = CourseModule::create(['course_id' => $other->courseDetail->id, 'title' => 'M', 'sort_order' => 1]);
        $foreign = CourseLesson::create(['module_id' => $otherModule->id, 'title' => 'Foreign', 'type' => 'video', 'is_published' => true, 'is_free_preview' => true, 'sort_order' => 1]);
        $this->getJson("/c/design-basics/preview/{$foreign->uuid}")->assertNotFound();

        // course unpublish → preview bhi band
        $free = $this->lesson('video', true);
        $this->course->update(['status' => 'unpublished']);
        $this->getJson("/c/design-basics/preview/{$free->uuid}")->assertNotFound();
    }

    public function test_quiz_and_assignment_previews_carry_no_content(): void
    {
        $quiz = $this->lesson('quiz', true);

        $this->getJson("/c/design-basics/preview/{$quiz->uuid}")->assertOk()->assertJsonPath('lesson.type', 'quiz')->assertJsonPath('lesson.content', null);
    }

    public function test_preview_notes_files_download_only_when_the_creator_allows_it(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('notes/cheatsheet.pdf', 'pdf');

        $lesson = $this->lesson('notes_pdf', true);
        $note = LessonNote::create(['lesson_id' => $lesson->id, 'description' => 'Cheat sheet', 'allow_download' => true]);
        $file = LessonNoteFile::create(['lesson_note_id' => $note->id, 'file_path' => 'notes/cheatsheet.pdf', 'original_name' => 'cheatsheet.pdf']);

        $url = "/c/design-basics/preview/{$lesson->uuid}/files/{$file->uuid}";
        $this->getJson("/c/design-basics/preview/{$lesson->uuid}")->assertOk()
            ->assertJsonPath('lesson.content.files.0.name', 'cheatsheet.pdf')
            ->assertJsonPath('lesson.content.files.0.url', url($url));
        $this->get($url)->assertOk()->assertDownload('cheatsheet.pdf');

        $note->update(['allow_download' => false]);
        $this->getJson("/c/design-basics/preview/{$lesson->uuid}")->assertJsonPath('lesson.content.files', []);
        $this->get($url)->assertNotFound();

        // locked lesson ki file preview route se kabhi nahi
        $note->update(['allow_download' => true]);
        $lesson->update(['is_free_preview' => false]);
        $this->get($url)->assertNotFound();
    }
}
