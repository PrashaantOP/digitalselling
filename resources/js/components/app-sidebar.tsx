import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CalendarDays,
    ChevronDown,
    CircleDollarSign,
    CreditCard,
    ExternalLink,
    FileLock2,
    GraduationCap,
    LayoutGrid,
    Lock,
    MessageCircle,
    Package,
    Settings,
    ShieldCheck,
    Sparkles,
    Store,
    Users,
    Wallet,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

type NavLink = { title: string; href: string; icon: typeof LayoutGrid; tone?: string };

const mainLinks: NavLink[] = [
    { title: 'Getting Started', href: '/dashboard', icon: Sparkles },
    { title: 'Store', href: '/dashboard/store', icon: Store },
    { title: 'Payments', href: '/dashboard/payments', icon: CircleDollarSign },
    { title: 'Payouts', href: '/dashboard/payouts', icon: Wallet },
    { title: 'Audience', href: '/dashboard/audience', icon: Users },
    { title: 'Refer & Earn', href: '/dashboard/refer-earn', icon: Sparkles },
    { title: 'Sub-admins', href: '/dashboard/sub-admins', icon: ShieldCheck },
];

const appLinks: NavLink[] = [
    { title: 'Courses', href: '/dashboard/courses', icon: GraduationCap, tone: 'bg-[#EEF0FF] text-[#4F46E5]' },
    { title: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays, tone: 'bg-[#E6F2FF] text-[#0284C7]' },
    { title: 'Events', href: '/dashboard/events', icon: CalendarDays, tone: 'bg-[#FFEDE8] text-[#FF6B4A]' },
    { title: 'Payment Pages', href: '/dashboard/payment-pages', icon: CreditCard, tone: 'bg-[#E1F6F3] text-[#0D9488]' },
    { title: 'Books', href: '/dashboard/books', icon: BookOpen, tone: 'bg-[#FFF4DB] text-[#B46E00]' },
    { title: 'Locked Content', href: '/dashboard/locked-content', icon: Lock, tone: 'bg-[#F1EAFE] text-[#7C3AED]' },
    { title: 'AutoDM', href: '/dashboard/autodm', icon: MessageCircle, tone: 'bg-[#FDE8F1] text-[#DB2777]' },
];

function isActive(currentUrl: string, href: string) {
    return href === '/dashboard' ? currentUrl === href : currentUrl === href || currentUrl.startsWith(`${href}/`);
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const page = usePage();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const username = typeof auth.user.username === 'string' ? auth.user.username : '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const storeUrl = username ? `${baseUrl}/${username}` : '/dashboard/store';

    const renderNavLink = (item: NavLink, app = false) => {
        const active = isActive(page.url, item.href);
        return <Link key={item.title} href={item.href} prefetch className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${active ? 'bg-[#EEF0FF] font-semibold text-[#4F46E5]' : 'font-medium text-[#4B4B57] hover:bg-[#F0EFEA] hover:text-[#14141B]'}`}>
            {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[#4F46E5]" />}
            {app ? <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${item.tone}`}><item.icon className="size-4" /></span> : <item.icon className={`size-4 shrink-0 ${active ? 'text-[#4F46E5]' : 'text-[#8A8A96]'}`} />}
            <span className="truncate">{item.title}</span>
            {active && app && <span className="ml-auto size-1.5 rounded-full bg-[#4F46E5]" />}
        </Link>;
    };

    return <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 flex-col border-r border-[#E4E2DA] bg-white lg:flex">
        <div className="border-b border-[#E4E2DA] p-4">
            <Link href="/dashboard" className="flex items-center gap-2.5"><span className="flex size-7 items-center justify-center rounded-[7px] bg-[#4F46E5] text-sm font-extrabold text-white shadow-sm">K</span><span className="text-base font-extrabold tracking-tight text-[#14141B]">Kiln</span></Link>
            <a href={storeUrl} target="_blank" rel="noreferrer" title="Open storefront in a new tab" className="group mt-3 flex items-center justify-between rounded-lg border border-[#E4E2DA] bg-[#F0EFEA] p-2 transition hover:border-[#C9C6BC] hover:bg-white">
                <div className="min-w-0"><p className="truncate text-xs font-bold text-[#14141B]">{auth.user.name}'s Store</p><p className="truncate text-[11px] text-[#8A8A96]">{username ? storeUrl : 'Set up your store'}</p></div>
                <ExternalLink className="size-4 shrink-0 text-[#8A8A96] transition group-hover:text-[#4F46E5]" />
            </a>
            {username && <a href={`${baseUrl}/w/${username}`} target="_blank" rel="noreferrer" title="Open your website in a new tab" className="mt-1.5 flex items-center justify-between rounded-md px-2 py-1 text-[11px] font-medium text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#4F46E5]"><span className="truncate">Website · /w/{username}</span><ExternalLink className="size-3 shrink-0" /></a>}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div><p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-[#8A8A96]">Main</p><div className="space-y-0.5">{mainLinks.map((item) => renderNavLink(item))}</div></div>
            <div><p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-[#8A8A96]">Apps & Tools</p><div className="space-y-1">{appLinks.map((item) => renderNavLink(item, true))}</div><Link href="/dashboard/products" className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-[#E4E2DA] bg-[#F0EFEA] px-2.5 py-2 text-sm font-medium text-[#4B4B57] transition hover:bg-white hover:text-[#14141B]"><LayoutGrid className="size-4 text-[#8A8A96]" />Explore all apps</Link></div>
        </nav>

        <div className="relative space-y-3 border-t border-[#E4E2DA] p-3">
            <div className="rounded-lg border border-[#E4E2DA] bg-[#F0EFEA] p-3"><div className="flex justify-between text-xs"><span className="font-bold text-[#14141B]">Free Plan</span><span className="text-[#8A8A96]">15% commission</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E4E2DA]"><span className="block h-full w-[20%] rounded-full bg-[#4F46E5]" /></div><Link href="/dashboard/settings/billing" className="mt-2 flex items-center justify-center gap-1 rounded-md bg-[#FF6B4A] px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#E85D3D]"><Zap className="size-3.5" />Upgrade to Pro (0% fee)</Link></div>
            <button type="button" onClick={() => setUserMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg p-2 text-left transition hover:bg-[#F0EFEA]"><span className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#4F46E5]/20 bg-[#EEF0FF] text-sm font-bold text-[#4F46E5]">{initials(auth.user.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-[#14141B]">{auth.user.name}</span><span className="block truncate text-[11px] text-[#8A8A96]">Creator · Free Plan</span></span></span><ChevronDown className="size-4 text-[#8A8A96]" /></button>
            {userMenuOpen && <div className="absolute bottom-14 left-3 right-3 z-20 rounded-xl border border-[#E4E2DA] bg-white p-1.5 shadow-lg"><p className="border-b border-[#E4E2DA] px-2.5 py-1.5 text-xs text-[#8A8A96]">{auth.user.email}</p><Link href="/dashboard/settings/profile" className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#4B4B57] hover:bg-[#F0EFEA]"><Settings className="size-4" />Profile settings</Link><Link href="/dashboard/settings/billing" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#4B4B57] hover:bg-[#F0EFEA]"><CreditCard className="size-4" />Billing & payouts</Link><button onClick={() => router.post('/logout')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"><FileLock2 className="size-4" />Log out</button></div>}
        </div>
    </aside>;
}