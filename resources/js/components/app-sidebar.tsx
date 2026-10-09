import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpen,
    Check,
    CalendarDays,
    ChevronDown,
    CircleDollarSign,
    Copy,
    CreditCard,
    ExternalLink,
    FileLock2,
    GraduationCap,
    LayoutGrid,
    Lock,
    MessageCircle,
    Settings,
    ShieldCheck,
    Sparkles,
    Store,
    Users,
    Wallet,
    X,
    Zap,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand';
import { useCan } from '@/hooks/use-can';
import { useEffect, useState } from 'react';

// requires: sub-admin ke paas ye permission ho tabhi link dikhe; 'owner' = sirf store owner. (Asli rok server pe.)
export type NavLink = { title: string; href: string; icon: typeof LayoutGrid; tone?: string; requires?: string };

export const mainLinks: NavLink[] = [
    { title: 'Getting Started', href: '/dashboard', icon: Sparkles },
    { title: 'Store', href: '/dashboard/store', icon: Store, requires: 'store.view' },
    { title: 'Payments', href: '/dashboard/payments', icon: CircleDollarSign, requires: 'payments.view' },
    { title: 'Settlements', href: '/dashboard/settlements', icon: Wallet, requires: 'payouts.view' },
    { title: 'Audience', href: '/dashboard/audience', icon: Users, requires: 'audience.view' },
    { title: 'Refer & Earn', href: '/dashboard/refer-earn', icon: Sparkles, requires: 'owner' },
    { title: 'Team', href: '/dashboard/sub-admins', icon: ShieldCheck, requires: 'owner' },
];

export const appLinks: NavLink[] = [
    { title: 'Courses', href: '/dashboard/courses', icon: GraduationCap, tone: 'bg-cp-brand-soft text-cp-brand-ink', requires: 'courses.view' },
    { title: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays, tone: 'bg-cp-sky-soft text-cp-sky-ink', requires: 'bookings.view' },
    { title: 'Events', href: '/dashboard/events', icon: CalendarDays, tone: 'bg-cp-coral-soft text-cp-coral-ink', requires: 'events.view' },
    { title: 'Payment Pages', href: '/dashboard/payment-pages', icon: CreditCard, tone: 'bg-cp-teal-soft text-cp-teal-ink', requires: 'payment-pages.view' },
    { title: 'Books', href: '/dashboard/books', icon: BookOpen, tone: 'bg-cp-warning-soft text-cp-warning-ink', requires: 'books.view' },
    { title: 'Locked Content', href: '/dashboard/locked-content', icon: Lock, tone: 'bg-cp-accent-soft text-cp-accent-ink', requires: 'locked-content.view' },
    { title: 'AutoDM', href: '/dashboard/autodm', icon: MessageCircle, tone: 'bg-cp-pink-soft text-cp-pink-ink', requires: 'autodm.view' },
];

export function isActive(currentUrl: string, href: string) {
    return href === '/dashboard' ? currentUrl === href : currentUrl === href || currentUrl.startsWith(`${href}/`);
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
}

/** Desktop (lg+): hamesha dikhne wala sidebar. Mobile / tablet pe MobileNav (mobile-nav.tsx: top bar + bottom bar). */
export function AppSidebar() {
    return (
        <aside className="sticky top-0 hidden h-dvh w-[288px] shrink-0 flex-col border-r border-cp-line bg-cp-surface lg:flex">
            <SidebarBody />
        </aside>
    );
}

export function BrandLink() {
    return (
        <Link href="/dashboard" aria-label="CreatorPro dashboard" className="flex items-center">
            <BrandLogo variant="auto" className="h-8" />
        </Link>
    );
}

