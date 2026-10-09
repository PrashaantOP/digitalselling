import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    ArrowUpRight,
    BadgeCheck,
    Check,
    Copy,
    Download,
    Eye,
    Inbox,
    Mail,
    MapPin,
    MessageCircle,
    Monitor,
    ReceiptText,
    Repeat,
    Search,
    Smartphone,
    Tablet,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

/* Change this if your routes use a different prefix.
 *   GET {BASE}            -> AudienceController@index     (customers)
 *   GET {BASE}/visitors   -> AudienceController@visitors
 *   GET {BASE}/export     -> AudienceController@export    (?type=customers|visitors)
 */
const BASE = '/dashboard/audience';
const TAB_URL = { customers: BASE, visitors: `${BASE}/visitors` } as const;

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Audience', href: BASE }];

type Tab = 'customers' | 'visitors';

interface Customer {
    id: number;
    name: string | null;
    email: string | null;
    phone: string;
    total_orders: number;
    total_spent: string | number;
    first_purchase_at: string | null;
    joined_at: string;
}

interface Visitor {
    id: number;
    phone: string | null;
    name: string | null;
    is_customer: boolean;
    visits_count: number;
    pages_count: number;
    country: string | null;
    city: string | null;
    device: string | null;
    browser: string | null;
    first_seen_at: string;
    last_seen_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface CustomerSummary {
    total: number;
    revenue: string | number;
    repeat: number;
    new_30d: number;
}

interface VisitorSummary {
    total: number;
    customers: number;
    returning: number;
    active_7d: number;
}

interface AudienceProps {
    tab: Tab;
    customers?: Paginated<Customer>;
    visitors?: Paginated<Visitor>;
    summary: CustomerSummary | VisitorSummary;
    counts: { customers: number; visitors: number };
    filters: { search?: string | null };
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = [
    'bg-cp-brand-soft text-cp-brand-ink',
    'bg-cp-sky-soft text-cp-sky-ink',
    'bg-cp-warning-soft text-cp-warning-ink',
    'bg-cp-coral-soft text-cp-coral-dark-ink',
    'bg-cp-accent-soft text-cp-accent-ink',
    'bg-cp-teal-soft text-cp-teal-ink',
];

function initials(name: string | null) {
    if (!name) return '?';
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase() || '?'
    );
}

function avatarTone(name: string | null) {
    const s = name ?? 'anonymous';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return AVATAR_TONES[h % AVATAR_TONES.length];
}

function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeAgo(iso: string) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min} min ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatDate(iso);
}

function waLink(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function DeviceIcon({ device, className }: { device: string | null; className?: string }) {
    const d = (device ?? '').toLowerCase();
    if (d === 'desktop') return <Monitor className={className} />;
    if (d === 'tablet') return <Tablet className={className} />;
    return <Smartphone className={className} />;
}

function pct(part: number, whole: number) {
    return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Payments / Store)                      */
/* ------------------------------------------------------------------ */

function TabNav({ active, counts }: { active: Tab; counts: { customers: number; visitors: number } }) {
    return (
        <nav className="flex items-center gap-6 border-b border-cp-line">
            {(
                [
                    { key: 'customers', label: 'Customers', count: counts.customers },
                    { key: 'visitors', label: 'Visitors', count: counts.visitors },
                ] as const
            ).map((tab) => {
                const isActive = active === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => router.get(TAB_URL[tab.key], {}, { preserveScroll: true })}
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                            isActive ? 'border-cp-brand text-cp-brand-ink' : 'border-transparent text-cp-muted hover:border-cp-line hover:text-cp-ink',
                        )}
                    >
                        {tab.label}
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', isActive ? 'bg-cp-brand-soft text-cp-brand-ink' : 'bg-cp-surface-3 text-cp-muted')}>
                            {tab.count.toLocaleString('en-IN')}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-cp-surface p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-cp-ink">{value}</span>
            <span className="mt-1 text-xs text-cp-muted">{sub}</span>
        </div>
    );
}

function MetaRow({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
    const [copied, setCopied] = useState(false);

    function copy() {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-cp-canvas/60 p-2.5">
            <span className="text-[13px] text-cp-muted">{label}</span>
            <div className="flex min-w-0 items-center gap-1">
                <span className={cn('max-w-[220px] truncate text-[13px] font-semibold text-cp-ink', mono && 'font-mono text-xs')}>{value}</span>
                {copyable && value !== '—' && (
                    <button type="button" onClick={copy} className="p-0.5 text-cp-muted hover:text-cp-ink" title="Copy">
                        {copied ? <Check className="size-3.5 text-cp-success-ink" /> : <Copy className="size-3.5" />}
                    </button>
                )}
            </div>
        </div>
    );
}

function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
    return (
        <>
            <div onClick={onClose} className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'pointer-events-none opacity-0')} />
            <div
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[400px] flex-col justify-between overflow-y-auto bg-cp-surface shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {open && (
                    <>
                        <div className="flex flex-col gap-4 p-6">
                            <div className="flex items-center justify-between border-b border-cp-line/70 pb-4">
                                <span className="text-base font-semibold text-cp-ink">{title}</span>
                                <button onClick={onClose} className="rounded-lg p-1 text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink">
                                    <X className="size-5" />
                                </button>
                            </div>
                            {children}
                        </div>
                        {footer && <div className="flex flex-col gap-2 border-t border-cp-line bg-cp-surface p-5">{footer}</div>}
                    </>
                )}
            </div>
        </>
    );
}

