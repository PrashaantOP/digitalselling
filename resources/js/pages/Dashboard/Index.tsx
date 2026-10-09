import { CreateProductModal } from '@/components/dashboard/create-product-modal';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { TopProducts } from '@/components/dashboard/top-products';
import { TypeDonut } from '@/components/dashboard/type-donut';
import {
    type Balance,
    type ChartPoint,
    type DashboardStats,
    type PlusOffer,
    type RecentOrder,
    type TopProduct,
    type TypeRevenue,
} from '@/components/dashboard/types';
import { useCan } from '@/hooks/use-can';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Bug,
    CalendarDays,
    Check,
    CircleAlert,
    CircleDollarSign,
    CreditCard,
    Eye,
    FileLock2,
    GraduationCap,
    Package,
    Percent,
    Plus,
    RefreshCw,
    ShoppingBag,
    Users,
    Wallet,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Overview', href: '/dashboard' }];

interface ProfileCompletion {
    percent: number;
    items: { store_profile: boolean; first_product: boolean; payout_method: boolean; kyc: boolean };
}
interface DashboardProps {
    days: number;
    canSeeSales: boolean;
    stats: DashboardStats;
    chart: ChartPoint[];
    revenueByType: TypeRevenue[];
    topProducts: TopProduct[];
    balance: Balance | null;
    totals: { customers: number; products: number };
    profileCompletion: ProfileCompletion;
    recentOrders: RecentOrder[];
    plusOffer: PlusOffer | null;
}

const periods = [7, 30, 90] as const;
const checklist = [
    { key: 'store_profile', label: 'Store profile', description: 'Add your bio & avatar', action: 'Finish store profile', href: '/dashboard/store' },
    { key: 'first_product', label: 'First product', description: 'Start selling today', action: 'Create a product', href: '/dashboard/products' },
    { key: 'payout_method', label: 'Payout method', description: 'Bank account or UPI', action: 'Add payout method', href: '/dashboard/payments/account' },
    { key: 'kyc', label: 'Creator KYC', description: 'Verify PAN & bank', action: 'Verify KYC', href: '/dashboard/payments/account/kyc' },
] as const;
const sellingOptions = [
    { title: 'Digital products', description: 'PDFs, guides & templates', href: '/dashboard/books', icon: BookOpen, tone: 'bg-cp-warning-soft text-cp-warning-ink' },
    { title: '1:1 sessions', description: 'Paid calls & mentorship', href: '/dashboard/bookings/sessions', icon: CalendarDays, tone: 'bg-cp-sky-soft text-cp-sky-ink' },
    { title: 'Courses', description: 'Cohorts or self-paced', href: '/dashboard/courses', icon: GraduationCap, tone: 'bg-cp-brand-soft text-cp-brand-ink' },
    { title: 'Events', description: 'Workshops & masterclasses', href: '/dashboard/events', icon: Users, tone: 'bg-cp-coral-soft text-cp-coral-ink' },
    { title: 'Locked content', description: 'Exclusive links & files', href: '/dashboard/locked-content', icon: FileLock2, tone: 'bg-cp-accent-soft text-cp-accent-ink' },
    { title: 'Payment pages', description: 'Custom UPI payment links', href: '/dashboard/payment-pages', icon: CreditCard, tone: 'bg-cp-teal-soft text-cp-teal-ink' },
];

/** "1 customer" / "2 customers" */
const plural = (n: number, word: string) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;

function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
        : 'Just now';
}

