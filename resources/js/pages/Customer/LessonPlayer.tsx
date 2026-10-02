import { GHOST, PRIMARY } from '@/components/customer/code-input';
import { PdfViewer, TextFileViewer } from '@/components/customer/pdf-viewer';
import { VideoEmbed } from '@/components/public/video-embed';
import CustomerLayout from '@/layouts/customer-layout';
import { firstError, postJson, xsrf } from '@/lib/razorpay';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ClipboardCheck, Download, Eye, FileText, Headphones, ListChecks, Loader2, Menu, RotateCcw, Video, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

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

/** Submit ho chuke attempt ka result — sahi jawab sirf isi me aate hain (QuizAttempt::result) */
interface QuizResult {
    score: number;
    total_questions: number;
    correct_answers: number;
    attempted_at: string;
    review: { question_id: number; selected: number[]; correct: number[]; is_correct: boolean }[];
}

interface Lesson extends LessonLink {
    // shape lesson.type pe depend karta hai (LessonPlayerController::lessonPayload)
    content: Record<string, unknown> | null;
    extra: {
        submission?: { submission_text: string | null; status: string; grade_feedback: string | null; submitted_at: string } | null;
        last_attempt?: QuizResult | null;
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
                                <LessonBody key={lesson.uuid} lesson={lesson} onPassed={() => void markComplete(false)} />
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

        case 'notes_pdf':
            return <Notes content={content as unknown as NotesContent} />;

        case 'assignment':
            return <Assignment lesson={lesson} />;

        case 'quiz':
            return <Quiz lesson={lesson} onPassed={onPassed} />;

        default:
            return null;
    }
}

interface NoteFile {
    uuid: string;
    name: string;
    /** browser me kaise dikhe — null: doc/ppt/xls/zip, in-app nahi dikh sakte */
    kind: 'pdf' | 'text' | null;
    view_url: string | null;
    /** sirf jab creator ne downloads on rakhe hon */
    download_url: string | null;
}

interface NotesContent {
    description: string | null;
    allow_download: boolean;
    files: NoteFile[];
}

