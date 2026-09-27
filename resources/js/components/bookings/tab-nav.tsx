import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

export type BookingsTab = 'bookings' | 'sessions' | 'responses' | 'availability';

const TABS: { key: BookingsTab; label: string; href: string }[] = [
    { key: 'bookings', label: 'Bookings', href: '/dashboard/bookings' },
    { key: 'sessions', label: 'Sessions', href: '/dashboard/bookings/sessions' },
    { key: 'responses', label: 'Responses', href: '/dashboard/bookings/responses' },
    { key: 'availability', label: 'Availability', href: '/dashboard/bookings/settings' },
];

/** Bookings ke chaaron pages ka sticky top tab bar — Payments page jaisa. */
export function BookingsTabNav({ active }: { active: BookingsTab }) {
    return (
        <div className="sticky top-0 z-30 border-b border-[#E4E2DA] bg-[#F6F5F2]/95 backdrop-blur-md">
            <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                <nav className="flex items-center gap-6 overflow-x-auto">
                    {TABS.map((tab) => (
                        <Link
                            key={tab.key}
                            href={tab.href}
                            preserveScroll
                            className={cn(
                                '-mb-px flex shrink-0 items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                                active === tab.key ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#8A8A96] hover:border-[#E4E2DA] hover:text-[#14141B]',
                            )}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}

export const bookingsBreadcrumbs = (title?: string) => [{ title: 'Bookings', href: '/dashboard/bookings' }, ...(title ? [{ title, href: '#' }] : [])];
