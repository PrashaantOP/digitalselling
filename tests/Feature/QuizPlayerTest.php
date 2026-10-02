<?php

namespace Tests\Feature;

use App\Models\Buyer;
use App\Models\CourseLesson;
use App\Models\CourseModule;
use App\Models\Enrollment;
use App\Models\Product;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizQuestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Feature\Concerns\SellsProducts;
use Tests\TestCase;

/** Lesson player ka quiz: result refresh ke baad bhi rehta hai, sirf Reset se hat-ta hai. */
class QuizPlayerTest extends TestCase
{
    use RefreshDatabase, SellsProducts;

    private Product $course;

    private CourseLesson $lesson;

    private Quiz $quiz;

    private QuizQuestion $single;

    private QuizQuestion $multi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeGateways();

        $this->course = $this->product($this->seller(), 'course');
        $module = CourseModule::create(['course_id' => $this->course->courseDetail->id, 'title' => 'Module 1', 'sort_order' => 1]);
        $this->lesson = CourseLesson::create(['module_id' => $module->id, 'title' => 'Check yourself', 'type' => 'quiz', 'is_published' => true, 'sort_order' => 1]);
        $this->quiz = Quiz::create(['lesson_id' => $this->lesson->id, 'title' => 'Basics']);

        $this->single = $this->question('Capital of India?', 'single_choice', ['Delhi' => true, 'Mumbai' => false, 'Pune' => false]);
        $this->multi = $this->question('Which are primary colours?', 'multiple_choice', ['Red' => true, 'Blue' => true, 'Grey' => false]);

