import { ProductTypeBadge } from '@/components/status-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CreditCard, Eye, Package, ShoppingBag, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Overview', href: '/dashboard' }];

interface OrderProduct {
    id: number;
    title: string;
    type: string;
}

interface RecentOrder {
    id: number;
    order_number: string;
    product_id: number;
    buyer_name: string | null;
    total_amount: string | number; // Eloquent decimal cast serializes as a numeric string
    paid_at: string | null;
    product: OrderProduct | null;
}

interface ProfileCompletion {
    percent: number;
    items: {
        store_profile: boolean;
        first_product: boolean;
        payout_method: boolean;
        kyc: boolean;
    };
}

interface DashboardProps {
    stats: {
        visits: number;
        sales: number;
        revenue: number;
    };
    profileCompletion: ProfileCompletion;
    recentOrders: RecentOrder[];
}

const CHECKLIST_LABELS: Record<keyof ProfileCompletion['items'], string> = {
    store_profile: 'Add your store bio and avatar',
    first_product: 'Create your first product',
    payout_method: 'Add a payout method',
    kyc: 'Complete KYC verification',
};

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardIndex({ stats, profileCompletion, recentOrders }: DashboardProps) {
    const kpis = [
        { label: "This Week's Revenue", value: formatCurrency(stats.revenue), icon: ShoppingBag },
        { label: "This Week's Sales", value: stats.sales.toLocaleString('en-IN'), icon: Package },
        { label: 'Store Visits', value: stats.visits.toLocaleString('en-IN'), icon: TrendingUp },
    ];

    const pendingChecklist = (Object.entries(profileCompletion.items) as [keyof ProfileCompletion['items'], boolean][]).filter(
        ([, done]) => !done,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Welcome header */}
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Good day 👋</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Here's what's happening with your digital business this week.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/store">
                                <Eye /> View Store
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard/products">
                                <Package /> Create Product
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Profile completion nudge */}
                {profileCompletion.percent < 100 && (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-semibold">Complete your profile to start selling ({profileCompletion.percent}%)</p>
                                <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
                                    {pendingChecklist.map(([key]) => (
                                        <li key={key} className="flex items-center gap-2">
                                            <span className="border-muted-foreground/50 size-3.5 shrink-0 rounded-full border" />
                                            {CHECKLIST_LABELS[key]}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Button asChild>
                                <Link href="/dashboard/settings/profile">Complete profile</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* KPI cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {kpis.map((kpi) => (
                        <Card key={kpi.label}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-muted-foreground text-sm font-medium">{kpi.label}</CardTitle>
                                <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                                    <kpi.icon className="size-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <span className="text-2xl font-bold tracking-tight">{kpi.value}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Recent orders */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <p className="text-muted-foreground mt-0.5 text-sm">Latest successful payments this week</p>
                    </CardHeader>
                    <CardContent>
                        {recentOrders.length === 0 ? (
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
                                <CreditCard className="size-8" />
                                No orders yet — once you make a sale, it'll show up here.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                                            <th className="py-2.5 pr-3 font-semibold">Order</th>
                                            <th className="py-2.5 pr-3 font-semibold">Buyer</th>
                                            <th className="py-2.5 pr-3 font-semibold">Product</th>
                                            <th className="py-2.5 pr-3 text-right font-semibold">Amount</th>
                                            <th className="py-2.5 font-semibold">Paid At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-muted/40 border-b last:border-0">
                                                <td className="text-primary py-3 pr-3 font-medium whitespace-nowrap">#{order.order_number}</td>
                                                <td className="py-3 pr-3">{order.buyer_name ?? 'Anonymous'}</td>
                                                <td className="py-3 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="max-w-[180px] truncate">{order.product?.title ?? 'Deleted product'}</span>
                                                        {order.product && <ProductTypeBadge type={order.product.type} />}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-3 text-right font-semibold">{formatCurrency(Number(order.total_amount))}</td>
                                                <td className="text-muted-foreground py-3 whitespace-nowrap">{formatDate(order.paid_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
