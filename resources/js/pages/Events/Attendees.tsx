import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Inbox,
    Info,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Search,
    Ticket,
    UserCheck,
    UserX,
    Users,
    Video,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

const BASE = '/dashboard/events';

type EventMode = 'online' | 'in_person';

interface EventDetail {
    mode: EventMode | null;
    starts_at: string | null;
    ends_at: string | null;
    venue_address: string | null;
    join_link: string | null;
}

interface AttendeeCustomer {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
}

interface Registration {
    id: number;
    event_id: number;
    customer_id: number;
    order_id: number;
    attended: boolean;
    registered_at: string | null;
    customer: AttendeeCustomer | null;
}

interface EventInfo {
    id: number;
    uuid: string;
    title: string;
    slug: string;
    status: 'draft' | 'unpublished' | 'published';
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

interface AttendeesProps {
    event: EventInfo;
    registrations: Paginated<Registration>;
    totals: { registered: number; attended: number };
    filters: { search?: string | null };
}

type Notice = { kind: 'success' | 'error'; text: string };

const INPUT_CLASS =
    'h-10 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function initials(name: string | null): string {
    const value = (name ?? '').trim();
    if (!value) return '?';
    return value
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

function errorText(errors: Record<string, string>, fallback: string): string {
    const messages = Object.values(errors).filter(Boolean);
    return messages.length ? messages.join(' ') : fallback;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (matches Events/Index conventions)                       */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, tone, hint }: { label: string; value: string | number; icon: React.ReactNode; tone: string; hint?: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value}</span>
            {hint && <span className="mt-1 text-xs text-[#8A8A96]">{hint}</span>}
        </div>
    );
}

function ModeChip({ event }: { event: EventInfo }) {
    const mode = event.event_detail?.mode;

    if (mode === 'in_person') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEDE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                <MapPin className="size-3" /> In person
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0284C7]">
            <Video className="size-3" /> Online
        </span>
    );
}

function AttendanceButton({ attended, busy, onClick }: { attended: boolean; busy: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            aria-pressed={attended}
            title={attended ? 'Mark as not attended' : 'Mark as attended'}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60',
                attended ? 'bg-[#E6F6EC] text-[#059669] hover:bg-[#D5F0E0]' : 'bg-[#F0EFEA] text-[#6B6B78] hover:bg-[#E6E4DD]',
            )}
        >
            {busy ? <Loader2 className="size-3 animate-spin" /> : attended ? <UserCheck className="size-3" /> : <UserX className="size-3" />}
            {attended ? 'Attended' : 'Not attended'}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/*  MAIN                                                               */
/* ------------------------------------------------------------------ */