/** Sidebar ka andar ka saara content — desktop aur mobile ka "More" drawer dono yahi dikhate hain, taaki link ek hi jagah jude. */
export function SidebarBody({ onClose }: { onClose?: () => void }) {
    const { auth } = usePage<SharedData>().props;
    const { can, isOwner, storeOwner } = useCan();
    const visible = (item: NavLink) => !item.requires || (item.requires === 'owner' ? isOwner : can(item.requires));
    const page = usePage();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const username = typeof auth.user.username === 'string' ? auth.user.username : '';

    const renderNavLink = (item: NavLink, app = false) => {
        const active = isActive(page.url, item.href);
        return <Link key={item.title} href={item.href} prefetch className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${active ? 'bg-cp-brand-soft font-semibold text-cp-brand-ink' : 'font-medium text-cp-body hover:bg-cp-surface-3 hover:text-cp-ink'}`}>
            {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-cp-brand" />}
            {app ? <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${item.tone}`}><item.icon className="size-4" /></span> : <item.icon className={`size-4 shrink-0 ${active ? 'text-cp-brand-ink' : 'text-cp-muted'}`} />}
            <span className="truncate">{item.title}</span>
            {active && app && <span className="ml-auto size-1.5 rounded-full bg-cp-brand" />}
        </Link>;
    };

    return <>
        <div className="border-b border-cp-line p-4">
            <div className="flex items-center justify-between gap-2">
                <BrandLink />
                {onClose && <button type="button" onClick={onClose} aria-label="Close menu" className="-mr-1.5 flex size-9 items-center justify-center rounded-lg text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink"><X className="size-5" /></button>}
            </div>
            {!isOwner ? (
                // team member: kis store me kaam kar raha hai — apna koi storefront nahi
                <div className="mt-3 rounded-lg border border-cp-line bg-cp-brand-soft p-2"><p className="truncate text-xs font-bold text-cp-brand-ink">Team member</p><p className="truncate text-[11px] text-cp-body">Working in {storeOwner ?? 'the owner'}'s store</p></div>
            ) : (
                <StoreLinkCard name={`${auth.user.name}'s Store`} username={username} />
            )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div><p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-cp-muted">Main</p><div className="space-y-0.5">{mainLinks.filter(visible).map((item) => renderNavLink(item))}</div></div>
            <div><p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-cp-muted">Apps & Tools</p><div className="space-y-1">{appLinks.filter(visible).map((item) => renderNavLink(item, true))}</div><Link href="/dashboard/products" className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-cp-line bg-cp-surface-3 px-2.5 py-2 text-sm font-medium text-cp-body transition hover:bg-cp-surface hover:text-cp-ink"><LayoutGrid className="size-4 text-cp-muted" />Explore all apps</Link></div>
        </nav>

        <div className="relative space-y-3 border-t border-cp-line p-3">
            {auth.plan && <PlanCard plan={auth.plan} canUpgrade={Boolean(auth.isOwner)} />}
            <button type="button" onClick={() => setUserMenuOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg p-2 text-left transition hover:bg-cp-surface-3"><span className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cp-brand/20 bg-cp-brand-soft text-sm font-bold text-cp-brand-ink">{initials(auth.user.name)}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-cp-ink">{auth.user.name}</span><span className="block truncate text-[11px] text-cp-muted">{auth.isOwner ? 'Creator' : 'Team member'}{auth.plan ? ` · ${auth.plan.effective === 'plus' ? 'Plus' : 'Free'} Plan` : ''}</span></span></span><ChevronDown className="size-4 text-cp-muted" /></button>
            {userMenuOpen && <div className="absolute bottom-14 left-3 right-3 z-20 rounded-xl border border-cp-line bg-cp-surface p-1.5 shadow-lg"><p className="border-b border-cp-line px-2.5 py-1.5 text-xs text-cp-muted">{auth.user.email}</p><Link href="/dashboard/settings/profile" className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-cp-body hover:bg-cp-surface-3"><Settings className="size-4" />Profile settings</Link><Link href="/dashboard/settings/billing" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-cp-body hover:bg-cp-surface-3"><CreditCard className="size-4" />Billing & payouts</Link>{auth.isOwner && <Link href="/dashboard/settings/notifications" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-cp-body hover:bg-cp-surface-3"><Bell className="size-4" />Notifications</Link>}<button onClick={() => router.post('/logout')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"><FileLock2 className="size-4" />Log out</button></div>}
        </div>
    </>;
}

/**
 * Sidebar (desktop + mobile ka More drawer) me creator ka store link: naam, saaf link (creatorpro.in/username),
 * Copy aur Open. Website (/w/…) ka link yahan nahi — wo Store → Web App tab me "Open web app" se.
 */
function StoreLinkCard({ name, username }: { name: string; username: string }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const t = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(t);
    }, [copied]);

    if (!username) {
        return (
            <Link href="/dashboard/store" className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-cp-line-stronger bg-cp-surface-2 p-3 transition hover:border-cp-brand hover:bg-cp-surface">
                <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-cp-ink">{name}</span>
                    <span className="block truncate text-[11px] text-cp-muted">Set up your store link</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-cp-muted" />
            </Link>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/${username}`;
    // dikhane me https:// nahi — creatorpro.in/username
    const display = url.replace(/^https?:\/\//, '');

    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // purane browser / non-https: chhupa textarea se copy
            const field = document.createElement('textarea');
            field.value = url;
            field.setAttribute('readonly', '');
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.appendChild(field);
            field.select();
            document.execCommand('copy');
            field.remove();
        }
        setCopied(true);
    }

    return (
        <div className="mt-3 rounded-xl border border-cp-line bg-cp-canvas p-3">
            <p className="truncate text-xs font-bold text-cp-ink">{name}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-cp-subtle" title={url}>
                {display}
            </p>
            <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-1.5">
                <button
                    type="button"
                    onClick={copy}
                    aria-live="polite"
                    className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition active:scale-[0.98] ${copied ? 'border-cp-success-line bg-cp-success-soft text-cp-success-strong-ink' : 'border-cp-line bg-cp-surface text-cp-ink hover:border-cp-line-stronger'}`}
                >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy link'}
                </button>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open your store in a new tab"
                    aria-label="Open your store in a new tab"
                    className="flex size-8 items-center justify-center rounded-lg border border-cp-line bg-cp-surface text-cp-subtle transition hover:border-cp-brand hover:text-cp-brand-ink active:scale-[0.98]"
                >
                    <ExternalLink className="size-3.5" />
                </a>
            </div>
        </div>
    );
}

