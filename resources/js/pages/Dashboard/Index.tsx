import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { TopProducts } from '@/components/dashboard/top-products';
import { TypeDonut } from '@/components/dashboard/type-donut';
import { type Balance, type ChartPoint, type DashboardStats, type TopProduct, type TypeRevenue } from '@/components/dashboard/types';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    BookOpen,
    CalendarDays,
    Check,
    CircleDollarSign,
    CreditCard,
    Eye,
    FileLock2,
    GraduationCap,
    Lightbulb,
    Package,
    Percent,
    RefreshCw,
    Rocket,
    ShoppingBag,
    Sparkles,
    Store,
    UserRound,
    Users,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Overview', href: '/dashboard' }];
interface OrderProduct {
    id: number;
    title: string;
    type: string;
}
interface RecentOrder {
    id: number;
    order_number: string;
    buyer_name: string | null;
    total_amount: string | number;
    paid_at: string | null;
    product: OrderProduct | null;
}
interface ProfileCompletion {
    percent: number;
    items: { store_profile: boolean; first_product: boolean; payout_method: boolean; kyc: boolean };
}
interface DashboardProps {
    days: number;
    stats: DashboardStats;
    chart: ChartPoint[];
    revenueByType: TypeRevenue[];
    topProducts: TopProduct[];
    balance: Balance | null;
    totals: { customers: number; products: number };
    profileCompletion: ProfileCompletion;
    recentOrders: RecentOrder[];
}

const periods = [7, 30, 90] as const;
const checklist = [
    { key: 'store_profile', label: 'Store profile', description: 'Add your bio & avatar', href: '/dashboard/store' },
    { key: 'first_product', label: 'First product', description: 'Start selling today', href: '/dashboard/products' },
    { key: 'payout_method', label: 'Payout method', description: 'Bank account or UPI', href: '/dashboard/payments/account' },
    { key: 'kyc', label: 'Creator KYC', description: 'Verify PAN & Aadhaar', href: '/dashboard/payments/account/kyc' },
] as const;
const sellingOptions = [
    {
        title: 'Digital products',
        description: 'PDFs, guides & templates',
        href: '/dashboard/books',
        icon: BookOpen,
        tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    },
    {
        title: '1:1 sessions',
        description: 'Paid calls & mentorship',
        href: '/dashboard/bookings/sessions',
        icon: CalendarDays,
        tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    },
    {
        title: 'Courses',
        description: 'Cohorts or self-paced',
        href: '/dashboard/courses',
        icon: GraduationCap,
        tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    },
    {
        title: 'Events',
        description: 'Workshops & masterclasses',
        href: '/dashboard/events',
        icon: Users,
        tone: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    },
    {
        title: 'Locked content',
        description: 'Exclusive links & files',
        href: '/dashboard/locked-content',
        icon: FileLock2,
        tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    },
    {
        title: 'Payment pages',
        description: 'Custom UPI payment links',
        href: '/dashboard/payment-pages',
        icon: CreditCard,
        tone: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    },
];
const quickLinks = [
    { title: 'Customize store', href: '/dashboard/store', icon: Store },
    { title: 'Edit profile', href: '/dashboard/settings/profile', icon: UserRound },
    { title: 'Audience', href: '/dashboard/audience', icon: Users },
    { title: 'Refer & earn', href: '/dashboard/refer-earn', icon: Sparkles },
];

function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
        : 'Just now';
}

