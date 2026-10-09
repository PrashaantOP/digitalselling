import { GradeForm, submissionFileUrl, SubmissionStatusPill } from '@/components/submission-grader';
import { MobileCard, MobileCardList } from '@/components/mobile-card-list';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { useCan } from '@/hooks/use-can';
import { Head, Link, router } from '@inertiajs/react';
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
    uuid: string;
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
    uuid: string;
    course_id: number;
    progress_percent: number | string | null;
    access_expires_at: string | null;
    completed_at: string | null;
    certificate_issued_at: string | null;
    created_at: string;
    customer: { id: number; name: string | null; email: string | null; phone: string | null } | null;
    order: { id: number; order_number: string; total_amount: string | number; paid_at: string | null } | null;
    certificate: { id: number; certificate_number: string; issued_at: string | null; student_name: string | null; revoked_at: string | null; revoke_reason: string | null } | null;
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
    'bg-cp-brand-soft text-cp-brand-ink',
    'bg-cp-sky-soft text-cp-sky-ink',
    'bg-cp-warning-soft text-cp-warning-ink',
    'bg-cp-coral-soft text-cp-coral-dark-ink',
    'bg-cp-accent-soft text-cp-accent-ink',
    'bg-cp-teal-soft text-cp-teal-ink',
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
    if (!expires) return { text: 'Lifetime access', tone: 'text-cp-ink' };
    const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { text: `Expired on ${formatDate(expires)}`, tone: 'text-cp-coral-dark-ink' };
    if (days <= 7) return { text: `${days} ${days === 1 ? 'day' : 'days'} left · ${formatDate(expires)}`, tone: 'text-cp-warning-ink' };
    return { text: `Until ${formatDate(expires)}`, tone: 'text-cp-ink' };
}

/* ------------------------------------------------------------------ */
/*  SHARED UI                                                          */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-cp-surface p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-xl font-semibold tracking-tight text-cp-ink sm:text-2xl">{value}</span>
            <span className="mt-1 text-xs text-cp-muted">{sub}</span>
        </div>
    );
}

