import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, Award, ChevronRight, ClipboardCheck, Inbox, Pencil, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Customer {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
}

interface EnrollmentRow {
    id: number;
    progress_percent: number | string | null;
    access_expires_at: string | null;
    completed_at: string | null;
    certificate_issued_at: string | null;
    created_at: string;
    customer: Customer | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface StudentsProps {
    course: { id: number; uuid: string; title: string; slug: string };
    enrollments: Paginated<EnrollmentRow>;
    filters: { search?: string | null };
}

type StudentStatus = 'completed' | 'expired' | 'in_progress' | 'not_started';

const STATUS_META: Record<StudentStatus, { label: string; chip: string; dot: string }> = {
    completed: { label: 'Completed', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
    in_progress: { label: 'In progress', chip: 'bg-[#EEF2FF] text-[#4F46E5]', dot: 'bg-[#4F46E5]' },
    not_started: { label: 'Not started', chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' },
    expired: { label: 'Access expired', chip: 'bg-[#FFEDE8] text-[#C2410C]', dot: 'bg-[#FF6B4A]' },
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

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function percentOf(row: EnrollmentRow) {
    return Math.min(100, Math.max(0, Number(row.progress_percent) || 0));
}

function isExpired(row: EnrollmentRow) {
    return Boolean(row.access_expires_at && new Date(row.access_expires_at).getTime() < Date.now());
}

function statusOf(row: EnrollmentRow): StudentStatus {
    const percent = percentOf(row);
    if (row.completed_at || percent >= 100) return 'completed';
    if (isExpired(row)) return 'expired';
    return percent > 0 ? 'in_progress' : 'not_started';
}

/** null expiry = the enrollment never expires (course access_type "lifetime"). */
function accessLabel(row: EnrollmentRow): { text: string; tone: string } {
    if (!row.access_expires_at) return { text: 'Lifetime', tone: 'text-[#4B4B57]' };
    const days = Math.ceil((new Date(row.access_expires_at).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { text: `Expired ${formatDate(row.access_expires_at)}`, tone: 'text-[#C2410C]' };
    if (days <= 7) return { text: `${days <= 0 ? 'Expires today' : `${days} ${days === 1 ? 'day' : 'days'} left`}`, tone: 'text-[#B46E00]' };
    return { text: `Until ${formatDate(row.access_expires_at)}`, tone: 'text-[#4B4B57]' };
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function CourseStudents({ course, enrollments, filters }: StudentsProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const base = `/dashboard/courses/${course.uuid}/students`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Courses', href: '/dashboard/courses' },
        { title: course.title || 'Untitled course', href: `/dashboard/courses/${course.uuid}/edit` },
        { title: 'Students', href: base },
    ];

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        router.get(base, { search: search.trim() || undefined }, { preserveState: true, replace: true });
    }

    function clearSearch() {
        setSearch('');
        if (filters.search) router.get(base, {}, { preserveState: true, replace: true });
    }

    function goToPage(page: number) {
        router.get(base, { search: filters.search || undefined, page }, { preserveState: true });
    }

    const searching = Boolean(filters.search);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Students · ${course.title || 'Course'}`} />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <Link href="/dashboard/courses" className="flex w-fit items-center gap-1.5 text-xs font-medium text-[#8A8A96] transition hover:text-[#14141B]">
                        <ArrowLeft className="size-3.5" /> All courses
                    </Link>

                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Students</h1>
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">Live Sync</span>
                            </div>
                            <p className="truncate text-sm text-[#8A8A96]">
                                Enrolled in <span className="font-semibold text-[#14141B]">{course.title || 'Untitled course'}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" asChild className="border-[#E4E2DA]">
                                <Link href={`/dashboard/assignments/submissions?course=${course.id}`}>
                                    <ClipboardCheck className="size-4" /> Assignments
                                </Link>
                            </Button>
                            <Button variant="outline" asChild className="border-[#E4E2DA]">
                                <Link href={`/dashboard/courses/${course.uuid}/edit`}>
                                    <Pencil className="size-4" /> Edit course
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                        <form onSubmit={submitSearch} className="relative max-w-sm">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, email or phone…"
                                aria-label="Search students"
                                className="w-full rounded-lg bg-[#F6F5F2] py-2 pr-9 pl-9 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20"
                            />
                            {search && (
                                <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-[#8A8A96] hover:text-[#14141B]">
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[#14141B]">Enrolled students</h2>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">
                                    {enrollments.total > 0
                                        ? `Showing ${enrollments.from ?? 0}–${enrollments.to ?? 0} of ${enrollments.total} ${enrollments.total === 1 ? 'student' : 'students'}${searching ? ' matching your search' : ''}`
                                        : searching
                                          ? 'No students match your search'
                                          : 'Nobody has enrolled yet'}
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                        <th className="px-6 py-3">Student</th>
                                        <th className="px-4 py-3">Enrolled</th>
                                        <th className="px-4 py-3">Progress</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3">Access</th>
                                        <th className="px-4 py-3 text-center">Certificate</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E4E2DA]/50">
                                    {enrollments.data.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8">
                                                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                                                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                                                        <Inbox className="size-5" />
                                                    </span>
                                                    <p className="mt-1 text-sm font-semibold text-[#14141B]">{searching ? 'No students found' : 'No students yet'}</p>
                                                    <p className="max-w-xs px-4 text-xs text-[#8A8A96]">
                                                        {searching ? 'Try a different name, email or phone number.' : 'Students appear here automatically as soon as they buy this course.'}
                                                    </p>
                                                    {searching && (
                                                        <Button variant="outline" size="sm" onClick={clearSearch} className="mt-3 border-[#E4E2DA]">
                                                            Clear search
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {enrollments.data.map((row) => {
                                        const percent = percentOf(row);
                                        const status = statusOf(row);
                                        const meta = STATUS_META[status];
                                        const access = accessLabel(row);
                                        const name = row.customer?.name ?? null;
                                        return (
                                            <tr key={row.id} onClick={() => router.visit(`/dashboard/enrollments/${row.id}`)} className="group cursor-pointer transition hover:bg-[#F6F5F2]/60">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex min-w-[220px] items-center gap-2.5">
                                                        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(name))}>{initials(name)}</div>
                                                        <div className="min-w-0">
                                                            <span className="block max-w-[220px] truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{name ?? 'Anonymous'}</span>
                                                            <span className="block max-w-[220px] truncate text-xs text-[#8A8A96]">{row.customer?.email ?? row.customer?.phone ?? '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs whitespace-nowrap text-[#4B4B57]">{formatDate(row.created_at)}</td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex min-w-[140px] items-center gap-2.5">
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ECEBE6]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                                                            <span className={cn('block h-full rounded-full', percent >= 100 ? 'bg-[#059669]' : 'bg-[#4F46E5]')} style={{ width: `${percent}%` }} />
                                                        </div>
                                                        <span className="w-9 text-right text-xs font-semibold text-[#14141B]">{percent}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
                                                        <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
                                                    </span>
                                                </td>
                                                <td className={cn('px-4 py-3.5 text-xs whitespace-nowrap', access.tone)}>{access.text}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {row.certificate_issued_at ? (
                                                        <span title={`Issued ${formatDate(row.certificate_issued_at)}`} className="inline-flex size-7 items-center justify-center rounded-full bg-[#FFF4DB] text-[#B46E00]">
                                                            <Award className="size-4" />
                                                            <span className="sr-only">Certificate issued</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[#8A8A96]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <ChevronRight className="ml-auto size-4 text-[#8A8A96] transition group-hover:translate-x-0.5 group-hover:text-[#14141B]" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {enrollments.total > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                                <p className="text-xs text-[#8A8A96]">
                                    Page <span className="font-semibold text-[#14141B]">{enrollments.current_page}</span> of <span className="font-semibold text-[#14141B]">{enrollments.last_page}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={enrollments.current_page <= 1} onClick={() => goToPage(enrollments.current_page - 1)} className="border-[#E4E2DA]">
                                        Previous
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={enrollments.current_page >= enrollments.last_page} onClick={() => goToPage(enrollments.current_page + 1)} className="border-[#E4E2DA]">
                                        Next <ArrowUpRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
