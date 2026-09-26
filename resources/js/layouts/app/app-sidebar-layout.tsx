import { AppSidebar } from '@/components/app-sidebar';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <div className="flex min-h-screen w-full bg-[#F6F5F2]">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">{children}</div>
        </div>
    );
}
