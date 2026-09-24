<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesUploads;
use App\Http\Controllers\Concerns\RespondsFlexibly;
use App\Models\CourseLesson;
use App\Models\LessonAssignment;
use App\Models\LessonAudio;
use App\Models\LessonNote;
use App\Models\LessonNoteFile;
use App\Models\LessonTextContent;
use App\Models\LessonTextImage;
use App\Models\LessonVideo;
use App\Models\Quiz;
use App\Support\Html;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Ek endpoint, 6 lesson types. `$lesson->type` dekh ke sahi detail model update hota hai.
 * Files (images/audio/notes) ke liye request multipart/form-data hona chahiye.
 */
class LessonContentController extends Controller
{
    use RespondsFlexibly, HandlesUploads;

    public function update(Request $request, CourseLesson $lesson)
    {
        DB::transaction(fn() => match ($lesson->type) {
            'video' => $this->video($request, $lesson),
            'text_image' => $this->text($request, $lesson),
            'audio' => $this->audio($request, $lesson),
            'notes_pdf' => $this->notes($request, $lesson),
            'assignment' => $this->assignment($request, $lesson),
            'quiz' => $this->quiz($request, $lesson),
        });

        return $this->done($request, 'Content saved.', [
            'lesson' => $lesson->fresh(['video', 'textContent.images', 'audio', 'notes.files', 'assignment', 'quiz.questions.options']),
        ]);
    }

    private function video(Request $request, CourseLesson $lesson): void
    {
        $data = $request->validate([
            'video_url' => ['required', 'url', 'max:500'],
            'video_source' => ['nullable', Rule::in(['youtube', 'vimeo', 'mp4'])],
            'notes' => ['nullable', 'string', 'max:20000'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
        ]);

        // source auto-detect
        $data['video_source'] ??= match (true) {
            str_contains($data['video_url'], 'youtu') => 'youtube',
            str_contains($data['video_url'], 'vimeo') => 'vimeo',
            str_ends_with(strtolower(parse_url($data['video_url'], PHP_URL_PATH) ?? ''), '.mp4') => 'mp4',
            default => null,
        };

        LessonVideo::updateOrCreate(['lesson_id' => $lesson->id], $data);
    }

    private function text(Request $request, CourseLesson $lesson): void
    {
        $data = $request->validate([
            'content' => ['present', 'nullable', 'string', 'max:500000'],
            'images' => ['sometimes', 'array', 'max:20'],
            'images.*' => ['image', 'max:5120'],
            'remove_image_ids' => ['sometimes', 'array'],
            'remove_image_ids.*' => ['integer'],
        ]);

        $text = LessonTextContent::updateOrCreate(['lesson_id' => $lesson->id], ['content' => Html::sanitize($data['content'] ?? '')]);

        foreach ($text->images()->whereIn('id', $data['remove_image_ids'] ?? [])->get() as $img) {
            $this->deletePublic($img->image_path);
            $img->delete();
        }

        foreach ($request->file('images', []) as $file) {
            LessonTextImage::create([
                'lesson_text_content_id' => $text->id,
                'image_path' => $this->putPublic($file, 'course'),
                'sort_order' => (int) $text->images()->max('sort_order') + 1,
            ]);
        }
    }

    private function audio(Request $request, CourseLesson $lesson): void
    {
        $data = $request->validate([
            'audio_url' => ['nullable', 'url', 'max:500'],
            'audio_file' => ['nullable', 'file', 'mimes:mp3,wav,m4a,aac,ogg', 'max:51200'],
            'notes' => ['nullable', 'string', 'max:20000'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
        ]);

        $audio = LessonAudio::firstOrNew(['lesson_id' => $lesson->id]);

        if ($request->hasFile('audio_file')) {
            $this->deletePublic($audio->audio_path);
            $audio->audio_path = $this->putPublic($request->file('audio_file'), 'course');
            $audio->audio_url = null; // ek time pe ek hi source
        } elseif (! empty($data['audio_url'])) {
            $this->deletePublic($audio->audio_path);
            $audio->audio_path = null;
            $audio->audio_url = $data['audio_url'];
        }

        $audio->notes = $data['notes'] ?? $audio->notes;
        $audio->duration_seconds = $data['duration_seconds'] ?? $audio->duration_seconds;
        $audio->save();
    }

    private function notes(Request $request, CourseLesson $lesson): void
    {
        $data = $request->validate([
            'allow_download' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:20000'],
            'files' => ['sometimes', 'array', 'max:20'],
            'files.*' => ['file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip', 'max:51200'],
            'remove_file_ids' => ['sometimes', 'array'],
            'remove_file_ids.*' => ['integer'],
        ]);

        $note = LessonNote::updateOrCreate(['lesson_id' => $lesson->id], [
            'allow_download' => $data['allow_download'] ?? false,
            'description' => $data['description'] ?? null,
        ]);

        foreach ($note->files()->whereIn('id', $data['remove_file_ids'] ?? [])->get() as $f) {
            $this->deletePrivate($f->file_path);
            $f->delete();
        }

        foreach ($request->file('files', []) as $file) {
            LessonNoteFile::create([
                'lesson_note_id' => $note->id,
                'file_path' => $this->putPrivate($file, 'lessons/notes'),
                'original_name' => $file->getClientOriginalName(),
                'sort_order' => (int) $note->files()->max('sort_order') + 1,
            ]);
        }
    }

    private function assignment(Request $request, CourseLesson $lesson): void
    {
        $data = $request->validate([
            'assignment_prompt' => ['required', 'string', 'max:20000'],
            'allow_file_upload' => ['sometimes', 'boolean'],
        ]);

        LessonAssignment::updateOrCreate(['lesson_id' => $lesson->id], [
            'assignment_prompt' => $data['assignment_prompt'],
            'allow_file_upload' => $data['allow_file_upload'] ?? true,
        ]);
    }

    private function quiz(Request $request, CourseLesson $lesson): void
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:150']]);

        Quiz::updateOrCreate(['lesson_id' => $lesson->id], ['title' => $data['title']]);
        $lesson->update(['title' => $data['title']]);
    }
}
