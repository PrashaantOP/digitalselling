import { GHOST, PRIMARY } from '@/components/customer/code-input';
import { VideoEmbed } from '@/components/public/video-embed';
import CustomerLayout from '@/layouts/customer-layout';
import { firstError, postJson, xsrf } from '@/lib/razorpay';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ClipboardCheck, Download, FileText, Headphones, ListChecks, Loader2, Menu, Video, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

type LessonType = 'video' | 'text_image' | 'audio' | 'notes_pdf' | 'assignment' | 'quiz';

interface LessonLink {
    id: number;
    uuid: string;
    title: string;
    type: LessonType;
}

interface QuizQuestion {
    id: number;
    question_text: string;
    question_image_path: string | null;
    type: string;
    options: { id: number; option_text: string | null; option_image_path: string | null }[];
}

interface Lesson extends LessonLink {
    // shape lesson.type pe depend karta hai (LessonPlayerController::lessonPayload)
    content: Record<string, unknown> | null;
    extra: {
        submission?: { submission_text: string | null; status: string; grade_feedback: string | null; submitted_at: string } | null;
        last_attempt?: { score: string | number; total_questions: number; correct_answers: number } | null;
    };
}

interface Props {
    enrollment: { uuid: string; progress_percent: number; completed_at: string | null; course: { title: string; slug: string }; certificate_uuid: string | null };
    modules: { id: number; title: string; lessons: LessonLink[] }[];
    completedLessonIds: number[];
    lesson: Lesson | null;
}

const ICON: Record<LessonType, LucideIcon> = { video: Video, text_image: BookOpen, audio: Headphones, notes_pdf: FileText, assignment: ClipboardCheck, quiz: ListChecks };

const asset = (path: unknown) => (typeof path === 'string' && path ? `/assets/${path}` : '');
const PROSE = 'text-[15px] leading-relaxed text-[#14141B] [&_a]:text-[#4F46E5] [&_a]:underline [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-bold [&_img]:my-3 [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc';

