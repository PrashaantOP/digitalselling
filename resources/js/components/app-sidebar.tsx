import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
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
    Settings,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Store,
    Users,
    Wallet,
    Zap,
} from 'lucide-react';
import { useCan } from '@/hooks/use-can';
import { useState } from 'react';

// requires: sub-admin ke paas ye permission ho tabhi link dikhe; 'owner' = sirf store owner. (Asli rok server pe.)
type NavLink = { title: string; href: string; icon: typeof LayoutGrid; tone?: string; requires?: string };

const mainLinks: NavLink[] = [
    { title: 'Getting Started', href: '/dashboard', icon: Sparkles },
    { title: 'Web App', href: '/dashboard/web-app', icon: Smartphone, requires: 'store.view' },
    { title: 'Store', href: '/dashboard/store', icon: Store, requires: 'store.view' },
    { title: 'Payments', href: '/dashboard/payments', icon: CircleDollarSign, requires: 'payments.view' },
    { title: 'Settlements', href: '/dashboard/settlements', icon: Wallet, requires: 'payouts.view' },
    { title: 'Audience', href: '/dashboard/audience', icon: Users, requires: 'audience.view' },
    { title: 'Refer & Earn', href: '/dashboard/refer-earn', icon: Sparkles, requires: 'owner' },
    { title: 'Team', href: '/dashboard/sub-admins', icon: ShieldCheck, requires: 'owner' },
];

const appLinks: NavLink[] = [
    { title: 'Courses', href: '/dashboard/courses', icon: GraduationCap, tone: 'bg-[#EEF0FF] text-[#4F46E5]', requires: 'courses.view' },
    { title: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays, tone: 'bg-[#E6F2FF] text-[#0284C7]', requires: 'bookings.view' },
    { title: 'Events', href: '/dashboard/events', icon: CalendarDays, tone: 'bg-[#FFEDE8] text-[#FF6B4A]', requires: 'events.view' },
    { title: 'Payment Pages', href: '/dashboard/payment-pages', icon: CreditCard, tone: 'bg-[#E1F6F3] text-[#0D9488]', requires: 'payment-pages.view' },
    { title: 'Books', href: '/dashboard/books', icon: BookOpen, tone: 'bg-[#FFF4DB] text-[#B46E00]', requires: 'books.view' },
    { title: 'Locked Content', href: '/dashboard/locked-content', icon: Lock, tone: 'bg-[#F1EAFE] text-[#7C3AED]', requires: 'locked-content.view' },
    { title: 'AutoDM', href: '/dashboard/autodm', icon: MessageCircle, tone: 'bg-[#FDE8F1] text-[#DB2777]', requires: 'autodm.view' },
];

