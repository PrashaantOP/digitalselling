import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    Award,
    CheckCircle2,
    Copy,
    CopyPlus,
    ExternalLink,
    EyeOff,
    GraduationCap,
    Info,
    Infinity as InfinityIcon,
    Inbox,
    Layers,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Rocket,
    Search,
    Timer,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const BASE = '/dashboard/courses';
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Courses', href: BASE }];

type CourseStatus = 'draft' | 'unpublished' | 'published';
type PricingType = 'fixed' | 'customer_decides' | 'free';

interface CourseDetail {
    access_type: 'lifetime' | 'days';
    access_days: number | null;
    certificate_enabled: boolean;
    total_lessons: number;
}

interface CourseRow {
    id: number;
    uuid: string;
    title: string;
    slug: string;
    status: CourseStatus;
    pricing_type: PricingType;
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    sales_count: number;
    revenue_total: string | number;
    views_count: number;
    published_at: string | null;
    created_at: string;
    course_detail: CourseDetail | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface CoursesIndexProps {
    items: Paginated<CourseRow>;
    /** Laravel sends [] (not {}) when there are no rows, so every key is optional */
    counts: Partial<Record<CourseStatus, number>>;
    filters: { status?: string | null; search?: string | null };
}

type Notice = { kind: 'success' | 'error'; text: string };

const STATUS_TABS: { key: 'all' | CourseStatus; label: string; dot: string }[] = [
    { key: 'all', label: 'All', dot: 'bg-[#4F46E5]' },
    { key: 'published', label: 'Published', dot: 'bg-[#059669]' },
    { key: 'draft', label: 'Draft', dot: 'bg-amber-500' },
    { key: 'unpublished', label: 'Unpublished', dot: 'bg-[#8A8A96]' },
];

const STATUS_META: Record<CourseStatus, { label: string; chip: string; dot: string }> = {
    published: { label: 'Published', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
    draft: { label: 'Draft', chip: 'bg-[#FFF4DB] text-[#B46E00]', dot: 'bg-amber-500' },
    unpublished: { label: 'Unpublished', chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' },
};

const TILE_TONES = [
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

/** formatCurrency() rounds to whole rupees — prices/revenue can carry paise, so show decimals when present. */
function money(amount: number | string | null | undefined): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount) || 0);
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tileTone(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
    return TILE_TONES[h % TILE_TONES.length];
}

function publicUrl(slug: string) {
    return `${window.location.origin}/c/${slug}`;
}

function errorText(errors: Record<string, string>, fallback: string) {
    const messages = Object.values(errors).filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Payments / Payouts)                    */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: CourseStatus }) {
    const meta = STATUS_META[status] ?? STATUS_META.draft;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  DELETE CONFIRM                                                     */
/* ------------------------------------------------------------------ */

function DeleteModal({ course, busy, onCancel, onConfirm }: { course: CourseRow | null; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
    useEffect(() => {
        if (!course) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [course, busy, onCancel]);

    if (!course) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div onClick={() => !busy && onCancel()} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div role="alertdialog" aria-modal="true" aria-labelledby="delete-course-title" className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#FFEDE8] text-[#C2410C]">
                    <Trash2 className="size-5" />
                </span>
                <h3 id="delete-course-title" className="mt-4 text-base font-semibold text-[#14141B]">
                    Delete this course?
                </h3>
                <p className="mt-1.5 text-sm text-[#6B6B78]">
                    <span className="font-semibold text-[#14141B]">{course.title || 'Untitled course'}</span> will be removed from your store. Past orders and payments stay on record.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={busy} className="border-[#E4E2DA]">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={busy} className="bg-[#D93838] text-white hover:bg-[#B92D2D]">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {busy ? 'Deleting…' : 'Delete course'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  TABLE PIECES                                                       */
/* ------------------------------------------------------------------ */

function PriceCell({ course }: { course: CourseRow }) {
    if (course.pricing_type === 'free') return <span className="text-[13px] font-semibold text-[#059669]">Free</span>;
    if (course.pricing_type === 'customer_decides') return <span className="text-[13px] font-semibold text-[#14141B]">Pay what you want</span>;

    const discounted = course.has_discount && course.discounted_price !== null && Number(course.discounted_price) < Number(course.price);
    return (
        <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#14141B]">{money(discounted ? course.discounted_price : course.price)}</span>
            {discounted && <span className="text-xs text-[#8A8A96] line-through">{money(course.price)}</span>}
        </div>
    );
}

function RowActions({ course, busy, onAction }: { course: CourseRow; busy: boolean; onAction: (action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') => void }) {
    const published = course.status === 'published';
    const itemClass = 'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#4B4B57] focus:bg-[#F6F5F2] focus:text-[#14141B] [&_svg]:text-[#8A8A96]';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`More actions for ${course.title}`}
                    disabled={busy}
                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B] disabled:opacity-50 data-[state=open]:bg-[#F0EFEA]"
                >
                    {busy ? <Loader2 className="size-[18px] animate-spin" /> : <MoreHorizontal className="size-[18px]" />}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#E4E2DA] bg-white p-1.5 shadow-lg">
                {published && (
                    <>
                        <DropdownMenuItem asChild className={itemClass}>
                            <a href={publicUrl(course.slug)} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-4" /> View live page
                            </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onAction('copy')} className={itemClass}>
                            <Copy className="size-4" /> Copy link
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuItem onSelect={() => onAction('duplicate')} className={itemClass}>
                    <CopyPlus className="size-4" /> Duplicate
                </DropdownMenuItem>
                {published ? (
                    <DropdownMenuItem onSelect={() => onAction('unpublish')} className={itemClass}>
                        <EyeOff className="size-4" /> Unpublish
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onSelect={() => onAction('publish')} className={itemClass}>
                        <Rocket className="size-4" /> Publish
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#E4E2DA]/70" />
                <DropdownMenuItem onSelect={() => onAction('delete')} className={cn(itemClass, 'text-[#C2410C] focus:bg-[#FFEDE8] focus:text-[#C2410C] [&_svg]:!text-[#C2410C]')}>
                    <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function CoursesIndex({ items, counts, filters }: CoursesIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [toDelete, setToDelete] = useState<CourseRow | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 7000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const activeStatus = (filters.status as CourseStatus | undefined) || 'all';
    const countOf = (key: 'all' | CourseStatus) => (key === 'all' ? (counts.draft ?? 0) + (counts.published ?? 0) + (counts.unpublished ?? 0) : (counts[key] ?? 0));
    const totalCourses = countOf('all');
    const hasFilters = Boolean(filters.status || filters.search);

    function applyFilters(overrides: { status?: string | null; search?: string | null }) {
        const merged = { status: filters.status || null, search: search.trim() || null, ...overrides };
        router.get(BASE, { status: merged.status || undefined, search: merged.search || undefined }, { preserveState: true, replace: true });
    }

    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilters({});
    }

    function clearFilters() {
        setSearch('');
        router.get(BASE, {}, { preserveState: true, replace: true });
    }

    function goToPage(page: number) {
        router.get(BASE, { status: filters.status || undefined, search: filters.search || undefined, page }, { preserveState: true });
    }

    function runAction(course: CourseRow, action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') {
        const name = course.title || 'Untitled course';

        if (action === 'copy') {
            navigator.clipboard?.writeText(publicUrl(course.slug));
            setNotice({ kind: 'success', text: 'Course link copied.' });
            return;
        }
        if (action === 'delete') {
            setToDelete(course);
            return;
        }

        setBusyId(course.id);
        const done = { preserveScroll: true, onFinish: () => setBusyId(null) };

        if (action === 'duplicate') {
            // redirects to the edit page of the new draft copy
            router.post(`${BASE}/${course.uuid}/duplicate`, {}, done);
            return;
        }

        const status = action === 'publish' ? 'published' : 'unpublished';
        router.post(`${BASE}/${course.uuid}/publish`, { status }, {
            ...done,
            onSuccess: () => setNotice({ kind: 'success', text: status === 'published' ? `“${name}” is now live.` : `“${name}” has been unpublished.` }),
            onError: (errors) => setNotice({ kind: 'error', text: `Couldn't publish “${name}”. ${errorText(errors, 'Please try again.')}` }),
        });
    }

    function createCourse() {
        if (creating) return;
        setCreating(true);
        // Direct open: blank draft banao aur seedha live-preview editor kholo (event jaisa flow)
        router.post(BASE, { title: 'Untitled course', pricing_type: 'free', price: 0 }, { onFinish: () => setCreating(false) });
    }

    function confirmDelete() {
        if (!toDelete) return;
        const name = toDelete.title || 'Untitled course';
        setBusyId(toDelete.id);
        router.delete(`${BASE}/${toDelete.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setToDelete(null);
                setNotice({ kind: 'success', text: `“${name}” was deleted.` });
            },
            onError: (errors) => {
                setToDelete(null);
                setNotice({ kind: 'error', text: errorText(errors, 'Could not delete the course.') });
            },
            onFinish: () => setBusyId(null),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courses" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Courses</h1>
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">Live Sync</span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">Build, price and publish courses — track sales and students from one place.</p>
                        </div>
                        <Button onClick={createCourse} disabled={creating} className="w-fit bg-[#4F46E5] hover:bg-[#4338CA]">
                            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {creating ? 'Creating…' : 'Create course'}
                        </Button>
                    </div>

                    {/* Notice */}
                    {notice && (
                        <div
                            role={notice.kind === 'error' ? 'alert' : 'status'}
                            className={cn('flex items-start justify-between gap-3 rounded-xl p-3.5 text-[13px] font-semibold', notice.kind === 'success' ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#FFEDE8] text-[#C2410C]')}
                        >
                            <span className="flex items-start gap-2">
                                {notice.kind === 'success' ? <CheckCircle2 className="mt-px size-[18px] shrink-0" /> : <Info className="mt-px size-[18px] shrink-0" />}
                                {notice.text}
                            </span>
                            <button onClick={() => setNotice(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-white/60">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {/* First-run empty state */}
                    {totalCourses === 0 && !hasFilters ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                                <GraduationCap className="size-7" />
                            </span>
                            <h2 className="text-lg font-semibold text-[#14141B]">Create your first course</h2>
                            <p className="max-w-md text-sm text-[#8A8A96]">Organise lessons into modules, add videos, notes, quizzes and assignments, then sell it from your store.</p>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#4B4B57]">
                                {['Modules & lessons', 'Quizzes', 'Assignments', 'Live classes', 'Certificates'].map((f) => (
                                    <span key={f} className="rounded-full bg-[#F6F5F2] px-2.5 py-1">
                                        {f}
                                    </span>
                                ))}
                            </div>
                            <Button onClick={createCourse} disabled={creating} className="mt-3 bg-[#4F46E5] hover:bg-[#4338CA]">
                                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {creating ? 'Creating…' : 'Create course'}
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Filters */}
                            <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#F6F5F2] p-1">
                                    {STATUS_TABS.map((tab) => {
                                        const active = activeStatus === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => applyFilters({ status: tab.key === 'all' ? null : tab.key })}
                                                className={cn(
                                                    'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                                                    active ? 'bg-white text-[#4F46E5] shadow-sm' : 'text-[#8A8A96] hover:text-[#14141B]',
                                                )}
                                            >
                                                <span className={cn('size-2 rounded-full', tab.dot)} />
                                                {tab.label}
                                                <span className={cn('font-semibold', active ? 'text-[#4F46E5]' : 'text-[#8A8A96]')}>{countOf(tab.key)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <form onSubmit={submitSearch} className="relative max-w-sm">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search courses by title…"
                                        aria-label="Search courses"
                                        className="w-full rounded-lg bg-[#F6F5F2] py-2 pr-9 pl-9 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                if (filters.search) applyFilters({ search: null });
                                            }}
                                            aria-label="Clear search"
                                            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-[#8A8A96] hover:text-[#14141B]"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </form>
                            </div>

                            {/* Courses table */}
                            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#14141B]">Your courses</h2>
                                        <p className="mt-0.5 text-xs text-[#8A8A96]">
                                            {items.total > 0 ? `Showing ${items.from ?? 0}–${items.to ?? 0} of ${items.total} courses` : 'No courses match these filters'}
                                        </p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                                <th className="px-6 py-3">Course</th>
                                                <th className="px-4 py-3">Price</th>
                                                <th className="px-4 py-3">Sales</th>
                                                <th className="px-4 py-3">Views</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                                <th className="px-4 py-3">Created</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E4E2DA]/50">
                                            {items.data.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-8">
                                                        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                                                            <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                                                                <Inbox className="size-5" />
                                                            </span>
                                                            <p className="mt-1 text-sm font-semibold text-[#14141B]">No courses found</p>
                                                            <p className="max-w-xs px-4 text-xs text-[#8A8A96]">Try a different search or status filter.</p>
                                                            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 border-[#E4E2DA]">
                                                                Clear filters
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {items.data.map((course) => {
                                                const detail = course.course_detail;
                                                const conversion = course.views_count > 0 ? (course.sales_count / course.views_count) * 100 : null;
                                                const editUrl = `${BASE}/${course.uuid}/edit`;
                                                return (
                                                    <tr key={course.id} onClick={() => router.visit(editUrl)} className="group cursor-pointer transition hover:bg-[#F6F5F2]/60">
                                                        <td className="px-6 py-3.5">
                                                            <div className="flex min-w-[260px] items-center gap-3">
                                                                <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tileTone(course.title || String(course.id)))}>
                                                                    <GraduationCap className="size-5" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <span className="block max-w-[280px] truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{course.title || 'Untitled course'}</span>
                                                                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#8A8A96]">
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Layers className="size-3" /> {detail?.total_lessons ?? 0} {(detail?.total_lessons ?? 0) === 1 ? 'lesson' : 'lessons'}
                                                                        </span>
                                                                        {detail && (
                                                                            <span className="inline-flex items-center gap-1">
                                                                                {detail.access_type === 'days' ? <Timer className="size-3" /> : <InfinityIcon className="size-3" />}
                                                                                {detail.access_type === 'days' ? `${detail.access_days ?? '—'} days access` : 'Lifetime access'}
                                                                            </span>
                                                                        )}
                                                                        {detail?.certificate_enabled && (
                                                                            <span className="inline-flex items-center gap-1 text-[#B46E00]">
                                                                                <Award className="size-3" /> Certificate
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <PriceCell course={course} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span className="block text-[13px] font-bold text-[#14141B]">{money(course.revenue_total)}</span>
                                                            <span className="text-xs text-[#8A8A96]">
                                                                {course.sales_count} {course.sales_count === 1 ? 'sale' : 'sales'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span className="block text-[13px] font-semibold text-[#14141B]">{Number(course.views_count).toLocaleString('en-IN')}</span>
                                                            <span className="text-xs text-[#8A8A96]">{conversion === null ? 'No views yet' : `${conversion.toFixed(1)}% conversion`}</span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                            <StatusPill status={course.status} />
                                                        </td>
                                                        <td className="px-4 py-3.5 text-xs whitespace-nowrap text-[#8A8A96]">{formatDate(course.created_at)}</td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <Link
                                                                    href={`${BASE}/${course.uuid}/students`}
                                                                    title="Students"
                                                                    aria-label={`Students of ${course.title}`}
                                                                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                                                >
                                                                    <Users className="size-[18px]" />
                                                                </Link>
                                                                <Link
                                                                    href={editUrl}
                                                                    title="Edit course"
                                                                    aria-label={`Edit ${course.title}`}
                                                                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                                                >
                                                                    <Pencil className="size-[18px]" />
                                                                </Link>
                                                                <RowActions course={course} busy={busyId === course.id} onAction={(a) => runAction(course, a)} />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {items.total > 0 && (
                                    <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                                        <p className="text-xs text-[#8A8A96]">
                                            Page <span className="font-semibold text-[#14141B]">{items.current_page}</span> of <span className="font-semibold text-[#14141B]">{items.last_page}</span>
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" disabled={items.current_page <= 1} onClick={() => goToPage(items.current_page - 1)} className="border-[#E4E2DA]">
                                                Previous
                                            </Button>
                                            <Button variant="outline" size="sm" disabled={items.current_page >= items.last_page} onClick={() => goToPage(items.current_page + 1)} className="border-[#E4E2DA]">
                                                Next <ArrowUpRight className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <DeleteModal course={toDelete} busy={busyId !== null && busyId === toDelete?.id} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
        </AppLayout>
    );
}
