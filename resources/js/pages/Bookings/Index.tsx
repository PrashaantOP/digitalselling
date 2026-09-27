import { BookingsTabNav, bookingsBreadcrumbs } from '@/components/bookings/tab-nav';
import { dayKey, dayLabel, durationLabel, formatDate, formatTimeRange, initials } from '@/components/bookings/format';
import { Modal } from '@/components/course-editor/ui';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowUpRight,
    CalendarCheck,
    CalendarClock,
    CalendarDays,
    Check,
    CheckCircle2,
    Copy,
    ExternalLink,
    Inbox,
    Loader2,
    Search,
    UserX,
    Video,
    X,
    XCircle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

type BookingStatus = 'upcoming' | 'completed' | 'cancelled' | 'no_show';
type Tab = BookingStatus | 'all';

interface BookingRow {
    id: number;
    uuid: string;
    scheduled_at: string;
    duration_minutes: number;
    status: BookingStatus;
    meeting_link: string | null;
    session: string;
    customer: { name: string | null; email: string | null; phone: string | null } | null;
    order: { order_number: string; total_amount: string | number; status: string } | null;
    responses: { question_label: string; answer: string }[];
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface BookingsIndexProps {
    bookings: Paginated<BookingRow>;
    counts: Partial<Record<BookingStatus, number>>;
    stats: { today: number; next_7_days: number; completed_this_month: number; no_show_this_month: number };
    timezone: string;
    filters: { status: Tab; search: string | null };
}

const BASE = '/dashboard/bookings';

const STATUS_TABS: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'no_show', label: 'No-show' },
    { key: 'all', label: 'All' },
];

const STATUS_META: Record<BookingStatus, { label: string; chip: string; dot: string }> = {
    upcoming: { label: 'Upcoming', chip: 'bg-[#E6F2FF] text-[#0284C7]', dot: 'bg-sky-500' },
    completed: { label: 'Completed', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
    cancelled: { label: 'Cancelled', chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-[#8A8A96]' },
    no_show: { label: 'No-show', chip: 'bg-[#FFEDE8] text-[#C2410C]', dot: 'bg-[#FF6B4A]' },
};

const AVATAR_TONES = ['bg-[#EEF2FF] text-[#4F46E5]', 'bg-[#E6F2FF] text-[#0284C7]', 'bg-[#FFF4DB] text-[#B46E00]', 'bg-[#F1EAFE] text-[#7C3AED]', 'bg-[#E1F6F3] text-[#0D9488]'];

function avatarTone(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
    return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** Time nikal gaya par creator ne completed / no-show mark nahi kiya. */
function needsUpdate(b: BookingRow) {
    return b.status === 'upcoming' && new Date(b.scheduled_at).getTime() + b.duration_minutes * 60_000 < Date.now();
}

function StatusPill({ status }: { status: BookingStatus }) {
    const meta = STATUS_META[status];
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
    );
}

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: number; sub: string; icon: React.ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value.toLocaleString('en-IN')}</span>
            <span className="mt-1 text-xs text-[#8A8A96]">{sub}</span>
        </div>
    );
}

