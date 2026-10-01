import { GHOST } from '@/components/customer/code-input';
import { VideoEmbed } from '@/components/public/video-embed';
import CustomerLayout from '@/layouts/customer-layout';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { BookOpen, CalendarDays, CreditCard, Download, FileText, GraduationCap, Lock, MapPin, PlayCircle, ShoppingBag, Video, type LucideIcon } from 'lucide-react';

interface Item {
    title: string;
    type: string;
    download_url: string | null;
    learn_url: string | null;
    event: { starts_at: string; ends_at: string | null; mode: 'online' | 'in_person'; join_link: string | null; venue_address: string | null } | null;
}

interface OrderRow {
    uuid: string;
    order_number: string;
    total_amount: number;
    paid_at: string | null;
    creator: { name: string; username: string | null } | null;
    invoice_url: string;
    items: Item[];
    unlocked: { title: string | null; hidden_message: string | null; hidden_video_url: string | null }[];
}

const TYPE: Record<string, { label: string; icon: LucideIcon }> = {
    course: { label: 'Course', icon: GraduationCap },
    event: { label: 'Event', icon: CalendarDays },
    book: { label: 'E-book', icon: BookOpen },
    locked_content: { label: 'Exclusive content', icon: Lock },
    payment_page: { label: 'Payment', icon: CreditCard },
    booking: { label: '1:1 session', icon: Video },
};

const money = (v: number) => (v > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v) : 'Free');
const date = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const dateTime = (v: string) => new Date(v).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function MyPurchases({ orders }: { orders: OrderRow[] }) {
    return (
        <CustomerLayout title="My purchases">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
                <p className="mt-1 text-sm text-[#8A8A96]">Everything you've bought, with downloads and invoices.</p>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-14 text-center shadow-sm">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#4F46E5]">
                        <ShoppingBag className="size-6" />
                    </span>
                    <p className="text-sm font-semibold">Nothing here yet</p>
                    <p className="max-w-sm text-sm text-[#8A8A96]">Purchases made with this email or mobile number appear here right after payment.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {orders.map((order) => (
                        <section key={order.uuid} className="rounded-xl bg-white shadow-sm">
                            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EFEA] px-5 py-3.5">
                                <div className="min-w-0 text-xs text-[#8A8A96]">
                                    <span className="font-mono font-semibold text-[#4B4B57]">{order.order_number}</span> · {date(order.paid_at)}
                                    {order.creator && ` · ${order.creator.name}`}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold tabular-nums">{money(order.total_amount)}</span>
                                    <a href={order.invoice_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:underline">
                                        <FileText className="size-3.5" /> Invoice
                                    </a>
                                </div>
                            </header>

                            <ul className="divide-y divide-[#F0EFEA]">
                                {order.items.map((item, i) => {
                                    const meta = TYPE[item.type] ?? { label: 'Product', icon: ShoppingBag };

                                    return (
                                        <li key={`${item.title}-${i}`} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F6F5F2] text-[#4B4B57]">
                                                    <meta.icon className="size-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold">{item.title}</p>
                                                    <p className="text-xs text-[#8A8A96]">
                                                        {meta.label}
                                                        {i > 0 && ' · add-on'}
                                                    </p>
                                                    {item.event && (
                                                        <div className="mt-2 flex flex-col gap-1 text-xs text-[#4B4B57]">
                                                            <span className="flex items-center gap-1.5">
                                                                <CalendarDays className="size-3.5 shrink-0" /> {dateTime(item.event.starts_at)}
                                                            </span>
                                                            {item.event.venue_address && (
                                                                <span className="flex items-start gap-1.5">
                                                                    <MapPin className="mt-0.5 size-3.5 shrink-0" /> {item.event.venue_address}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                {item.learn_url && (
                                                    <Link href={item.learn_url} className={cn(GHOST, 'border-[#4F46E5] text-[#4F46E5]')}>
                                                        <PlayCircle className="size-4" /> Open course
                                                    </Link>
                                                )}
                                                {item.download_url && (
                                                    <a href={item.download_url} className={cn(GHOST, 'border-[#4F46E5] text-[#4F46E5]')}>
                                                        <Download className="size-4" /> Download
                                                    </a>
                                                )}
                                                {item.event?.join_link && (
                                                    <a href={item.event.join_link} target="_blank" rel="noopener noreferrer" className={cn(GHOST, 'border-[#4F46E5] text-[#4F46E5]')}>
                                                        <Video className="size-4" /> Join link
                                                    </a>
                                                )}
                                                {item.type === 'booking' && (
                                                    <Link href="/me/bookings" className={GHOST}>
                                                        View session
                                                    </Link>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            {order.unlocked.map((content, i) => (
                                <div key={i} className="border-t border-[#F0EFEA] px-5 py-4">
                                    <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#059669] uppercase">
                                        <Lock className="size-3.5" /> Unlocked for you
                                    </p>
                                    {content.hidden_message && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-[#14141B]">{content.hidden_message}</p>}
                                    {content.hidden_video_url && <VideoEmbed url={content.hidden_video_url} className="mt-3 max-w-xl" />}
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            )}
        </CustomerLayout>
    );
}
