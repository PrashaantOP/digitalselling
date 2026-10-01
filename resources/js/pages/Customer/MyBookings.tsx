import { GHOST } from '@/components/customer/code-input';
import CustomerLayout from '@/layouts/customer-layout';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, Video } from 'lucide-react';

interface BookingRow {
    uuid: string;
    scheduled_at: string;
    duration_minutes: number;
    meeting_link: string | null;
    status: 'upcoming' | 'completed' | 'cancelled' | 'no_show';
    service: { product: { title: string } | null } | null;
    creator: { name: string; username: string | null } | null;
}

const STATUS: Record<string, string> = { upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Missed' };

// buyer ke apne timezone me (browser) — session ka waqt wahi dikhna chahiye jo uski ghadi me hoga
const day = (v: string) => new Date(v).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const time = (v: string, minutes: number) => {
    const start = new Date(v);
    const end = new Date(start.getTime() + minutes * 60_000);
    const format = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

    return `${format(start)} – ${format(end)}`;
};

export default function MyBookings({ upcoming, past }: { upcoming: BookingRow[]; past: BookingRow[] }) {
    return (
        <CustomerLayout title="My sessions">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
                <p className="mt-1 text-sm text-[#8A8A96]">Your 1:1 bookings. Times are shown in your device's time zone.</p>
            </div>

            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-bold">Upcoming</h2>
                {upcoming.length === 0 ? (
                    <p className="rounded-xl bg-white px-5 py-8 text-center text-sm text-[#8A8A96] shadow-sm">No upcoming sessions.</p>
                ) : (
                    upcoming.map((booking) => <BookingCard key={booking.uuid} booking={booking} highlight />)
                )}
            </section>

            {past.length > 0 && (
                <section className="flex flex-col gap-3">
                    <h2 className="text-sm font-bold">Earlier</h2>
                    {past.map((booking) => (
                        <BookingCard key={booking.uuid} booking={booking} />
                    ))}
                </section>
            )}
        </CustomerLayout>
    );
}

function BookingCard({ booking, highlight = false }: { booking: BookingRow; highlight?: boolean }) {
    return (
        <div className={cn('flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between', highlight && 'ring-1 ring-[#4F46E5]/20')}>
            <div className="min-w-0">
                <p className="text-sm font-bold">
                    {booking.service?.product?.title ?? 'Session'}
                    {booking.creator && <span className="font-normal text-[#8A8A96]"> with {booking.creator.name}</span>}
                </p>
                <div className="mt-2 flex flex-col gap-1 text-sm text-[#4B4B57]">
                    <span className="flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0 text-[#4F46E5]" /> {day(booking.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0" /> {time(booking.scheduled_at, booking.duration_minutes)}
                    </span>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {!highlight && <span className="rounded-full bg-[#F0EFEA] px-2.5 py-1 text-xs font-semibold text-[#6B6B78]">{STATUS[booking.status] ?? booking.status}</span>}
                {highlight &&
                    (booking.meeting_link ? (
                        <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer" className={cn(GHOST, 'border-[#4F46E5] text-[#4F46E5]')}>
                            <Video className="size-4" /> Join
                        </a>
                    ) : (
                        <span className="text-xs text-[#8A8A96]">Link will be shared before the call</span>
                    ))}
            </div>
        </div>
    );
}
