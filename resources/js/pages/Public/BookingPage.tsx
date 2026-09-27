import { durationLabel, formatDate, formatTimeRange } from '@/components/bookings/format';
import { cookie, money } from '@/components/public/checkout-card';
import { PublicProductLayout, SectionLabel, type PublicCreator } from '@/components/public/public-product-layout';
import { cn } from '@/lib/utils';
import { CalendarCheck, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Loader2, Lock, Video } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

type Question = { id: number; label: string; field_type: 'text' | 'phone' | 'email' | 'number' | 'dropdown'; options: string[] | null; is_required: boolean };

type Service = {
    id: number;
    title: string;
    slug: string;
    description: string;
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    button_text: string | null;
    duration_minutes: number;
    bookable: boolean;
    questions: Question[];
};

type Slot = { start: string; label: string };

type Confirmed = { scheduled_at: string; duration_minutes: number; session: string; meeting_link: string | null; calendar_url: string; email: string };

type Props = {
    creator: PublicCreator;
    services: Service[];
    timezone: string;
    availableWeekdays: number[];
    blockedDates: string[];
};

const ACCENT = '#4F46E5';
const DAYS_AHEAD = 30;
const PAGE_SIZE = 7;
const INPUT = 'h-11 w-full rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';

/* ---- date helpers: creator ke timezone ka "aaj", aur Y-m-d strings pe calendar maths ---- */

function todayIn(timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addDays(key: string, n: number) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function keyParts(key: string) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return {
        weekday: date.getUTCDay(),
        dayName: new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short' }).format(date),
        dayNum: d,
        month: new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'short' }).format(date),
    };
}

function priceLabel(s: Service) {
    if (s.pricing_type === 'free') return 'Free';
    if (s.pricing_type === 'customer_decides') return 'Pay what you want';
    const discounted = s.has_discount && Number(s.discounted_price) > 0 && Number(s.discounted_price) < Number(s.price);
    return money(discounted ? Number(s.discounted_price) : Number(s.price));
}

