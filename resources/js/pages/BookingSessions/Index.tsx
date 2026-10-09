import { durationLabel } from '@/components/bookings/format';
import { BookingsTabNav, bookingsBreadcrumbs } from '@/components/bookings/tab-nav';
import { Modal, Toggle } from '@/components/course-editor/ui';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { CalendarPlus, Copy, Globe, Link2, Loader2, Pencil, Plus, Search, Trash2, Video, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type ProductStatus = 'draft' | 'unpublished' | 'published';
type PricingType = 'fixed' | 'customer_decides' | 'free';

interface SessionRow {
    id: number;
    uuid: string;
    title: string;
    description: string | null;
    status: ProductStatus;
    pricing_type: PricingType;
    price: string | number;
    upcoming_count?: number;
    booking_service_detail: { duration_minutes: number; default_meeting_link: string | null; is_active: boolean } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

interface SessionsProps {
    items: Paginated<SessionRow>;
    counts: Partial<Record<ProductStatus, number>>;
    filters: { status?: string | null; search?: string | null };
}

const BASE = '/dashboard/bookings/sessions';
const DURATIONS = [15, 30, 45, 60, 90, 120];

const STATUS_META: Record<ProductStatus, { label: string; chip: string }> = {
    published: { label: 'Published', chip: 'bg-cp-success-soft text-cp-success-ink' },
    draft: { label: 'Draft', chip: 'bg-cp-surface-3 text-cp-subtle' },
    unpublished: { label: 'Unpublished', chip: 'bg-cp-warning-soft text-cp-warning-ink' },
};

const LABEL = 'text-xs font-semibold tracking-wider text-cp-ink uppercase';
const INPUT = 'h-10 w-full rounded-lg border border-cp-line bg-cp-surface px-3 text-sm text-cp-ink shadow-sm outline-none placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';

function priceLabel(s: SessionRow) {
    if (s.pricing_type === 'free') return 'Free';
    if (s.pricing_type === 'customer_decides') return 'Pay what you want';
    return formatCurrency(Number(s.price));
}

function firstError(errors: Record<string, string | string[]>) {
    const v = Object.values(errors)[0];
    return (Array.isArray(v) ? v[0] : v) ?? 'Something went wrong. Please try again.';
}

export default function BookingSessionsIndex({ items, counts, filters }: SessionsProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [editing, setEditing] = useState<SessionRow | 'new' | null>(null);
    const [toDelete, setToDelete] = useState<SessionRow | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const total = Object.values(counts).reduce((s, n) => s + Number(n ?? 0), 0);
    const tabs: { key: string; label: string; count: number }[] = [
        { key: '', label: 'All', count: total },
        { key: 'published', label: 'Published', count: Number(counts.published ?? 0) },
        { key: 'draft', label: 'Draft', count: Number(counts.draft ?? 0) },
        { key: 'unpublished', label: 'Unpublished', count: Number(counts.unpublished ?? 0) },
    ];

    function visit(overrides: { status?: string; search?: string; page?: number }) {
        const next = { status: filters.status ?? '', search: filters.search ?? '', ...overrides };
        router.get(BASE, { status: next.status || undefined, search: next.search || undefined, page: overrides.page }, { preserveState: true, replace: true });
    }

    function action(id: number, fn: (opts: { preserveScroll: true; preserveState: true; onError: (e: Record<string, string>) => void; onFinish: () => void }) => void) {
        setBusyId(id);
        setError(null);
        fn({ preserveScroll: true, preserveState: true, onError: (e) => setError(firstError(e)), onFinish: () => setBusyId(null) });
    }

    const togglePublish = (s: SessionRow) =>
        action(s.id, (o) => router.post(`${BASE}/${s.uuid}/publish`, { status: s.status === 'published' ? 'unpublished' : 'published' }, o));
    const toggleActive = (s: SessionRow, value: boolean) => action(s.id, (o) => router.put(`${BASE}/${s.uuid}`, { is_active: value }, o));
    const duplicate = (s: SessionRow) => action(s.id, (o) => router.post(`${BASE}/${s.uuid}/duplicate`, {}, o));

    return (
        <AppLayout breadcrumbs={bookingsBreadcrumbs('Sessions')}>
            <Head title="Booking sessions" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <BookingsTabNav active="sessions" />

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Sessions</h1>
                            <p className="text-sm text-cp-muted">The calls people can book with you — 1:1 mentorship, consultations, reviews.</p>
                        </div>
                        <Button onClick={() => setEditing('new')} className="w-fit text-white bg-cp-brand hover:bg-cp-brand-hover">
                            <Plus className="size-4" /> New session
                        </Button>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl bg-cp-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-cp-canvas p-1">
                            {tabs.map((t) => {
                                const active = (filters.status ?? '') === t.key;
                                return (
                                    <button
                                        key={t.key || 'all'}
                                        type="button"
                                        onClick={() => visit({ status: t.key })}
                                        className={cn(
                                            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                                            active ? 'bg-cp-surface text-cp-brand-ink shadow-sm' : 'text-cp-muted hover:text-cp-ink',
                                        )}
                                    >
                                        {t.label}
                                        <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', active ? 'bg-cp-brand-soft' : 'bg-cp-surface-3')}>{t.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                visit({ search: search.trim() });
                            }}
                            className="relative w-full lg:max-w-xs"
                        >
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cp-muted" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search sessions…"
                                className="w-full rounded-lg bg-cp-canvas py-2 pr-3 pl-9 text-sm text-cp-ink outline-none placeholder:text-cp-muted focus:bg-cp-surface focus:ring-2 focus:ring-cp-brand/20"
                            />
                        </form>
                    </div>

                    {error && (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-cp-coral-soft px-4 py-3 text-[13px] font-medium text-cp-coral-dark-ink">
                            {error}
                            <button onClick={() => setError(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-white/50">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {items.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cp-line bg-cp-surface py-12 text-center">
                            <span className="flex size-10 items-center justify-center rounded-full bg-cp-brand-soft text-cp-brand-ink">
                                <CalendarPlus className="size-5" />
                            </span>
                            <p className="mt-1 text-sm font-semibold text-cp-ink">{filters.search ? 'No sessions match your search' : 'Create your first session'}</p>
                            <p className="max-w-sm px-4 text-xs text-cp-muted">Set a duration and price — customers pick a slot from your availability.</p>
                            {!filters.search && (
                                <Button onClick={() => setEditing('new')} size="sm" className="mt-3 text-white bg-cp-brand hover:bg-cp-brand-hover">
                                    <Plus className="size-4" /> New session
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {items.data.map((s) => (
                                <SessionCard
                                    key={s.id}
                                    session={s}
                                    busy={busyId === s.id}
                                    onEdit={() => setEditing(s)}
                                    onPublish={() => togglePublish(s)}
                                    onActive={(v) => toggleActive(s, v)}
                                    onDuplicate={() => duplicate(s)}
                                    onDelete={() => setToDelete(s)}
                                />
                            ))}
                        </div>
                    )}

                    {items.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-cp-muted">
                                Page {items.current_page} of {items.last_page}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={items.current_page <= 1} onClick={() => visit({ page: items.current_page - 1 })} className="border-cp-line bg-cp-surface">
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={items.current_page >= items.last_page} onClick={() => visit({ page: items.current_page + 1 })} className="border-cp-line bg-cp-surface">
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <SessionDrawer session={editing} onClose={() => setEditing(null)} />

            <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this session?">
                {toDelete && (
                    <>
                        <p className="text-sm text-cp-subtle">
                            “{toDelete.title}” will be removed and customers won't be able to book it.
                            {Number(toDelete.upcoming_count ?? 0) > 0 && (
                                <span className="mt-2 block font-medium text-cp-warning-ink">
                                    Its {toDelete.upcoming_count} upcoming {toDelete.upcoming_count === 1 ? 'booking stays' : 'bookings stay'} in your Bookings list.
                                </span>
                            )}
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setToDelete(null)} className="border-cp-line">
                                Keep it
                            </Button>
                            <Button
                                onClick={() => {
                                    const s = toDelete;
                                    setToDelete(null);
                                    action(s.id, (o) => router.delete(`${BASE}/${s.uuid}`, o));
                                }}
                                className="bg-cp-coral-dark hover:bg-cp-coral-strong"
                            >
                                Delete session
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </AppLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  CARD                                                               */
/* ------------------------------------------------------------------ */

function SessionCard({
    session: s,
    busy,
    onEdit,
    onPublish,
    onActive,
    onDuplicate,
    onDelete,
}: {
    session: SessionRow;
    busy: boolean;
    onEdit: () => void;
    onPublish: () => void;
    onActive: (v: boolean) => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const detail = s.booking_service_detail;
    const meta = STATUS_META[s.status];
    const iconBtn = 'rounded-lg p-1.5 text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink disabled:opacity-50';

    return (
        <article className="flex flex-col rounded-xl bg-cp-surface p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase', meta.chip)}>{meta.label}</span>
                <div className="flex items-center gap-2">
                    {busy && <Loader2 className="size-4 animate-spin text-cp-muted" />}
                    <span className="text-[11px] font-medium text-cp-muted">{detail?.is_active ? 'Taking bookings' : 'Paused'}</span>
                    <Toggle checked={Boolean(detail?.is_active)} onChange={onActive} label={`Accept bookings for ${s.title}`} disabled={busy} />
                </div>
            </div>

            <button type="button" onClick={onEdit} className="mt-3 text-left">
                <h3 className="line-clamp-2 text-base font-semibold text-cp-ink hover:text-cp-brand-ink">{s.title}</h3>
            </button>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-cp-brand-soft px-2 py-0.5 font-semibold text-cp-brand-ink">{durationLabel(detail?.duration_minutes ?? 30)}</span>
                <span className="font-semibold text-cp-ink">{priceLabel(s)}</span>
                <span className="text-cp-muted">·</span>
                <span className="text-cp-subtle">
                    {Number(s.upcoming_count ?? 0)} upcoming
                </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs">
                {detail?.default_meeting_link ? (
                    <span className="flex min-w-0 items-center gap-1.5 text-cp-subtle">
                        <Video className="size-3.5 shrink-0 text-cp-success-ink" />
                        <span className="truncate">{detail.default_meeting_link.replace(/^https?:\/\//, '')}</span>
                    </span>
                ) : (
                    <button type="button" onClick={onEdit} className="flex items-center gap-1.5 font-medium text-cp-warning-ink hover:underline">
                        <Link2 className="size-3.5" /> Add a default meeting link
                    </button>
                )}
            </div>

            <div className="flex-1" />
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-cp-line/70 pt-3">
                <Button size="sm" variant="outline" onClick={onPublish} disabled={busy} className="border-cp-line">
                    <Globe className="size-3.5" /> {s.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
                <div className="flex items-center gap-0.5">
                    <button type="button" onClick={onEdit} title="Edit" aria-label="Edit session" className={iconBtn}>
                        <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={onDuplicate} disabled={busy} title="Duplicate" aria-label="Duplicate session" className={iconBtn}>
                        <Copy className="size-4" />
                    </button>
                    <button type="button" onClick={onDelete} disabled={busy} title="Delete" aria-label="Delete session" className={cn(iconBtn, 'hover:bg-cp-coral-soft hover:text-cp-coral-dark-ink')}>
                        <Trash2 className="size-4" />
                    </button>
                </div>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  CREATE / EDIT DRAWER                                               */
/* ------------------------------------------------------------------ */

function SessionDrawer({ session, onClose }: { session: SessionRow | 'new' | null; onClose: () => void }) {
    return (
        <>
            <div onClick={onClose} className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300', session ? 'opacity-100' : 'pointer-events-none opacity-0')} />
            <aside
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[440px] flex-col overflow-y-auto bg-cp-surface shadow-2xl transition-transform duration-300 ease-out',
                    session ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {session && <SessionForm key={session === 'new' ? 'new' : session.id} session={session === 'new' ? null : session} onClose={onClose} />}
            </aside>
        </>
    );
}

function SessionForm({ session, onClose }: { session: SessionRow | null; onClose: () => void }) {
    const detail = session?.booking_service_detail;
    const initialDuration = detail?.duration_minutes ?? 30;
    const [form, setForm] = useState({
        title: session?.title ?? '',
        description: session?.description ?? '',
        pricing_type: (session?.pricing_type === 'free' ? 'free' : 'fixed') as 'free' | 'fixed',
        price: session && Number(session.price) > 0 ? String(Number(session.price)) : '',
        duration: DURATIONS.includes(initialDuration) ? String(initialDuration) : 'custom',
        custom_duration: DURATIONS.includes(initialDuration) ? '' : String(initialDuration),
        default_meeting_link: detail?.default_meeting_link ?? '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const duration = form.duration === 'custom' ? Number(form.custom_duration) : Number(form.duration);
    const valid = form.title.trim() && duration >= 5 && duration <= 480 && (form.pricing_type === 'free' || Number(form.price) > 0);

    function submit(e: FormEvent) {
        e.preventDefault();
        if (!valid) return;
        setSaving(true);
        setErrors({});

        const payload = {
            title: form.title.trim(),
            pricing_type: form.pricing_type,
            price: form.pricing_type === 'free' ? 0 : Number(form.price),
            duration_minutes: duration,
            default_meeting_link: form.default_meeting_link.trim() || null,
            ...(session ? { description: form.description.trim() || null } : {}),
        };
        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onClose(),
            onError: (e: Record<string, string>) => setErrors(e),
            onFinish: () => setSaving(false),
        };

        if (session) router.put(`${BASE}/${session.uuid}`, payload, options);
        else router.post(BASE, payload, options);
    }

    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

    return (
        <form onSubmit={submit} className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-cp-line/70 px-6 py-4">
                <span className="text-base font-semibold text-cp-ink">{session ? 'Edit session' : 'New session'}</span>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink">
                    <X className="size-5" />
                </button>
            </div>

            <div className="flex flex-col gap-5 p-6">
                <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>
                        Title <span className="text-cp-red-ink">*</span>
                    </span>
                    <input value={form.title} maxLength={150} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 1:1 Portfolio review" className={INPUT} />
                    {errors.title && <span className="text-xs text-cp-red-ink">{errors.title}</span>}
                </label>

                {session && (
                    <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Description</span>
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={(e) => set('description', e.target.value)}
                            placeholder="What will you cover on this call?"
                            className="w-full resize-y rounded-lg border border-cp-line bg-cp-surface px-3 py-2 text-sm text-cp-ink shadow-sm outline-none placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15"
                        />
                        {errors.description && <span className="text-xs text-cp-red-ink">{errors.description}</span>}
                    </label>
                )}

                <div className="flex flex-col gap-1.5">
                    <span className={LABEL}>Duration</span>
                    <div className="flex flex-wrap gap-2">
                        {[...DURATIONS.map(String), 'custom'].map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => set('duration', d)}
                                className={cn(
                                    'h-9 rounded-lg border px-3 text-xs font-semibold transition-colors',
                                    form.duration === d ? 'border-cp-brand bg-cp-brand-soft text-cp-brand-ink' : 'border-cp-line text-cp-body hover:bg-cp-canvas',
                                )}
                            >
                                {d === 'custom' ? 'Custom' : durationLabel(Number(d))}
                            </button>
                        ))}
                    </div>
                    {form.duration === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input type="number" min={5} max={480} value={form.custom_duration} onChange={(e) => set('custom_duration', e.target.value)} className={cn(INPUT, 'w-28')} />
                            <span className="text-sm text-cp-muted">minutes (5–480)</span>
                        </div>
                    )}
                    {errors.duration_minutes && <span className="text-xs text-cp-red-ink">{errors.duration_minutes}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className={LABEL}>Price</span>
                    <div className="grid grid-cols-2 gap-2">
                        {(['fixed', 'free'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => set('pricing_type', p)}
                                className={cn(
                                    'h-10 rounded-lg border text-sm font-semibold transition-colors',
                                    form.pricing_type === p ? 'border-cp-brand bg-cp-brand-soft text-cp-brand-ink' : 'border-cp-line text-cp-body hover:bg-cp-canvas',
                                )}
                            >
                                {p === 'fixed' ? 'Paid' : 'Free'}
                            </button>
                        ))}
                    </div>
                    {form.pricing_type === 'fixed' && (
                        <div className="relative">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-cp-muted">₹</span>
                            <input type="number" min={1} step="1" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="999" className={cn(INPUT, 'pl-7')} />
                        </div>
                    )}
                    {errors.price && <span className="text-xs text-cp-red-ink">{errors.price}</span>}
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Default meeting link</span>
                    <input value={form.default_meeting_link} onChange={(e) => set('default_meeting_link', e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" className={INPUT} />
                    <span className="text-[11px] text-cp-muted">Added to every new booking of this session. You can change it for a single booking later.</span>
                    {errors.default_meeting_link && <span className="text-xs text-cp-red-ink">{errors.default_meeting_link}</span>}
                </label>
            </div>

            <div className="mt-auto flex items-center justify-end gap-2 border-t border-cp-line p-5">
                <Button type="button" variant="outline" onClick={onClose} className="border-cp-line">
                    Cancel
                </Button>
                <Button type="submit" disabled={!valid || saving} className="text-white bg-cp-brand hover:bg-cp-brand-hover">
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {session ? 'Save changes' : 'Create session'}
                </Button>
            </div>
        </form>
    );
}
