import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { CalendarDays, CreditCard, FileLock2, GraduationCap, Loader2, Package, Rocket, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

/*
 * Dashboard ka "Create a product" — type chuno aur us product ka page khulta hai (wahan list + apna "Create" button).
 * Koi draft apne aap nahi banta. Sub-admin ko sirf wahi types dikhte hain jinka edit permission hai.
 */

type Option = {
    key: string;
    title: string;
    description: string;
    icon: LucideIcon;
    tone: string;
    perm: string;
    /** us product type ka dashboard page */
    href: string;
};

const OPTIONS: Option[] = [
    {
        // payment page ke "Files to deliver" se file links pay ke baad buyer ko email + purchases me milte hain
        key: 'digital',
        title: 'Sell Digital Product',
        description: 'Sell e-books, PDFs, images or any files — buyers get the download links right after paying.',
        icon: Package,
        tone: 'bg-[#FEF3C7] text-[#B45309]',
        perm: 'payment-pages.edit',
        href: '/dashboard/payment-pages',
    },
    {
        key: 'booking',
        title: 'Offer 1-on-1 Session',
        description: 'Set up a paid call or mentorship slot your audience can book.',
        icon: Rocket,
        tone: 'bg-[#EDE9FE] text-[#7C3AED]',
        perm: 'bookings.edit',
        href: '/dashboard/bookings/sessions',
    },
    {
        key: 'course',
        title: 'Sell a course',
        description: 'Sell access to your video lessons, live classes, quizzes and certificates.',
        icon: GraduationCap,
        tone: 'bg-[#EEF0FF] text-[#4F46E5]',
        perm: 'courses.edit',
        href: '/dashboard/courses',
    },
    {
        key: 'event',
        title: 'Host Event or Webinar',
        description: 'Sell tickets for live workshops, webinars or in-person meetups.',
        icon: CalendarDays,
        tone: 'bg-[#FFEDE8] text-[#C2410C]',
        perm: 'events.edit',
        href: '/dashboard/events',
    },
    {
        key: 'locked_content',
        title: 'Locked Content',
        description: 'Lock a message, link or video behind a price. Visitors pay to unlock.',
        icon: FileLock2,
        tone: 'bg-[#FCE7F3] text-[#BE185D]',
        perm: 'locked-content.edit',
        href: '/dashboard/locked-content',
    },
    {
        key: 'payment_page',
        title: 'Take any Payment',
        description: 'Share a link and get paid for anything — services, donations, deposits.',
        icon: CreditCard,
        tone: 'bg-[#E0F2FE] text-[#0369A1]',
        perm: 'payment-pages.edit',
        href: '/dashboard/payment-pages',
    },
];

export function CreateProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { can } = useCan();
    const [busy, setBusy] = useState<string | null>(null);
    const options = OPTIONS.filter((o) => can(o.perm));

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, onClose]);

    if (!open) return null;

    function choose(option: Option) {
        if (busy) return;
        setBusy(option.key);

        router.visit(option.href, { onFinish: () => setBusy(null) });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-[#14141B]/50 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
            <div role="dialog" aria-modal="true" aria-labelledby="create-product-title" className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-2xl sm:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="create-product-title" className="text-xl font-bold tracking-tight text-[#14141B]">
                            Create a product
                        </h2>
                        <p className="mt-1 text-sm text-[#6B6B78]">Make money by selling products and services.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={Boolean(busy)} aria-label="Close" className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F6F5F2] hover:text-[#14141B]">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {options.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => choose(option)}
                            disabled={Boolean(busy)}
                            className={cn(
                                'group flex items-start gap-3.5 rounded-xl border border-[#E4E2DA] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#4F46E5]/40 hover:shadow-md disabled:cursor-wait',
                                busy && busy !== option.key && 'opacity-50',
                            )}
                        >
                            <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', option.tone)}>
                                {busy === option.key ? <Loader2 className="size-5 animate-spin" /> : <option.icon className="size-5" />}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[15px] font-bold text-[#14141B] group-hover:text-[#4F46E5]">{option.title}</span>
                                <span className="mt-0.5 block text-[13px] leading-snug text-[#6B6B78]">{option.description}</span>
                            </span>
                        </button>
                    ))}
                    {options.length === 0 && <p className="col-span-full py-6 text-center text-sm text-[#8A8A96]">You don’t have permission to create products in this store.</p>}
                </div>
            </div>
        </div>
    );
}
