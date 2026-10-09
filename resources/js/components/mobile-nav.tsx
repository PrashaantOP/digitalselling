import { appLinks, BrandLink, isActive, SidebarBody, type NavLink } from '@/components/app-sidebar';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, ExternalLink, House, IndianRupee, LayoutGrid, Menu, Store, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Creator dashboard — mobile / tablet (lg se chhoti screen) ka navigation:
 *  - upar patla sticky bar: logo + apna store kholne ka icon
 *  - neeche fixed bar: Home · Store · Apps · Payments · More
 *      Apps → neeche se sheet (apps ke tiles)   More → left se wahi poora sidebar (SidebarBody)
 *
 * Neeche ki jagah `--mobile-nav-offset` CSS variable me hai — layout ka bottom padding aur pages ke fixed
 * save bars (Store, Certificate) isi se bottom bar ke upar baithte hain. Kisi field me type karte waqt
 * (phone ka keyboard khula) bottom bar chhup jaata hai aur offset 0 ho jaata hai.
 */

type Panel = 'apps' | 'more' | null;

// h-16 + 1px border-t + iPhone ka home-indicator
const NAV_HEIGHT = 'calc(4rem + 1px + env(safe-area-inset-bottom))';
const TYPING_FIELDS = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):not([type=button]):not([type=submit]), textarea, select, [contenteditable="true"]';

/** Phone ka keyboard khula hai? (koi text field focus me) */
function useTyping(): boolean {
    const [typing, setTyping] = useState(false);

    useEffect(() => {
        const check = () => setTyping(document.activeElement instanceof HTMLElement && document.activeElement.matches(TYPING_FIELDS));
        // focusout ke waqt activeElement abhi body hota hai — agla field focus hone do, phir dekho
        const onFocusOut = () => window.setTimeout(check, 0);

        document.addEventListener('focusin', check);
        document.addEventListener('focusout', onFocusOut);

        return () => {
            document.removeEventListener('focusin', check);
            document.removeEventListener('focusout', onFocusOut);
        };
    }, []);

    return typing;
}

