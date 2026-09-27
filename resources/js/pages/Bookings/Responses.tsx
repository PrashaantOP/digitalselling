import { formatDate, formatTime, initials } from '@/components/bookings/format';
import { BookingsTabNav, bookingsBreadcrumbs } from '@/components/bookings/tab-nav';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { ArrowUpRight, MessageSquareText } from 'lucide-react';

interface ResponseRow {
    id: number;
    scheduled_at: string;
    status: string;
    session: string;
    customer: { name: string | null; email: string | null; phone: string | null } | null;
    responses: { question_label: string; answer: string }[];
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

export default function BookingResponses({ bookings, timezone }: { bookings: Paginated<ResponseRow>; timezone: string }) {
    function goToPage(page: number) {
        router.get('/dashboard/bookings/responses', { page }, { preserveState: true });
    }

    return (
        <AppLayout breadcrumbs={bookingsBreadcrumbs('Responses')}>
            <Head title="Booking responses" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <BookingsTabNav active="responses" />

                <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col gap-1 pt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Responses</h1>
                        <p className="text-sm text-[#8A8A96]">Answers customers gave to your questions while booking — read them before the call.</p>
                    </div>

                    {bookings.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-white py-12 text-center">
                            <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                                <MessageSquareText className="size-5" />
                            </span>
                            <p className="mt-1 text-sm font-semibold text-[#14141B]">No responses yet</p>
                            <p className="max-w-sm px-4 text-xs text-[#8A8A96]">Add checkout questions to a session and the answers will appear here.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {bookings.data.map((b) => (
                                <article key={b.id} className="rounded-xl bg-white p-5 shadow-sm">
                                    <header className="flex flex-col justify-between gap-3 border-b border-[#E4E2DA]/70 pb-4 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[11px] font-bold text-[#4F46E5]">
                                                {initials(b.customer?.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-[13px] font-semibold text-[#14141B]">{b.customer?.name ?? 'Guest'}</p>
                                                <p className="truncate text-xs text-[#8A8A96]">{b.customer?.email ?? b.customer?.phone ?? '—'}</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-[13px] font-medium text-[#14141B]">{b.session}</p>
                                            <p className="text-xs text-[#8A8A96]">
                                                {formatDate(b.scheduled_at, timezone)}, {formatTime(b.scheduled_at, timezone)}
                                            </p>
                                        </div>
                                    </header>
                                    <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {b.responses.map((r, i) => (
                                            <div key={i} className="rounded-lg bg-[#F6F5F2] p-3">
                                                <dt className="text-xs text-[#8A8A96]">{r.question_label}</dt>
                                                <dd className="mt-0.5 text-[13px] break-words whitespace-pre-line text-[#14141B]">{r.answer || '—'}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </article>
                            ))}
                        </div>
                    )}

                    {bookings.last_page > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-[#8A8A96]">
                                Page {bookings.current_page} of {bookings.last_page}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={bookings.current_page <= 1} onClick={() => goToPage(bookings.current_page - 1)} className="border-[#E4E2DA] bg-white">
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={bookings.current_page >= bookings.last_page} onClick={() => goToPage(bookings.current_page + 1)} className="border-[#E4E2DA] bg-white">
                                    Next <ArrowUpRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