function Card({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="overflow-hidden rounded-xl bg-cp-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-cp-line/70 px-6 py-4">
                <div>
                    <h2 className="text-base font-semibold text-cp-ink">{title}</h2>
                    {description && <p className="mt-0.5 text-xs text-cp-muted">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
    return <p className="px-6 py-8 text-center text-xs text-cp-muted">{children}</p>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <span className="text-[13px] text-cp-muted">{label}</span>
            <span className="text-right text-[13px] font-semibold text-cp-ink">{children}</span>
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
        { title: name ?? 'Student', href: `/dashboard/enrollments/${enrollment.uuid}` },
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
        ? { label: 'Completed', chip: 'bg-cp-success-soft text-cp-success-ink', dot: 'bg-cp-success' }
        : expired
          ? { label: 'Access expired', chip: 'bg-cp-coral-soft text-cp-coral-dark-ink', dot: 'bg-cp-coral' }
          : percent > 0
            ? { label: 'In progress', chip: 'bg-cp-brand-soft text-cp-brand-ink', dot: 'bg-cp-brand' }
            : { label: 'Not started', chip: 'bg-cp-surface-3 text-cp-subtle', dot: 'bg-current' };

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
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <Link href={studentsUrl} className="flex w-fit items-center gap-1.5 text-xs font-medium text-cp-muted transition hover:text-cp-ink">
                        <ArrowLeft className="size-3.5" /> All students
                    </Link>

                    {/* Student header */}
                    <div className="flex flex-col justify-between gap-4 rounded-xl bg-cp-surface p-5 shadow-sm sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className={cn('flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold', avatarTone(name))}>{initials(name)}</div>
                            <div className="min-w-0">
                                <h1 className="truncate text-xl font-bold tracking-tight text-cp-ink">{name ?? 'Anonymous'}</h1>
                                <p className="mt-0.5 truncate text-sm text-cp-muted">{[customer?.email, customer?.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
                                <p className="mt-0.5 truncate text-xs text-cp-muted">
                                    Enrolled in <span className="font-semibold text-cp-body">{courseTitle}</span> on {formatDate(enrollment.created_at)}
                                </p>
                            </div>
                        </div>
                        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', status.chip)}>
                            <span className={cn('size-1.5 rounded-full', status.dot)} /> {status.label}
                        </span>
                    </div>

                    {/* KPI cards */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                        <KpiCard label="Progress" value={`${percent}%`} sub={`${doneCount} of ${publishedLessons.length} lessons done`} icon={<Check className="size-3.5" />} tone="bg-cp-brand-soft text-cp-brand-ink" />
                        <KpiCard
                            label="Quizzes"
                            value={avgBest === null ? '—' : `${avgBest}%`}
                            sub={attempts.length ? `Avg. best score · ${attempts.length} ${attempts.length === 1 ? 'attempt' : 'attempts'}` : 'No attempts yet'}
                            icon={<ListChecks className="size-3.5" />}
                            tone="bg-cp-sky-soft text-cp-sky-ink"
                        />
                        <KpiCard
                            label="Assignments"
                            value={String(submissions.length)}
                            sub={submissions.length ? `${awaiting} awaiting your review` : 'Nothing submitted yet'}
                            icon={<ClipboardCheck className="size-3.5" />}
                            tone="bg-cp-warning-soft text-cp-warning-ink"
                        />
                        <KpiCard label="Certificate" value={certificateValue} sub={certificateSub} icon={<Award className="size-3.5" />} tone="bg-cp-accent-soft text-cp-accent-ink" />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="flex flex-col gap-5">
                            {/* Curriculum */}
                            <Card title="Lesson progress" description={`${doneCount} of ${publishedLessons.length} published lessons completed`}>
                                {modules.length === 0 ? (
                                    <EmptyNote>This course has no published lessons yet.</EmptyNote>
                                ) : (
                                    <div className="divide-y divide-cp-line/60">
                                        {modules.map((module) => {
                                            const moduleDone = module.lessons.filter((l) => completedAt.has(l.id)).length;
                                            const modulePercent = Math.round((moduleDone / module.lessons.length) * 100);
                                            return (
                                                <div key={module.id} className="px-6 py-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h3 className="truncate text-[13px] font-semibold text-cp-ink">{module.title}</h3>
                                                        <div className="flex shrink-0 items-center gap-2.5">
                                                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-cp-surface-3">
                                                                <span className={cn('block h-full rounded-full', modulePercent === 100 ? 'bg-cp-success' : 'bg-cp-brand')} style={{ width: `${modulePercent}%` }} />
                                                            </div>
                                                            <span className="text-xs text-cp-muted">
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
                                                                <li key={lesson.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-cp-canvas/70">
                                                                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full', done ? 'bg-cp-success-soft text-cp-success-ink' : 'border border-cp-line text-transparent')}>
                                                                        <Check className="size-3" />
                                                                        <span className="sr-only">{done ? 'Completed' : 'Not completed'}</span>
                                                                    </span>
                                                                    <type.icon className="size-4 shrink-0 text-cp-muted" />
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className={cn('block truncate text-[13px]', done ? 'font-medium text-cp-ink' : 'text-cp-body')}>{lesson.title}</span>
                                                                        <span className="text-[11px] text-cp-muted">{type.label}</span>
                                                                    </span>
                                                                    {best !== undefined && <span className="rounded-full bg-cp-sky-soft px-2 py-0.5 text-[10px] font-semibold text-cp-sky-ink">Best {Math.round(best)}%</span>}
                                                                    {submission && <SubmissionStatusPill status={submission.status} />}
                                                                    <span className="hidden w-24 shrink-0 text-right text-xs text-cp-muted sm:block">{done ? formatDate(completedAt.get(lesson.id) ?? null) : '—'}</span>
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
                                    <>
                                    {/* phone: table ki jagah cards (same data + same actions) */}
                                    {attempts.length > 0 && (
                                        <MobileCardList>
                                            {attempts.map((a) => {
                                                return (
                                                    <MobileCard
                                                        key={a.id}
                                                        title={a.quiz?.title || lessonTitle.get(a.quiz?.lesson_id ?? -1) || 'Quiz'}
                                                        subtitle={formatDateTime(a.attempted_at)}
                                                        trailing={<span className="text-sm font-bold text-cp-ink">{Math.round(scoreOf(a))}%</span>}
                                                        meta={
                                                            <span>
                                                                {a.correct_answers} / {a.total_questions} correct
                                                            </span>
                                                        }
                                                    />
                                                );
                                            })}
                                        </MobileCardList>
                                    )}
                                    <div className="hidden overflow-x-auto md:block">
                                        <table className="w-full border-collapse text-left text-sm">
                                            <thead>
                                                <tr className="bg-cp-canvas/60 text-[11px] font-semibold tracking-wider text-cp-muted uppercase">
                                                    <th className="px-6 py-3">Quiz</th>
                                                    <th className="px-4 py-3">Attempted</th>
                                                    <th className="px-4 py-3">Correct</th>
                                                    <th className="px-6 py-3">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cp-line/50">
                                                {attempts.map((a) => (
                                                    <tr key={a.id}>
                                                        <td className="px-6 py-3 text-[13px] font-medium text-cp-ink">{a.quiz?.title || lessonTitle.get(a.quiz?.lesson_id ?? -1) || 'Quiz'}</td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-cp-body">{formatDateTime(a.attempted_at)}</td>
                                                        <td className="px-4 py-3 text-xs whitespace-nowrap text-cp-body">
                                                            {a.correct_answers} / {a.total_questions}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex min-w-[130px] items-center gap-2.5">
                                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cp-surface-3">
                                                                    <span className="block h-full rounded-full bg-cp-brand" style={{ width: `${scoreOf(a)}%` }} />
                                                                </div>
                                                                <span className="w-10 text-right text-xs font-semibold text-cp-ink">{Math.round(scoreOf(a))}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                )}
                            </Card>

                            {/* Assignments */}
                            <Card
                                title="Assignments"
                                description={submissions.length ? `${submissions.length} submitted · ${awaiting} awaiting review` : undefined}
                                action={
                                    awaiting > 0 ? (
                                        <Link href={`/dashboard/assignments/submissions?course=${courseIdOf(course)}&status=submitted`} className="text-xs font-semibold text-cp-brand-ink hover:underline">
                                            Open review queue
                                        </Link>
                                    ) : undefined
                                }
                            >
                                {submissions.length === 0 ? (
                                    <EmptyNote>No assignment submissions from this student yet.</EmptyNote>
                                ) : (
                                    <div className="divide-y divide-cp-line/60">
                                        {submissions.map((s) => (
                                            <div key={s.id} className="flex flex-col gap-3 px-6 py-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-semibold text-cp-ink">{lessonTitle.get(s.assignment?.lesson_id ?? -1) ?? 'Assignment'}</p>
                                                        <p className="text-xs text-cp-muted">Submitted {formatDateTime(s.submitted_at)}</p>
                                                    </div>
                                                    <SubmissionStatusPill status={s.status} />
                                                </div>
                                                {s.submission_text && <p className="max-h-40 overflow-y-auto rounded-lg bg-cp-canvas p-3 text-[13px] break-words whitespace-pre-wrap text-cp-body">{s.submission_text}</p>}
                                                {s.submission_file_path && (
                                                    <a href={submissionFileUrl(s.uuid)} className="flex w-fit items-center gap-2 rounded-lg border border-cp-line px-3 py-2 text-xs font-medium text-cp-body transition hover:bg-cp-canvas">
                                                        <Download className="size-3.5 text-cp-muted" /> Download attachment
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
                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-cp-ink">Enrollment</h3>
                                <div className="mt-2 divide-y divide-cp-line/60">
                                    <DetailRow label="Enrolled">{formatDate(enrollment.created_at)}</DetailRow>
                                    <DetailRow label="Access">
                                        <span className={accessLabel(enrollment.access_expires_at).tone}>{accessLabel(enrollment.access_expires_at).text}</span>
                                    </DetailRow>
                                    <DetailRow label="Completed">{formatDate(enrollment.completed_at)}</DetailRow>
                                    <DetailRow label="Certificate">
                                        {enrollment.certificate ? (
                                            <span className="flex flex-col items-end">
                                                <span className="font-mono text-xs">{enrollment.certificate.certificate_number}</span>
                                                <span className="text-[11px] font-normal text-cp-muted">{formatDate(enrollment.certificate.issued_at ?? enrollment.certificate_issued_at)}</span>
                                            </span>
                                        ) : (
                                            <span className="font-normal text-cp-muted">{certificateEnabled ? 'Not issued' : 'Not enabled'}</span>
                                        )}
                                    </DetailRow>
                                </div>
                                {enrollment.certificate && <CertificateActions enrollmentUuid={enrollment.uuid} certificate={enrollment.certificate} />}
                            </div>

                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-cp-ink">Order</h3>
                                {enrollment.order ? (
                                    <div className="mt-2 divide-y divide-cp-line/60">
                                        <DetailRow label="Order ref">
                                            <span className="inline-flex items-center gap-1">
                                                <span className="font-mono text-xs">{enrollment.order.order_number}</span>
                                                <button onClick={() => copyOrder(enrollment.order!.order_number)} aria-label="Copy order reference" className="p-0.5 text-cp-muted hover:text-cp-ink">
                                                    {copied ? <Check className="size-3.5 text-cp-success-ink" /> : <Copy className="size-3.5" />}
                                                </button>
                                            </span>
                                        </DetailRow>
                                        <DetailRow label="Amount">{money(enrollment.order.total_amount)}</DetailRow>
                                        <DetailRow label="Paid on">{formatDateTime(enrollment.order.paid_at)}</DetailRow>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-cp-muted">No order linked to this enrollment.</p>
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
    return course?.product?.uuid ?? '';
}

/**
 * Certificate ek record hai (naam issue ke waqt jam jaata hai) — creator yahan se use dekh sakta hai,
 * naam ki spelling sudhaar sakta hai, ya radd kar sakta hai (jaise refund ke baad).
 */
function CertificateActions({ enrollmentUuid, certificate }: { enrollmentUuid: string; certificate: NonNullable<EnrollmentDetail['certificate']> }) {
    const { can } = useCan();
    const base = `/dashboard/enrollments/${enrollmentUuid}/certificate`;
    const [mode, setMode] = useState<'idle' | 'rename' | 'revoke'>('idle');
    const [name, setName] = useState(certificate.student_name ?? '');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const revoked = certificate.revoked_at !== null;

    function send(method: 'put' | 'post', url: string, data: Record<string, string>) {
        setBusy(true);
        setError(null);
        router[method](url, data, {
            preserveScroll: true,
            onSuccess: () => {
                setMode('idle');
                setReason('');
            },
            onError: (errors) => setError(Object.values(errors)[0] as string),
            onFinish: () => setBusy(false),
        });
    }

    const link = 'text-xs font-semibold text-cp-brand-ink hover:underline disabled:opacity-50';
    const field = 'h-9 w-full rounded-lg border border-cp-line-strong bg-cp-surface px-3 text-sm text-cp-ink outline-none focus:border-cp-brand';

    return (
        <div className="mt-3 border-t border-cp-line/60 pt-3">
            {revoked && (
                <p className="mb-2 rounded-lg bg-cp-coral-soft px-3 py-2 text-xs font-medium text-cp-coral-dark-ink">
                    Revoked{certificate.revoke_reason ? ` — ${certificate.revoke_reason}` : ''}. The public verify page shows it as no longer valid.
                </p>
            )}
            <p className="text-xs text-cp-muted">
                Name on certificate: <span className="font-semibold text-cp-ink">{certificate.student_name ?? '—'}</span>
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <a href={base} target="_blank" rel="noreferrer" className={link}>
                    View certificate
                </a>
                {can('courses.edit') && (
                    <>
                        <button type="button" onClick={() => setMode(mode === 'rename' ? 'idle' : 'rename')} className={link}>
                            Edit name
                        </button>
                        {revoked ? (
                            <button type="button" disabled={busy} onClick={() => send('post', `${base}/restore`, {})} className={link}>
                                Restore
                            </button>
                        ) : (
                            <button type="button" onClick={() => setMode(mode === 'revoke' ? 'idle' : 'revoke')} className="text-xs font-semibold text-cp-coral-dark-ink hover:underline">
                                Revoke
                            </button>
                        )}
                    </>
                )}
            </div>

            {mode === 'rename' && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send('put', base, { student_name: name });
                    }}
                    className="mt-3 flex flex-col gap-2"
                >
                    <label htmlFor="cert-name" className="text-xs font-semibold text-cp-body">
                        Name as it should appear
                    </label>
                    <input id="cert-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} className={field} />
                    <button type="submit" disabled={busy || name.trim() === ''} className="h-9 w-fit rounded-lg bg-cp-brand px-3 text-xs font-semibold text-white disabled:opacity-50">
                        Save name
                    </button>
                </form>
            )}

            {mode === 'revoke' && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send('post', `${base}/revoke`, { reason });
                    }}
                    className="mt-3 flex flex-col gap-2"
                >
                    <label htmlFor="cert-reason" className="text-xs font-semibold text-cp-body">
                        Why are you revoking it? (only you see this)
                    </label>
                    <input id="cert-reason" value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={255} placeholder="e.g. Order refunded" className={field} />
                    <button type="submit" disabled={busy || reason.trim() === ''} className="h-9 w-fit rounded-lg bg-cp-coral-dark px-3 text-xs font-semibold text-white disabled:opacity-50">
                        Revoke certificate
                    </button>
                </form>
            )}

            {error && (
                <p role="alert" className="mt-2 text-xs font-medium text-cp-coral-dark-ink">
                    {error}
                </p>
            )}
        </div>
    );
}
