import { categoryLabel, lockedSummaryText } from '@/components/public/locked-content-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Copy,
    CopyPlus,
    ExternalLink,
    EyeOff,
    FileWarning,
    Inbox,
    Info,
    Link2,
    Loader2,
    Lock,
    MoreHorizontal,
    Pencil,
    Plus,
    Rocket,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

const BASE = '/dashboard/locked-content';
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Locked content', href: BASE }];

type LockedStatus = 'draft' | 'unpublished' | 'published';
type PricingType = 'fixed' | 'customer_decides' | 'free';
interface LockedDetail {
    category: string | null;
    public_teaser: string | null;
    hidden_message: string | null;
    hidden_video_url: string | null;
    images_count?: number;
    files_count?: number;
}

interface LockedRow {
    id: number;
    uuid: string;
    title: string;
    slug: string;
    status: LockedStatus;
    pricing_type: PricingType;
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    sales_count: number;
    revenue_total: string | number;
    views_count: number;
    published_at: string | null;
    created_at: string;
    cover_image: string | null;
    locked_content_detail: LockedDetail | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface LockedIndexProps {
    items: Paginated<LockedRow>;
    counts: Partial<Record<LockedStatus, number>>;
    filters: { status?: string | null; search?: string | null };
}

type Notice = { kind: 'success' | 'error'; text: string };

const STATUS_TABS: { key: 'all' | LockedStatus; label: string; dot: string }[] = [
    { key: 'all', label: 'All', dot: 'bg-[#FF6B4A]' },
    { key: 'published', label: 'Published', dot: 'bg-[#059669]' },
    { key: 'draft', label: 'Draft', dot: 'bg-amber-500' },
    { key: 'unpublished', label: 'Unpublished', dot: 'bg-[#8A8A96]' },
];

const STATUS_META: Record<LockedStatus, { label: string; chip: string; dot: string }> = {
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

function money(amount: number | string | null | undefined): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
}

function tileTone(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
    return TILE_TONES[h % TILE_TONES.length];
}

function publicUrl(slug: string) {
    return `${window.location.origin}/l/${slug}`;
}

function errorText(errors: Record<string, string>, fallback: string) {
    const messages = Object.values(errors).filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Events / Courses)                     */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: LockedStatus }) {
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

function DeleteModal({ entry, busy, onCancel, onConfirm }: { entry: LockedRow | null; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
    useEffect(() => {
        if (!entry) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [entry, busy, onCancel]);

    if (!entry) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div onClick={() => !busy && onCancel()} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-locked-title"
                className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#FFEDE8] text-[#C2410C]">
                    <Trash2 className="size-5" />
                </span>
                <h3 id="delete-locked-title" className="mt-4 text-base font-semibold text-[#14141B]">
                    Delete this locked content?
                </h3>
                <p className="mt-1.5 text-sm text-[#6B6B78]">
                    <span className="font-semibold text-[#14141B]">{entry.title || 'Untitled locked content'}</span> will be removed from your store.
                    Past orders and unlocks stay on record.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={busy} className="border-[#E4E2DA]">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={busy} className="bg-[#D93838] text-white hover:bg-[#B92D2D]">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {busy ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  TABLE PIECES                                                       */
/* ------------------------------------------------------------------ */

function PriceCell({ entry }: { entry: LockedRow }) {
    if (entry.pricing_type === 'free') return <span className="text-[13px] font-semibold text-[#059669]">Free</span>;
    if (entry.pricing_type === 'customer_decides') return <span className="text-[13px] font-semibold text-[#14141B]">Pay what you want</span>;

    const discounted = entry.has_discount && entry.discounted_price !== null && Number(entry.discounted_price) < Number(entry.price);
    return (
        <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#14141B]">{money(discounted ? entry.discounted_price : entry.price)}</span>
            {discounted && <span className="text-xs text-[#8A8A96] line-through">{money(entry.price)}</span>}
        </div>
    );
}

function CategoryChip({ entry }: { entry: LockedRow }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#4F46E5]">
            {categoryLabel(entry.locked_content_detail?.category)}
        </span>
    );
}

function ContentChip({ entry }: { entry: LockedRow }) {
    const d = entry.locked_content_detail;
    const summary = d
        ? lockedSummaryText({
              has_message: Boolean(d.hidden_message),
              has_video: Boolean(d.hidden_video_url),
              image_count: d.images_count ?? 0,
              file_count: d.files_count ?? 0,
          })
        : '';
    if (summary) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#E6F6EC] px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
                <CheckCircle2 className="size-3" /> {summary}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF4DB] px-2 py-0.5 text-[11px] font-semibold text-[#B46E00]">
            <FileWarning className="size-3" /> No content yet
        </span>
    );
}

function RowActions({
    entry,
    busy,
    onAction,
}: {
    entry: LockedRow;
    busy: boolean;
    onAction: (action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') => void;
}) {
    const published = entry.status === 'published';
    const itemClass =
        'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#4B4B57] focus:bg-[#F6F5F2] focus:text-[#14141B] [&_svg]:text-[#8A8A96]';

    return (
        <div className="">
            <DropdownMenuShim
                trigger={
                    <button
                        type="button"
                        aria-label={`More actions for ${entry.title}`}
                        disabled={busy}
                        className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B] disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="size-[18px] animate-spin" /> : <MoreHorizontal className="size-[18px]" />}
                    </button>
                }
            >
                {published && (
                    <>
                        <DropdownItemShim asChild className={itemClass}>
                            <a href={publicUrl(entry.slug)} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-4" /> View live page
                            </a>
                        </DropdownItemShim>
                        <DropdownItemShim onSelect={() => onAction('copy')} className={itemClass}>
                            <Copy className="size-4" /> Copy link
                        </DropdownItemShim>
                    </>
                )}
                <DropdownItemShim onSelect={() => onAction('duplicate')} className={itemClass}>
                    <CopyPlus className="size-4" /> Duplicate
                </DropdownItemShim>
                {published ? (
                    <DropdownItemShim onSelect={() => onAction('unpublish')} className={itemClass}>
                        <EyeOff className="size-4" /> Unpublish
                    </DropdownItemShim>
                ) : (
                    <DropdownItemShim onSelect={() => onAction('publish')} className={itemClass}>
                        <Rocket className="size-4" /> Publish
                    </DropdownItemShim>
                )}
                <DropdownDividerShim />
                <DropdownItemShim
                    onSelect={() => onAction('delete')}
                    className={cn(itemClass, 'text-[#C2410C] focus:bg-[#FFEDE8] focus:text-[#C2410C] [&_svg]:!text-[#C2410C]')}
                >
                    <Trash2 className="size-4" /> Delete
                </DropdownItemShim>
            </DropdownMenuShim>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function LockedContentIndex({ items, counts, filters }: LockedIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [toDelete, setToDelete] = useState<LockedRow | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 7000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const activeStatus = (filters.status as LockedStatus | undefined) || 'all';
    const countOf = (key: 'all' | LockedStatus) =>
        key === 'all' ? (counts.draft ?? 0) + (counts.published ?? 0) + (counts.unpublished ?? 0) : (counts[key] ?? 0);
    const totalItems = countOf('all');
    const hasFilters = Boolean(filters.status || filters.search);

    function applyFilters(overrides: { status?: string | null; search?: string | null }) {
        const merged = { status: filters.status || null, search: search.trim() || null, ...overrides };
        router.get(BASE, { status: merged.status || undefined, search: merged.search || undefined }, { preserveState: true, replace: true });
    }

    function submitSearch(e: FormEvent) {
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

    function createItem() {
        if (creating) return;
        setCreating(true);
        // A draft is created first so the creator lands directly in the
        // full-screen editor, where every field has a live public preview.
        router.post(BASE, { title: 'Untitled locked content', pricing_type: 'fixed', price: 0 }, { onFinish: () => setCreating(false) });
    }

    function runAction(entry: LockedRow, action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') {
        const name = entry.title || 'Untitled locked content';

        if (action === 'copy') {
            navigator.clipboard?.writeText(publicUrl(entry.slug));
            setNotice({ kind: 'success', text: 'Link copied.' });
            return;
        }
        if (action === 'delete') {
            setToDelete(entry);
            return;
        }

        setBusyId(entry.id);
        const done = { preserveScroll: true, onFinish: () => setBusyId(null) };

        if (action === 'duplicate') {
            // redirects to the edit page of the new draft copy
            router.post(`${BASE}/${entry.uuid}/duplicate`, {}, done);
            return;
        }

        const status = action === 'publish' ? 'published' : 'unpublished';
        router.post(
            `${BASE}/${entry.uuid}/publish`,
            { status },
            {
                ...done,
                onSuccess: () =>
                    setNotice({
                        kind: 'success',
                        text: status === 'published' ? `“${name}” is now live.` : `“${name}” has been unpublished.`,
                    }),
                onError: (errors) =>
                    setNotice({
                        kind: 'error',
                        text: `Couldn't publish “${name}”. ${errorText(errors, 'Please try again.')}`,
                    }),
            },
        );
    }

    function confirmDelete() {
        if (!toDelete) return;
        const name = toDelete.title || 'Untitled locked content';
        setBusyId(toDelete.id);
        router.delete(`${BASE}/${toDelete.uuid}`, {
            preserveScroll: true,
            onSuccess: () => {
                setToDelete(null);
                setNotice({ kind: 'success', text: `“${name}” was deleted.` });
            },
            onError: (errors) => {
                setToDelete(null);
                setNotice({ kind: 'error', text: errorText(errors, 'Could not delete this item.') });
            },
            onFinish: () => setBusyId(null),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Locked content" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Locked content</h1>
                                <span className="rounded-full bg-[#FFF4DB] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#B46E00] uppercase">
                                    Pay to unlock
                                </span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">
                                Put messages, images, videos or files behind a paywall — buyers unlock them instantly after payment.
                            </p>
                        </div>
                        <Button onClick={createItem} disabled={creating} className="w-fit bg-[#4F46E5] hover:bg-[#4338CA]">
                            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            {creating ? 'Opening editor…' : 'Create locked content'}
                        </Button>
                    </div>

                    {/* Notice */}
                    {notice && (
                        <div
                            role={notice.kind === 'error' ? 'alert' : 'status'}
                            className={cn(
                                'flex items-start justify-between gap-3 rounded-xl p-3.5 text-[13px] font-semibold',
                                notice.kind === 'success' ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#FFEDE8] text-[#C2410C]',
                            )}
                        >
                            <span className="flex items-start gap-2">
                                {notice.kind === 'success' ? (
                                    <CheckCircle2 className="mt-px size-[18px] shrink-0" />
                                ) : (
                                    <Info className="mt-px size-[18px] shrink-0" />
                                )}
                                {notice.text}
                            </span>
                            <button onClick={() => setNotice(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-white/60">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {/* First-run empty state */}
                    {totalItems === 0 && !hasFilters ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#FFF4DB] text-[#B46E00]">
                                <Lock className="size-7" />
                            </span>
                            <h2 className="text-lg font-semibold text-[#14141B]">Create your first locked content</h2>
                            <p className="max-w-md text-sm text-[#8A8A96]">
                                Write a private message or upload images, a video link or files — visitors see only a teaser until they pay.
                            </p>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#4B4B57]">
                                {['Messages', 'Images & video', 'Any file', 'Instant unlock'].map((f) => (
                                    <span key={f} className="rounded-full bg-[#F6F5F2] px-2.5 py-1">
                                        {f}
                                    </span>
                                ))}
                            </div>
                            <Button onClick={createItem} disabled={creating} className="mt-3 bg-[#4F46E5] hover:bg-[#4338CA]">
                                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                {creating ? 'Opening editor…' : 'Create locked content'}
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
                                                <span className={cn('font-semibold', active ? 'text-[#4F46E5]' : 'text-[#8A8A96]')}>
                                                    {countOf(tab.key)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <form onSubmit={submitSearch} className="relative max-w-sm">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by title…"
                                        aria-label="Search locked content"
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

                            {/* Locked content table */}
                            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#14141B]">Your locked content</h2>
                                        <p className="mt-0.5 text-xs text-[#8A8A96]">
                                            {items.total > 0
                                                ? `Showing ${items.from ?? 0}–${items.to ?? 0} of ${items.total} items`
                                                : 'Nothing matches these filters'}
                                        </p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                                <th className="px-6 py-3">Title</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3">Hidden content</th>
                                                <th className="px-4 py-3">Price</th>
                                                <th className="px-4 py-3">Sales</th>
                                                <th className="px-4 py-3 text-center">Status</th>
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
                                                            <p className="mt-1 text-sm font-semibold text-[#14141B]">Nothing found</p>
                                                            <p className="max-w-xs px-4 text-xs text-[#8A8A96]">
                                                                Try a different search or status filter.
                                                            </p>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={clearFilters}
                                                                className="mt-3 border-[#E4E2DA]"
                                                            >
                                                                Clear filters
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {items.data.map((entry) => {
                                                const conversion = entry.views_count > 0 ? (entry.sales_count / entry.views_count) * 100 : null;
                                                const editUrl = `${BASE}/${entry.uuid}/edit`;
                                                return (
                                                    <tr
                                                        key={entry.id}
                                                        onClick={() => router.visit(editUrl)}
                                                        className="group cursor-pointer transition hover:bg-[#F6F5F2]/60"
                                                    >
                                                        <td className="px-6 py-3.5">
                                                            <div className="flex min-w-[260px] items-center gap-3">
                                                                <span
                                                                    className={cn(
                                                                        'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
                                                                        entry.cover_image
                                                                            ? 'bg-[#F6F5F2]'
                                                                            : tileTone(entry.title || String(entry.id)),
                                                                    )}
                                                                >
                                                                    {entry.cover_image ? (
                                                                        <img src={entry.cover_image} alt="" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <Lock className="size-5" />
                                                                    )}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <span className="block max-w-[280px] truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">
                                                                        {entry.title || 'Untitled locked content'}
                                                                    </span>
                                                                    {entry.locked_content_detail?.public_teaser && (
                                                                        <span className="mt-0.5 block max-w-[280px] truncate text-xs text-[#8A8A96]">
                                                                            {entry.locked_content_detail.public_teaser}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <CategoryChip entry={entry} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <ContentChip entry={entry} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <PriceCell entry={entry} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span className="block text-[13px] font-bold text-[#14141B]">
                                                                {money(entry.revenue_total)}
                                                            </span>
                                                            <span className="text-xs text-[#8A8A96]">
                                                                {entry.sales_count} {entry.sales_count === 1 ? 'sale' : 'sales'} ·{' '}
                                                                {conversion === null ? 'no views' : `${conversion.toFixed(1)}% conv.`}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                            <StatusPill status={entry.status} />
                                                        </td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <Link
                                                                    href={editUrl}
                                                                    title="Edit"
                                                                    aria-label={`Edit ${entry.title}`}
                                                                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                                                >
                                                                    <Pencil className="size-[18px]" />
                                                                </Link>
                                                                <RowActions
                                                                    entry={entry}
                                                                    busy={busyId === entry.id}
                                                                    onAction={(a) => runAction(entry, a)}
                                                                />
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
                                            Page <span className="font-semibold text-[#14141B]">{items.current_page}</span> of{' '}
                                            <span className="font-semibold text-[#14141B]">{items.last_page}</span>
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={items.current_page <= 1}
                                                onClick={() => goToPage(items.current_page - 1)}
                                                className="border-[#E4E2DA]"
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={items.current_page >= items.last_page}
                                                onClick={() => goToPage(items.current_page + 1)}
                                                className="border-[#E4E2DA]"
                                            >
                                                Next <ArrowUpRight className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="flex items-center gap-1.5 text-xs text-[#8A8A96]">
                                <Link2 className="size-3.5 text-[#FF6B4A]" />
                                Buyers unlock the hidden content the moment their payment settles.
                            </p>
                        </>
                    )}
                </div>
            </div>

            <DeleteModal
                entry={toDelete}
                busy={busyId !== null && busyId === toDelete?.id}
                onCancel={() => setToDelete(null)}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  LIGHTWEIGHT DROPDOWN SHIMS                                          */
/*  (matches the DropdownMenu primitives used elsewhere — kept inline   */
/*   so this file is self-contained and doesn't import the whole UI kit)*/
/* ------------------------------------------------------------------ */

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type * as React from 'react';

function DropdownMenuShim({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-[#E4E2DA] bg-white p-1.5 shadow-lg">
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function DropdownItemShim({
    onSelect,
    asChild,
    className,
    children,
}: {
    onSelect?: () => void;
    asChild?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <DropdownMenuItem onSelect={onSelect} asChild={asChild} className={className}>
            {children}
        </DropdownMenuItem>
    );
}

function DropdownDividerShim() {
    return <DropdownMenuSeparator className="bg-[#E4E2DA]/70" />;
}
