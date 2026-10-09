import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';

/**
 * Dashboard → Store ka top tab bar. Store page (Store/Edit) aur Web App page (Webapp/Index) dono yahi dikhate hain,
 * taaki Web App alag page hote hue bhi Store ka hi ek tab lage. Web App pehle sidebar me alag link tha.
 */
export type StoreTabKey = 'profile' | 'analytics' | 'appearance' | 'webapp' | 'settings';

const TABS: { key: StoreTabKey; label: string; href: string }[] = [
    { key: 'profile', label: 'Store', href: '/dashboard/store' },
    { key: 'analytics', label: 'Analytics', href: '/dashboard/store/analytics' },
    { key: 'appearance', label: 'Appearance', href: '/dashboard/store/appearance' },
    { key: 'webapp', label: 'Web App', href: '/dashboard/store/web-app' },
    { key: 'settings', label: 'Settings', href: '/dashboard/store/settings' },
];

export function StoreTabs({ active }: { active: StoreTabKey }) {
    // Free creator ko yaad dilao ki web app ke premium themes Plus me hain
    const onPlus = usePage<SharedData>().props.auth.plan?.effective === 'plus';

    return (
        // 5 tabs phone pe nahi samaate — side me scroll (scrollbar chhupa)
        <nav
            className="no-scrollbar flex items-center gap-6 overflow-x-auto border-b border-cp-line"
            aria-label="Store sections"
        >
            {TABS.map((tab) => {
                const isActive = active === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => router.get(tab.href, {}, { preserveScroll: true })}
                        className={cn(
                            'flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                            isActive ? 'border-cp-brand text-cp-brand-ink' : 'border-transparent text-cp-muted hover:border-cp-line hover:text-cp-ink',
                        )}
                    >
                        {tab.label}
                        {tab.key === 'webapp' && !onPlus && (
                            <span className="rounded-full bg-cp-accent-soft px-1.5 py-px text-[10px] font-bold tracking-wide text-cp-accent-ink uppercase">Plus</span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

/** Sticky header jisme tab bar hai — dono pages pe ek jaisa. */
export function StoreTabsHeader({ active }: { active: StoreTabKey }) {
    return (
        <div className="sticky top-14 z-30 border-b border-cp-line bg-cp-canvas/95 backdrop-blur-md lg:top-0">
            <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                <StoreTabs active={active} />
            </div>
        </div>
    );
}
