import { Button } from '@/components/ui/button';
import { useRefreshOnBack } from '@/hooks/use-refresh-on-back';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CheckCircle2,
    Copy,
    CopyPlus,
    CreditCard,
    ExternalLink,
    EyeOff,
    Inbox,
    Info,
    Link2,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    Rocket,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

const BASE = '/dashboard/payment-pages';
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payment Pages', href: BASE }];

type PaymentPageStatus = 'draft' | 'unpublished' | 'published';
type PricingType = 'fixed' | 'customer_decides' | 'free';

interface PaymentPageRow {
    id: number;
    uuid: string;
    title: string;
    slug: string;
    status: PaymentPageStatus;
    pricing_type: PricingType;
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    sales_count: number;
    revenue_total: string | number;
    views_count: number;
    published_at: string | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface PaymentPagesIndexProps {
    items: Paginated<PaymentPageRow>;
    counts: Partial<Record<PaymentPageStatus, number>>;
    filters: { status?: string | null; search?: string | null };
}

type Notice = { kind: 'success' | 'error'; text: string };

const STATUS_TABS: { key: 'all' | PaymentPageStatus; label: string; dot: string }[] = [
    { key: 'all', label: 'All', dot: 'bg-[#FF6B4A]' },
    { key: 'published', label: 'Published', dot: 'bg-[#059669]' },
    { key: 'draft', label: 'Draft', dot: 'bg-amber-500' },
    { key: 'unpublished', label: 'Unpublished', dot: 'bg-[#8A8A96]' },
];

const STATUS_META: Record<PaymentPageStatus, { label: string; chip: string; dot: string }> = {
    published: { label: 'Published', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
    draft: { label: 'Draft', chip: 'bg-[#FFF4DB] text-[#B46E00]', dot: 'bg-amber-500' },
    unpublished: { label: 'Unpublished', chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' },
};

const TILE_TONES = [
    'bg-[#E1F6F3] text-[#0D9488]',
    'bg-[#EEF2FF] text-[#4F46E5]',
    'bg-[#FFF4DB] text-[#B46E00]',
    'bg-[#FFEDE8] text-[#C2410C]',
    'bg-[#F1EAFE] text-[#7C3AED]',
    'bg-[#E6F2FF] text-[#0284C7]',
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
    return `${window.location.origin}/p/${slug}`;
}

function errorText(errors: Record<string, string>, fallback: string) {
    const messages = Object.values(errors).filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Books / Events / Courses)              */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: PaymentPageStatus }) {
    const meta = STATUS_META[status] ?? STATUS_META.draft;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
    );
}

function PriceCell({ page }: { page: PaymentPageRow }) {
    if (page.pricing_type === 'customer_decides') return <span className="text-[13px] font-semibold text-[#14141B]">Pay what you want</span>;

    const discounted = page.has_discount && page.discounted_price !== null && Number(page.discounted_price) < Number(page.price);
    return (
        <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#14141B]">{money(discounted ? page.discounted_price : page.price)}</span>
            {discounted && <span className="text-xs text-[#8A8A96] line-through">{money(page.price)}</span>}
        </div>
    );
}