export default function LessonPlayer({ enrollment, modules, completedLessonIds, lesson }: Props) {
    const [completed, setCompleted] = useState<number[]>(completedLessonIds);
    const [progress, setProgress] = useState(enrollment.progress_percent);
    const [certificate, setCertificate] = useState(enrollment.certificate_uuid);
    const [marking, setMarking] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setCompleted(completedLessonIds);
        setMenuOpen(false);
    }, [completedLessonIds, lesson?.uuid]);

    const lessons = modules.flatMap((m) => m.lessons);
    const index = lesson ? lessons.findIndex((l) => l.uuid === lesson.uuid) : -1;
    const previous = index > 0 ? lessons[index - 1] : null;
    const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
    const href = (l: LessonLink) => `/me/courses/${enrollment.uuid}/learn/${l.uuid}`;
    const isDone = lesson ? completed.includes(lesson.id) : false;

    async function markComplete(thenNext = true) {
        if (!lesson || marking) return;
        setMarking(true);

        try {
            const res = await postJson(`/me/lessons/${lesson.uuid}/complete`, {});
            if (res.ok) {
                const data = await res.json();
                setCompleted((ids) => (ids.includes(lesson.id) ? ids : [...ids, lesson.id]));
                setProgress(data.progress_percent);
                setCertificate(data.certificate_uuid);
                if (thenNext && next) router.visit(href(next));
            }
        } finally {
            setMarking(false);
        }
    }

    const outline = (
        <nav aria-label="Course content" className="flex flex-col gap-4">
            {modules.map((module) => (
                <div key={module.id}>
                    <p className="px-2 text-[11px] font-bold tracking-wider text-[#8A8A96] uppercase">{module.title}</p>
                    <div className="mt-1.5 flex flex-col gap-0.5">
                        {module.lessons.map((item) => {
                            const Icon = ICON[item.type] ?? BookOpen;
                            const active = item.uuid === lesson?.uuid;
                            const done = completed.includes(item.id);

                            return (
                                <Link
                                    key={item.uuid}
                                    href={href(item)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition', active ? 'bg-[#EEF0FF] font-semibold text-[#4F46E5]' : 'text-[#4B4B57] hover:bg-[#F6F5F2]')}
                                >
                                    {done ? <CheckCircle2 className="size-4 shrink-0 text-[#059669]" /> : <Icon className="size-4 shrink-0 opacity-60" />}
                                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );

    return (
        <CustomerLayout title={lesson?.title ?? enrollment.course.title} wide>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <Link href="/me/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A8A96] hover:text-[#14141B]">
                        <ArrowLeft className="size-3.5" /> My courses
                    </Link>
                    <h1 className="truncate text-lg font-bold tracking-tight">{enrollment.course.title}</h1>
                </div>
                <button type="button" onClick={() => setMenuOpen(true)} className={cn(GHOST, 'shrink-0 lg:hidden')}>
                    <Menu className="size-4" /> Lessons
                </button>
            </div>

            <div className="rounded-xl bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#4B4B57]">
                        {completed.length} of {lessons.length} lessons · {progress}%
                    </span>
                    {certificate && (
                        <a href={`/me/certificates/${certificate}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#B46E00] hover:underline">
                            <Award className="size-3.5" /> View certificate
                        </a>
                    )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0EFEA]">
                    <span className="block h-full rounded-full bg-[#4F46E5] transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="hidden rounded-xl bg-white p-3 shadow-sm lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto">{outline}</aside>

                <article className="min-w-0 rounded-xl bg-white p-5 shadow-sm sm:p-7">
                    {!lesson ? (
                        <p className="py-10 text-center text-sm text-[#8A8A96]">This course has no lessons yet. Check back soon.</p>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold tracking-tight">{lesson.title}</h2>
                            <div className="mt-5">
                                <LessonBody lesson={lesson} onPassed={() => void markComplete(false)} />
                            </div>

                            <div className="mt-8 flex flex-col gap-3 border-t border-[#E4E2DA] pt-5 sm:flex-row sm:items-center sm:justify-between">
                                {previous ? (
                                    <Link href={href(previous)} className={GHOST}>
                                        <ArrowLeft className="size-4" /> Previous
                                    </Link>
                                ) : (
                                    <span />
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    {isDone ? (
                                        <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E6F6EC] px-3.5 text-sm font-semibold text-[#059669]">
                                            <Check className="size-4" /> Completed
                                        </span>
                                    ) : (
                                        <button type="button" onClick={() => void markComplete()} disabled={marking} className={cn(PRIMARY, 'h-9 w-auto rounded-lg')}>
                                            {marking && <Loader2 className="size-4 animate-spin" />} Mark complete{next ? ' & continue' : ''}
                                        </button>
                                    )}
                                    {isDone && next && (
                                        <Link href={href(next)} className={cn(PRIMARY, 'h-9 w-auto rounded-lg')}>
                                            Next lesson <ArrowRight className="size-4" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </article>
            </div>

            {/* phone: lessons ki list drawer me */}
            {menuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-[#14141B]/40" onClick={() => setMenuOpen(false)} />
                    <div role="dialog" aria-modal="true" aria-label="Lessons" className="absolute inset-y-0 right-0 flex w-[min(340px,88vw)] flex-col bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[#E4E2DA] p-4">
                            <p className="text-sm font-bold">Lessons</p>
                            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close" className="rounded-lg p-1 text-[#8A8A96] hover:bg-[#F6F5F2]">
                                <X className="size-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">{outline}</div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    );
}

function LessonBody({ lesson, onPassed }: { lesson: Lesson; onPassed: () => void }) {
    const content = lesson.content;

    if (!content) {
        return <p className="text-sm text-[#8A8A96]">This lesson has no content yet.</p>;
    }

    const notes = typeof content.notes === 'string' && content.notes.trim() ? <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-line text-[#4B4B57]">{content.notes}</p> : null;

    switch (lesson.type) {
        case 'video':
            return (
                <>
                    <VideoEmbed url={content.video_url as string} />
                    {notes}
                </>
            );

        case 'text_image':
            return (
                <>
                    {/* content server pe sanitize hota hai (App\Support\Html) */}
                    <div className={PROSE} dangerouslySetInnerHTML={{ __html: (content.content as string) ?? '' }} />
                    {((content.images as string[]) ?? []).map((path) => (
                        <img key={path} src={asset(path)} alt="" loading="lazy" className="mt-4 w-full rounded-xl border border-[#E4E2DA]" />
                    ))}
                </>
            );

        case 'audio':
            return (
                <>
                    <audio controls preload="metadata" src={(content.audio_url as string) || asset(content.audio_path)} className="w-full" />
                    {notes}
                </>
            );

        case 'notes_pdf': {
            const files = (content.files as { name: string | null; url: string }[]) ?? [];

            return (
                <>
                    {typeof content.description === 'string' && content.description && <p className="text-[15px] leading-relaxed whitespace-pre-line text-[#4B4B57]">{content.description}</p>}
                    <div className="mt-4 flex flex-col gap-2">
                        {files.map((file) => (
                            <a key={file.url} href={file.url} className="flex items-center justify-between gap-3 rounded-lg border border-[#E4E2DA] p-3 text-sm transition hover:bg-[#F6F5F2]">
                                <span className="flex min-w-0 items-center gap-2.5 font-medium">
                                    <FileText className="size-4 shrink-0 text-[#4F46E5]" /> <span className="truncate">{file.name ?? 'Download'}</span>
                                </span>
                                <Download className="size-4 shrink-0 text-[#8A8A96]" />
                            </a>
                        ))}
                        {files.length === 0 && <p className="text-sm text-[#8A8A96]">{content.allow_download ? 'No files added yet.' : 'Downloads are turned off for these notes.'}</p>}
                    </div>
                </>
            );
        }

        case 'assignment':
            return <Assignment lesson={lesson} />;

        case 'quiz':
            return <Quiz lesson={lesson} onPassed={onPassed} />;

        default:
            return null;
    }
}

function Assignment({ lesson }: { lesson: Lesson }) {
    const content = lesson.content as { uuid: string; assignment_prompt: string | null; allow_file_upload: boolean };
    const previous = lesson.extra.submission;
    const [text, setText] = useState(previous?.submission_text ?? '');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(Boolean(previous));

    async function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);

        const body = new FormData();
        body.append('submission_text', text);
        if (file) body.append('file', file);

        try {
            const res = await fetch(`/me/assignments/${content.uuid}/submit`, { method: 'POST', headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf() }, body });
            const data = await res.json().catch(() => null);

            if (res.ok) {
                setSubmitted(true);
                setFile(null);
            } else {
                setError(firstError(data, 'Could not submit. Please try again.'));
            }
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            {content.assignment_prompt && <p className="text-[15px] leading-relaxed whitespace-pre-line text-[#14141B]">{content.assignment_prompt}</p>}

            {previous?.grade_feedback && (
                <div className="mt-4 rounded-xl bg-[#EEF0FF] p-4 text-sm">
                    <p className="font-semibold text-[#4338CA]">Feedback from your instructor</p>
                    <p className="mt-1 whitespace-pre-line text-[#14141B]">{previous.grade_feedback}</p>
                </div>
            )}

            <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
                <label htmlFor="assignment-answer" className="text-sm font-semibold">
                    Your answer
                </label>
                <textarea
                    id="assignment-answer"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    maxLength={20000}
                    className="w-full rounded-lg border border-[#DAD8D0] bg-white p-3 text-sm outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                />
                {content.allow_file_upload && <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-[#4B4B57] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F0EFEA] file:px-3 file:py-2 file:text-sm file:font-semibold" />}
                {error && (
                    <p role="alert" className="text-xs font-medium text-[#C2410C]">
                        {error}
                    </p>
                )}
                {submitted && !error && <p className="text-xs font-semibold text-[#059669]">Submitted. You can submit again to replace it.</p>}
                <button type="submit" disabled={busy} className={cn(PRIMARY, 'w-fit')}>
                    {busy && <Loader2 className="size-4 animate-spin" />} {submitted ? 'Submit again' : 'Submit assignment'}
                </button>
            </form>
        </>
    );
}

function Quiz({ lesson, onPassed }: { lesson: Lesson; onPassed: () => void }) {
    const content = lesson.content as { uuid: string; title: string | null; questions: QuizQuestion[] };
    const [answers, setAnswers] = useState<Record<number, number[]>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(
        lesson.extra.last_attempt ? { score: Number(lesson.extra.last_attempt.score), correct: lesson.extra.last_attempt.correct_answers, total: lesson.extra.last_attempt.total_questions } : null,
    );
    // submit ke baad hi server sahi jawab bhejta hai
    const [review, setReview] = useState<Record<number, { correct: number[]; is_correct: boolean }>>({});

    const multiple = (q: QuizQuestion) => /multi/i.test(q.type);

    function toggle(q: QuizQuestion, optionId: number) {
        setAnswers((all) => {
            const current = all[q.id] ?? [];
            if (!multiple(q)) return { ...all, [q.id]: [optionId] };

            return { ...all, [q.id]: current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId] };
        });
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);

        try {
            const res = await postJson(`/me/quiz/${content.uuid}/attempt`, { answers });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setError(firstError(data, 'Could not submit the quiz. Answer at least one question.'));
                return;
            }

            setResult({ score: Number(data.attempt.score), correct: data.attempt.correct_answers, total: data.attempt.total_questions });
            setReview(Object.fromEntries((data.review as { question_id: number; correct: number[]; is_correct: boolean }[]).map((r) => [r.question_id, r])));
            onPassed();
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-5">
            {result && (
                <div className="rounded-xl bg-[#EEF0FF] p-4 text-sm">
                    <p className="font-bold text-[#4338CA]">
                        Your score: {result.correct} / {result.total} ({Math.round(result.score)}%)
                    </p>
                    <p className="mt-0.5 text-[#4B4B57]">You can try again as many times as you like.</p>
                </div>
            )}

            {content.questions.map((q, i) => (
                <fieldset key={q.id} className="rounded-xl border border-[#E4E2DA] p-4">
                    <legend className="px-1 text-sm font-semibold">
                        {i + 1}. {q.question_text}
                        {multiple(q) && <span className="ml-1 text-xs font-normal text-[#8A8A96]">(choose all that apply)</span>}
                    </legend>
                    {q.question_image_path && <img src={asset(q.question_image_path)} alt="" className="mt-2 max-h-64 rounded-lg" />}
                    <div className="mt-3 flex flex-col gap-2">
                        {q.options.map((option) => {
                            const checked = (answers[q.id] ?? []).includes(option.id);
                            const reviewed = review[q.id];
                            const isCorrect = reviewed?.correct.includes(option.id);

                            return (
                                <label
                                    key={option.id}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition',
                                        reviewed ? (isCorrect ? 'border-[#059669] bg-[#E6F6EC]' : checked ? 'border-[#C2410C] bg-[#FFEDE8]' : 'border-[#E4E2DA]') : checked ? 'border-[#4F46E5] bg-[#EEF0FF]' : 'border-[#E4E2DA] hover:bg-[#F6F5F2]',
                                    )}
                                >
                                    <input type={multiple(q) ? 'checkbox' : 'radio'} name={`q-${q.id}`} checked={checked} onChange={() => toggle(q, option.id)} className="size-4 shrink-0 accent-[#4F46E5]" />
                                    <span className="min-w-0 flex-1">
                                        {option.option_text}
                                        {option.option_image_path && <img src={asset(option.option_image_path)} alt="" className="mt-2 max-h-40 rounded-lg" />}
                                    </span>
                                    {reviewed && isCorrect && <Check className="size-4 shrink-0 text-[#059669]" />}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
            ))}

            {error && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                    {error}
                </p>
            )}

            <button type="submit" disabled={busy || Object.keys(answers).length === 0} className={cn(PRIMARY, 'w-fit')}>
                {busy && <Loader2 className="size-4 animate-spin" />} {result ? 'Submit again' : 'Submit answers'}
            </button>
        </form>
    );
}
