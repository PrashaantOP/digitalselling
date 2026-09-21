import { GradeForm, submissionFileUrl, SubmissionStatusPill } from '@/components/submission-grader';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Award, BookOpen, Check, ClipboardCheck, Copy, Download, FileText, Headphones, ListChecks, Video, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface LessonRow {
    id: number;
    module_id: number;
    title: string;
    type: string;
    is_published: boolean;
    is_free_preview?: boolean;
    sort_order: number;
}

interface ModuleRow {
    id: number;
    title: string;
    sort_order: number;
    lessons: LessonRow[];
}

interface QuizAttemptRow {
    id: number;
    quiz_id: number;
    score: string | number;
    total_questions: number;
    correct_answers: number;
    attempted_at: string | null;
    quiz: { id: number; lesson_id: number; title: string | null } | null;
}

interface SubmissionRow {
    id: number;
    lesson_assignment_id: number;
    status: string;
    submission_text: string | null;
    submission_file_path: string | null;
    grade_feedback: string | null;
    submitted_at: string | null;
    assignment: { id: number; lesson_id: number } | null;
}

interface EnrollmentDetail {
    id: number;
    course_id: number;
    progress_percent: number | string | null;
    access_expires_at: string | null;
    completed_at: string | null;
    certificate_issued_at: string | null;
    created_at: string;
    customer: { id: number; name: string | null; email: string | null; phone: string | null } | null;
    order: { id: number; order_number: string; total_amount: string | number; paid_at: string | null } | null;
    certificate: { id: number; certificate_number: string; issued_at: string | null } | null;
    lesson_progress: { id: number; lesson_id: number; is_completed: boolean; completed_at: string | null }[];
    quiz_attempts: QuizAttemptRow[];
    assignment_submissions: SubmissionRow[];
    course: { id: number; certificate_enabled?: boolean; product: { id: number; uuid: string; title: string } | null; modules: ModuleRow[] } | null;
}

const LESSON_TYPES: Record<string, { label: string; icon: LucideIcon }> = {
    video: { label: 'Video', icon: Video },
    text_image: { label: 'Reading', icon: BookOpen },
    audio: { label: 'Audio', icon: Headphones },
    quiz: { label: 'Quiz', icon: ListChecks },
    assignment: { label: 'Assignment', icon: ClipboardCheck },
    notes_pdf: { label: 'Notes', icon: FileText },
};

const AVATAR_TONES = [
    'bg-[#EEF2FF] text-[#4F46E5]',
    'bg-[#E6F2FF] text-[#0284C7]',
    'bg-[#FFF4DB] text-[#B46E00]',
    'bg-[#FFEDE8] text-[#C2410C]',
    'bg-[#F1EAFE] text-[#7C3AED]',
    'bg-[#E1F6F3] text-[#0D9488]',
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function initials(name: string | null) {
    if (!name) return '?';
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase() || '?'
    );
}

function avatarTone(name: string | null) {
    const s = name ?? 'anonymous';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return AVATAR_TONES[h % AVATAR_TONES.length];
}

function money(amount: number | string | null | undefined): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount) || 0);
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function scoreOf(a: QuizAttemptRow) {
    return Math.min(100, Math.max(0, Number(a.score) || 0));
}

function accessLabel(expires: string | null): { text: string; tone: string } {
    if (!expires) return { text: 'Lifetime access', tone: 'text-[#14141B]' };
    const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { text: `Expired on ${formatDate(expires)}`, tone: 'text-[#C2410C]' };
    if (days <= 7) return { text: `${days} ${days === 1 ? 'day' : 'days'} left · ${formatDate(expires)}`, tone: 'text-[#B46E00]' };
    return { text: `Until ${formatDate(expires)}`, tone: 'text-[#14141B]' };
}

/* ------------------------------------------------------------------ */
/*  SHARED UI                                                          */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value}</span>
            <span className="mt-1 text-xs text-[#8A8A96]">{sub}</span>
        </div>
    );
}

