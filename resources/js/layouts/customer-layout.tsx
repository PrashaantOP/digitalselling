import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, GraduationCap, LogOut, ShoppingBag, UserRound } from 'lucide-react';
import { type ReactNode } from 'react';

export type CustomerShared = { name: string; buyer: { name: string | null; email: string } | null; flash?: { status?: string | null } };

const NAV = [
    { href: '/me/courses', label: 'Courses', icon: GraduationCap },
    { href: '/me/purchases', label: 'Purchases', icon: ShoppingBag },
    { href: '/me/bookings', label: 'Sessions', icon: CalendarDays },
    { href: '/me/account', label: 'Account', icon: UserRound },
];

/**
 * Customer portal (/me) ka frame — creator dashboard se jaan-bujh ke alag aur halka: upar ek patli nav,
 * phone pe neeche tab bar (installed app jaisa). Buyer yahan sirf apni kharid dekhta hai.
 */
export default function CustomerLayout({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
    const { name, buyer, flash } = usePage<CustomerShared>().props;
    const path = usePage().url.split('?')[0];
    const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

    return (
        <div className="flex min-h-screen flex-col bg-[#F6F5F2] text-[#14141B]">
            <Head title={title} />

            <header className="sticky top-0 z-30 border-b border-[#E4E2DA] bg-white/90 backdrop-blur">
                <div className={cn('mx-auto flex h-14 items-center justify-between gap-4 px-4 md:px-6', wide ? 'max-w-[1400px]' : 'max-w-5xl')}>
                    <Link href="/me/courses" className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] text-sm font-bold text-white">{name.charAt(0)}</span>
                        <span className="truncate text-sm font-bold">My learning</span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                                    isActive(item.href) ? 'bg-[#EEF0FF] text-[#4F46E5]' : 'text-[#6B6B78] hover:bg-[#F6F5F2] hover:text-[#14141B]',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex shrink-0 items-center gap-3">
                        {buyer && <span className="hidden max-w-[180px] truncate text-xs text-[#8A8A96] sm:block">{buyer.name || buyer.email}</span>}
                        <button
                            type="button"
                            onClick={() => router.post('/me/logout')}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4B4B57] transition hover:bg-[#F6F5F2]"
                        >
                            <LogOut className="size-3.5" /> Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className={cn('mx-auto flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-24 md:px-6 md:pb-10', wide ? 'max-w-[1400px]' : 'max-w-5xl')}>
                {flash?.status && <div className="rounded-xl bg-[#E6F6EC] px-4 py-3 text-sm font-semibold text-[#059669]">{flash.status}</div>}
                {children}
            </main>

            {/* phone: neeche tab bar */}
            <nav
                className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#E4E2DA] bg-white/95 backdrop-blur md:hidden"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                {NAV.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', isActive(item.href) ? 'text-[#4F46E5]' : 'text-[#8A8A96]')}
                    >
                        <item.icon className="size-5" />
                        {item.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

/** Login / verify / done page ka chhota centered card (bina nav ke). */
export function CustomerCard({ title, children }: { title: string; children: ReactNode }) {
    const { name } = usePage<CustomerShared>().props;

    return (
        <div className="flex min-h-screen flex-col items-center bg-[#F6F5F2] px-4 py-10 text-[#14141B]">
            <Head title={title} />
            <div className="mb-6 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#4F46E5] text-sm font-bold text-white">{name.charAt(0)}</span>
                <span className="text-base font-bold">{name}</span>
            </div>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">{children}</div>
        </div>
    );
}