function CopyButton({ value, label = 'Copy link' }: { value: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(value);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]"
        >
            {copied ? <Check className="size-4 text-[#059669]" /> : <Copy className="size-4" />}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function BookingsIndex({ bookings, counts, stats, timezone, filters }: BookingsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [toCancel, setToCancel] = useState<BookingRow | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    // props refresh hone pe drawer me hamesha taaza data dikhe
    const selected = bookings.data.find((b) => b.id === selectedId) ?? null;
    const totalAll = Object.values(counts).reduce((s, n) => s + Number(n ?? 0), 0);

    function visit(overrides: Partial<{ status: Tab; search: string; page: number }>) {
        const next = { status: filters.status, search: filters.search ?? '', ...overrides };
        router.get(
            BASE,
            { status: next.status === 'upcoming' ? undefined : next.status, search: next.search || undefined, page: overrides.page },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        visit({ search: search.trim() });
    }

    function setStatus(booking: BookingRow, status: Exclude<BookingStatus, 'upcoming'>) {
        setBusyId(booking.id);
        router.put(`${BASE}/${booking.uuid}/status`, { status }, { preserveScroll: true, preserveState: true, onFinish: () => setBusyId(null) });
    }

    // day-wise groups ("Today", "Tomorrow", …) — order wahi jo server ne diya
    const groups: { key: string; label: string; rows: BookingRow[] }[] = [];
    for (const b of bookings.data) {
        const key = dayKey(b.scheduled_at, timezone);
        const last = groups[groups.length - 1];
        if (last?.key === key) last.rows.push(b);
        else groups.push({ key, label: dayLabel(b.scheduled_at, timezone), rows: [b] });
    }

    return (
        <AppLayout breadcrumbs={bookingsBreadcrumbs()}>
            <Head title="Bookings" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <BookingsTabNav active="bookings" />

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Bookings</h1>
                            <p className="text-sm text-[#8A8A96]">Every call booked with you — mark them done, share meeting links and see what customers told you.</p>
                        </div>
                        <span className="flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-[#6B6B78] shadow-sm">
                            <CalendarDays className="size-3.5" /> Times shown in {timezone}
                        </span>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Today" value={stats.today} sub="Calls scheduled today" icon={<CalendarClock className="size-3.5" />} tone="bg-[#EEF2FF] text-[#4F46E5]" />
                        <KpiCard label="Next 7 days" value={stats.next_7_days} sub="Upcoming calls this week" icon={<CalendarDays className="size-3.5" />} tone="bg-[#E6F2FF] text-[#0284C7]" />
                        <KpiCard label="Completed" value={stats.completed_this_month} sub="This month" icon={<CalendarCheck className="size-3.5" />} tone="bg-[#E6F6EC] text-[#059669]" />
                        <KpiCard label="No-shows" value={stats.no_show_this_month} sub="This month" icon={<UserX className="size-3.5" />} tone="bg-[#FFEDE8] text-[#C2410C]" />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#F6F5F2] p-1">
                            {STATUS_TABS.map((tab) => {
                                const active = filters.status === tab.key;
                                const count = tab.key === 'all' ? totalAll : Number(counts[tab.key] ?? 0);
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => visit({ status: tab.key })}
                                        className={cn(
                                            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                                            active ? 'bg-white text-[#4F46E5] shadow-sm' : 'text-[#8A8A96] hover:text-[#14141B]',
                                        )}
                                    >
                                        {tab.label}
                                        <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', active ? 'bg-[#EEF2FF]' : 'bg-[#ECEBE6]')}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <form onSubmit={submitSearch} className="relative w-full lg:max-w-xs">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name, email, phone…"
                                className="w-full rounded-lg bg-[#F6F5F2] py-2 pr-3 pl-9 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20"
                            />
                        </form>
                    </div>

                    {/* List */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        {bookings.data.length === 0 ? (
                            <EmptyState tab={filters.status} searching={Boolean(filters.search)} />
                        ) : (
                            groups.map((group) => (
                                <div key={group.key}>
                                    <div className="border-y border-[#E4E2DA]/60 bg-[#F6F5F2]/70 px-6 py-2 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase first:border-t-0">
                                        {group.label}
                                    </div>
                                    <ul className="divide-y divide-[#E4E2DA]/50">
                                        {group.rows.map((b) => (
                                            <BookingItem
                                                key={b.id}
                                                booking={b}
                                                timezone={timezone}
                                                busy={busyId === b.id}
                                                onOpen={() => setSelectedId(b.id)}
                                                onStatus={(s) => (s === 'cancelled' ? setToCancel(b) : setStatus(b, s))}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            ))
                        )}

                        {bookings.total > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                                <p className="text-xs text-[#8A8A96]">
                                    Showing {bookings.from ?? 0}–{bookings.to ?? 0} of {bookings.total} bookings
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={bookings.current_page <= 1} onClick={() => visit({ page: bookings.current_page - 1 })} className="border-[#E4E2DA]">
                                        Previous
                                    </Button>
                                    <Button variant="outline" size="sm" disabled={bookings.current_page >= bookings.last_page} onClick={() => visit({ page: bookings.current_page + 1 })} className="border-[#E4E2DA]">
                                        Next <ArrowUpRight className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BookingDrawer
                booking={selected}
                timezone={timezone}
                busy={selected ? busyId === selected.id : false}
                onClose={() => setSelectedId(null)}
                onStatus={(s) => selected && (s === 'cancelled' ? setToCancel(selected) : setStatus(selected, s))}
            />

            <Modal open={Boolean(toCancel)} onClose={() => setToCancel(null)} title="Cancel this booking?">
                {toCancel && (
                    <>
                        <p className="text-sm text-[#6B6B78]">
                            {toCancel.customer?.name ?? 'This customer'}'s {toCancel.session} on {formatDate(toCancel.scheduled_at, timezone)},{' '}
                            {formatTimeRange(toCancel.scheduled_at, toCancel.duration_minutes, timezone)} will be marked as cancelled. This can't be undone.
                        </p>
                        <p className="mt-2 text-xs text-[#8A8A96]">Refunds aren't issued automatically — handle them from your payment gateway if needed.</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setToCancel(null)} className="border-[#E4E2DA]">
                                Keep booking
                            </Button>
                            <Button
                                onClick={() => {
                                    setStatus(toCancel, 'cancelled');
                                    setToCancel(null);
                                }}
                                className="bg-[#C2410C] hover:bg-[#9A3412]"
                            >
                                Cancel booking
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </AppLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  ROW                                                                */
/* ------------------------------------------------------------------ */

function StatusActions({ busy, onStatus, compact }: { busy: boolean; onStatus: (s: Exclude<BookingStatus, 'upcoming'>) => void; compact?: boolean }) {
    const btn = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition disabled:opacity-50';
    return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {busy && <Loader2 className="size-4 animate-spin text-[#8A8A96]" />}
            <button type="button" disabled={busy} onClick={() => onStatus('completed')} title="Mark completed" className={cn(btn, 'bg-[#E6F6EC] text-[#059669] hover:bg-[#D3F0DE]')}>
                <CheckCircle2 className="size-3.5" /> {!compact && 'Completed'}
            </button>
            <button type="button" disabled={busy} onClick={() => onStatus('no_show')} title="Mark no-show" className={cn(btn, 'bg-[#FFF4DB] text-[#B46E00] hover:bg-[#FDEBC2]')}>
                <UserX className="size-3.5" /> {!compact && 'No-show'}
            </button>
            <button type="button" disabled={busy} onClick={() => onStatus('cancelled')} title="Cancel booking" className={cn(btn, 'text-[#C2410C] hover:bg-[#FFEDE8]')}>
                <XCircle className="size-3.5" /> {!compact && 'Cancel'}
            </button>
        </div>
    );
}

function BookingItem({
    booking: b,
    timezone,
    busy,
    onOpen,
    onStatus,
}: {
    booking: BookingRow;
    timezone: string;
    busy: boolean;
    onOpen: () => void;
    onStatus: (s: Exclude<BookingStatus, 'upcoming'>) => void;
}) {
    const overdue = needsUpdate(b);
    const name = b.customer?.name ?? 'Guest';

    return (
        <li onClick={onOpen} className="group grid cursor-pointer grid-cols-1 gap-3 px-6 py-4 transition hover:bg-[#F6F5F2]/60 lg:grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
            <div>
                <span className="block text-[13px] font-semibold text-[#14141B]">{formatTimeRange(b.scheduled_at, b.duration_minutes, timezone)}</span>
                <span className="text-xs text-[#8A8A96]">{durationLabel(b.duration_minutes)}</span>
            </div>

            <div className="flex min-w-0 items-center gap-2.5">
                <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(name))}>{initials(name)}</div>
                <div className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{name}</span>
                    <span className="block truncate text-xs text-[#8A8A96]">{b.customer?.email ?? b.customer?.phone ?? '—'}</span>
                </div>
            </div>

            <div className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#14141B]">{b.session}</span>
                <span className="text-xs text-[#8A8A96]">{b.order ? formatCurrency(Number(b.order.total_amount)) : 'Free'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {overdue ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4DB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B46E00]">
                        <AlertTriangle className="size-3" /> Needs update
                    </span>
                ) : (
                    <StatusPill status={b.status} />
                )}

                {b.status === 'upcoming' && b.meeting_link && !overdue && (
                    <a
                        href={b.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 text-xs font-semibold text-white transition hover:bg-[#4338CA]"
                    >
                        <Video className="size-3.5" /> Join
                    </a>
                )}
                {b.status === 'upcoming' && !b.meeting_link && (
                    <span className="text-[11px] font-medium text-[#B46E00]" title="Add a meeting link from the booking details">
                        No meeting link
                    </span>
                )}
                {b.status === 'upcoming' && <StatusActions busy={busy} onStatus={onStatus} compact />}
            </div>
        </li>
    );
}

/* ------------------------------------------------------------------ */
/*  DRAWER                                                             */
/* ------------------------------------------------------------------ */

function BookingDrawer({
    booking,
    timezone,
    busy,
    onClose,
    onStatus,
}: {
    booking: BookingRow | null;
    timezone: string;
    busy: boolean;
    onClose: () => void;
    onStatus: (s: Exclude<BookingStatus, 'upcoming'>) => void;
}) {
    return (
        <>
            <div onClick={onClose} className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300', booking ? 'opacity-100' : 'pointer-events-none opacity-0')} />
            <aside
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out',
                    booking ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {/* key: dusri booking kholne pe link editor ka state reset ho */}
                {booking && <DrawerBody key={booking.id} booking={booking} timezone={timezone} busy={busy} onClose={onClose} onStatus={onStatus} />}
            </aside>
        </>
    );
}

function DrawerBody({
    booking: b,
    timezone,
    busy,
    onClose,
    onStatus,
}: {
    booking: BookingRow;
    timezone: string;
    busy: boolean;
    onClose: () => void;
    onStatus: (s: Exclude<BookingStatus, 'upcoming'>) => void;
}) {
    const [link, setLink] = useState(b.meeting_link ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const dirty = link.trim() !== (b.meeting_link ?? '');

    function saveLink() {
        setSaving(true);
        setError(null);
        router.put(
            `${BASE}/${b.uuid}/meeting-link`,
            { meeting_link: link.trim() || null },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSaved(true);
                    window.setTimeout(() => setSaved(false), 1500);
                },
                onError: (errors) => setError(errors.meeting_link ?? 'Could not save the link.'),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                <span className="text-base font-semibold text-[#14141B]">Booking details</span>
                <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                    <X className="size-5" />
                </button>
            </div>

            <div className="flex flex-col gap-5 p-6">
                {/* Schedule */}
                <div className="rounded-xl bg-[#F6F5F2] p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[15px] font-semibold text-[#14141B]">{b.session}</p>
                            <p className="mt-1 text-[13px] text-[#6B6B78]">{formatDate(b.scheduled_at, timezone, true)}</p>
                            <p className="text-[13px] text-[#6B6B78]">
                                {formatTimeRange(b.scheduled_at, b.duration_minutes, timezone)} · {durationLabel(b.duration_minutes)}
                            </p>
                        </div>
                        <StatusPill status={b.status} />
                    </div>
                    {needsUpdate(b) && <p className="mt-3 text-xs font-medium text-[#B46E00]">This call has ended — mark it as completed or no-show.</p>}
                </div>

                {/* Customer */}
                <section className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Customer</span>
                    <div className="flex flex-col gap-0.5 rounded-xl border border-[#E4E2DA] p-3">
                        <span className="text-[13px] font-semibold text-[#14141B]">{b.customer?.name ?? 'Guest'}</span>
                        {b.customer?.email && (
                            <a href={`mailto:${b.customer.email}`} className="text-[13px] text-[#4F46E5] hover:underline">
                                {b.customer.email}
                            </a>
                        )}
                        {b.customer?.phone && <span className="text-[13px] text-[#6B6B78]">{b.customer.phone}</span>}
                    </div>
                </section>

                {/* Meeting link */}
                <section className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Meeting link</span>
                    <div className="flex items-center gap-1.5">
                        <input
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://meet.google.com/…"
                            disabled={b.status !== 'upcoming'}
                            className="h-10 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 disabled:bg-[#F6F5F2] disabled:text-[#8A8A96]"
                        />
                        {b.meeting_link && !dirty && (
                            <>
                                <CopyButton value={b.meeting_link} />
                                <a href={b.meeting_link} target="_blank" rel="noopener noreferrer" title="Open link" className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                                    <ExternalLink className="size-4" />
                                </a>
                            </>
                        )}
                    </div>
                    {error && <span className="text-xs text-[#D93838]">{error}</span>}
                    {b.status === 'upcoming' && (
                        <div className="flex items-center gap-2">
                            {dirty && (
                                <Button size="sm" onClick={saveLink} disabled={saving} className="bg-[#4F46E5] hover:bg-[#4338CA]">
                                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save link
                                </Button>
                            )}
                            {saved && <span className="text-xs font-medium text-[#059669]">Saved</span>}
                            <span className="text-[11px] text-[#8A8A96]">Leave empty to use the session's default link.</span>
                        </div>
                    )}
                </section>

                {/* Payment */}
                <section className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Payment</span>
                    <div className="flex items-center justify-between rounded-xl border border-[#E4E2DA] p-3 text-[13px]">
                        {b.order ? (
                            <>
                                <span className="font-mono text-xs text-[#6B6B78]">{b.order.order_number}</span>
                                <span className="font-semibold text-[#14141B]">{formatCurrency(Number(b.order.total_amount))}</span>
                            </>
                        ) : (
                            <span className="text-[#6B6B78]">Free booking</span>
                        )}
                    </div>
                </section>

                {/* Responses */}
                <section className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Responses</span>
                    {b.responses.length ? (
                        <dl className="flex flex-col gap-2">
                            {b.responses.map((r, i) => (
                                <div key={i} className="rounded-xl bg-[#F6F5F2] p-3">
                                    <dt className="text-xs text-[#8A8A96]">{r.question_label}</dt>
                                    <dd className="mt-0.5 text-[13px] break-words whitespace-pre-line text-[#14141B]">{r.answer || '—'}</dd>
                                </div>
                            ))}
                        </dl>
                    ) : (
                        <p className="text-xs text-[#8A8A96]">The customer didn't answer any questions for this booking.</p>
                    )}
                </section>
            </div>

            {b.status === 'upcoming' && (
                <div className="mt-auto border-t border-[#E4E2DA] p-5">
                    <StatusActions busy={busy} onStatus={onStatus} />
                </div>
            )}
        </div>
    );
}

function EmptyState({ tab, searching }: { tab: Tab; searching: boolean }) {
    const copy: Record<Tab, string> = {
        upcoming: 'No upcoming bookings. Share your booking page so people can pick a slot.',
        completed: 'Completed calls will show up here.',
        cancelled: 'No cancelled bookings.',
        no_show: 'No no-shows — nice.',
        all: 'Bookings will show up here once someone books a session.',
    };

    return (
        <div className="p-6">
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-10 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                    <Inbox className="size-5" />
                </span>
                <p className="mt-1 text-sm font-semibold text-[#14141B]">{searching ? 'No bookings match your search' : 'Nothing here yet'}</p>
                <p className="max-w-sm px-4 text-xs text-[#8A8A96]">{searching ? 'Try a different name, email or phone number.' : copy[tab]}</p>
                {!searching && tab === 'upcoming' && (
                    <Link href="/dashboard/bookings/sessions" className="mt-3 text-xs font-semibold text-[#4F46E5] hover:underline">
                        Manage sessions →
                    </Link>
                )}
            </div>
        </div>
    );
}