export default function DashboardIndex({
    days,
    stats,
    chart,
    revenueByType,
    topProducts,
    balance,
    totals,
    profileCompletion,
    recentOrders,
}: DashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const [loading, setLoading] = useState(false);

    const firstName = auth.user.name.trim().split(/\s+/)[0] || 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // period badalna ya refresh — dono me server se fresh data, scroll wahi rahe
    const load = (nextDays: number) =>
        router.get(
            '/dashboard',
            { days: nextDays },
            { preserveState: true, preserveScroll: true, replace: true, onStart: () => setLoading(true), onFinish: () => setLoading(false) },
        );

    const kpis = [
        {
            label: 'Net revenue',
            value: formatCurrency(stats.revenue.value),
            change: stats.revenue.change,
            icon: CircleDollarSign,
            color: 'var(--chart-1)',
            tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
            series: chart.map((d) => d.revenue),
        },
        {
            label: 'Sales',
            value: stats.sales.value.toLocaleString('en-IN'),
            change: stats.sales.change,
            icon: ShoppingBag,
            color: 'var(--chart-3)',
            tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
            series: chart.map((d) => d.sales),
            hint: `Avg. order ${formatCurrency(stats.aov.value)}`,
        },
        {
            label: 'Store visits',
            value: stats.visits.value.toLocaleString('en-IN'),
            change: stats.visits.change,
            icon: Eye,
            color: 'var(--chart-4)',
            tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
            series: chart.map((d) => d.visits),
            hint: `${stats.visitors.value.toLocaleString('en-IN')} unique visitors`,
        },
        {
            label: 'Conversion rate',
            value: `${stats.conversion.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`,
            change: stats.conversion.change,
            icon: Percent,
            color: '#f59e0b',
            tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
            series: chart.map((d) => (d.visits > 0 ? d.sales / d.visits : 0)),
            hint: 'Sales per unique visitor',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="relative isolate min-h-full">
                <div aria-hidden="true" className="dashboard-glow pointer-events-none absolute inset-0 -z-10" />
                <div aria-hidden="true" className="dashboard-dots pointer-events-none absolute inset-0 -z-10" />
                <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                    {/* Hero */}
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-[#7c3aed] p-6 text-white shadow-lg md:p-8 dark:from-[#1e2a6b] dark:via-[#2a2470] dark:to-[#3b1d6e]">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)] opacity-25"
                            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }}
                        />
                        <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-white/5 blur-3xl" />
                        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                            <div>
                                <p className="text-sm font-medium text-white/70">Creator dashboard</p>
                                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                                    {greeting}, {firstName} <span aria-hidden="true">👋</span>
                                </h1>
                                <p className="mt-2 max-w-xl text-sm text-white/80">
                                    You earned <strong className="text-white">{formatCurrency(stats.revenue.value)}</strong> from{' '}
                                    <strong className="text-white">{stats.sales.value.toLocaleString('en-IN')}</strong>{' '}
                                    {stats.sales.value === 1 ? 'sale' : 'sales'} in the last {days} days.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                                        <Users className="size-3.5" />
                                        {totals.customers.toLocaleString('en-IN')} customers
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                                        <Package className="size-3.5" />
                                        {totals.products.toLocaleString('en-IN')} products
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="inline-flex rounded-xl bg-white/15 p-1 backdrop-blur">
                                    {periods.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => p !== days && load(p)}
                                            disabled={loading}
                                            className={cn(
                                                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                                                p === days ? 'bg-white text-primary shadow-sm dark:text-[#1e2a6b]' : 'text-white/80 hover:text-white',
                                            )}
                                        >
                                            {p}D
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => load(days)}
                                    disabled={loading}
                                    aria-label="Refresh data"
                                    className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
                                >
                                    <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                                </button>
                            </div>
                        </div>
                    </section>

                    <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
                        {/* KPIs */}
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {kpis.map((k) => (
                                <KpiCard key={k.label} {...k} />
                            ))}
                        </section>

                        <div className="grid items-start gap-6 xl:grid-cols-12">
                            <div className="min-w-0 space-y-6 xl:col-span-8">
                                <RevenueChart data={chart} days={days} />

                                <div className="grid gap-6 md:grid-cols-2">
                                    <TopProducts products={topProducts} />
                                    <TypeDonut data={revenueByType} />
                                </div>

                                {profileCompletion.percent < 100 && <ProfileCard profileCompletion={profileCompletion} />}

                                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                                    <h2 className="font-semibold">Start selling</h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">Pick a format and launch in under 2 minutes.</p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {sellingOptions.map((item) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className="group flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-accent/50"
                                            >
                                                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', item.tone)}>
                                                    <item.icon className="size-5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                                                        {item.title}
                                                    </span>
                                                    <span className="block truncate text-[11px] text-muted-foreground">{item.description}</span>
                                                </span>
                                                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:col-span-4">
                                {balance && <BalanceCard balance={balance} />}

                                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between border-b pb-3">
                                        <h2 className="font-semibold">Recent activity</h2>
                                        <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                            <span className="relative flex size-2">
                                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                            </span>
                                            Latest sales
                                        </span>
                                    </div>
                                    {recentOrders.length === 0 ? (
                                        <div className="flex flex-col items-center py-7 text-center">
                                            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <ShoppingBag className="size-5" />
                                            </span>
                                            <h3 className="mt-3 text-sm font-semibold">No orders yet</h3>
                                            <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
                                                Once you make a sale, it&apos;ll show up here with buyer details.
                                            </p>
                                            <Link href="/dashboard/products" className="mt-4 text-xs font-semibold text-primary">
                                                Create your first product <ArrowRight className="inline size-3" />
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {recentOrders.slice(0, 6).map((order) => (
                                                <div key={order.id} className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-muted/60">
                                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                        {(order.buyer_name ?? 'A').trim().charAt(0).toUpperCase() || <Banknote className="size-4" />}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex justify-between gap-2">
                                                            <p className="truncate text-sm font-semibold">{order.buyer_name ?? 'Anonymous'}</p>
                                                            <p className="text-sm font-semibold whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                                +{formatCurrency(Number(order.total_amount))}
                                                            </p>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                            {order.product?.title ?? 'Product'}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(order.paid_at)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-2xl border bg-card p-5 shadow-sm">
                                    <h2 className="font-semibold">Quick links</h2>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {quickLinks.map((q) => (
                                            <Link
                                                key={q.title}
                                                href={q.href}
                                                className="group flex flex-col gap-2 rounded-xl border p-3 text-xs font-semibold transition hover:border-primary/40 hover:bg-accent/50 hover:text-primary"
                                            >
                                                <q.icon className="size-4 text-muted-foreground group-hover:text-primary" />
                                                {q.title}
                                            </Link>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-2xl border-2 border-orange-200 bg-gradient-to-b from-card to-orange-50 p-5 shadow-sm dark:border-orange-900 dark:to-orange-950/20">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
                                        <Rocket className="size-3" />
                                        Pro membership
                                    </span>
                                    <h2 className="mt-3 text-base font-bold">Level up your business</h2>
                                    <ul className="my-4 space-y-2 text-xs">
                                        {['0% platform fee on all sales', 'Connect your custom domain', 'Automated WhatsApp reminders'].map(
                                            (benefit) => (
                                                <li key={benefit} className="flex gap-2">
                                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                                        <Check className="size-2.5" />
                                                    </span>
                                                    {benefit}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                    <Link
                                        href="/dashboard/settings/billing"
                                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
                                    >
                                        Explore Pro <ArrowRight className="size-3.5" />
                                    </Link>
                                </section>

                                <section className="flex gap-3 rounded-2xl border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
                                    <Lightbulb className="size-5 shrink-0 text-amber-500" />
                                    <p>
                                        <strong className="block text-foreground">Pro tip for Indian creators</strong>UPI checkouts convert especially
                                        well. Your store supports fast, familiar payment methods.
                                    </p>
                                </section>
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

function BalanceCard({ balance }: { balance: Balance }) {
    return (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-5 text-white shadow-lg">
            <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-white/70">
                        <Wallet className="size-4" />
                        Available balance
                    </span>
                    <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">INR</span>
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight">{formatCurrency(balance.available)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
                    <div>
                        <p className="text-white/60">In process</p>
                        <p className="mt-0.5 font-semibold">{formatCurrency(balance.in_process)}</p>
                    </div>
                    <div>
                        <p className="text-white/60">Paid out</p>
                        <p className="mt-0.5 font-semibold">{formatCurrency(balance.paid_out)}</p>
                    </div>
                </div>
                <Link
                    href="/dashboard/payouts"
                    className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-xs font-semibold text-[#0f172a] transition hover:bg-white/90"
                >
                    Request payout <ArrowRight className="size-3.5" />
                </Link>
            </div>
        </section>
    );
}

function ProfileCard({ profileCompletion }: { profileCompletion: ProfileCompletion }) {
    const pct = profileCompletion.percent;
    return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                    {/* conic ring = progress */}
                    <div
                        className="relative flex size-14 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `conic-gradient(#d97706 ${pct * 3.6}deg, rgba(217,119,6,0.15) 0)` }}
                    >
                        <span className="flex size-11 items-center justify-center rounded-full bg-background text-xs font-bold text-amber-700 dark:text-amber-300">
                            {pct}%
                        </span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-amber-950 dark:text-amber-100">Complete your profile to start selling</h2>
                        <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                            Complete the essentials so buyers know who they&apos;re paying.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-4 grid gap-2 border-t border-amber-200/70 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-amber-900/60">
                {checklist.map((item, index) => {
                    const done = profileCompletion.items[item.key];
                    return (
                        <Link
                            href={item.href}
                            key={item.key}
                            className={cn(
                                'flex items-center gap-2 rounded-lg border p-2.5 transition hover:bg-background',
                                done
                                    ? 'border-emerald-200 bg-background/70 dark:border-emerald-900'
                                    : 'border-amber-200 bg-background/40 dark:border-amber-900',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                    done ? 'bg-emerald-500 text-white' : 'border border-amber-500 text-amber-700 dark:text-amber-300',
                                )}
                            >
                                {done ? <Check className="size-3" /> : index + 1}
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold">{item.label}</span>
                                <span className="block truncate text-[10px] text-muted-foreground">{done ? 'Done' : item.description}</span>
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
