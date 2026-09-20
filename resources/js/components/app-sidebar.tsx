import { NavFooter } from '@/components/nav-footer';
import { NavMain, type NavGroup } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Calendar,
    CalendarDays,
    CreditCard,
    Folder,
    GraduationCap,
    LayoutGrid,
    Lock,
    Package,
    Settings,
    Share2,
    ShoppingBag,
    Store,
    TrendingUp,
    UserCog,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from './app-logo';

// Groups mirror the CreatorFlow dashboard design: Overview (ungrouped) → Sell → Grow → Manage.
// Hrefs match routes/web.php exactly (see controllers-routes-roadmap.md for the full list).
const navGroups: NavGroup[] = [
    {
        items: [
            { title: 'Overview', href: '/dashboard', icon: LayoutGrid },
            { title: 'Store', href: '/dashboard/store', icon: Store },
            { title: 'Payments', href: '/dashboard/payments', icon: CreditCard },
            { title: 'Payouts', href: '/dashboard/payouts', icon: Wallet },
            { title: 'Audience', href: '/dashboard/audience', icon: Users },
        ],
    },
    {
        label: 'Sell',
        items: [
            { title: 'Products', href: '/dashboard/products', icon: Package },
            { title: 'Courses', href: '/dashboard/courses', icon: GraduationCap },
            { title: 'Events', href: '/dashboard/events', icon: Calendar },
            { title: 'Books', href: '/dashboard/books', icon: BookOpen },
            { title: 'Locked Content', href: '/dashboard/locked-content', icon: Lock },
            { title: 'Payment Pages', href: '/dashboard/payment-pages', icon: ShoppingBag },
            { title: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays },
        ],
    },
    {
        label: 'Grow',
        items: [
            { title: 'Analytics', href: '/dashboard/store/analytics', icon: TrendingUp },
            { title: 'Refer & Earn', href: '/dashboard/refer-earn', icon: Share2 },
        ],
    },
    {
        label: 'Manage',
        items: [
            { title: 'Sub-Admins', href: '/dashboard/sub-admins', icon: UserCog },
            { title: 'Settings', href: '/dashboard/settings/profile', icon: Settings },
        ],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