export default function Attendees({ event, registrations, totals, filters }: AttendeesProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Events', href: BASE },
        { title: 'Attendees', href: `${BASE}/${event.uuid}/attendees` },
    ];

    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(timer);
    }, [notice]);

    const notAttended = Math.max(0, totals.registered - totals.attended);
    const rate = totals.registered > 0 ? Math.round((totals.attended / totals.registered) * 100) : 0;
    const hasSearch = Boolean(filters.search);

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        router.get(`${BASE}/${event.uuid}/attendees`, search ? { search } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function clearSearch() {
        setSearch('');
        router.get(`${BASE}/${event.uuid}/attendees`, {}, { preserveState: true, preserveScroll: true, replace: true });
    }

    function goToPage(page: number) {
        router.get(
            `${BASE}/${event.uuid}/attendees`,
            { ...(filters.search ? { search: filters.search } : {}), page },
            { preserveState: true, preserveScroll: true },
        );
    }

    function toggleAttended(reg: Registration) {
        const name = reg.customer?.name ?? 'Attendee';
        setBusyId(reg.id);
        router.put(
            `/dashboard/event-registrations/${reg.id}`,
            { attended: !reg.attended },
            {
                preserveScroll: true,
                onSuccess: () =>
                    setNotice({
                        kind: 'success',
                        text: `${name} marked as ${reg.attended ? 'not attended' : 'attended'}.`,
                    }),
                onError: (errors) => setNotice({ kind: 'error', text: errorText(errors, 'Could not update attendance.') }),
                onFinish: () => setBusyId(null),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Attendees · ${event.title}`} />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Attendees</h1>
                                <ModeChip event={event} />
                            </div>
                            <p className="text-sm text-[#8A8A96]">
                                Everyone who registered for <span className="font-medium text-[#4B4B57]">{event.title}</span> — mark attendance as the
                                event runs.
                            </p>
                        </div>
                        <Link href={BASE}>
                            <Button variant="outline" className="w-fit border-[#E4E2DA]">
                                <ArrowLeft className="size-4" /> Back to events
                            </Button>
                        </Link>
                    </div>

                    {/* Notice */}
                    {notice && (
                        <div
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

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard
                            label="Registered"
                            value={totals.registered}
                            icon={<Users className="size-3.5" />}
                            tone="bg-[#EEF2FF] text-[#4F46E5]"
                            hint="Total seats booked"
                        />
                        <StatCard
                            label="Attended"
                            value={totals.attended}
                            icon={<UserCheck className="size-3.5" />}
                            tone="bg-[#E6F6EC] text-[#059669]"
                            hint="Checked in so far"
                        />
                        <StatCard
                            label="Not attended"
                            value={notAttended}
                            icon={<UserX className="size-3.5" />}
                            tone="bg-[#FFEDE8] text-[#C2410C]"
                            hint="Still pending"
                        />
                        <StatCard
                            label="Attendance rate"
                            value={`${rate}%`}
                            icon={<Ticket className="size-3.5" />}
                            tone="bg-[#FFF4DB] text-[#B46E00]"
                            hint="Attended ÷ registered"
                        />
                    </div>

                    {/* Event schedule strip */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white px-4 py-3 text-xs text-[#4B4B57] shadow-sm">
                        <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 text-[#8A8A96]" />
                            Starts {formatDateTime(event.event_detail?.starts_at ?? null)}
                        </span>
                        {event.event_detail?.ends_at && (
                            <span className="flex items-center gap-1.5">
                                <CalendarDays className="size-3.5 text-[#8A8A96]" /> Ends {formatDateTime(event.event_detail.ends_at)}
                            </span>
                        )}
                        {event.event_detail?.mode === 'in_person' ? (
                            event.event_detail?.venue_address && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="size-3.5 text-[#8A8A96]" /> {event.event_detail.venue_address}
                                </span>
                            )
                        ) : event.event_detail?.join_link ? (
                            <span className="flex items-center gap-1.5">
                                <Video className="size-3.5 text-[#8A8A96]" /> Join link is shared with attendees
                            </span>
                        ) : null}
                    </div>

                    {/* Search */}
                    <form onSubmit={submitSearch} className="relative w-full max-w-sm">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email or phone…"
                            aria-label="Search attendees"
                            className={cn(INPUT_CLASS, 'pr-9 pl-9')}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                aria-label="Clear search"
                                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-[#8A8A96] hover:text-[#14141B]"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </form>

                    {/* Attendees table */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[#14141B]">Registrations</h2>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">
                                    {registrations.total > 0
                                        ? `Showing ${registrations.from ?? 0}–${registrations.to ?? 0} of ${registrations.total} attendees`
                                        : 'No attendees match this search'}
                                </p>
                            </div>
                        </div>

                        {registrations.data.length === 0 ? (
                            <div className="px-6 py-8">
                                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-10 text-center">
                                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                                        <Inbox className="size-5" />
                                    </span>
                                    <p className="mt-1 text-sm font-semibold text-[#14141B]">No registrations yet</p>
                                    <p className="max-w-sm px-4 text-xs text-[#8A8A96]">
                                        {hasSearch
                                            ? 'Try a different name, email or phone number.'
                                            : 'Attendees appear here as soon as someone registers and their payment settles.'}
                                    </p>
                                    {hasSearch && (
                                        <Button variant="outline" size="sm" onClick={clearSearch} className="mt-3 border-[#E4E2DA]">
                                            Clear search
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                            <th className="px-6 py-3">Attendee</th>
                                            <th className="px-4 py-3">Contact</th>
                                            <th className="px-4 py-3">Order</th>
                                            <th className="px-4 py-3">Registered</th>
                                            <th className="px-6 py-3 text-right">Attendance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E2DA]/50">
                                        {registrations.data.map((reg) => (
                                            <tr key={reg.id} className="transition-colors hover:bg-[#FAF9F5]">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-bold text-[#4F46E5]">
                                                            {initials(reg.customer?.name ?? null)}
                                                        </span>
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate text-[13px] font-semibold text-[#14141B]">
                                                                {reg.customer?.name ?? 'Unknown attendee'}
                                                            </span>
                                                            <span className="text-xs text-[#8A8A96]">Customer #{reg.customer_id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        {reg.customer?.email ? (
                                                            <span className="flex items-center gap-1.5 text-xs text-[#4B4B57]">
                                                                <Mail className="size-3 shrink-0 text-[#8A8A96]" />
                                                                <span className="max-w-[220px] truncate">{reg.customer.email}</span>
                                                            </span>
                                                        ) : null}
                                                        {reg.customer?.phone ? (
                                                            <span className="flex items-center gap-1.5 text-xs text-[#4B4B57]">
                                                                <Phone className="size-3 shrink-0 text-[#8A8A96]" /> {reg.customer.phone}
                                                            </span>
                                                        ) : null}
                                                        {!reg.customer?.email && !reg.customer?.phone && (
                                                            <span className="text-xs text-[#8A8A96]">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="font-mono text-xs text-[#4B4B57]">#{reg.order_id}</span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="text-xs text-[#4B4B57]">{formatDateTime(reg.registered_at)}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                                    <AttendanceButton
                                                        attended={reg.attended}
                                                        busy={busyId === reg.id}
                                                        onClick={() => toggleAttended(reg)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {registrations.total > 0 && (
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                                <p className="text-xs text-[#8A8A96]">
                                    Page <span className="font-semibold text-[#14141B]">{registrations.current_page}</span> of{' '}
                                    <span className="font-semibold text-[#14141B]">{registrations.last_page}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={registrations.current_page <= 1}
                                        onClick={() => goToPage(registrations.current_page - 1)}
                                        className="border-[#E4E2DA]"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={registrations.current_page >= registrations.last_page}
                                        onClick={() => goToPage(registrations.current_page + 1)}
                                        className="border-[#E4E2DA]"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-[#8A8A96]">
                        <Ticket className="size-3.5 text-[#FF6B4A]" />
                        Attendees get a join link or venue address the moment their payment settles. Mark attendance to track who actually showed up.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
