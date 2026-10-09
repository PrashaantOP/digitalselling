import { BookingsTabNav, bookingsBreadcrumbs } from '@/components/bookings/tab-nav';
import { Toggle } from '@/components/course-editor/ui';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router, usePage } from '@inertiajs/react';
import { CalendarOff, Check, Clock, Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

interface DayRow {
    weekday: number;
    is_enabled: boolean;
    start_time: string;
    end_time: string;
}

interface BlockedDate {
    id: number;
    uuid: string;
    date: string;
    reason: string | null;
}

interface SettingsProps {
    timezone: string;
    week: DayRow[];
    exceptions: BlockedDate[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Monday se shuru — India me week aise hi padha jaata hai
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const COMMON_TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];

const INPUT = 'h-10 rounded-lg border border-cp-line bg-cp-surface px-3 text-sm text-cp-ink shadow-sm outline-none focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';

function allTimezones(current: string) {
    const intl = Intl as unknown as { supportedValuesOf?: (key: 'timeZone') => string[] };
    const list = intl.supportedValuesOf?.('timeZone') ?? COMMON_TIMEZONES;
    return list.includes(current) ? list : [current, ...list];
}

/** "2026-10-02" (ya ISO) → "Fri, 2 Oct 2026" — sirf calendar date, timezone shift nahi hona chahiye. */
function formatBlockedDate(value: string) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookingSettings({ timezone, week, exceptions }: SettingsProps) {
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };

    return (
        <AppLayout breadcrumbs={bookingsBreadcrumbs('Availability')}>
            <Head title="Availability" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <BookingsTabNav active="availability" />

                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col gap-1 pt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Availability</h1>
                        <p className="text-sm text-cp-muted">Set the hours people can book you. Customers only see open slots inside these hours.</p>
                    </div>

                    <WeeklyHours timezone={timezone} week={week} errors={errors} />
                    <BlockedDates exceptions={exceptions} errors={errors} />
                </div>
            </div>
        </AppLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Weekly hours                                                       */
/* ------------------------------------------------------------------ */

function WeeklyHours({ timezone: initialTz, week, errors }: { timezone: string; week: DayRow[]; errors: Record<string, string> }) {
    const [timezone, setTimezone] = useState(initialTz);
    const [days, setDays] = useState<DayRow[]>(() => [...week].sort((a, b) => a.weekday - b.weekday));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const zones = useMemo(() => allTimezones(initialTz), [initialTz]);

    const dirty = timezone !== initialTz || JSON.stringify(days) !== JSON.stringify([...week].sort((a, b) => a.weekday - b.weekday));
    const invalidDay = days.find((d) => d.is_enabled && (!d.start_time || !d.end_time || d.end_time <= d.start_time));

    function update(weekday: number, patch: Partial<DayRow>) {
        setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
    }

    function copyToAll(source: DayRow) {
        setDays((prev) => prev.map((d) => (d.is_enabled ? { ...d, start_time: source.start_time, end_time: source.end_time } : d)));
    }

    function save(e: FormEvent) {
        e.preventDefault();
        if (invalidDay) return;
        setSaving(true);
        router.put(
            '/dashboard/bookings/settings/availability',
            { timezone, week: days.map((d) => (d.is_enabled ? d : { ...d, start_time: d.start_time || null, end_time: d.end_time || null })) },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSaved(true);
                    window.setTimeout(() => setSaved(false), 2000);
                },
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <form onSubmit={save} className="rounded-xl bg-cp-surface p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-cp-line/70 pb-5 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cp-brand-soft text-cp-brand-ink">
                        <Clock className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-cp-ink">Weekly hours</h2>
                        <p className="mt-0.5 text-xs text-cp-muted">Turn on the days you take calls and set your working hours.</p>
                    </div>
                </div>
                <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">Timezone</span>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={cn(INPUT, 'w-full sm:w-60')}>
                        {zones.map((z) => (
                            <option key={z} value={z}>
                                {z.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                    {errors.timezone && <span className="text-xs text-cp-red-ink">{errors.timezone}</span>}
                </label>
            </div>

            <ul className="mt-2 divide-y divide-cp-line/60">
                {DISPLAY_ORDER.map((weekday) => {
                    const day = days.find((d) => d.weekday === weekday);
                    if (!day) return null;
                    const idx = days.indexOf(day);
                    const rowError =
                        errors[`week.${idx}.end_time`] ??
                        errors[`week.${idx}.start_time`] ??
                        (day.is_enabled && day.start_time && day.end_time && day.end_time <= day.start_time ? 'End time must be after start time.' : undefined);

                    return (
                        <li key={weekday} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center">
                            <div className="flex w-40 items-center gap-3">
                                <Toggle checked={day.is_enabled} onChange={(v) => update(weekday, { is_enabled: v })} label={`Available on ${DAY_NAMES[weekday]}`} />
                                <span className={cn('text-sm font-medium', day.is_enabled ? 'text-cp-ink' : 'text-cp-muted')}>{DAY_NAMES[weekday]}</span>
                            </div>
                            {day.is_enabled ? (
                                <div className="flex flex-1 flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <input type="time" aria-label={`${DAY_NAMES[weekday]} start`} value={day.start_time} onChange={(e) => update(weekday, { start_time: e.target.value })} className={INPUT} />
                                        <span className="text-sm text-cp-muted">to</span>
                                        <input type="time" aria-label={`${DAY_NAMES[weekday]} end`} value={day.end_time} onChange={(e) => update(weekday, { end_time: e.target.value })} className={INPUT} />
                                        <button
                                            type="button"
                                            title="Copy these hours to all open days"
                                            aria-label="Copy these hours to all open days"
                                            onClick={() => copyToAll(day)}
                                            className="rounded-lg p-2 text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink"
                                        >
                                            <Copy className="size-4" />
                                        </button>
                                    </div>
                                    {rowError && <span className="text-xs text-cp-red-ink">{rowError}</span>}
                                </div>
                            ) : (
                                <span className="text-sm text-cp-muted">Unavailable</span>
                            )}
                        </li>
                    );
                })}
            </ul>

            <div className="mt-4 flex items-center gap-3 border-t border-cp-line/70 pt-5">
                <Button type="submit" disabled={!dirty || saving || Boolean(invalidDay)} className="text-white bg-cp-brand hover:bg-cp-brand-hover">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {saving ? 'Saving…' : 'Save availability'}
                </Button>
                {saved && <span className="text-xs font-medium text-cp-success-ink">Availability saved</span>}
            </div>
        </form>
    );
}

/* ------------------------------------------------------------------ */
/*  Blocked dates                                                      */
/* ------------------------------------------------------------------ */

function BlockedDates({ exceptions, errors }: { exceptions: BlockedDate[]; errors: Record<string, string> }) {
    const [date, setDate] = useState('');
    const [reason, setReason] = useState('');
    const [adding, setAdding] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    function add(e: FormEvent) {
        e.preventDefault();
        if (!date) return;
        setAdding(true);
        router.post(
            '/dashboard/bookings/settings/exceptions',
            { date, reason: reason.trim() || null },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setDate('');
                    setReason('');
                },
                onFinish: () => setAdding(false),
            },
        );
    }

    function remove(ex: BlockedDate) {
        setRemovingId(ex.id);
        router.delete(`/dashboard/bookings/exceptions/${ex.uuid}`, { preserveScroll: true, preserveState: true, onFinish: () => setRemovingId(null) });
    }

    return (
        <section className="rounded-xl bg-cp-surface p-6 shadow-sm">
            <div className="flex items-start gap-3.5 border-b border-cp-line/70 pb-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cp-coral-soft text-cp-coral-dark-ink">
                    <CalendarOff className="size-5" />
                </span>
                <div>
                    <h2 className="text-base font-semibold text-cp-ink">Blocked dates</h2>
                    <p className="mt-0.5 text-xs text-cp-muted">Holidays or days off — nobody can book you on these dates.</p>
                </div>
            </div>

            <form onSubmit={add} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-1">
                    <input type="date" aria-label="Date to block" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} className={INPUT} />
                    {errors.date && <span className="text-xs text-cp-red-ink">{errors.date}</span>}
                </div>
                <input value={reason} maxLength={150} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional) — e.g. Diwali" className={cn(INPUT, 'flex-1')} />
                <Button type="submit" disabled={!date || adding} variant="outline" className="h-10 border-cp-line">
                    {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Block date
                </Button>
            </form>

            {exceptions.length === 0 ? (
                <p className="mt-5 rounded-lg bg-cp-canvas px-4 py-3 text-xs text-cp-muted">No blocked dates coming up.</p>
            ) : (
                <ul className="mt-5 flex flex-col gap-2">
                    {exceptions.map((ex) => (
                        <li key={ex.id} className="flex items-center justify-between gap-3 rounded-lg bg-cp-canvas px-4 py-2.5">
                            <div className="min-w-0">
                                <span className="block text-[13px] font-semibold text-cp-ink">{formatBlockedDate(ex.date)}</span>
                                {ex.reason && <span className="block truncate text-xs text-cp-muted">{ex.reason}</span>}
                            </div>
                            <button
                                type="button"
                                onClick={() => remove(ex)}
                                disabled={removingId === ex.id}
                                title="Unblock date"
                                aria-label="Unblock date"
                                className="rounded-lg p-1.5 text-cp-muted transition hover:bg-cp-coral-soft hover:text-cp-coral-dark-ink disabled:opacity-50"
                            >
                                {removingId === ex.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