        $this->buy($this->course);
    }

    private function question(string $text, string $type, array $options): QuizQuestion
    {
        $question = QuizQuestion::create(['quiz_id' => $this->quiz->id, 'question_text' => $text, 'type' => $type, 'sort_order' => QuizQuestion::count() + 1]);

        $i = 0;
        foreach ($options as $label => $correct) {
            $question->options()->create(['option_text' => $label, 'is_correct' => $correct, 'sort_order' => ++$i]);
        }

        return $question->load('options');
    }

    private function option(QuizQuestion $question, string $label): int
    {
        return $question->options->firstWhere('option_text', $label)->id;
    }

    private function attempt(array $answers)
    {
        return $this->asBuyer()->postJson("/me/quiz/{$this->quiz->uuid}/attempt", ['answers' => $answers]);
    }

    private function allRight(): array
    {
        return [
            $this->single->id => [$this->option($this->single, 'Delhi')],
            $this->multi->id => [$this->option($this->multi, 'Red'), $this->option($this->multi, 'Blue')],
        ];
    }

    private function player()
    {
        return $this->asBuyer()->get('/me/courses/' . Enrollment::firstOrFail()->uuid . "/learn/{$this->lesson->uuid}")->assertOk();
    }

    public function test_right_answers_are_not_sent_before_the_quiz_is_submitted(): void
    {
        $response = $this->player()->assertInertia(fn (Assert $page) => $page
            ->has('lesson.content.questions', 2)
            ->where('lesson.extra.last_attempt', null)
            ->missing('lesson.content.questions.0.options.0.is_correct')
        );

        $this->assertStringNotContainsString('is_correct', $response->getContent());
    }

    public function test_submitting_scores_the_quiz_and_returns_what_was_chosen_and_what_is_right(): void
    {
        $answers = $this->allRight();
        $answers[$this->multi->id] = [$this->option($this->multi, 'Red')]; // adha sahi = galat

        $this->attempt($answers)->assertCreated()
            ->assertJsonPath('result.total_questions', 2)
            ->assertJsonPath('result.correct_answers', 1)
            ->assertJsonPath('result.score', 50)
            ->assertJsonPath('result.review.0.is_correct', true)
            ->assertJsonPath('result.review.1.is_correct', false)
            ->assertJsonPath('result.review.1.selected', [$this->option($this->multi, 'Red')])
            ->assertJsonPath('result.review.1.correct', [$this->option($this->multi, 'Red'), $this->option($this->multi, 'Blue')]);
    }

    public function test_the_result_survives_a_refresh(): void
    {
        $this->attempt($this->allRight())->assertCreated();

        foreach (range(1, 2) as $refresh) {
            $this->player()->assertInertia(fn (Assert $page) => $page
                ->where('lesson.extra.last_attempt.correct_answers', 2)
                ->where('lesson.extra.last_attempt.score', 100)
                ->where('lesson.extra.last_attempt.review.0.selected', [$this->option($this->single, 'Delhi')])
                ->where('lesson.extra.last_attempt.review.0.is_correct', true)
            );
        }
    }

    public function test_only_reset_clears_the_result_and_it_keeps_the_history_and_progress(): void
    {
        $this->attempt($this->allRight())->assertCreated();
        $this->asBuyer()->postJson("/me/lessons/{$this->lesson->uuid}/complete")->assertOk();

        $this->asBuyer()->postJson("/me/quiz/{$this->quiz->uuid}/reset")->assertOk()->assertJson(['reset' => true]);

        $this->player()->assertInertia(fn (Assert $page) => $page
            ->where('lesson.extra.last_attempt', null)
            ->where('completedLessonIds', [$this->lesson->id]) // lesson ka progress wahi
        );

        // attempt delete nahi hua — creator ki history ke liye
        $this->assertSame(1, QuizAttempt::count());
        $this->assertNotNull(QuizAttempt::firstOrFail()->cleared_at);

        // reset ke baad naya attempt hi dikhta hai
        $this->attempt([$this->single->id => [$this->option($this->single, 'Pune')], $this->multi->id => [$this->option($this->multi, 'Grey')]])->assertCreated();
        $this->player()->assertInertia(fn (Assert $page) => $page->where('lesson.extra.last_attempt.correct_answers', 0));
        $this->assertSame(1, QuizAttempt::whereNull('cleared_at')->count());
    }

    public function test_every_question_must_be_answered(): void
    {
        $this->attempt([$this->single->id => [$this->option($this->single, 'Delhi')]])->assertUnprocessable()->assertJsonValidationErrors('answers');
        // doosre sawaal ka option is sawaal ka jawab nahi hota
        $this->attempt([$this->single->id => [$this->option($this->single, 'Delhi')], $this->multi->id => [$this->option($this->single, 'Mumbai')]])->assertUnprocessable();

        $this->assertSame(0, QuizAttempt::count());
    }

    public function test_a_single_choice_question_takes_one_answer_only(): void
    {
        $answers = $this->allRight();
        // do jawab bheje to bhi sirf ek gina jaata hai
        $answers[$this->single->id] = [$this->option($this->single, 'Mumbai'), $this->option($this->single, 'Pune')];

        $this->attempt($answers)->assertCreated()
            ->assertJsonPath('result.review.0.is_correct', false)
            ->assertJsonPath('result.review.0.selected', [$this->option($this->single, 'Mumbai')]);
    }

    public function test_another_buyer_cannot_attempt_or_reset_this_quiz(): void
    {
        $this->attempt($this->allRight())->assertCreated();
        $this->buy($this->product($this->seller('elsewhere'), 'payment_page'), ['email' => 'meera@test.com', 'phone' => '9820144321']);

        $meera = fn () => $this->actingAs(Buyer::where('email', 'meera@test.com')->firstOrFail(), 'customer');

        $meera()->postJson("/me/quiz/{$this->quiz->uuid}/attempt", ['answers' => $this->allRight()])->assertNotFound();
        $meera()->postJson("/me/quiz/{$this->quiz->uuid}/reset")->assertNotFound();
        $meera()->postJson("/me/quiz/{$this->quiz->id}/reset")->assertNotFound(); // numeric id

        $this->assertSame(1, QuizAttempt::whereNull('cleared_at')->count());
    }
}