export default function DashboardIndex({
    days,
    canSeeSales,
    stats,
    chart,
    revenueByType,
    topProducts,
    balance,
    totals,
    profileCompletion,
    recentOrders,
    plusOffer,
}: DashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const { can, isOwner, storeOwner } = useCan();
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

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
            color: 'var(--cp-brand)',
            tone: 'bg-cp-brand-soft text-cp-brand-ink',
            series: chart.map((d) => d.revenue),
        },
        {
            label: 'Sales',
            value: stats.sales.value.toLocaleString('en-IN'),
            change: stats.sales.change,
            icon: ShoppingBag,
            color: 'var(--cp-success)',
            tone: 'bg-cp-success-soft text-cp-success-ink',
            series: chart.map((d) => d.sales),
            hint: `Avg. order ${formatCurrency(stats.aov.value)}`,
        },
        {
            label: 'Store visits',
            value: stats.visits.value.toLocaleString('en-IN'),
            change: stats.visits.change,
            icon: Eye,
            color: 'var(--cp-accent)',
            tone: 'bg-cp-accent-soft text-cp-accent-ink',
            series: chart.map((d) => d.visits),
            hint: plural(stats.visitors.value, 'unique visitor'),
        },
        {
            label: 'Conversion rate',
            value: `${stats.conversion.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`,
            change: stats.conversion.change,
            icon: Percent,
            color: 'var(--cp-warning-bright)',
            tone: 'bg-cp-warning-soft text-cp-warning-ink',
            // value unique visitors pe hai — visitors hi na hon to sparkline bhi nahi (0% ke saath lehrata graph galat lagta)
            series: stats.visitors.value > 0 ? chart.map((d) => (d.visits > 0 ? d.sales / d.visits : 0)) : [],
            hint: 'Sales per unique visitor',
        },
    ].filter((k) => canSeeSales || k.label === 'Store visits');

    const money = <MoneyPanel balance={balance} recentOrders={recentOrders} canSeeSales={canSeeSales} />;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="relative isolate min-h-full overflow-x-clip">
                {/* background — landing (/) jaisa: upar halka blue wash, blue grid lines (neeche fade), beech me blue glow */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-140 bg-linear-to-b from-blue-50/80 to-transparent dark:from-indigo-500/10" />
                <div aria-hidden="true" className="home-grid pointer-events-none absolute inset-0 -z-10 mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
                <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-130 w-225 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl dark:bg-indigo-500/10" />
                <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                    {/* Hero — sirf greeting, kamai aur ek kaam. Period / refresh neeche Overview me (wo usi data ke hain) */}
                    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-cp-brand-strong via-cp-brand to-cp-accent p-6 text-white shadow-lg md:p-8">
                        <div aria-hidden="true" className="home-grid-light pointer-events-none absolute inset-0 mask-[linear-gradient(to_left,black,transparent_75%)] opacity-40" />
                        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
                        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                            <div>
                                <p className="text-sm font-medium text-white/70">Creator dashboard</p>
                                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                                    {greeting}, {firstName} <span aria-hidden="true">👋</span>
                                </h1>
                                {canSeeSales && stats.sales.value === 0 ? (
                                    // abhi koi sale nahi — "₹0 kamaye" ki jagah agla kaam batao
                                    <p className="mt-2 max-w-xl text-sm text-white/80">
                                        {totals.products === 0
                                            ? 'Create your first product and share your store link — your first sale is a few steps away.'
                                            : `No sales in the last ${days} days yet — share your store link to bring buyers in.`}
                                    </p>
                                ) : canSeeSales ? (
                                    <p className="mt-2 max-w-xl text-sm text-white/80">
                                        You earned <strong className="text-white">{formatCurrency(stats.revenue.value)}</strong> from{' '}
                                        <strong className="text-white">{plural(stats.sales.value, 'sale')}</strong> in the last {days} days.
                                    </p>
                                ) : (
                                    <p className="mt-2 max-w-xl text-sm text-white/80">
                                        {storeOwner ? <>You're working in <strong className="text-white">{storeOwner}</strong>'s store.</> : 'Welcome back.'}
                                    </p>
                                )}
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    {can('audience.view') && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                                            <Users className="size-3.5" />
                                            {plural(totals.customers, 'customer')}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                                        <Package className="size-3.5" />
                                        {plural(totals.products, 'product')}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="inline-flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-cp-brand shadow-sm transition hover:bg-white/90"
                            >
                                <Plus className="size-4" /> Create a product
                            </button>
                        </div>
                    </section>

                    {/* setup sirf store owner ka kaam — naye creator ke liye sabse pehle */}
                    {isOwner && profileCompletion.percent < 100 && <SetupChecklist profileCompletion={profileCompletion} />}

                    <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
                        {/* Overview — period + refresh yahin, kyunki neeche ka saara data inhi se badalta hai */}
                        <section className="space-y-3">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-cp-ink">Overview</h2>
                                    <p className="text-xs text-cp-muted">Last {days} days</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex rounded-xl border border-cp-line bg-cp-surface p-1 shadow-sm">
                                        {periods.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => p !== days && load(p)}
                                                disabled={loading}
                                                aria-pressed={p === days}
                                                className={cn(
                                                    'rounded-lg px-3 py-2 text-xs font-semibold transition sm:py-1',
                                                    p === days ? 'bg-cp-brand text-white shadow-sm' : 'text-cp-subtle hover:text-cp-ink',
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
                                        className="flex size-9 items-center justify-center rounded-xl border border-cp-line bg-cp-surface text-cp-subtle shadow-sm transition hover:text-cp-ink disabled:opacity-60"
                                    >
                                        <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                                {kpis.map((k) => (
                                    <KpiCard key={k.label} {...k} />
                                ))}
                            </div>
                        </section>

                        {/* mobile / tablet: paisa (payout + recent sales) KPI ke turant baad — desktop pe right column me */}
                        <div className="space-y-6 xl:hidden">{money}</div>

                        <div className="grid items-start gap-6 xl:grid-cols-12">
                            <div className="min-w-0 space-y-6 xl:col-span-8">
                                {canSeeSales && (
                                    <>
                                        <RevenueChart data={chart} days={days} />
                                        <div className="grid items-start gap-6 md:grid-cols-2">
                                            <TopProducts products={topProducts} />
                                            <TypeDonut data={revenueByType} />
                                        </div>
                                    </>
                                )}

                                <section className="rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm">
                                    <h2 className="font-semibold text-cp-ink">Start selling</h2>
                                    <p className="mt-0.5 text-xs text-cp-muted">Pick a format and launch in under 2 minutes.</p>
                                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                                        {sellingOptions.map((item) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className="group flex flex-col gap-2.5 rounded-xl border border-cp-line p-3 transition hover:border-cp-brand-line hover:bg-cp-surface-2 sm:flex-row sm:items-center sm:gap-3"
                                            >
                                                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10', item.tone)}>
                                                    <item.icon className="size-4.5 sm:size-5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-cp-ink group-hover:text-cp-brand-ink">{item.title}</span>
                                                    <span className="block truncate text-[11px] text-cp-muted">{item.description}</span>
                                                </span>
                                                <ArrowRight className="hidden size-4 shrink-0 text-cp-faint transition group-hover:translate-x-0.5 group-hover:text-cp-brand-ink sm:block" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:col-span-4">
                                <div className="hidden space-y-6 xl:block">{money}</div>
                                {plusOffer && <PlusCard offer={plusOffer} />}
                            </aside>
                        </div>

                        {/* feedback — patli row, sabse neeche */}
                        <section className="flex items-center gap-3 rounded-2xl border border-cp-line bg-cp-surface px-4 py-3 shadow-sm">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cp-warning-soft text-cp-warning-ink">
                                <Bug className="size-4" />
                            </span>
                            <p className="min-w-0 flex-1 text-xs text-cp-subtle">
                                <strong className="font-semibold text-cp-ink">Found a bug or have an idea?</strong>{' '}
                                <span className="hidden sm:inline">Tell us what would make CreatorPro better for you.</span>
                            </p>
                            <Link href="/dashboard/feedback" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cp-brand-ink hover:underline">
                                Report <ArrowRight className="size-3" />
                            </Link>
                        </section>
                    </div>
                </main>
            </div>
            <CreateProductModal open={creating} onClose={() => setCreating(false)} />
        </AppLayout>
    );
}

/** Payout + recent sales — ek hi component, mobile pe KPI ke baad aur desktop pe right column me */
function MoneyPanel({ balance, recentOrders, canSeeSales }: { balance: Balance | null; recentOrders: RecentOrder[]; canSeeSales: boolean }) {
    if (!balance && !canSeeSales) return null;

    return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
            {balance && <PayoutCard balance={balance} />}
            {canSeeSales && <RecentActivity orders={recentOrders} />}
        </div>
    );
}

function PayoutCard({ balance }: { balance: Balance }) {
    // payout kyun ruka hai — seedha theek karne ki jagah ka link
    const blocked =
        balance.blocked_reason === 'kyc'
            ? { text: 'Verify your KYC to receive payouts', href: '/dashboard/payments/account/kyc' }
            : balance.blocked_reason === 'payout_method'
              ? { text: 'Add a bank account or UPI to receive payouts', href: '/dashboard/payments/account' }
              : null;

    return (
        <section className="rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-cp-ink">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-cp-success-soft text-cp-success-ink">
                        <Wallet className="size-3.5" />
                    </span>
                    Upcoming payout
                </span>
                <span className="text-[11px] text-cp-muted">INR</span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-cp-ink">{formatCurrency(balance.clearing + balance.ready)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-cp-surface-2 px-3 py-2">
                    <p className="text-cp-muted">In transit</p>
                    <p className="mt-0.5 font-semibold text-cp-ink">{formatCurrency(balance.in_transit)}</p>
                </div>
                <div className="rounded-lg bg-cp-surface-2 px-3 py-2">
                    <p className="text-cp-muted">Settled</p>
                    <p className="mt-0.5 font-semibold text-cp-success-ink">{formatCurrency(balance.settled)}</p>
                </div>
            </div>
            {blocked && (
                <Link href={blocked.href} className="mt-3 flex items-center gap-2 rounded-lg bg-cp-warning-soft px-3 py-2 text-xs font-medium text-cp-warning-ink">
                    <CircleAlert className="size-3.5 shrink-0" />
                    <span className="flex-1">{blocked.text}</span>
                    <ArrowRight className="size-3 shrink-0" />
                </Link>
            )}
            <Link
                href="/dashboard/settlements"
                className="mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-cp-solid text-xs font-semibold text-white transition hover:bg-cp-solid-hover"
            >
                View settlements <ArrowRight className="size-3.5" />
            </Link>
        </section>
    );
}

function RecentActivity({ orders }: { orders: RecentOrder[] }) {
    return (
        <section className="rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-cp-ink">Recent sales</h2>
                {orders.length > 0 && (
                    <Link href="/dashboard/payments" className="inline-flex items-center gap-1 text-xs font-semibold text-cp-brand-ink">
                        View all <ArrowRight className="size-3" />
                    </Link>
                )}
            </div>
            {orders.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-cp-surface-2 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cp-brand-soft text-cp-brand-ink">
                        <ShoppingBag className="size-4" />
                    </span>
                    <p className="text-xs text-cp-muted">Your sales will show up here with buyer details.</p>
                </div>
            ) : (
                <ul className="-mx-2 space-y-0.5">
                    {orders.map((order) => (
                        <li key={order.uuid} className="flex items-center gap-3 rounded-lg p-2">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cp-success-soft text-sm font-semibold text-cp-success-ink">
                                {(order.buyer_name ?? 'A').trim().charAt(0).toUpperCase() || 'A'}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-cp-ink">{order.buyer_name ?? 'Anonymous'}</p>
                                <p className="truncate text-[11px] text-cp-muted">{order.product ?? 'Product'}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold whitespace-nowrap text-cp-success-ink">+{formatCurrency(order.amount)}</p>
                                <p className="text-[10px] whitespace-nowrap text-cp-faint">{formatDate(order.paid_at)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Sirf Free creator — Plus ke asli faayde (commission, themes, team), andaaze nahi */
function PlusCard({ offer }: { offer: PlusOffer }) {
    const fmtRate = (r: number) => `${r.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
    const benefits = [
        `Commission ${fmtRate(offer.current_rate)} → ${fmtRate(offer.plus_rate)} on every sale`,
        'Premium web app themes',
        `Up to ${offer.team_seats} team members`,
    ];

    return (
        <section className="rounded-2xl border border-cp-coral-line bg-cp-surface p-5 shadow-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-cp-coral-soft px-2 py-1 text-[10px] font-bold tracking-wide text-cp-coral-dark-ink uppercase">
                <Zap className="size-3" /> CreatorPro Plus
            </span>
            <h2 className="mt-3 text-base font-bold text-cp-ink">Keep more of every sale</h2>
            {offer.saved_last_30 > 0 && (
                <p className="mt-1 text-xs text-cp-subtle">
                    On your last 30 days of sales, Plus would have saved you{' '}
                    <strong className="text-cp-success-ink">{formatCurrency(offer.saved_last_30)}</strong>.
                </p>
            )}
            <ul className="my-4 space-y-2 text-xs text-cp-body">
                {benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-cp-coral-soft text-cp-coral-dark-ink">
                            <Check className="size-2.5" />
                        </span>
                        {benefit}
                    </li>
                ))}
            </ul>
            <Link
                href="/dashboard/settings/billing"
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-cp-coral text-xs font-semibold text-white shadow-sm transition hover:bg-cp-coral-hover"
            >
                See Plus · {formatCurrency(offer.monthly_price)}/month <ArrowRight className="size-3.5" />
            </Link>
        </section>
    );
}

/** Setup ke 4 kadam — agla adhoora kadam highlight + ek seedha button */
function SetupChecklist({ profileCompletion }: { profileCompletion: ProfileCompletion }) {
    const done = checklist.filter((item) => profileCompletion.items[item.key]).length;
    const next = checklist.find((item) => !profileCompletion.items[item.key]);

    return (
        <section className="rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <h2 className="font-semibold text-cp-ink">Finish setting up your store</h2>
                    <p className="mt-0.5 text-xs text-cp-muted">
                        {done} of {checklist.length} done · complete these so buyers can pay you and you can get paid.
                    </p>
                    <div className="mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-cp-surface-3">
                        <div className="h-full rounded-full bg-cp-brand transition-all" style={{ width: `${profileCompletion.percent}%` }} />
                    </div>
                </div>
                {next && (
                    <Link
                        href={next.href}
                        className="inline-flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-xl bg-cp-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cp-brand-hover"
                    >
                        {next.action} <ArrowRight className="size-4" />
                    </Link>
                )}
            </div>
            <ol className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {checklist.map((item, index) => {
                    const isDone = profileCompletion.items[item.key];
                    const isNext = item.key === next?.key;
                    return (
                        <li key={item.key}>
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex h-full items-center gap-2.5 rounded-xl border p-2.5 transition',
                                    isNext ? 'border-cp-brand-line bg-cp-brand-soft' : 'border-cp-line hover:bg-cp-surface-2',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                        isDone ? 'bg-cp-success text-white' : isNext ? 'bg-cp-brand text-white' : 'border border-cp-line-strong text-cp-muted',
                                    )}
                                >
                                    {isDone ? <Check className="size-3.5" /> : index + 1}
                                </span>
                                <span className="min-w-0">
                                    <span className={cn('block truncate text-xs font-semibold', isDone ? 'text-cp-muted line-through' : 'text-cp-ink')}>{item.label}</span>
                                    <span className="block truncate text-[11px] text-cp-muted">{isDone ? 'Done' : isNext ? 'Next step' : item.description}</span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