function EmptyRow({ colSpan, title, hint }: { colSpan: number; title: string; hint: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-6 py-8">
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cp-line bg-cp-surface-2 py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-cp-surface-3 text-cp-muted">
                        <Inbox className="size-5" />
                    </span>
                    <p className="mt-1 text-sm font-semibold text-cp-ink">{title}</p>
                    <p className="max-w-xs px-4 text-xs text-cp-muted">{hint}</p>
                </div>
            </td>
        </tr>
    );
}

function Avatar({ name, className }: { name: string | null; className?: string }) {
    return <div className={cn('flex shrink-0 items-center justify-center rounded-full font-bold', avatarTone(name), className)}>{initials(name)}</div>;
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function AudienceIndex({ tab, customers, visitors, summary, counts, filters }: AudienceProps) {
    const applied = filters?.search || undefined;
    const [search, setSearch] = useState(applied ?? '');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

    const isCustomers = tab === 'customers';
    const list = isCustomers ? customers : visitors;

    function visit(overrides: Record<string, string | number | undefined>) {
        router.get(TAB_URL[tab], { search: applied, ...overrides }, { preserveState: true, replace: true });
    }

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        visit({ search: search.trim() || undefined, page: undefined });
    }

    function exportCsv() {
        const params = new URLSearchParams({ type: tab });
        if (applied) params.set('search', applied);
        window.location.href = `${BASE}/export?${params.toString()}`;
    }

    const cs = summary as CustomerSummary;
    const vs = summary as VisitorSummary;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audience" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                {/* Sticky top header — same as Store / Payments */}
                <div className="sticky top-14 z-30 border-b border-cp-line bg-cp-canvas/95 backdrop-blur-md lg:top-0">
                    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                        <TabNav active={tab} counts={counts} />
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Audience</h1>
                                <span className="rounded-full bg-cp-brand-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cp-brand-ink uppercase">Live Sync</span>
                            </div>
                            <p className="text-sm text-cp-muted">The people who buy from you and the people who visit your store.</p>
                        </div>
                        <span className="flex w-fit items-center gap-1.5 text-xs text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Live tracking
                        </span>
                    </div>

                    {/* KPI cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {isCustomers ? (
                            <>
                                <KpiCard label="Total Customers" value={Number(cs.total).toLocaleString('en-IN')} sub={`${cs.new_30d} joined in the last 30 days`} icon={<Users className="size-3.5" />} tone="bg-cp-brand-soft text-cp-brand-ink" />
                                <KpiCard label="Lifetime Revenue" value={formatCurrency(Number(cs.revenue || 0))} sub="Across all customers" icon={<span className="text-sm font-bold">₹</span>} tone="bg-cp-success-soft text-cp-success-ink" />
                                <KpiCard label="Repeat Buyers" value={Number(cs.repeat).toLocaleString('en-IN')} sub={`${pct(cs.repeat, cs.total)} of customers bought again`} icon={<Repeat className="size-3.5" />} tone="bg-cp-accent-soft text-cp-accent-ink" />
                                <KpiCard label="New (30 days)" value={Number(cs.new_30d).toLocaleString('en-IN')} sub="Fresh customers this month" icon={<UserPlus className="size-3.5" />} tone="bg-cp-teal-soft text-cp-teal-ink" />
                            </>
                        ) : (
                            <>
                                <KpiCard label="Total Visitors" value={Number(vs.total).toLocaleString('en-IN')} sub="Unique store sessions" icon={<Eye className="size-3.5" />} tone="bg-cp-brand-soft text-cp-brand-ink" />
                                <KpiCard label="Converted" value={Number(vs.customers).toLocaleString('en-IN')} sub={`${pct(vs.customers, vs.total)} visitor → customer rate`} icon={<BadgeCheck className="size-3.5" />} tone="bg-cp-success-soft text-cp-success-ink" />
                                <KpiCard label="Returning" value={Number(vs.returning).toLocaleString('en-IN')} sub={`${pct(vs.returning, vs.total)} came back more than once`} icon={<Repeat className="size-3.5" />} tone="bg-cp-accent-soft text-cp-accent-ink" />
                                <KpiCard label="Active (7 days)" value={Number(vs.active_7d).toLocaleString('en-IN')} sub="Seen in the last week" icon={<Activity className="size-3.5" />} tone="bg-cp-coral-soft text-cp-coral-ink" />
                            </>
                        )}
                    </div>

                    {/* Search + export */}
                    <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl bg-cp-surface p-4 shadow-sm sm:flex-row sm:items-center">
                        <form onSubmit={submitSearch} className="relative max-w-sm flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-cp-muted" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isCustomers ? 'Search name, email, phone…' : 'Search name, phone, city…'}
                                className="w-full rounded-lg bg-cp-canvas py-2 pr-9 pl-9 text-sm text-cp-ink outline-none placeholder:text-cp-muted focus:bg-cp-surface focus:ring-2 focus:ring-cp-brand/20"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        visit({ search: undefined, page: undefined });
                                    }}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-cp-muted hover:text-cp-ink"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </form>
                        <Button variant="outline" onClick={exportCsv} className="border-cp-line">
                            <Download /> Export CSV
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl bg-cp-surface shadow-sm">
                        <div className="flex items-center justify-between border-b border-cp-line/70 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-cp-ink">{isCustomers ? 'Customers' : 'Visitors'}</h2>
                                <p className="mt-0.5 text-xs text-cp-muted">
                                    Showing {list?.from ?? 0}–{list?.to ?? 0} of {list?.total ?? 0} {isCustomers ? 'customers' : 'visitors'}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {isCustomers ? (
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-cp-canvas/60 text-[11px] font-semibold tracking-wider text-cp-muted uppercase">
                                            <th className="px-6 py-3">Customer</th>
                                            <th className="px-4 py-3">Phone</th>
                                            <th className="px-4 py-3 text-center">Orders</th>
                                            <th className="px-4 py-3 text-right">Total spent</th>
                                            <th className="px-4 py-3">First purchase</th>
                                            <th className="px-6 py-3">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cp-line/50">
                                        {customers?.data.length === 0 && (
                                            <EmptyRow colSpan={6} title="No customers found" hint={applied ? 'Try a different search.' : 'Customers appear here automatically after their first purchase.'} />
                                        )}
                                        {customers?.data.map((c) => (
                                            <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="group cursor-pointer transition hover:bg-cp-canvas/60">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={c.name} className="size-8 text-[11px]" />
                                                        <div className="min-w-0">
                                                            <span className="block truncate text-[13px] font-semibold text-cp-ink group-hover:text-cp-brand-ink">{c.name ?? 'Unnamed'}</span>
                                                            <span className="block truncate text-xs text-cp-muted">{c.email ?? '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-cp-body">{c.phone}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                            c.total_orders > 1 ? 'bg-cp-brand-soft text-cp-brand-ink' : c.total_orders === 1 ? 'bg-cp-success-soft text-cp-success-ink' : 'bg-cp-surface-3 text-cp-subtle',
                                                        )}
                                                    >
                                                        {c.total_orders > 1 && <Repeat className="size-3" />}
                                                        {c.total_orders}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[15px] font-bold whitespace-nowrap text-cp-ink">{formatCurrency(Number(c.total_spent))}</td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-cp-body">{formatDate(c.first_purchase_at)}</td>
                                                <td className="px-6 py-3.5 text-[13px] whitespace-nowrap text-cp-body">{formatDate(c.joined_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-cp-canvas/60 text-[11px] font-semibold tracking-wider text-cp-muted uppercase">
                                            <th className="px-6 py-3">Visitor</th>
                                            <th className="px-4 py-3">Location</th>
                                            <th className="px-4 py-3">Device</th>
                                            <th className="px-4 py-3 text-center">Visits</th>
                                            <th className="px-4 py-3 text-center">Pages</th>
                                            <th className="px-4 py-3">Last seen</th>
                                            <th className="px-6 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cp-line/50">
                                        {visitors?.data.length === 0 && (
                                            <EmptyRow colSpan={7} title="No visitors found" hint={applied ? 'Try a different search.' : 'Visitors appear here as people open your store.'} />
                                        )}
                                        {visitors?.data.map((v) => (
                                            <tr key={v.id} onClick={() => setSelectedVisitor(v)} className="group cursor-pointer transition hover:bg-cp-canvas/60">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={v.name} className="size-8 text-[11px]" />
                                                        <div className="min-w-0">
                                                            <span className="block truncate text-[13px] font-semibold text-cp-ink group-hover:text-cp-brand-ink">{v.name ?? 'Anonymous visitor'}</span>
                                                            <span className="block truncate text-xs text-cp-muted">{v.phone ?? 'No phone captured'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-cp-body">{[v.city, v.country].filter(Boolean).join(', ') || '—'}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5 text-[13px] text-cp-body">
                                                        <DeviceIcon device={v.device} className="size-4 text-cp-muted" />
                                                        {[v.device, v.browser].filter(Boolean).join(' · ') || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center text-[13px] font-semibold text-cp-ink">{v.visits_count}</td>
                                                <td className="px-4 py-3.5 text-center text-[13px] font-semibold text-cp-ink">{v.pages_count}</td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-cp-body">{timeAgo(v.last_seen_at)}</td>
                                                <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                                    {v.is_customer ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-cp-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-cp-success-ink">
                                                            <span className="size-1.5 rounded-full bg-cp-success" /> Customer
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-cp-surface-3 px-2.5 py-0.5 text-[11px] font-semibold text-cp-subtle">
                                                            <span className="size-1.5 rounded-full bg-current" /> Visitor
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-between gap-3 border-t border-cp-line/60 p-4 sm:flex-row">
                            <p className="text-xs text-cp-muted">
                                Page <span className="font-semibold text-cp-ink">{list?.current_page ?? 1}</span> of <span className="font-semibold text-cp-ink">{list?.last_page ?? 1}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={(list?.current_page ?? 1) <= 1} onClick={() => visit({ page: (list?.current_page ?? 1) - 1 })} className="border-cp-line">
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={(list?.current_page ?? 1) >= (list?.last_page ?? 1)} onClick={() => visit({ page: (list?.current_page ?? 1) + 1 })} className="border-cp-line">
                                    Next <ArrowUpRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer drawer */}
            <Drawer
                open={!!selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
                title="Customer Details"
                footer={
                    selectedCustomer && (
                        <>
                            <Button onClick={() => router.get('/dashboard/payments', { search: selectedCustomer.phone })} className="w-full text-white bg-cp-brand hover:bg-cp-brand-hover">
                                <ReceiptText className="size-4" /> View transactions
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Button asChild variant="outline" className="border-cp-line">
                                    <a href={waLink(selectedCustomer.phone)} target="_blank" rel="noreferrer">
                                        <MessageCircle className="size-4" /> WhatsApp
                                    </a>
                                </Button>
                                {selectedCustomer.email ? (
                                    <Button asChild variant="outline" className="border-cp-line">
                                        <a href={`mailto:${selectedCustomer.email}`}>
                                            <Mail className="size-4" /> Email
                                        </a>
                                    </Button>
                                ) : (
                                    <Button variant="outline" disabled className="border-cp-line">
                                        <Mail className="size-4" /> Email
                                    </Button>
                                )}
                            </div>
                        </>
                    )
                }
            >
                {selectedCustomer && (
                    <>
                        <div className="flex items-center gap-3">
                            <Avatar name={selectedCustomer.name} className="size-12 text-base" />
                            <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-cp-ink">{selectedCustomer.name ?? 'Unnamed'}</p>
                                <p className="truncate text-xs text-cp-muted">{selectedCustomer.email ?? 'No email'}</p>
                            </div>
                        </div>

                        <div
                            className={cn(
                                'flex items-center gap-2 rounded-xl p-3 text-[13px] font-semibold',
                                selectedCustomer.total_orders > 1 ? 'bg-cp-brand-soft text-cp-brand-ink' : selectedCustomer.total_orders === 1 ? 'bg-cp-success-soft text-cp-success-ink' : 'bg-cp-canvas text-cp-body',
                            )}
                        >
                            <BadgeCheck className="size-[18px]" />
                            {selectedCustomer.total_orders > 1 ? 'Repeat buyer' : selectedCustomer.total_orders === 1 ? 'First-time buyer' : 'No purchases yet'}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-cp-canvas p-3">
                                <p className="text-[11px] text-cp-muted">Orders</p>
                                <p className="mt-0.5 text-base font-bold text-cp-ink">{selectedCustomer.total_orders}</p>
                            </div>
                            <div className="rounded-xl bg-cp-canvas p-3">
                                <p className="text-[11px] text-cp-muted">Spent</p>
                                <p className="mt-0.5 text-base font-bold text-cp-ink">{formatCurrency(Number(selectedCustomer.total_spent))}</p>
                            </div>
                            <div className="rounded-xl bg-cp-canvas p-3">
                                <p className="text-[11px] text-cp-muted">Avg order</p>
                                <p className="mt-0.5 text-base font-bold text-cp-ink">
                                    {formatCurrency(selectedCustomer.total_orders > 0 ? Number(selectedCustomer.total_spent) / selectedCustomer.total_orders : 0)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">Contact</span>
                            <MetaRow label="Phone" value={selectedCustomer.phone} copyable />
                            <MetaRow label="Email" value={selectedCustomer.email ?? '—'} copyable />
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">Timeline</span>
                            <MetaRow label="First purchase" value={formatDate(selectedCustomer.first_purchase_at)} />
                            <MetaRow label="Joined" value={formatDate(selectedCustomer.joined_at)} />
                        </div>
                    </>
                )}
            </Drawer>

            {/* Visitor drawer */}
            <Drawer
                open={!!selectedVisitor}
                onClose={() => setSelectedVisitor(null)}
                title="Visitor Details"
                footer={
                    selectedVisitor?.phone && (
                        <Button asChild variant="outline" className="w-full border-cp-line">
                            <a href={waLink(selectedVisitor.phone)} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-4" /> Message on WhatsApp
                            </a>
                        </Button>
                    )
                }
            >
                {selectedVisitor && (
                    <>
                        <div className="flex items-center gap-3">
                            <Avatar name={selectedVisitor.name} className="size-12 text-base" />
                            <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-cp-ink">{selectedVisitor.name ?? 'Anonymous visitor'}</p>
                                <p className="truncate text-xs text-cp-muted">{selectedVisitor.phone ?? 'No phone captured'}</p>
                            </div>
                        </div>

                        <div className={cn('flex items-center gap-2 rounded-xl p-3 text-[13px] font-semibold', selectedVisitor.is_customer ? 'bg-cp-success-soft text-cp-success-ink' : 'bg-cp-canvas text-cp-body')}>
                            <BadgeCheck className="size-[18px]" />
                            {selectedVisitor.is_customer ? 'Converted to customer' : 'Not purchased yet'}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-cp-canvas p-3">
                                <p className="text-[11px] text-cp-muted">Visits</p>
                                <p className="mt-0.5 text-base font-bold text-cp-ink">{selectedVisitor.visits_count}</p>
                            </div>
                            <div className="rounded-xl bg-cp-canvas p-3">
                                <p className="text-[11px] text-cp-muted">Pages viewed</p>
                                <p className="mt-0.5 text-base font-bold text-cp-ink">{selectedVisitor.pages_count}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">Session</span>
                            <div className="flex items-center gap-2 rounded-lg bg-cp-canvas/60 p-2.5 text-[13px] text-cp-muted">
                                <MapPin className="size-4" />
                                <span className="font-semibold text-cp-ink">{[selectedVisitor.city, selectedVisitor.country].filter(Boolean).join(', ') || 'Unknown location'}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-cp-canvas/60 p-2.5 text-[13px] text-cp-muted">
                                <DeviceIcon device={selectedVisitor.device} className="size-4" />
                                <span className="font-semibold text-cp-ink">{[selectedVisitor.device, selectedVisitor.browser].filter(Boolean).join(' · ') || 'Unknown device'}</span>
                            </div>
                            <MetaRow label="First seen" value={formatDateTime(selectedVisitor.first_seen_at)} />
                            <MetaRow label="Last seen" value={formatDateTime(selectedVisitor.last_seen_at)} />
                        </div>
                    </>
                )}
            </Drawer>
        </AppLayout>
    );
}