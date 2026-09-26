import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRefreshOnBack } from '@/hooks/use-refresh-on-back';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Copy,
    CopyPlus,
    ExternalLink,
    EyeOff,
    Globe2,
    Info,
    Inbox,
    Loader2,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    Rocket,
    Search,
    Ticket,
    Trash2,
    Users,
    Video,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

const BASE = '/dashboard/events';
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Events', href: BASE }];

type EventStatus = 'draft' | 'unpublished' | 'published';
type PricingType = 'fixed' | 'customer_decides' | 'free';
type EventMode = 'online' | 'in_person';

interface EventDetail {
    mode: EventMode | null;
    starts_at: string | null;
    ends_at: string | null;
    venue_address: string | null;
    join_link: string | null;
}

interface EventRow {
    id: number;
    uuid: string;
    title: string;
    slug: string;
    status: EventStatus;
    pricing_type: PricingType;
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    sales_count: number;
    revenue_total: string | number;
    views_count: number;
    registrations_count: number;
    published_at: string | null;
    created_at: string;
    cover_image: string | null;
    event_detail: EventDetail | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface EventsIndexProps {
    items: Paginated<EventRow>;
    counts: Partial<Record<EventStatus, number>>;
    filters: { status?: string | null; search?: string | null };
}

type Notice = { kind: 'success' | 'error'; text: string };

const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';
const INPUT_CLASS =
    'h-10 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';

const STATUS_TABS: { key: 'all' | EventStatus; label: string; dot: string }[] = [
    { key: 'all', label: 'All', dot: 'bg-[#FF6B4A]' },
    { key: 'published', label: 'Published', dot: 'bg-[#059669]' },
    { key: 'draft', label: 'Draft', dot: 'bg-amber-500' },
    { key: 'unpublished', label: 'Unpublished', dot: 'bg-[#8A8A96]' },
];

const STATUS_META: Record<EventStatus, { label: string; chip: string; dot: string }> = {
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

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tileTone(seed: string) {
    void formatDate;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
    return TILE_TONES[h % TILE_TONES.length];
}

function publicUrl(slug: string) {
    return `${window.location.origin}/e/${slug}`;
}

function errorText(errors: Record<string, string>, fallback: string) {
    const messages = Object.values(errors).filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Payments / Payouts / Courses)         */
/* ------------------------------------------------------------------ */

function StatusPill({ status }: { status: EventStatus }) {
    const meta = STATUS_META[status] ?? STATUS_META.draft;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <span className="text-xs text-[#D93838]">{message}</span>;
}

function Drawer({
    open,
    onClose,
    title,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return (
        <>
            <div
                onClick={onClose}
                className={cn(
                    'fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
            />
            <div
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col justify-between overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <div className="flex flex-col gap-5 p-6">
                    <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 pb-4">
                        <span className="text-base font-semibold text-[#14141B]">{title}</span>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                    {children}
                </div>
                {footer && <div className="flex flex-col gap-2 border-t border-[#E4E2DA] bg-white p-5">{footer}</div>}
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  CREATE EVENT DRAWER                                                */
/* ------------------------------------------------------------------ */

function CreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };
    const [title, setTitle] = useState('');
    const [pricing, setPricing] = useState<'fixed' | 'free'>('fixed');
    const [mode, setMode] = useState<EventMode>('online');
    const [price, setPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // server errors stay in page props until the next visit — only show them until the user edits again
    const [dirty, setDirty] = useState(true);

    useEffect(() => {
        if (!open) return;
        setTitle('');
        setPricing('fixed');
        setMode('online');
        setPrice('');
        setDirty(true);
    }, [open]);

    const trimmed = title.trim();
    const canSubmit = trimmed.length > 0 && trimmed.length <= 150 && !submitting;

    function onPriceChange(value: string) {
        const cleaned = value.replace(/[^\d.]/g, '');
        const [whole, ...rest] = cleaned.split('.');
        setPrice(rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole);
        setDirty(true);
    }

    function submit(e?: FormEvent) {
        e?.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setDirty(false);
        // controller creates a draft and redirects straight to /dashboard/events/{id}/edit
        router.post(
            BASE,
            {
                title: trimmed,
                pricing_type: pricing,
                price: pricing === 'fixed' ? Number(price) || 0 : 0,
                mode,
            },
            { onFinish: () => setSubmitting(false) },
        );
    }

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Create event"
            footer={
                <>
                    <Button onClick={() => submit()} disabled={!canSubmit} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                        {submitting ? 'Creating…' : 'Create draft & continue'}
                    </Button>
                    <p className="text-center text-[11px] text-[#8A8A96]">Your event stays a private draft until you publish it.</p>
                </>
            }
        >
            <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="event_title" className={LABEL_CLASS}>
                            Event title <span className="text-[#D93838]">*</span>
                        </Label>
                        <span className="text-[11px] text-[#8A8A96]">{title.length}/150</span>
                    </div>
                    <input
                        id="event_title"
                        value={title}
                        maxLength={150}
                        autoFocus
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setDirty(true);
                        }}
                        placeholder="e.g. Live Workshop: Masterclass on Notion"
                        className={INPUT_CLASS}
                    />
                    <FieldError message={dirty ? undefined : errors.title} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label className={LABEL_CLASS}>Format</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'online' as const, label: 'Online', icon: Video, hint: 'Share a join link after registration' },
                            { key: 'in_person' as const, label: 'In person', icon: MapPin, hint: 'Show venue on the event page' },
                        ].map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                aria-pressed={mode === opt.key}
                                onClick={() => {
                                    setMode(opt.key);
                                    setDirty(true);
                                }}
                                className={cn(
                                    'flex h-auto items-start gap-2.5 rounded-lg border p-3 text-left transition-colors',
                                    mode === opt.key
                                        ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]'
                                        : 'border-[#E4E2DA] bg-white text-[#4B4B57] hover:bg-[#F6F5F2]',
                                )}
                            >
                                <opt.icon className="mt-0.5 size-4 shrink-0" />
                                <span className="flex flex-col">
                                    <span className="text-sm font-semibold">{opt.label}</span>
                                    <span className={cn('text-[11px]', mode === opt.key ? 'text-[#4F46E5]/80' : 'text-[#8A8A96]')}>{opt.hint}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <FieldError message={dirty ? undefined : errors.mode} />
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label className={LABEL_CLASS}>Pricing</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'fixed' as const, label: 'Paid' },
                            { key: 'free' as const, label: 'Free' },
                        ].map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                aria-pressed={pricing === opt.key}
                                onClick={() => {
                                    setPricing(opt.key);
                                    setDirty(true);
                                }}
                                className={cn(
                                    'h-11 rounded-lg border text-sm font-semibold transition-colors',
                                    pricing === opt.key
                                        ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]'
                                        : 'border-[#E4E2DA] bg-white text-[#4B4B57] hover:bg-[#F6F5F2]',
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <FieldError message={dirty ? undefined : errors.pricing_type} />
                </div>

                {pricing === 'fixed' && (
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="event_price" className={LABEL_CLASS}>
                            Price
                        </Label>
                        <div className="relative">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-[#8A8A96]">₹</span>
                            <input
                                id="event_price"
                                inputMode="decimal"
                                value={price}
                                onChange={(e) => onPriceChange(e.target.value)}
                                placeholder="0"
                                className={cn(INPUT_CLASS, 'pl-7')}
                            />
                        </div>
                        <FieldError message={dirty ? undefined : errors.price} />
                        <span className="text-[11px] text-[#8A8A96]">
                            You can change this later — it must be above ₹0 to publish a paid event.
                        </span>
                    </div>
                )}
            </form>
        </Drawer>
    );
}

