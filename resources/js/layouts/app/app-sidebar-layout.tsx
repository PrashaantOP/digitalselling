import { AppSidebar } from '@/components/app-sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <div className="flex min-h-screen w-full bg-cp-canvas">
            <AppSidebar />
            {/* mobile pe neeche fixed tab bar ki jagah chhodo (MobileNav --mobile-nav-offset set karta hai) */}
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip pb-(--mobile-nav-offset,0px) lg:pb-0">
                {/* sirf lg se chhoti screen pe: upar logo bar + neeche Home / Store / Apps / Payments / More */}
                <MobileNav />
                {children}
            </div>
        </div>
    );
}
