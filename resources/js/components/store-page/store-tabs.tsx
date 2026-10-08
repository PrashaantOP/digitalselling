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
            className="no-scrollbar flex items-center gap-6 overflow-x-auto border-b border-[#E4E2DA]"
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
                            isActive ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#8A8A96] hover:border-[#E4E2DA] hover:text-[#14141B]',
                        )}
                    >
                        {tab.label}
                        {tab.key === 'webapp' && !onPlus && (
                            <span className="rounded-full bg-[#F1EAFE] px-1.5 py-px text-[10px] font-bold tracking-wide text-[#7C3AED] uppercase">Plus</span>
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
        <div className="sticky top-0 z-30 border-b border-[#E4E2DA] bg-[#F6F5F2]/95 backdrop-blur-md">
            <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                <StoreTabs active={active} />
            </div>
        </div>
    );
}