function isActive(currentUrl: string, href: string) {
    return href === '/dashboard' ? currentUrl === href : currentUrl === href || currentUrl.startsWith(`${href}/`);
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const { can, isOwner, storeOwner } = useCan();
    const visible = (item: NavLink) => !item.requires || (item.requires === 'owner' ? isOwner : can(item.requires));
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
            {!isOwner ? (
                // team member: kis store me kaam kar raha hai — apna koi storefront nahi
                <div className="mt-3 rounded-lg border border-[#E4E2DA] bg-[#EEF0FF] p-2"><p className="truncate text-xs font-bold text-[#4F46E5]">Team member</p><p className="truncate text-[11px] text-[#4B4B57]">Working in {storeOwner ?? 'the owner'}'s store</p></div>
            ) : (<>
            <a href={storeUrl} target="_blank" rel="noreferrer" title="Open storefront in a new tab" className="group mt-3 flex items-center justify-between rounded-lg border border-[#E4E2DA] bg-[#F0EFEA] p-2 transition hover:border-[#C9C6BC] hover:bg-white">
                <div className="min-w-0"><p className="truncate text-xs font-bold text-[#14141B]">{auth.user.name}'s Store</p><p className="truncate text-[11px] text-[#8A8A96]">{username ? storeUrl : 'Set up your store'}</p></div>
                <ExternalLink className="size-4 shrink-0 text-[#8A8A96] transition group-hover:text-[#4F46E5]" />
            </a>
            {username && <a href={`${baseUrl}/w/${username}`} target="_blank" rel="noreferrer" title="Open your website in a new tab" className="mt-1.5 flex items-center justify-between rounded-md px-2 py-1 text-[11px] font-medium text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#4F46E5]"><span className="truncate">Website · /w/{username}</span><ExternalLink className="size-3 shrink-0" /></a>}
            </>)}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div><p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-[#8A8A96]">Main</p><div className="space-y-0.5">{mainLinks.filter(visible).map((item) => renderNavLink(item))}</div></div>
            <div><p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-[#8A8A96]">Apps & Tools</p><div className="space-y-1">{appLinks.filter(visible).map((item) => renderNavLink(item, true))}</div><Link href="/dashboard/products" className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-[#E4E2DA] bg-[#F0EFEA] px-2.5 py-2 text-sm font-medium text-[#4B4B57] transition hover:bg-white hover:text-[#14141B]"><LayoutGrid className="size-4 text-[#8A8A96]" />Explore all apps</Link></div>
        </nav>

        <div className="relative space-y-3 border-t border-[#E4E2DA] p-3">
            {auth.plan && <PlanCard plan={auth.plan} canUpgrade={Boolean(auth.isOwner)} />}
            <button type="button" onClick={() => setUserMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg p-2 text-left transition hover:bg-[#F0EFEA]"><span className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#4F46E5]/20 bg-[#EEF0FF] text-sm font-bold text-[#4F46E5]">{initials(auth.user.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-[#14141B]">{auth.user.name}</span><span className="block truncate text-[11px] text-[#8A8A96]">{auth.isOwner ? 'Creator' : 'Team member'}{auth.plan ? ` · ${auth.plan.effective === 'pro' ? 'Pro' : 'Free'} Plan` : ''}</span></span></span><ChevronDown className="size-4 text-[#8A8A96]" /></button>
            {userMenuOpen && <div className="absolute bottom-14 left-3 right-3 z-20 rounded-xl border border-[#E4E2DA] bg-white p-1.5 shadow-lg"><p className="border-b border-[#E4E2DA] px-2.5 py-1.5 text-xs text-[#8A8A96]">{auth.user.email}</p><Link href="/dashboard/settings/profile" className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#4B4B57] hover:bg-[#F0EFEA]"><Settings className="size-4" />Profile settings</Link><Link href="/dashboard/settings/billing" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#4B4B57] hover:bg-[#F0EFEA]"><CreditCard className="size-4" />Billing & payouts</Link>{auth.isOwner && <Link href="/dashboard/settings/notifications" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-[#4B4B57] hover:bg-[#F0EFEA]"><Bell className="size-4" />Notifications</Link>}<button onClick={() => router.post('/logout')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"><FileLock2 className="size-4" />Log out</button></div>}
        </div>
    </aside>;
}
/** Store ka asli plan — pehle yahan "Free Plan / 0% fee" hardcoded tha, chahe creator Pro pe ho. */
function PlanCard({ plan, canUpgrade }: { plan: NonNullable<SharedData['auth']['plan']>; canUpgrade: boolean }) {
    const pro = plan.effective === 'pro';
    const daysLeft = plan.expires_at ? Math.max(0, Math.ceil((new Date(plan.expires_at).getTime() - Date.now()) / 86_400_000)) : null;
    const endingSoon = pro && daysLeft !== null && daysLeft <= 7;

    return (
        <div className="rounded-lg border border-[#E4E2DA] bg-[#F0EFEA] p-3">
            <div className="flex justify-between gap-2 text-xs">
                <span className="font-bold text-[#14141B]">{pro ? 'Pro Plan' : 'Free Plan'}</span>
                <span className="text-[#8A8A96]">{Number(plan.commission_rate.toFixed(2))}% commission</span>
            </div>
            {pro && daysLeft !== null && (
                <p className={`mt-1 text-[11px] ${endingSoon ? 'font-semibold text-[#B46E00]' : 'text-[#8A8A96]'}`}>
                    {daysLeft === 0 ? 'Ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                </p>
            )}
            {canUpgrade && (!pro || endingSoon) && (
                <Link
                    href="/dashboard/settings/billing"
                    className="mt-2 flex items-center justify-center gap-1 rounded-md bg-[#FF6B4A] px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#E85D3D]"
                >
                    <Zap className="size-3.5" />
                    {pro ? 'Extend Pro' : 'Upgrade to Pro'}
                </Link>
            )}
        </div>
    );
}