function Card({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E4E2DA]/70 px-6 py-4">
                <div>
                    <h2 className="text-base font-semibold text-[#14141B]">{title}</h2>
                    {description && <p className="mt-0.5 text-xs text-[#8A8A96]">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
    return <p className="px-6 py-8 text-center text-xs text-[#8A8A96]">{children}</p>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <span className="text-[13px] text-[#8A8A96]">{label}</span>
            <span className="text-right text-[13px] font-semibold text-[#14141B]">{children}</span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function EnrollmentShow({ enrollment }: { enrollment: EnrollmentDetail }) {
    const [copied, setCopied] = useState(false);

    const customer = enrollment.customer;
    const name = customer?.name ?? null;
    const course = enrollment.course;
    const courseTitle = course?.product?.title ?? 'Course';
    const courseUuid = course?.product?.uuid ?? '';
    const studentsUrl = `/dashboard/courses/${courseUuid}/students`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/dashboard/courses' },
        { title: courseTitle, href: `/dashboard/courses/${courseUuid}/edit` },
        { title: 'Students', href: studentsUrl },
        { title: name ?? 'Student', href: `/dashboard/enrollments/${enrollment.id}` },
    ];

    // ---- derive everything from what the controller loaded ----
    const allLessons = (course?.modules ?? []).flatMap((m) => m.lessons ?? []);
    const lessonTitle = new Map(allLessons.map((l) => [l.id, l.title]));
    // progress_percent counts published lessons only, so hide unpublished ones here too
    const modules = (course?.modules ?? [])
        .map((m) => ({ ...m, lessons: (m.lessons ?? []).filter((l) => l.is_published) }))
        .filter((m) => m.lessons.length > 0);
    const publishedLessons = modules.flatMap((m) => m.lessons);

    const completedAt = new Map(enrollment.lesson_progress.filter((p) => p.is_completed).map((p) => [p.lesson_id, p.completed_at]));
    const doneCount = publishedLessons.filter((l) => completedAt.has(l.id)).length;

    const percent = Math.min(100, Math.max(0, Number(enrollment.progress_percent) || 0));
    const expired = Boolean(enrollment.access_expires_at && new Date(enrollment.access_expires_at).getTime() < Date.now());
    const finished = Boolean(enrollment.completed_at) || percent >= 100;
    const status = finished
        ? { label: 'Completed', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' }
        : expired
          ? { label: 'Access expired', chip: 'bg-[#FFEDE8] text-[#C2410C]', dot: 'bg-[#FF6B4A]' }
          : percent > 0
            ? { label: 'In progress', chip: 'bg-[#EEF2FF] text-[#4F46E5]', dot: 'bg-[#4F46E5]' }
            : { label: 'Not started', chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' };

    const attempts = [...enrollment.quiz_attempts].sort((a, b) => new Date(b.attempted_at ?? 0).getTime() - new Date(a.attempted_at ?? 0).getTime());
    const bestByLesson = new Map<number, number>();
    for (const a of attempts) {
        const lessonId = a.quiz?.lesson_id;
        if (lessonId !== undefined) bestByLesson.set(lessonId, Math.max(bestByLesson.get(lessonId) ?? 0, scoreOf(a)));
    }
    const bestScores = [...bestByLesson.values()];
    const avgBest = bestScores.length ? Math.round(bestScores.reduce((s, v) => s + v, 0) / bestScores.length) : null;

    const submissions = [...enrollment.assignment_submissions].sort((a, b) => new Date(b.submitted_at ?? 0).getTime() - new Date(a.submitted_at ?? 0).getTime());
    const submissionByLesson = new Map(submissions.filter((s) => s.assignment).map((s) => [s.assignment!.lesson_id, s]));
    const awaiting = submissions.filter((s) => s.status === 'submitted').length;

    const certificateEnabled = course?.certificate_enabled ?? false;
    const certificateValue = enrollment.certificate ? 'Issued' : certificateEnabled ? 'Not yet' : 'Off';
    const certificateSub = enrollment.certificate ? enrollment.certificate.certificate_number : certificateEnabled ? 'Issued when the course is completed' : 'Not enabled for this course';

    function copyOrder(ref: string) {
        navigator.clipboard?.writeText(ref);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${name ?? 'Student'} · ${courseTitle}`} />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <Link href={studentsUrl} className="flex w-fit items-center gap-1.5 text-xs font-medium text-[#8A8A96] transition hover:text-[#14141B]">
                        <ArrowLeft className="size-3.5" /> All students
                    </Link>

                    {/* Student header */}
                    <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className={cn('flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold', avatarTone(name))}>{initials(name)}</div>
                            <div className="min-w-0">
                                <h1 className="truncate text-xl font-bold tracking-tight text-[#14141B]">{name ?? 'Anonymous'}</h1>
                                <p className="mt-0.5 truncate text-sm text-[#8A8A96]">{[customer?.email, customer?.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                                <p className="mt-0.5 truncate text-xs text-[#8A8A96]">
                                    Enrolled in <span className="font-semibold text-[#4B4B57]">{courseTitle}</span> on {formatDate(enrollment.created_at)}
                                </p>
                            </div>
                        </div>
                        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', status.chip)}>
                            <span className={cn('size-1.5 rounded-full', status.dot)} /> {status.label}
                        </span>
                    </div>

                    {/* KPI cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Progress" value={`${percent}%`} sub={`${doneCount} of ${publishedLessons.length} lessons done`} icon={<Check className="size-3.5" />} tone="bg-[#EEF2FF] text-[#4F46E5]" />
                        <KpiCard
                            label="Quizzes"
                            value={avgBest === null ? '—' : `${avgBest}%`}
                            sub={attempts.length ? `Avg. best score · ${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'}` : 'No attempts yet'}
                            icon={<ListChecks className="size-3.5" />}
                            tone="bg-[#E6F2FF] text-[#0284C7]"
                        />
                        <KpiCard
                            label="Assignments"
                            value={String(submissions.length)}
                            sub={submissions.length ? `${awaiting} awaiting your review` : 'Nothing submitted yet'}
                            icon={<ClipboardCheck className="size-3.5" />}
                            tone="bg-[#FFF4DB] text-[#B46E00]"
                        />
                        <KpiCard label="Certificate" value={certificateValue} sub={certificateSub} icon={<Award className="size-3.5" />} tone="bg-[#F1EAFE] text-[#7C3AED]" />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="flex flex-col gap-5">
                            {/* Curriculum */}
                            <Card title="Lesson progress" description={`${doneCount} of ${publishedLessons.length} published lessons completed`}>
                                {modules.length === 0 ? (
                                    <EmptyNote>This course has no published lessons yet.</EmptyNote>
                                ) : (
                                    <div className="divide-y divide-[#E4E2DA]/60">
                                        {modules.map((module) => {
                                            const moduleDone = module.lessons.filter((l) => completedAt.has(l.id)).length;
                                            const modulePercent = Math.round((moduleDone / module.lessons.length) * 100);
                                            return (
                                                <div key={module.id} className="px-6 py-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 className="truncate text-[13px] font-semibold text-[#14141B]">{module.title}</h3>
                                                        <div className="flex shrink-0 items-center gap-2.5">
                                                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#ECEBE6]">
                                                                <span className={cn('block h-full rounded-full', modulePercent === 100 ? 'bg-[#059669]' : 'bg-[#4F46E5]')} style={{ width: `${modulePercent}%` }} />
                                                            </div>
                                                            <span className="text-xs text-[#8A8A96]">
                                                                {moduleDone}/{module.lessons.length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ul className="mt-3 flex flex-col gap-1">
                                                        {module.lessons.map((lesson) => {
                                                            const done = completedAt.has(lesson.id);
                                                            const type = LESSON_TYPES[lesson.type] ?? { label: lesson.type, icon: FileText };
                                                            const best = bestByLesson.get(lesson.id);
                                                            const submission = submissionByLesson.get(lesson.id);
                                                            return (
                                                                <li key={lesson.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F6F5F2]/70">
                                                                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', done ? 'bg-[#E6F6EC] text-[#059669]' : 'border border-[#E4E2DA] text-transparent')}>
                                                                        <Check className="size-3" />
                                                                        <span className="sr-only">{done ? 'Completed' : 'Not completed'}</span>
                                                                    </span>
                                                                    <type.icon className="size-4 shrink-0 text-[#8A8A96]" />
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className={cn('block truncate text-[13px]', done ? 'font-medium text-[#14141B]' : 'text-[#4B4B57]')}>{lesson.title}</span>
                                                                        <span className="text-[11px] text-[#8A8A96]">{type.label}</span>
                                                                    </span>
                                                                    {best !== undefined && <span className="rounded-full bg-[#E6F2FF] px-2 py-0.5 text-[10px] font-semibold text-[#0284C7]">Best {Math.round(best)}%</span>}
                                                                    {submission && <SubmissionStatusPill status={submission.status} />}
                                                                    <span className="hidden w-24 shrink-0 text-right text-xs text-[#8A8A96] sm:block">{done ? formatDate(completedAt.get(lesson.id) ?? null) : '—'}</span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Quiz attempts */}
                            <Card title="Quiz attempts" description={attempts.length ? `${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'} so far` : undefined}>
                                {attempts.length === 0 ? (
                                    <EmptyNote>This student hasn't attempted any quiz yet.</EmptyNote>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-left text-sm">
                                            <thead>
                                                <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                                    <th className="px-6 py-3">Quiz</th>
                                                    <th className="px-4 py-3">Attempted</th>
                                                    <th className="px-4 py-3">Correct</th>
                                                    <th className="px-6 py-3">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E4E2DA]/50">
                                                {attempts.map((a) => (
                                                    <tr key={a.id}>
                                                        <td className="px-6 py-3 text-[13px] font-medium text-[#14141B]">{a.quiz?.title || lessonTitle.get(a.quiz?.lesson_id ?? -1) || 'Quiz'}</td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-[#4B4B57]">{formatDateTime(a.attempted_at)}</td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-[#4B4B57]">
                                                            {a.correct_answers} / {a.total_questions}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex min-w-[130px] items-center gap-2.5">
                                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ECEBE6]">
                                                                    <span className="block h-full rounded-full bg-[#4F46E5]" style={{ width: `${scoreOf(a)}%` }} />
                                                                </div>
                                                                <span className="w-10 text-right text-xs font-semibold text-[#14141B]">{Math.round(scoreOf(a))}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>

                            {/* Assignments */}
                            <Card
                                title="Assignments"
                                description={submissions.length ? `${submissions.length} submitted · ${awaiting} awaiting review` : undefined}
                                action={
                                    awaiting > 0 ? (
                                        <Link href={`/dashboard/assignments/submissions?course=${courseIdOf(course)}&status=submitted`} className="text-xs font-semibold text-[#4F46E5] hover:underline">
                                            Open review queue
                                        </Link>
                                    ) : undefined
                                }
                            >
                                {submissions.length === 0 ? (
                                    <EmptyNote>No assignment submissions from this student yet.</EmptyNote>
                                ) : (
                                    <div className="divide-y divide-[#E4E2DA]/60">
                                        {submissions.map((s) => (
                                            <div key={s.id} className="flex flex-col gap-3 px-6 py-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-semibold text-[#14141B]">{lessonTitle.get(s.assignment?.lesson_id ?? -1) ?? 'Assignment'}</p>
                                                        <p className="text-xs text-[#8A8A96]">Submitted {formatDateTime(s.submitted_at)}</p>
                                                    </div>
                                                    <SubmissionStatusPill status={s.status} />
                                                </div>
                                                {s.submission_text && <p className="max-h-40 overflow-y-auto rounded-lg bg-[#F6F5F2] p-3 text-[13px] break-words whitespace-pre-wrap text-[#4B4B57]">{s.submission_text}</p>}
                                                {s.submission_file_path && (
                                                    <a href={submissionFileUrl(s.id)} className="flex w-fit items-center gap-2 rounded-lg border border-[#E4E2DA] px-3 py-2 text-xs font-medium text-[#4B4B57] transition hover:bg-[#F6F5F2]">
                                                        <Download className="size-3.5 text-[#8A8A96]" /> Download attachment
                                                    </a>
                                                )}
                                                <GradeForm submission={s} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Side */}
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-[#14141B]">Enrollment</h3>
                                <div className="mt-2 divide-y divide-[#E4E2DA]/60">
                                    <DetailRow label="Enrolled">{formatDate(enrollment.created_at)}</DetailRow>
                                    <DetailRow label="Access">
                                        <span className={accessLabel(enrollment.access_expires_at).tone}>{accessLabel(enrollment.access_expires_at).text}</span>
                                    </DetailRow>
                                    <DetailRow label="Completed">{formatDate(enrollment.completed_at)}</DetailRow>
                                    <DetailRow label="Certificate">
                                        {enrollment.certificate ? (
                                            <span className="flex flex-col items-end">
                                                <span className="font-mono text-xs">{enrollment.certificate.certificate_number}</span>
                                                <span className="text-[11px] font-normal text-[#8A8A96]">{formatDate(enrollment.certificate.issued_at ?? enrollment.certificate_issued_at)}</span>
                                            </span>
                                        ) : (
                                            <span className="font-normal text-[#8A8A96]">{certificateEnabled ? 'Not issued' : 'Not enabled'}</span>
                                        )}
                                    </DetailRow>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-[#14141B]">Order</h3>
                                {enrollment.order ? (
                                    <div className="mt-2 divide-y divide-[#E4E2DA]/60">
                                        <DetailRow label="Order ref">
                                            <span className="inline-flex items-center gap-1">
                                                <span className="font-mono text-xs">{enrollment.order.order_number}</span>
                                                <button onClick={() => copyOrder(enrollment.order!.order_number)} aria-label="Copy order reference" className="p-0.5 text-[#8A8A96] hover:text-[#14141B]">
                                                    {copied ? <Check className="size-3.5 text-[#059669]" /> : <Copy className="size-3.5" />}
                                                </button>
                                            </span>
                                        </DetailRow>
                                        <DetailRow label="Amount">{money(enrollment.order.total_amount)}</DetailRow>
                                        <DetailRow label="Paid on">{formatDateTime(enrollment.order.paid_at)}</DetailRow>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-[#8A8A96]">No order linked to this enrollment.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/** `course.product.id` is the id the assignments review queue filters on (?course=<product id>). */
function courseIdOf(course: EnrollmentDetail['course']) {
    return course?.product?.id ?? '';
}
