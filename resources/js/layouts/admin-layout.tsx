import { BrandIcon } from '@/components/brand';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, Banknote, CreditCard, FileClock, LayoutDashboard, LogOut, Menu, MessageSquareWarning, Receipt, Users, Wallet, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type AdminShared = { admin: { uuid: string; name: string; email: string } | null; flash?: { status?: string | null } };

const NAV = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/creators', label: 'Creators', icon: Users },
    { href: '/admin/kyc', label: 'KYC review', icon: BadgeCheck },
    { href: '/admin/payout-methods', label: 'Payout methods', icon: Wallet },
    { href: '/admin/settlements', label: 'Settlements', icon: Banknote },
    { href: '/admin/billing', label: 'Billing', icon: CreditCard },
    { href: '/admin/orders', label: 'Orders', icon: Receipt },
    { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareWarning },
    { href: '/admin/audit', label: 'Audit log', icon: FileClock },
];

/**
 * Admin panel ka frame — jaan-bujh ke creator dashboard se alag dikhta hai (dark sidebar, "Admin" label),
 * taaki koi galti se bhi na soche ki wo creator side pe hai.
 */
export default function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
    const { admin, flash } = usePage<AdminShared>().props;
    const [open, setOpen] = useState(false);
    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

    const nav = (
        <nav className="flex flex-col gap-0.5 p-3">
            {NAV.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                        isActive(item.href, item.exact) ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                    )}
                >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                </Link>
            ))}
        </nav>
    );

    return (
        <>
            <Head title={`${title} · Admin`} />
            <div className="flex min-h-dvh bg-slate-50 text-slate-900">
                {/* sidebar */}
                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-900 transition-transform lg:static lg:translate-x-0',
                        open ? 'translate-x-0' : '-translate-x-full',
                    )}
                >
                    <div className="flex h-14 items-center justify-between gap-2 border-b border-white/10 px-4">
                        <span className="flex items-center gap-2 text-sm font-bold text-white">
                            <BrandIcon className="size-7" /> Platform admin
                        </span>
                        <button onClick={() => setOpen(false)} className="text-slate-400 lg:hidden" aria-label="Close menu">
                            <X className="size-5" />
                        </button>
                    </div>
                    {nav}
                    <div className="mt-auto border-t border-white/10 p-4">
                        <p className="truncate text-sm font-semibold text-white">{admin?.name}</p>
                        <p className="truncate text-xs text-slate-400">{admin?.email}</p>
                        <button
                            onClick={() => router.post('/admin/logout')}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                        >
                            <LogOut className="size-3.5" /> Sign out
                        </button>
                    </div>
                </aside>
                {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" />}

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
                        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
                            <Menu className="size-5" />
                        </button>
                        <span className="text-sm font-bold">Platform admin</span>
                    </header>
                    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 md:px-8">
                        {flash?.status && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">{flash.status}</div>}
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