export default function BookingPage({ creator, services, timezone, availableWeekdays, blockedDates }: Props) {
    const initialSlug = useMemo(() => {
        const wanted = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('service') : null;
        return services.find((s) => s.slug === wanted)?.slug ?? services.find((s) => s.bookable)?.slug ?? services[0].slug;
    }, [services]);

    const [slug, setSlug] = useState(initialSlug);
    const service = services.find((s) => s.slug === slug) ?? services[0];

    const today = useMemo(() => todayIn(timezone), [timezone]);
    const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today]);
    const isOpenDay = (key: string) => availableWeekdays.includes(keyParts(key).weekday) && !blockedDates.includes(key);

    const [page, setPage] = useState(0);
    const [date, setDate] = useState<string | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotError, setSlotError] = useState<string | null>(null);
    const [slot, setSlot] = useState<Slot | null>(null);
    const requestId = useRef(0);

    const [fields, setFields] = useState({ name: '', email: '', phone: '' });
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

    async function loadSlots(forSlug: string, forDate: string) {
        const id = ++requestId.current;
        setLoadingSlots(true);
        setSlotError(null);
        setSlots([]);
        setSlot(null);
        try {
            const res = await fetch(`/book/${creator.username}/slots?service=${encodeURIComponent(forSlug)}&date=${forDate}`, { headers: { Accept: 'application/json' } });
            const data = await res.json().catch(() => null);
            if (id !== requestId.current) return; // user ne beech me dusra din chun liya
            if (!res.ok) throw new Error(data?.message);
            setSlots(data.slots ?? []);
        } catch {
            if (id === requestId.current) setSlotError('Could not load times. Please try again.');
        } finally {
            if (id === requestId.current) setLoadingSlots(false);
        }
    }

    function pickDate(key: string) {
        setDate(key);
        void loadSlots(service.slug, key);
    }

    // session badalte hi pehla khula din chun lo
    useEffect(() => {
        setAnswers({});
        setErrors({});
        setFormError(null);
        if (!service.bookable) {
            setDate(null);
            setSlot(null);
            return;
        }
        const first = days.find(isOpenDay);
        if (first) {
            setPage(Math.floor(days.indexOf(first) / PAGE_SIZE));
            pickDate(first);
        } else {
            setDate(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!slot || submitting) return;
        setSubmitting(true);
        setErrors({});
        setFormError(null);

        try {
            const res = await fetch(`/book/${creator.username}/${service.slug}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') },
                body: JSON.stringify({ ...fields, slot: slot.start, answers }),
            });
            const data = await res.json().catch(() => null);

            if (res.ok) {
                setConfirmed(data.booking);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const fieldErrors: Record<string, string> = Object.fromEntries(Object.entries(data?.errors ?? {}).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : String(v)]));
            setErrors(fieldErrors);
            if (fieldErrors.slot && date) {
                setFormError(fieldErrors.slot);
                void loadSlots(service.slug, date);
            } else if (!Object.keys(fieldErrors).length) {
                setFormError(data?.message ?? 'Could not book this slot. Please try again.');
            }
        } catch {
            setFormError('Could not reach the server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    const visibleDays = days.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const lastPage = Math.ceil(days.length / PAGE_SIZE) - 1;

    if (confirmed) {
        return (
            <PublicProductLayout title={`Booked — ${confirmed.session}`} accent={ACCENT} creator={creator} aside={null}>
                <Confirmation booking={confirmed} creatorName={creator.name} timezone={timezone} />
            </PublicProductLayout>
        );
    }

    return (
        <PublicProductLayout
            title={`Book a session with ${creator.name}`}
            accent={ACCENT}
            creator={creator}
            aside={
                <aside className="h-fit rounded-2xl border border-[#E4E2DA] bg-white p-5 shadow-sm lg:sticky lg:top-6">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-[#4F46E5] uppercase">Your booking</p>
                    <p className="mt-2 text-base font-semibold text-[#14141B]">{service.title}</p>
                    <div className="mt-2 flex flex-col gap-1.5 text-sm text-[#6B6B78]">
                        <span className="flex items-center gap-2">
                            <Clock className="size-4 shrink-0" /> {durationLabel(service.duration_minutes)} · {priceLabel(service)}
                        </span>
                        <span className="flex items-center gap-2">
                            <CalendarCheck className="size-4 shrink-0" />
                            {slot ? `${formatDate(slot.start, timezone)}, ${formatTimeRange(slot.start, service.duration_minutes, timezone)}` : 'Pick a date and time'}
                        </span>
                    </div>

                    {!service.bookable ? (
                        <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#F6F5F2] p-3 text-xs text-[#6B6B78]">
                            <Lock className="mt-0.5 size-3.5 shrink-0" /> Online payment for this session is coming soon. Check back shortly or pick a free session.
                        </div>
                    ) : (
                        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
                            <Field error={errors.name}>
                                <input required value={fields.name} maxLength={150} onChange={(e) => setFields({ ...fields, name: e.target.value })} placeholder="Full name" autoComplete="name" className={INPUT} />
                            </Field>
                            <Field error={errors.email}>
                                <input required type="email" value={fields.email} maxLength={150} onChange={(e) => setFields({ ...fields, email: e.target.value })} placeholder="Email" autoComplete="email" className={INPUT} />
                            </Field>
                            <Field error={errors.phone}>
                                <input required type="tel" value={fields.phone} maxLength={16} onChange={(e) => setFields({ ...fields, phone: e.target.value.replace(/[^\d+]/g, '') })} placeholder="Phone number" autoComplete="tel" className={INPUT} />
                            </Field>

                            {service.questions.map((q) => (
                                <Field key={q.id} error={errors[`answers.${q.id}`]}>
                                    {q.field_type === 'dropdown' ? (
                                        <select required={q.is_required} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} className={INPUT}>
                                            <option value="">
                                                {q.label}
                                                {q.is_required ? '' : ' (optional)'}
                                            </option>
                                            {(q.options ?? []).map((o) => (
                                                <option key={o} value={o}>
                                                    {o}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            required={q.is_required}
                                            type={q.field_type === 'number' ? 'number' : q.field_type === 'email' ? 'email' : q.field_type === 'phone' ? 'tel' : 'text'}
                                            maxLength={255}
                                            value={answers[q.id] ?? ''}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            placeholder={`${q.label}${q.is_required ? '' : ' (optional)'}`}
                                            className={INPUT}
                                        />
                                    )}
                                </Field>
                            ))}

                            {formError && <p className="rounded-lg bg-[#FFEDE8] px-3 py-2 text-xs font-medium text-[#C2410C]">{formError}</p>}

                            <button
                                type="submit"
                                disabled={!slot || submitting}
                                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-lg bg-[#4F46E5] text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="size-4 animate-spin" />}
                                {slot ? 'Confirm booking' : 'Select a time first'}
                            </button>
                            <p className="text-center text-[11px] text-[#8A8A96]">You'll get a confirmation email with the details.</p>
                        </form>
                    )}
                </aside>
            }
        >
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#14141B]">Book a session with {creator.name}</h1>
                <p className="mt-2 text-sm text-[#6B6B78]">Pick a session, choose a time that works for you and you're done.</p>
            </div>

            {/* 1. Session */}
            <div>
                <SectionLabel accent={ACCENT}>1 · Choose a session</SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {services.map((s) => {
                        const active = s.slug === service.slug;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setSlug(s.slug)}
                                aria-pressed={active}
                                className={cn(
                                    'flex flex-col rounded-xl border bg-white p-4 text-left transition',
                                    active ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/15' : 'border-[#E4E2DA] hover:border-[#C9C6BB]',
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-[15px] font-semibold text-[#14141B]">{s.title}</span>
                                    {active && (
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                                            <Check className="size-3" />
                                        </span>
                                    )}
                                </div>
                                <span className="mt-1 text-xs text-[#6B6B78]">
                                    {durationLabel(s.duration_minutes)} · <span className="font-semibold text-[#14141B]">{priceLabel(s)}</span>
                                </span>
                                {s.description && <span className="mt-2 line-clamp-3 text-xs text-[#8A8A96]">{s.description}</span>}
                                {!s.bookable && (
                                    <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-[#F6F5F2] px-2 py-0.5 text-[10px] font-semibold text-[#6B6B78]">
                                        <Lock className="size-3" /> Online payment coming soon
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {service.bookable && (
                <>
                    {/* 2. Date */}
                    <div>
                        <div className="flex items-center justify-between">
                            <SectionLabel accent={ACCENT}>2 · Pick a date</SectionLabel>
                            <div className="mb-3 flex items-center gap-1">
                                <button type="button" aria-label="Previous week" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg p-1.5 text-[#6B6B78] transition hover:bg-[#F0EFEA] disabled:opacity-30">
                                    <ChevronLeft className="size-4" />
                                </button>
                                <button type="button" aria-label="Next week" disabled={page === lastPage} onClick={() => setPage(page + 1)} className="rounded-lg p-1.5 text-[#6B6B78] transition hover:bg-[#F0EFEA] disabled:opacity-30">
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                            {visibleDays.map((key) => {
                                const p = keyParts(key);
                                const open = isOpenDay(key);
                                const active = key === date;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        disabled={!open}
                                        onClick={() => pickDate(key)}
                                        className={cn(
                                            'flex flex-col items-center rounded-xl border py-2.5 transition',
                                            active
                                                ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                                                : open
                                                  ? 'border-[#E4E2DA] bg-white text-[#14141B] hover:border-[#4F46E5]'
                                                  : 'cursor-not-allowed border-transparent bg-[#F0EFEA]/60 text-[#B5B3AA]',
                                        )}
                                    >
                                        <span className={cn('text-[10px] font-semibold uppercase', active ? 'text-white/80' : 'text-[#8A8A96]')}>{key === today ? 'Today' : p.dayName}</span>
                                        <span className="text-lg leading-tight font-bold">{p.dayNum}</span>
                                        <span className={cn('text-[10px]', active ? 'text-white/80' : 'text-[#8A8A96]')}>{p.month}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {!days.some(isOpenDay) && <p className="mt-3 text-sm text-[#6B6B78]">{creator.name} isn't taking bookings in the next few weeks. Please check back later.</p>}
                    </div>

                    {/* 3. Time */}
                    {date && (
                        <div>
                            <SectionLabel accent={ACCENT}>3 · Pick a time</SectionLabel>
                            {loadingSlots ? (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {Array.from({ length: 8 }, (_, i) => (
                                        <div key={i} className="h-11 animate-pulse rounded-lg bg-[#ECEBE6]" />
                                    ))}
                                </div>
                            ) : slotError ? (
                                <p className="text-sm text-[#C2410C]">
                                    {slotError}{' '}
                                    <button type="button" onClick={() => pickDate(date)} className="font-semibold underline">
                                        Retry
                                    </button>
                                </p>
                            ) : slots.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-[#E4E2DA] bg-white px-4 py-5 text-center text-sm text-[#6B6B78]">No times left on this day — try another date.</p>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {slots.map((s) => (
                                        <button
                                            key={s.start}
                                            type="button"
                                            onClick={() => setSlot(s)}
                                            aria-pressed={slot?.start === s.start}
                                            className={cn(
                                                'h-11 rounded-lg border text-sm font-semibold transition',
                                                slot?.start === s.start ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#E4E2DA] bg-white text-[#14141B] hover:border-[#4F46E5]',
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <p className="mt-3 text-xs text-[#8A8A96]">Times are in {timezone.replace(/_/g, ' ')}.</p>
                        </div>
                    )}
                </>
            )}
        </PublicProductLayout>
    );
}

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            {children}
            {error && <span className="text-xs text-[#D93838]">{error}</span>}
        </div>
    );
}

function Confirmation({ booking, creatorName, timezone }: { booking: Confirmed; creatorName: string; timezone: string }) {
    return (
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-[#E4E2DA] bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#E6F6EC] text-[#059669]">
                <Check className="size-7" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#14141B]">You're booked!</h1>
            <p className="mt-1 text-sm text-[#6B6B78]">
                {booking.session} with {creatorName}
            </p>

            <div className="mt-6 rounded-xl bg-[#F6F5F2] p-4 text-left text-sm">
                <p className="flex items-center gap-2 font-semibold text-[#14141B]">
                    <CalendarCheck className="size-4 text-[#4F46E5]" /> {formatDate(booking.scheduled_at, timezone, true)}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[#6B6B78]">
                    <Clock className="size-4" /> {formatTimeRange(booking.scheduled_at, booking.duration_minutes, timezone)} ({timezone.replace(/_/g, ' ')})
                </p>
                {booking.meeting_link && (
                    <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-2 break-all text-[#4F46E5] hover:underline">
                        <Video className="size-4 shrink-0" /> {booking.meeting_link}
                    </a>
                )}
            </div>

            {!booking.meeting_link && <p className="mt-3 text-xs text-[#8A8A96]">{creatorName} will share the meeting link before the call.</p>}

            <a
                href={booking.calendar_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-5 text-sm font-semibold text-white transition hover:bg-[#4338CA]"
            >
                <CalendarPlus className="size-4" /> Add to Google Calendar
            </a>
            <p className="mt-3 text-xs text-[#8A8A96]">A confirmation has been sent to {booking.email}.</p>
        </div>
    );
}