function DeleteModal({
    page,
    busy,
    onCancel,
    onConfirm,
}: {
    page: PaymentPageRow | null;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        if (!page) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [page, busy, onCancel]);

    if (!page) return null;
    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div onClick={() => !busy && onCancel()} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div role="alertdialog" aria-modal="true" aria-labelledby="delete-payment-page-title" className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#FFEDE8] text-[#C2410C]">
                    <Trash2 className="size-5" />
                </span>
                <h3 id="delete-payment-page-title" className="mt-4 text-base font-semibold text-[#14141B]">
                    Delete this payment page?
                </h3>
                <p className="mt-1.5 text-sm text-[#6B6B78]">
                    <span className="font-semibold text-[#14141B]">{page.title || 'Untitled payment page'}</span> will be removed from your store.
                    Past orders stay on record.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={busy} className="border-[#E4E2DA]">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={busy} className="bg-[#D93838] text-white hover:bg-[#B92D2D]">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {busy ? 'Deleting…' : 'Delete page'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function RowActions({
    page,
    busy,
    onAction,
}: {
    page: PaymentPageRow;
    busy: boolean;
    onAction: (action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') => void;
}) {
    const published = page.status === 'published';
    const itemClass =
        'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#4B4B57] focus:bg-[#F6F5F2] focus:text-[#14141B] [&_svg]:text-[#8A8A96]';

    return (
        <DropdownMenuShim
            trigger={
                <button
                    type="button"
                    aria-label={`More actions for ${page.title}`}
                    disabled={busy}
                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B] disabled:opacity-50"
                >
                    {busy ? <Loader2 className="size-4.5 animate-spin" /> : <MoreHorizontal className="size-4.5" />}
                </button>
            }
        >
            {published && (
                <>
                    <DropdownItemShim asChild className={itemClass}>
                        <a href={publicUrl(page.slug)} target="_blank" rel="noreferrer">
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
                className={cn(itemClass, 'text-[#C2410C] focus:bg-[#FFEDE8] focus:text-[#C2410C] [&_svg]:text-[#C2410C]!')}
            >
                <Trash2 className="size-4" /> Delete
            </DropdownItemShim>
        </DropdownMenuShim>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function PaymentPagesIndex({ items, counts, filters }: PaymentPagesIndexProps) {
    // back/forward se lautne par list stale na rahe (naya draft ya duplicate turant dikhe)
    useRefreshOnBack(['items', 'counts']);

    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [toDelete, setToDelete] = useState<PaymentPageRow | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 7000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const activeStatus = (filters.status as PaymentPageStatus | undefined) || 'all';
    const countOf = (key: 'all' | PaymentPageStatus) =>
        key === 'all' ? (counts.draft ?? 0) + (counts.published ?? 0) + (counts.unpublished ?? 0) : (counts[key] ?? 0);
    const totalPages = countOf('all');
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

    function createPaymentPage() {
        if (creating) return;
        setCreating(true);
        // A draft is created first so the creator lands directly in the
        // full-screen editor, where every field has a live public preview.
        router.post(BASE, { title: 'Untitled payment page', pricing_type: 'fixed', price: 0 }, { onFinish: () => setCreating(false) });
    }

    function runAction(page: PaymentPageRow, action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') {
        const name = page.title || 'Untitled payment page';

        if (action === 'copy') {
            navigator.clipboard?.writeText(publicUrl(page.slug));
            setNotice({ kind: 'success', text: 'Payment page link copied.' });
            return;
        }
        if (action === 'delete') {
            setToDelete(page);
            return;
        }

        setBusyId(page.id);
        const done = { preserveScroll: true, onFinish: () => setBusyId(null) };

        if (action === 'duplicate') {
            // redirects to the edit page of the new draft copy
            router.post(`${BASE}/${page.uuid}/duplicate`, {}, done);
            return;
        }

        const status = action === 'publish' ? 'published' : 'unpublished';
        router.post(
            `${BASE}/${page.uuid}/publish`,
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
        const name = toDelete.title || 'Untitled payment page';
        setBusyId(toDelete.id);
        router.delete(`${BASE}/${toDelete.uuid}`, {
            preserveScroll: true,
            onSuccess: () => {
                setToDelete(null);
                setNotice({ kind: 'success', text: `“${name}” was deleted.` });
            },
            onError: (errors) => {
                setToDelete(null);
                setNotice({ kind: 'error', text: errorText(errors, 'Could not delete the payment page.') });
            },
            onFinish: () => setBusyId(null),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payment Pages" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Payment Pages</h1>
                                <span className="rounded-full bg-[#E1F6F3] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#0D9488] uppercase">
                                    Simple Checkout
                                </span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">
                                Collect one-time payments for anything — consulting, custom work, donations — with a simple checkout page.
                            </p>
                        </div>
                        <Button onClick={createPaymentPage} disabled={creating} className="w-fit bg-[#4F46E5] hover:bg-[#4338CA]">
                            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            {creating ? 'Opening editor…' : 'Create payment page'}
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
                                    <CheckCircle2 className="mt-px size-4.5 shrink-0" />
                                ) : (
                                    <Info className="mt-px size-4.5 shrink-0" />
                                )}
                                {notice.text}
                            </span>
                            <button onClick={() => setNotice(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-white/60">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {/* First-run empty state */}
                    {totalPages === 0 && !hasFilters ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#E1F6F3] text-[#0D9488]">
                                <CreditCard className="size-7" />
                            </span>
                            <h2 className="text-lg font-semibold text-[#14141B]">Create your first payment page</h2>
                            <p className="max-w-md text-sm text-[#8A8A96]">
                                Set up a simple checkout page for anything you sell — consulting, custom work, a quick sale — and start collecting
                                payments in minutes.
                            </p>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#4B4B57]">
                                {['Fixed or pay-what-you-want', 'Coupons', 'FAQs', 'Custom URL'].map((f) => (
                                    <span key={f} className="rounded-full bg-[#F6F5F2] px-2.5 py-1">
                                        {f}
                                    </span>
                                ))}
                            </div>
                            <Button onClick={createPaymentPage} disabled={creating} className="mt-3 bg-[#4F46E5] hover:bg-[#4338CA]">
                                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                {creating ? 'Opening editor…' : 'Create payment page'}
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
                                        placeholder="Search payment pages by title…"
                                        aria-label="Search payment pages"
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

                            {/* Payment pages table */}
                            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#14141B]">Your payment pages</h2>
                                        <p className="mt-0.5 text-xs text-[#8A8A96]">
                                            {items.total > 0
                                                ? `Showing ${items.from ?? 0}–${items.to ?? 0} of ${items.total} payment pages`
                                                : 'No payment pages match these filters'}
                                        </p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                                <th className="px-6 py-3">Payment page</th>
                                                <th className="px-4 py-3">Price</th>
                                                <th className="px-4 py-3">Sales</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E4E2DA]/50">
                                            {items.data.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8">
                                                        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                                                            <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                                                                <Inbox className="size-5" />
                                                            </span>
                                                            <p className="mt-1 text-sm font-semibold text-[#14141B]">No payment pages found</p>
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
                                            {items.data.map((page) => {
                                                const conversion = page.views_count > 0 ? (page.sales_count / page.views_count) * 100 : null;
                                                const editUrl = `${BASE}/${page.uuid}/edit`;
                                                return (
                                                    <tr
                                                        key={page.id}
                                                        onClick={() => router.visit(editUrl)}
                                                        className="group cursor-pointer transition hover:bg-[#F6F5F2]/60"
                                                    >
                                                        <td className="px-6 py-3.5">
                                                            <div className="flex min-w-65 items-center gap-3">
                                                                <span
                                                                    className={cn(
                                                                        'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
                                                                        tileTone(page.title || String(page.id)),
                                                                    )}
                                                                >
                                                                    <CreditCard className="size-5" />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <span className="block max-w-70 truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">
                                                                        {page.title || 'Untitled payment page'}
                                                                    </span>
                                                                    <span className="mt-0.5 block max-w-70 truncate text-xs text-[#8A8A96]">
                                                                        /p/{page.slug}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <PriceCell page={page} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span className="block text-[13px] font-bold text-[#14141B]">{money(page.revenue_total)}</span>
                                                            <span className="text-xs text-[#8A8A96]">
                                                                {page.sales_count} {page.sales_count === 1 ? 'sale' : 'sales'} ·{' '}
                                                                {conversion === null ? 'no views' : `${conversion.toFixed(1)}% conv.`}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                            <StatusPill status={page.status} />
                                                        </td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <Link
                                                                    href={editUrl}
                                                                    title="Edit payment page"
                                                                    aria-label={`Edit ${page.title}`}
                                                                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                                                >
                                                                    <Pencil className="size-4.5" />
                                                                </Link>
                                                                <RowActions page={page} busy={busyId === page.id} onAction={(a) => runAction(page, a)} />
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
                                Buyers get a receipt by email the moment their payment settles.
                            </p>
                        </>
                    )}
                </div>
            </div>

            <DeleteModal page={toDelete} busy={busyId !== null && busyId === toDelete?.id} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
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