/** Store ka asli plan — pehle yahan "Free Plan / 0% fee" hardcoded tha, chahe creator Plus pe ho. */
function PlanCard({ plan, canUpgrade }: { plan: NonNullable<SharedData['auth']['plan']>; canUpgrade: boolean }) {
    const plus = plan.effective === 'plus';
    const daysLeft = plan.expires_at ? Math.max(0, Math.ceil((new Date(plan.expires_at).getTime() - Date.now()) / 86_400_000)) : null;
    const endingSoon = plus && daysLeft !== null && daysLeft <= 7;

    return (
        <div className="rounded-lg border border-cp-line bg-cp-surface-3 p-3">
            <div className="flex justify-between gap-2 text-xs">
                <span className="font-bold text-cp-ink">{plus ? 'Plus Plan' : 'Free Plan'}</span>
                <span className="text-cp-muted">{Number(plan.commission_rate.toFixed(2))}% commission</span>
            </div>
            {plus && daysLeft !== null && (
                <p className={`mt-1 text-[11px] ${endingSoon ? 'font-semibold text-cp-warning-ink' : 'text-cp-muted'}`}>
                    {daysLeft === 0 ? 'Ends today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                </p>
            )}
            {canUpgrade && (!plus || endingSoon) && (
                <Link
                    href="/dashboard/settings/billing"
                    className="mt-2 flex items-center justify-center gap-1 rounded-md bg-cp-coral px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-cp-coral-hover"
                >
                    <Zap className="size-3.5" />
                    {plus ? 'Extend Plus' : 'Upgrade to Plus'}
                </Link>
            )}
        </div>
    );
}
