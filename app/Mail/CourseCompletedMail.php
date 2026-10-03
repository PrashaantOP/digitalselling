<?php

namespace App\Mail;

use App\Models\Enrollment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Creator ko — kisi student ne course poora kiya. "Course completion" notification band ho to bheja hi nahi jaata. */
class CourseCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Enrollment $enrollment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "{$this->student()} completed " . ($this->enrollment->course?->product?->title ?? 'your course'));
    }

    public function content(): Content
    {
        $e = $this->enrollment;

        return new Content(markdown: 'mail.course-completed', with: [
            'name' => $e->course?->product?->creator?->name ?: 'there',
            'student' => $this->student(),
            'title' => $e->course?->product?->title ?? 'your course',
            'certificate' => (bool) $e->course?->certificate_enabled,
            'url' => url("/dashboard/enrollments/{$e->uuid}"),
        ]);
    }

    private function student(): string
    {
        return $this->enrollment->customer?->buyer?->name ?: ($this->enrollment->customer?->name ?: 'A student');
    }
}