/** Notes: PDF / txt yahin page me padhe jaate hain; download ka button sirf jab creator ne allow kiya ho. */
function Notes({ content }: { content: NotesContent }) {
    const files = content.files ?? [];
    // pehli padhne layak file apne aap khuli rahe
    const [openUuid, setOpenUuid] = useState<string | null>(() => files.find((f) => f.view_url)?.uuid ?? null);
    const open = files.find((f) => f.uuid === openUuid && f.view_url) ?? null;

    return (
        <>
            {content.description && <p className="text-[15px] leading-relaxed whitespace-pre-line text-[#4B4B57]">{content.description}</p>}

            <div className="mt-4 flex flex-col gap-2">
                {files.map((file) => {
                    const active = open?.uuid === file.uuid;

                    return (
                        <div key={file.uuid} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3 text-sm', active ? 'border-[#4F46E5] bg-[#EEF0FF]' : 'border-[#E4E2DA]')}>
                            <span className="flex min-w-0 flex-1 basis-40 items-center gap-2.5 font-medium">
                                <FileText className="size-4 shrink-0 text-[#4F46E5]" /> <span className="truncate">{file.name}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                                {file.view_url && (
                                    <button type="button" onClick={() => setOpenUuid(active ? null : file.uuid)} aria-expanded={active} className={cn(GHOST, 'h-8 px-2.5 text-xs')}>
                                        <Eye className="size-3.5" /> {active ? 'Close' : 'Read'}
                                    </button>
                                )}
                                {file.download_url && (
                                    <a href={file.download_url} className={cn(GHOST, 'h-8 px-2.5 text-xs')}>
                                        <Download className="size-3.5" /> Download
                                    </a>
                                )}
                                {!file.view_url && !file.download_url && <span className="text-xs text-[#8A8A96]">Can’t be opened here</span>}
                            </span>
                        </div>
                    );
                })}
                {files.length === 0 && <p className="text-sm text-[#8A8A96]">No files added yet.</p>}
                {files.some((f) => !f.view_url && !f.download_url) && (
                    <p className="text-xs text-[#8A8A96]">Some files can only be read as a PDF and downloads are turned off for these notes. Ask your instructor for a PDF copy.</p>
                )}
            </div>

            {open && <div className="mt-4">{open.kind === 'pdf' ? <PdfViewer url={open.view_url!} title={open.name} /> : <TextFileViewer url={open.view_url!} />}</div>}
        </>
    );
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

/** Submit se pehle ke jawab — refresh pe na udein. Storage band ho (private window) to bas yaad nahi rehta. */
const draftStore = {
    key: (quizUuid: string) => `quiz-draft:${quizUuid}`,
    read(quizUuid: string): Record<number, number[]> {
        try {
            const raw = JSON.parse(window.localStorage.getItem(this.key(quizUuid)) ?? '{}');
            return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        } catch {
            return {};
        }
    },
    write(quizUuid: string, answers: Record<number, number[]>) {
        try {
            if (Object.keys(answers).length === 0) window.localStorage.removeItem(this.key(quizUuid));
            else window.localStorage.setItem(this.key(quizUuid), JSON.stringify(answers));
        } catch {
            // storage nahi hai — koi baat nahi
        }
    },
};

function Quiz({ lesson, onPassed }: { lesson: Lesson; onPassed: () => void }) {
    const content = lesson.content as { uuid: string; title: string | null; questions: QuizQuestion[] };
    const questions = content.questions;

    // result server se aata hai (submit ke baad ya page khulte hi) — sahi jawab sirf usi me hote hain
    const [result, setResult] = useState<QuizResult | null>(lesson.extra.last_attempt ?? null);
    const [answers, setAnswers] = useState<Record<number, number[]>>(() => {
        if (lesson.extra.last_attempt) return {};

        // purane draft me se sirf wahi jo aaj bhi is quiz me hai (creator ne sawaal badle ho sakte hain)
        const draft = draftStore.read(content.uuid);
        const kept: Record<number, number[]> = {};
        for (const q of questions) {
            const ids = (Array.isArray(draft[q.id]) ? draft[q.id] : []).filter((id) => q.options.some((o) => o.id === id));
            if (ids.length > 0) kept[q.id] = ids;
        }

        return kept;
    });
    const [busy, setBusy] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const top = useRef<HTMLDivElement>(null);

    const review = useMemo(() => Object.fromEntries((result?.review ?? []).map((r) => [r.question_id, r])), [result]);
    const multiple = (q: QuizQuestion) => q.type === 'multiple_choice';
    const selectedFor = (q: QuizQuestion) => (result ? (review[q.id]?.selected ?? []) : (answers[q.id] ?? []));

    const answered = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;
    const remaining = questions.length - answered;

    useEffect(() => {
        if (!result) draftStore.write(content.uuid, answers);
    }, [answers, result, content.uuid]);

    function toggle(q: QuizQuestion, optionId: number) {
        setError(null);
        setAnswers((all) => {
            const current = all[q.id] ?? [];
            const next = multiple(q) ? (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]) : [optionId];
            const rest = { ...all };
            if (next.length > 0) rest[q.id] = next;
            else delete rest[q.id];

            return rest;
        });
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (result || busy) return;
        setBusy(true);
        setError(null);

        try {
            const res = await postJson(`/me/quiz/${content.uuid}/attempt`, { answers });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setError(firstError(data, 'Could not submit the quiz. Please try again.'));
                return;
            }

            setResult(data.result as QuizResult);
            setAnswers({});
            draftStore.write(content.uuid, {});
            onPassed();
            top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    /** Quiz sirf yahin se khaali hota hai — refresh se nahi. */
    async function reset() {
        if (resetting) return;
        setError(null);

        // abhi submit nahi hua: sirf chune hue jawab hatane hain, server pe kuch hai hi nahi
        if (!result) {
            setAnswers({});
            return;
        }

        setResetting(true);
        try {
            const res = await postJson(`/me/quiz/${content.uuid}/reset`, {});
            if (!res.ok) {
                setError('Could not reset the quiz. Please try again.');
                return;
            }

            setResult(null);
            setAnswers({});
            top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setResetting(false);
        }
    }

    if (questions.length === 0) {
        return <p className="text-sm text-[#8A8A96]">This quiz has no questions yet. Check back soon.</p>;
    }

    const resetButton = (label: string) => (
        <button type="button" onClick={() => void reset()} disabled={resetting} className={cn(GHOST, 'shrink-0')}>
            {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} {label}
        </button>
    );

    const perfect = result !== null && result.correct_answers === result.total_questions;

    return (
        <form onSubmit={submit} className="flex flex-col gap-5">
            <div ref={top} className="scroll-mt-24">
                {result ? (
                    <div role="status" className={cn('flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between', perfect ? 'bg-[#E6F6EC]' : 'bg-[#EEF0FF]')}>
                        <div className="flex items-center gap-4">
                            <span className={cn('flex size-16 shrink-0 flex-col items-center justify-center rounded-full bg-white text-lg font-bold tabular-nums', perfect ? 'text-[#059669]' : 'text-[#4338CA]')}>
                                {Math.round(result.score)}%
                            </span>
                            <div className="min-w-0">
                                <p className="text-base font-bold text-[#14141B]">
                                    {result.correct_answers} of {result.total_questions} correct
                                </p>
                                <p className="mt-0.5 text-sm text-[#4B4B57]">
                                    {perfect ? 'Perfect score — well done.' : 'The right answers are marked below. Reset the quiz to try again.'}
                                </p>
                                <p className="mt-1 text-xs text-[#8A8A96]">Submitted {new Date(result.attempted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                        </div>
                        {resetButton('Reset quiz')}
                    </div>
                ) : (
                    <div className="rounded-xl bg-[#F6F5F2] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[#14141B]">
                                {answered} of {questions.length} answered
                            </p>
                            {answered > 0 && resetButton('Reset')}
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E4E2DA]">
                            <span className="block h-full rounded-full bg-[#4F46E5] transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-[#8A8A96]">Your answers stay here if you leave or refresh. They are checked when you submit.</p>
                    </div>
                )}
            </div>

            {questions.map((q, i) => {
                const reviewed = review[q.id];
                const selected = selectedFor(q);

                return (
                    <fieldset key={q.id} disabled={result !== null || busy} className="min-w-0 rounded-xl border border-[#E4E2DA] p-4">
                        <legend className="sr-only">Question {i + 1}</legend>
                        <div className="flex items-start gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F0EFEA] text-xs font-bold text-[#4B4B57] tabular-nums">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] leading-snug font-semibold text-[#14141B]">{q.question_text}</p>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">{multiple(q) ? 'Choose all that apply' : 'Choose one'}</p>
                            </div>
                            {reviewed && (
                                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold', reviewed.is_correct ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#FFEDE8] text-[#C2410C]')}>
                                    {reviewed.is_correct ? <Check className="size-3.5" /> : <X className="size-3.5" />} {reviewed.is_correct ? 'Correct' : 'Incorrect'}
                                </span>
                            )}
                        </div>
                        {q.question_image_path && <img src={asset(q.question_image_path)} alt="" className="mt-3 max-h-64 max-w-full rounded-lg" />}

                        <div className="mt-3 flex flex-col gap-2">
                            {q.options.map((option) => {
                                const checked = selected.includes(option.id);
                                const isCorrect = reviewed?.correct.includes(option.id) ?? false;
                                const tone = reviewed
                                    ? isCorrect
                                        ? 'border-[#059669] bg-[#E6F6EC]'
                                        : checked
                                          ? 'border-[#C2410C] bg-[#FFEDE8]'
                                          : 'border-[#E4E2DA] opacity-70'
                                    : checked
                                      ? 'cursor-pointer border-[#4F46E5] bg-[#EEF0FF]'
                                      : 'cursor-pointer border-[#E4E2DA] hover:bg-[#F6F5F2]';

                                return (
                                    <label key={option.id} className={cn('flex items-center gap-3 rounded-lg border p-3 text-sm transition', tone)}>
                                        <input type={multiple(q) ? 'checkbox' : 'radio'} name={`q-${q.id}`} checked={checked} onChange={() => toggle(q, option.id)} className="size-4 shrink-0 accent-[#4F46E5]" />
                                        <span className="min-w-0 flex-1 break-words">
                                            {option.option_text}
                                            {option.option_image_path && <img src={asset(option.option_image_path)} alt="" className="mt-2 max-h-40 max-w-full rounded-lg" />}
                                        </span>
                                        {reviewed && isCorrect && (
                                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#059669]">
                                                <Check className="size-4" /> {checked ? 'Your answer' : 'Right answer'}
                                            </span>
                                        )}
                                        {reviewed && !isCorrect && checked && (
                                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#C2410C]">
                                                <X className="size-4" /> Your answer
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                );
            })}

            {error && (
                <p role="alert" className="text-sm font-medium text-[#C2410C]">
                    {error}
                </p>
            )}

            {result ? (
                <div className="flex flex-wrap items-center gap-3">
                    {resetButton('Reset quiz & try again')}
                    <span className="text-xs text-[#8A8A96]">Resetting clears your answers here. Your lesson progress stays.</span>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={busy || remaining > 0} className={cn(PRIMARY, 'w-fit')}>
                        {busy && <Loader2 className="size-4 animate-spin" />} Submit answers
                    </button>
                    {remaining > 0 && (
                        <span className="text-xs font-medium text-[#8A8A96]">
                            {remaining} {remaining === 1 ? 'question' : 'questions'} left to answer
                        </span>
                    )}
                </div>
            )}
        </form>
    );
}