/* ------------------------------------------------------------------ */
/*  DELETE CONFIRM                                                     */
/* ------------------------------------------------------------------ */

void CreateDrawer;

function DeleteModal({
    event,
    busy,
    onCancel,
    onConfirm,
}: {
    event: EventRow | null;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        if (!event) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [event, busy, onCancel]);

    if (!event) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div onClick={() => !busy && onCancel()} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title" className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#FFEDE8] text-[#C2410C]">
                    <Trash2 className="size-5" />
                </span>
                <h3 id="delete-event-title" className="mt-4 text-base font-semibold text-[#14141B]">
                    Delete this event?
                </h3>
                <p className="mt-1.5 text-sm text-[#6B6B78]">
                    <span className="font-semibold text-[#14141B]">{event.title || 'Untitled event'}</span> will be removed from your store. Past orders
                    and registrations stay on record.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel} disabled={busy} className="border-[#E4E2DA]">
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} disabled={busy} className="bg-[#D93838] text-white hover:bg-[#B92D2D]">
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        {busy ? 'Deleting…' : 'Delete event'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  TABLE PIECES                                                       */
/* ------------------------------------------------------------------ */

function PriceCell({ event }: { event: EventRow }) {
    if (event.pricing_type === 'free')
        return <span className="text-[13px] font-semibold text-[#059669]">Free</span>;
    if (event.pricing_type === 'customer_decides')
        return <span className="text-[13px] font-semibold text-[#14141B]">Pay what you want</span>;

    const discounted = event.has_discount && event.discounted_price !== null && Number(event.discounted_price) < Number(event.price);
    return (
        <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#14141B]">
                {money(discounted ? event.discounted_price : event.price)}
            </span>
            {discounted && <span className="text-xs text-[#8A8A96] line-through">{money(event.price)}</span>}
        </div>
    );
}

function ScheduleCell({ event }: { event: EventRow }) {
    const starts = event.event_detail?.starts_at ?? null;
    const ends = event.event_detail?.ends_at ?? null;
    if (!starts) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF4DB] px-2 py-0.5 text-[11px] font-semibold text-[#B46E00]">
                <CalendarDays className="size-3" /> TBA
            </span>
        );
    }
    const startLabel = new Date(starts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (ends) {
        const endLabel = new Date(ends).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return (
            <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#14141B]">{startLabel}</span>
                <span className="text-[11px] text-[#8A8A96]">→ {endLabel}</span>
            </div>
        );
    }
    return (
        <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-[#14141B]">{startLabel}</span>
            <span className="text-[11px] text-[#8A8A96]">Open ended</span>
        </div>
    );
}

function ModeChip({ event }: { event: EventRow }) {
    const mode = event.event_detail?.mode;
    if (mode === 'in_person') {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#F1EAFE] px-2 py-0.5 text-[11px] font-semibold text-[#7C3AED]">
                <MapPin className="size-3" /> In person
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-[#E6F2FF] px-2 py-0.5 text-[11px] font-semibold text-[#0284C7]">
            <Globe2 className="size-3" /> Online
        </span>
    );
}

function RowActions({
    event,
    busy,
    onAction,
}: {
    event: EventRow;
    busy: boolean;
    onAction: (action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') => void;
}) {
    const published = event.status === 'published';
    const itemClass =
        'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#4B4B57] focus:bg-[#F6F5F2] focus:text-[#14141B] [&_svg]:text-[#8A8A96]';

    return (
        <div className="">
            <DropdownMenuShim
                trigger={
                    <button
                        type="button"
                        aria-label={`More actions for ${event.title}`}
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
                            <a href={publicUrl(event.slug)} target="_blank" rel="noreferrer">
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
                    className={cn(
                        itemClass,
                        'text-[#C2410C] focus:bg-[#FFEDE8] focus:text-[#C2410C] [&_svg]:!text-[#C2410C]',
                    )}
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

export default function EventsIndex({ items, counts, filters }: EventsIndexProps) {
    // back/forward se lautne par list stale na rahe (naya draft ya duplicate turant dikhe)
    useRefreshOnBack(['items', 'counts']);

    const [search, setSearch] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [toDelete, setToDelete] = useState<EventRow | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 7000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const activeStatus = (filters.status as EventStatus | undefined) || 'all';
    const countOf = (key: 'all' | EventStatus) =>
        key === 'all'
            ? (counts.draft ?? 0) + (counts.published ?? 0) + (counts.unpublished ?? 0)
            : (counts[key] ?? 0);
    const totalEvents = countOf('all');
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

    function createEvent() {
        if (creating) return;
        setCreating(true);
        // A draft is created first so the creator lands directly in the
        // full-screen editor, where every field has a live public preview.
        router.post(
            BASE,
            { title: 'Untitled event', pricing_type: 'fixed', price: 0, mode: 'online' },
            { onFinish: () => setCreating(false) },
        );
    }

    function runAction(event: EventRow, action: 'publish' | 'unpublish' | 'duplicate' | 'delete' | 'copy') {
        const name = event.title || 'Untitled event';

        if (action === 'copy') {
            navigator.clipboard?.writeText(publicUrl(event.slug));
            setNotice({ kind: 'success', text: 'Event link copied.' });
            return;
        }
        if (action === 'delete') {
            setToDelete(event);
            return;
        }

        setBusyId(event.id);
        const done = { preserveScroll: true, onFinish: () => setBusyId(null) };

        if (action === 'duplicate') {
            // redirects to the edit page of the new draft copy
            router.post(`${BASE}/${event.uuid}/duplicate`, {}, done);
            return;
        }

        const status = action === 'publish' ? 'published' : 'unpublished';
        router.post(
            `${BASE}/${event.uuid}/publish`,
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
        const name = toDelete.title || 'Untitled event';
        setBusyId(toDelete.id);
        router.delete(`${BASE}/${toDelete.uuid}`, {
            preserveScroll: true,
            onSuccess: () => {
                setToDelete(null);
                setNotice({ kind: 'success', text: `“${name}” was deleted.` });
            },
            onError: (errors) => {
                setToDelete(null);
                setNotice({ kind: 'error', text: errorText(errors, 'Could not delete the event.') });
            },
            onFinish: () => setBusyId(null),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Events" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Events</h1>
                                <span className="rounded-full bg-[#FFEDE8] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#C2410C] uppercase">
                                    Live Workshops
                                </span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">
                                Host paid workshops, webinars, or in-person meetups — track registrations from one place.
                            </p>
                        </div>
                        <Button onClick={createEvent} disabled={creating} className="w-fit bg-[#4F46E5] hover:bg-[#4338CA]">
                            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                            {creating ? 'Opening editor…' : 'Create event'}
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
                            <button
                                onClick={() => setNotice(null)}
                                aria-label="Dismiss"
                                className="rounded p-0.5 hover:bg-white/60"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {/* First-run empty state */}
                    {totalEvents === 0 && !hasFilters ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
                            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#FFEDE8] text-[#FF6B4A]">
                                <Calendar className="size-7" />
                            </span>
                            <h2 className="text-lg font-semibold text-[#14141B]">Create your first event</h2>
                            <p className="max-w-md text-sm text-[#8A8A96]">
                                Sell seats to a live workshop, host a free webinar, or run an in-person meetup — buyers register and get a join
                                link automatically.
                            </p>
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-[#4B4B57]">
                                {['Online & in-person', 'Capacity & join links', 'Coupons & addons', 'Refund policies'].map((f) => (
                                    <span key={f} className="rounded-full bg-[#F6F5F2] px-2.5 py-1">
                                        {f}
                                    </span>
                                ))}
                            </div>
                            <Button onClick={createEvent} disabled={creating} className="mt-3 bg-[#4F46E5] hover:bg-[#4338CA]">
                                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                {creating ? 'Opening editor…' : 'Create event'}
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
                                                    active
                                                        ? 'bg-white text-[#4F46E5] shadow-sm'
                                                        : 'text-[#8A8A96] hover:text-[#14141B]',
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
                                        placeholder="Search events by title…"
                                        aria-label="Search events"
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

                            {/* Events table */}
                            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-[#14141B]">Your events</h2>
                                        <p className="mt-0.5 text-xs text-[#8A8A96]">
                                            {items.total > 0
                                                ? `Showing ${items.from ?? 0}–${items.to ?? 0} of ${items.total} events`
                                                : 'No events match these filters'}
                                        </p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                                <th className="px-6 py-3">Event</th>
                                                <th className="px-4 py-3">Schedule</th>
                                                <th className="px-4 py-3">Price</th>
                                                <th className="px-4 py-3">Sales</th>
                                                <th className="px-4 py-3">Attendees</th>
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
                                                            <p className="mt-1 text-sm font-semibold text-[#14141B]">No events found</p>
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
                                            {items.data.map((event) => {
                                                const detail = event.event_detail;
                                                const conversion =
                                                    event.views_count > 0 ? (event.sales_count / event.views_count) * 100 : null;
                                                const editUrl = `${BASE}/${event.uuid}/edit`;
                                                return (
                                                    <tr
                                                        key={event.id}
                                                        onClick={() => router.visit(editUrl)}
                                                        className="group cursor-pointer transition hover:bg-[#F6F5F2]/60"
                                                    >
                                                        <td className="px-6 py-3.5">
                                                            <div className="flex min-w-[260px] items-center gap-3">
                                                                <span
                                                                    className={cn(
                                                                        'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl',
                                                                        event.cover_image
                                                                            ? 'bg-[#F6F5F2]'
                                                                            : tileTone(event.title || String(event.id)),
                                                                    )}
                                                                >
                                                                    {event.cover_image ? (
                                                                        <img
                                                                            src={event.cover_image}
                                                                            alt=""
                                                                            className="h-full w-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <CalendarDays className="size-5" />
                                                                    )}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <span className="block max-w-[280px] truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">
                                                                        {event.title || 'Untitled event'}
                                                                    </span>
                                                                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#8A8A96]">
                                                                        <ModeChip event={event} />
                                                                        {detail?.venue_address && (
                                                                            <span className="inline-flex max-w-[180px] items-center gap-1 truncate">
                                                                                <MapPin className="size-3" /> {detail.venue_address}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <ScheduleCell event={event} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <PriceCell event={event} />
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span className="block text-[13px] font-bold text-[#14141B]">
                                                                {money(event.revenue_total)}
                                                            </span>
                                                            <span className="text-xs text-[#8A8A96]">
                                                                {event.sales_count} {event.sales_count === 1 ? 'sale' : 'sales'} ·{' '}
                                                                {conversion === null
                                                                    ? 'no views'
                                                                    : `${conversion.toFixed(1)}% conv.`}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                                            <span className="block text-[13px] font-semibold text-[#14141B]">
                                                                {event.registrations_count ?? 0}
                                                            </span>
                                                            <span className="text-xs text-[#8A8A96]">registered</span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                            <StatusPill status={event.status} />
                                                        </td>
                                                        <td
                                                            className="px-6 py-3.5 whitespace-nowrap"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <Link
                                                                    href={`${BASE}/${event.uuid}/attendees`}
                                                                    title="Attendees"
                                                                    aria-label={`Attendees of ${event.title}`}
                                                                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                                                >
                                                                    <Users className="size-[18px]" />
                                                                </Link>
                                                                <Link
                                                                    href={editUrl}
                                                                    title="Edit event"
                                                                    aria-label={`Edit ${event.title}`}
                                                                    className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
                                                                >
                                                                    <Pencil className="size-[18px]" />
                                                                </Link>
                                                                <RowActions
                                                                    event={event}
                                                                    busy={busyId === event.id}
                                                                    onAction={(a) => runAction(event, a)}
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
                                <Ticket className="size-3.5 text-[#FF6B4A]" />
                                Attendees get a join link or venue address the moment their payment settles.
                            </p>
                        </>
                    )}
                </div>
            </div>

            <DeleteModal
                event={toDelete}
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

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