export function MobileNav() {
    const { auth } = usePage<SharedData>().props;
    const { url } = usePage();
    const { can, isOwner } = useCan();
    const [panel, setPanel] = useState<Panel>(null);
    const typing = useTyping();

    const visible = (item: NavLink) => !item.requires || (item.requires === 'owner' ? isOwner : can(item.requires));
    const apps = appLinks.filter(visible);
    const path = url.split('?')[0];

    // kis tab ka page khula hai
    const inApps = isActive(path, '/dashboard/products') || apps.some((app) => isActive(path, app.href));
    const section = (() => {
        if (path === '/dashboard') return 'home';
        if (isActive(path, '/dashboard/store')) return 'store';
        if (isActive(path, '/dashboard/payments')) return 'payments';
        if (inApps) return 'apps';
        return path.startsWith('/dashboard') ? 'more' : null;
    })();

    const username = typeof auth.user.username === 'string' ? auth.user.username : '';

    // naya page khulte hi sheet / drawer band
    useEffect(() => router.on('navigate', () => setPanel(null)), []);

    // khula ho: Esc se band, peeche ka page scroll nahi
    useEffect(() => {
        if (!panel) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);

        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, [panel]);

    // bottom bar kitni jagah le raha hai — layout padding + fixed save bars isi ko padhte hain
    useEffect(() => {
        document.documentElement.style.setProperty('--mobile-nav-offset', typing ? '0px' : NAV_HEIGHT);
    }, [typing]);
    useEffect(
        () => () => {
            document.documentElement.style.removeProperty('--mobile-nav-offset');
        },
        [],
    );

    const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

    return (
        <>
            {/* ---- upar: logo + store ---- */}
            <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-cp-line bg-cp-surface/95 px-4 backdrop-blur-md lg:hidden">
                <BrandLink />
                {isOwner && username && (
                    <a
                        href={`/${username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 items-center gap-1.5 rounded-full border border-cp-line bg-cp-surface px-3 text-xs font-semibold text-cp-body transition active:scale-95"
                    >
                        View store <ExternalLink className="size-3.5" />
                    </a>
                )}
            </header>

            {/* ---- neeche: tabs ---- */}
            <nav
                aria-label="Main"
                className={cn(
                    'fixed inset-x-0 bottom-0 z-40 border-t border-cp-line bg-cp-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(20,20,27,0.06)] backdrop-blur-md transition-transform duration-200 lg:hidden',
                    typing && !panel ? 'translate-y-full' : 'translate-y-0',
                )}
            >
                <div className="mx-auto flex h-16 max-w-xl items-stretch justify-around px-1">
                    <TabLink href="/dashboard" icon={House} label="Home" active={!panel && section === 'home'} />
                    {can('store.view') && <TabLink href="/dashboard/store" icon={Store} label="Store" active={!panel && section === 'store'} />}
                    {apps.length > 0 && (
                        <TabButton icon={LayoutGrid} label="Apps" active={panel === 'apps' || (!panel && section === 'apps')} expanded={panel === 'apps'} onClick={() => toggle('apps')} />
                    )}
                    {can('payments.view') && <TabLink href="/dashboard/payments" icon={IndianRupee} label="Payments" active={!panel && section === 'payments'} />}
                    <TabButton icon={Menu} label="More" active={panel === 'more' || (!panel && section === 'more')} expanded={panel === 'more'} onClick={() => toggle('more')} />
                </div>
            </nav>

            {/* ---- Apps: neeche se sheet ---- */}
            <Overlay open={panel === 'apps'} onClose={() => setPanel(null)}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Apps and tools"
                    className={cn(
                        'absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-cp-surface px-4 pt-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(20,20,27,0.18)] transition-transform duration-300 ease-out',
                        panel === 'apps' ? 'translate-y-0' : 'translate-y-full',
                    )}
                >
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cp-line-strong" aria-hidden />
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-cp-ink">Apps & tools</h2>
                            <p className="text-xs text-cp-muted">Create and manage what you sell</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPanel(null)}
                            aria-label="Close apps"
                            className="-mt-0.5 -mr-1 flex size-9 items-center justify-center rounded-full bg-cp-canvas text-cp-subtle transition active:scale-95"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        {apps.map((app) => {
                            const active = isActive(path, app.href);

                            return (
                                <Link
                                    key={app.href}
                                    href={app.href}
                                    prefetch
                                    className={cn(
                                        'flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition active:scale-95',
                                        active ? 'border-cp-brand bg-cp-brand-soft' : 'border-cp-surface-3 bg-cp-surface-2',
                                    )}
                                >
                                    <span className={cn('flex size-11 items-center justify-center rounded-xl', app.tone)}>
                                        <app.icon className="size-5" />
                                    </span>
                                    <span className={cn('text-xs leading-tight font-semibold', active ? 'text-cp-brand-ink' : 'text-cp-ink')}>{app.title}</span>
                                </Link>
                            );
                        })}
                    </div>

                    <Link
                        href="/dashboard/products"
                        className="mt-3 flex items-center justify-between rounded-2xl border border-cp-line px-4 py-3.5 text-sm font-semibold text-cp-ink transition active:scale-[0.99]"
                    >
                        <span className="flex items-center gap-2.5">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-cp-surface-3 text-cp-subtle">
                                <LayoutGrid className="size-4" />
                            </span>
                            Explore all apps
                        </span>
                        <ArrowRight className="size-4 text-cp-muted" />
                    </Link>
                </div>
            </Overlay>

            {/* ---- More: left se poora sidebar ---- */}
            <Overlay open={panel === 'more'} onClose={() => setPanel(null)}>
                <aside
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu"
                    className={cn(
                        'absolute inset-y-0 left-0 flex w-[300px] max-w-[86vw] flex-col bg-cp-surface pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-300 ease-out',
                        panel === 'more' ? 'translate-x-0' : '-translate-x-full',
                    )}
                >
                    <SidebarBody onClose={() => setPanel(null)} />
                </aside>
            </Overlay>
        </>
    );
}

/** Dark backdrop + panel. Band ho to `inert` — chhupe links pe Tab / screen reader na jaye. */
function Overlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
    return (
        <div className={cn('fixed inset-0 z-50 lg:hidden', !open && 'pointer-events-none')} inert={!open}>
            <div onClick={onClose} className={cn('absolute inset-0 bg-cp-solid/40 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} />
            {children}
        </div>
    );
}

const TAB = 'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition active:scale-95';

function TabIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
    return (
        <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active ? 'bg-cp-brand-soft text-cp-brand-ink' : 'text-cp-muted')}>
            <Icon className="size-5" strokeWidth={active ? 2.3 : 2} />
        </span>
    );
}

function TabLink({ href, icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
    return (
        <Link href={href} prefetch aria-current={active ? 'page' : undefined} className={cn(TAB, active ? 'text-cp-brand-ink' : 'text-cp-subtle')}>
            <TabIcon icon={icon} active={active} />
            {label}
        </Link>
    );
}

function TabButton({ icon, label, active, expanded, onClick }: { icon: LucideIcon; label: string; active: boolean; expanded: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-expanded={expanded} aria-haspopup="dialog" className={cn(TAB, active ? 'text-cp-brand-ink' : 'text-cp-subtle')}>
            <TabIcon icon={icon} active={active} />
            {label}
        </button>
    );
}
