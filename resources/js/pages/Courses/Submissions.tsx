import { GradeForm, submissionFileUrl, SubmissionStatusPill } from '@/components/submission-grader';
import { MobileCard, MobileCardList } from '@/components/mobile-card-list';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight, ChevronRight, Download, FileText, GraduationCap, Inbox, Paperclip, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const BASE = '/dashboard/assignments/submissions';
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Courses', href: '/dashboard/courses' },
    { title: 'Assignments', href: BASE },
];

interface SubmissionRow {
    id: number;
    uuid: string;
    lesson_assignment_id: number;
    enrollment_id: number;
    submission_file_path: string | null;
    submission_text: string | null;
    status: string;
    grade_feedback: string | null;
    submitted_at: string | null;
    enrollment: {
        id: number;
        uuid: string;
        customer: { id: number; name: string | null; email: string | null } | null;
        course: { id: number; product: { id: number; uuid: string; title: string } | null } | null;
    } | null;
    assignment: {
        id: number;
        assignment_prompt?: string | null;
        allow_file_upload?: boolean;
        lesson: { id: number; title: string } | null;
    } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface SubmissionsProps {
    submissions: Paginated<SubmissionRow>;
    filters: { status?: string | null; course?: string | number | null };
}

const STATUS_TABS: { key: 'all' | 'submitted' | 'graded'; label: string; dot: string }[] = [
    { key: 'all', label: 'All', dot: 'bg-cp-brand' },
    { key: 'submitted', label: 'Needs review', dot: 'bg-amber-500' },
    { key: 'graded', label: 'Graded', dot: 'bg-cp-success' },
];

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

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameDay(d, today)) return `Today, ${time}`;
    if (sameDay(d, yesterday)) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })}, ${time}`;
}

const studentName = (s: SubmissionRow) => s.enrollment?.customer?.name ?? null;
const courseTitle = (s: SubmissionRow) => s.enrollment?.course?.product?.title ?? 'Deleted course';
const lessonTitle = (s: SubmissionRow) => s.assignment?.lesson?.title ?? 'Assignment';

/* ------------------------------------------------------------------ */
/*  REVIEW DRAWER                                                      */
/* ------------------------------------------------------------------ */

function ReviewDrawer({ submission, open, onClose }: { submission: SubmissionRow | null; open: boolean; onClose: () => void }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const name = submission ? studentName(submission) : null;

    return (
        <>
            <div onClick={onClose} className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'pointer-events-none opacity-0')} />
            <div
                aria-hidden={!open}
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[520px] flex-col justify-between overflow-y-auto bg-cp-surface shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {submission && (
                    <>
                        <div className="flex flex-col gap-5 p-6">
                            <div className="flex items-center justify-between border-b border-cp-line/70 pb-4">
                                <span className="text-base font-semibold text-cp-ink">Review Submission</span>
                                <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink">
                                    <X className="size-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold', avatarTone(name))}>{initials(name)}</div>
                                    <div className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-cp-ink">{name ?? 'Anonymous'}</span>
                                        <span className="block truncate text-xs text-cp-muted">{submission.enrollment?.customer?.email ?? '—'}</span>
                                    </div>
                                </div>
                                <SubmissionStatusPill status={submission.status} />
                            </div>

                            <div className="flex flex-col gap-1.5 rounded-xl bg-cp-canvas p-4">
                                <span className="flex items-center gap-1.5 text-xs text-cp-muted">
                                    <GraduationCap className="size-3.5" /> {courseTitle(submission)}
                                </span>
                                <span className="text-[13px] font-semibold text-cp-ink">{lessonTitle(submission)}</span>
                                <span className="text-xs text-cp-muted">Submitted {formatDateTime(submission.submitted_at)}</span>
                            </div>

                            {submission.assignment?.assignment_prompt && (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">Assignment prompt</span>
                                    <p className="rounded-xl bg-cp-canvas p-3 text-[13px] break-words whitespace-pre-wrap text-cp-body">{submission.assignment.assignment_prompt}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">Student's answer</span>
                                {submission.submission_text ? (
                                    <p className="max-h-72 overflow-y-auto rounded-xl border border-cp-line p-3 text-[13px] break-words whitespace-pre-wrap text-cp-ink">{submission.submission_text}</p>
                                ) : (
                                    <p className="rounded-xl border border-dashed border-cp-line bg-cp-surface-2 p-3 text-xs text-cp-muted">No written answer — see the attached file.</p>
                                )}
                                {submission.submission_file_path && (
                                    <a
                                        href={submissionFileUrl(submission.uuid)}
                                        className="flex items-center gap-3 rounded-xl border border-cp-line p-3 transition hover:bg-cp-canvas"
                                    >
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cp-brand-soft text-cp-brand-ink">
                                            <FileText className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-semibold text-cp-ink">{submission.submission_file_path.split('/').pop()}</span>
                                            <span className="text-xs text-cp-muted">Attached file</span>
                                        </span>
                                        <Download className="size-4 text-cp-muted" />
                                    </a>
                                )}
                            </div>

                            <GradeForm submission={submission} />
                        </div>
                        <div className="flex flex-col gap-2 border-t border-cp-line bg-cp-surface p-5">
                            <Button variant="outline" asChild className="w-full border-cp-line">
                                <Link href={`/dashboard/enrollments/${submission.enrollment?.uuid}`}>
                                    <UserRound className="size-4" /> View student progress
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function CourseSubmissions({ submissions, filters }: SubmissionsProps) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [snapshot, setSnapshot] = useState<SubmissionRow | null>(null);
    const [open, setOpen] = useState(false);

    // After saving feedback Inertia refreshes the rows — read the fresh row, but keep the last known copy
    // if the row drops out of the current filter (e.g. "Needs review" once it is graded).
    const selected = submissions.data.find((s) => s.id === selectedId) ?? snapshot;

    const activeStatus = filters.status || 'all';
    const courseFilter = filters.course ? String(filters.course) : null;
    const filteredCourseTitle = courseFilter ? (submissions.data.find((s) => s.enrollment?.course?.product)?.enrollment?.course?.product?.title ?? null) : null;
    const hasFilters = Boolean(filters.status || courseFilter);

    function applyFilters(overrides: { status?: string | null; course?: string | null }) {
        const merged = { status: filters.status || null, course: courseFilter, ...overrides };
        router.get(BASE, { status: merged.status || undefined, course: merged.course || undefined }, { preserveState: true, replace: true });
    }

    function goToPage(page: number) {
        router.get(BASE, { status: filters.status || undefined, course: courseFilter || undefined, page }, { preserveState: true });
    }

    function openReview(row: SubmissionRow) {
        setSelectedId(row.id);
        setSnapshot(row);
        setOpen(true);
    }

    // filter se kuch na mile — table aur phone cards dono me yahi
    const noResults = (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cp-line bg-cp-surface-2 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-cp-surface-3 text-cp-muted">
                <Inbox className="size-5" />
            </span>
            <p className="mt-1 text-sm font-semibold text-cp-ink">{hasFilters ? 'No submissions match' : 'No submissions yet'}</p>
            <p className="max-w-xs px-4 text-xs text-cp-muted">
                {hasFilters ? 'Try a different status or remove the course filter.' : 'When students submit an assignment from a lesson, it will show up here for review.'}
            </p>
            {hasFilters && (
                <Button variant="outline" size="sm" onClick={() => router.get(BASE, {}, { preserveState: true, replace: true })} className="mt-3 border-cp-line">
                    Clear filters
                </Button>
            )}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assignments" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col gap-1 pt-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Assignments</h1>
                            <span className="rounded-full bg-cp-brand-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cp-brand-ink uppercase">Live Sync</span>
                        </div>
                        <p className="text-sm text-cp-muted">Review student submissions and send feedback.</p>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col gap-3 rounded-xl bg-cp-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div data-scroll-x className="flex items-center gap-1 overflow-x-auto rounded-lg bg-cp-canvas p-1">
                            {STATUS_TABS.map((tab) => {
                                const active = activeStatus === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => applyFilters({ status: tab.key === 'all' ? null : tab.key })}
                                        className={cn(
                                            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs md:py-1.5 font-medium whitespace-nowrap transition-colors',
                                            active ? 'bg-cp-surface text-cp-brand-ink shadow-sm' : 'text-cp-muted hover:text-cp-ink',
                                        )}
                                    >
                                        <span className={cn('size-2 rounded-full', tab.dot)} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                        {courseFilter && (
                            <span className="flex w-fit items-center gap-1.5 rounded-full bg-cp-brand-soft py-1 pr-1.5 pl-3 text-xs font-medium text-cp-brand-ink">
                                <GraduationCap className="size-3.5" />
                                <span className="max-w-[240px] truncate">{filteredCourseTitle ?? 'Selected course'}</span>
                                <button onClick={() => applyFilters({ course: null })} aria-label="Remove course filter" className="rounded-full p-0.5 hover:bg-cp-surface/70">
                                    <X className="size-3.5" />
                                </button>
                            </span>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl bg-cp-surface shadow-sm">
                        <div className="flex items-center justify-between border-b border-cp-line/70 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-cp-ink">Submissions</h2>
                                <p className="mt-0.5 text-xs text-cp-muted">
                                    {submissions.total > 0 ? `Showing ${submissions.from ?? 0}–${submissions.to ?? 0} of ${submissions.total} submissions` : 'No submissions to show'}
                                </p>
                            </div>
                        </div>
                        {/* phone: table ki jagah cards (same data + same actions) */}
                        {submissions.data.length === 0 ? (
                            <div className="p-4 md:hidden">{noResults}</div>
                        ) : (
                            <MobileCardList>
                                {submissions.data.map((row) => {
                                    const name = studentName(row);
                                    return (
                                        <MobileCard
                                            key={row.id}
                                            onOpen={() => openReview(row)}
                                            leading={<div className={cn('flex size-9 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(name))}>{initials(name)}</div>}
                                            title={lessonTitle(row)}
                                            subtitle={`${name ?? 'Anonymous'} · ${courseTitle(row)}`}
                                            trailing={<SubmissionStatusPill status={row.status} />}
                                            meta={
                                                <>
                                                    <span>{formatDateTime(row.submitted_at)}</span>
                                                    {row.submission_file_path && (
                                                        <span className="inline-flex items-center gap-1 text-cp-brand-ink">
                                                            <Paperclip className="size-3" /> File
                                                        </span>
                                                    )}
                                                </>
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
                                        <th className="px-6 py-3">Student</th>
                                        <th className="px-4 py-3">Assignment</th>
                                        <th className="px-4 py-3">Submitted</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cp-line/50">
                                    {submissions.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8">
                                                {noResults}
                                            </td>
                                        </tr>
                                    )}
                                    {submissions.data.map((row) => {
                                        const name = studentName(row);
                                        return (
                                            <tr key={row.id} onClick={() => openReview(row)} className="group cursor-pointer transition hover:bg-cp-canvas/60">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex min-w-[200px] items-center gap-2.5">
                                                        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(name))}>{initials(name)}</div>
                                                        <div className="min-w-0">
                                                            <span className="block max-w-[200px] truncate text-[13px] font-semibold text-cp-ink group-hover:text-cp-brand-ink">{name ?? 'Anonymous'}</span>
                                                            <span className="block max-w-[200px] truncate text-xs text-cp-muted">{row.enrollment?.customer?.email ?? '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="block max-w-[260px] truncate text-[13px] font-medium text-cp-ink">{lessonTitle(row)}</span>
                                                    <span className="mt-0.5 flex items-center gap-2 text-xs text-cp-muted">
                                                        <span className="max-w-[200px] truncate">{courseTitle(row)}</span>
                                                        {row.submission_file_path && (
                                                            <span title="Has attachment" className="inline-flex items-center text-cp-brand-ink">
                                                                <Paperclip className="size-3" />
                                                                <span className="sr-only">Has attachment</span>
                                                            </span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs whitespace-nowrap text-cp-body">{formatDateTime(row.submitted_at)}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <SubmissionStatusPill status={row.status} />
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <ChevronRight className="ml-auto size-4 text-cp-muted transition group-hover:translate-x-0.5 group-hover:text-cp-ink" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {submissions.total > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-cp-line/60 p-4 sm:flex-row">
                                <p className="text-xs text-cp-muted">
                                    Page <span className="font-semibold text-cp-ink">{submissions.current_page}</span> of <span className="font-semibold text-cp-ink">{submissions.last_page}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={submissions.current_page <= 1} onClick={() => goToPage(submissions.current_page - 1)} className="border-cp-line">
                                        Previous
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={submissions.current_page >= submissions.last_page} onClick={() => goToPage(submissions.current_page + 1)} className="border-cp-line">
                                        Next <ArrowUpRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ReviewDrawer submission={selected} open={open} onClose={() => setOpen(false)} />
        </AppLayout>
    );
}
