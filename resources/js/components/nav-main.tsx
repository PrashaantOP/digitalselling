import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export interface NavGroup {
    label?: string;
    items: NavItem[];
}

/**
 * Renders one or more labeled sidebar sections.
 * Backward compatible: pass `items` for a single unlabeled group (old usage),
 * or `groups` for multiple labeled sections (Overview / Sell / Grow / Manage).
 */
export function NavMain({ items, groups }: { items?: NavItem[]; groups?: NavGroup[] }) {
    const page = usePage();
    const resolvedGroups: NavGroup[] = groups ?? [{ items: items ?? [] }];
    const isActive = (href: string) => (href === '/dashboard' ? page.url === '/dashboard' : page.url === href || page.url.startsWith(href + '/'));

    return (
        <>
            {resolvedGroups.map((group, gi) => (
                <SidebarGroup key={group.label ?? gi} className="px-2 py-0">
                    {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                    <SidebarMenu>
                        {group.items.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={{ children: item.title }}>
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
