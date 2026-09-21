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
    'bg-[#EEF2FF] text-[#4F46E5]',
    'bg-[#E6F2FF] text-[#0284C7]',
    'bg-[#FFF4DB] text-[#B46E00]',
    'bg-[#FFEDE8] text-[#C2410C]',
    'bg-[#F1EAFE] text-[#7C3AED]',
    'bg-[#E1F6F3] text-[#0D9488]',
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
        <nav className="flex items-center gap-6 border-b border-[#E4E2DA]">
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
                            isActive ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#8A8A96] hover:border-[#E4E2DA] hover:text-[#14141B]',
                        )}
                    >
                        {tab.label}
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[#ECEBE6] text-[#8A8A96]')}>
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
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value}</span>
            <span className="mt-1 text-xs text-[#8A8A96]">{sub}</span>
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
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F5F2]/60 p-2.5">
            <span className="text-[13px] text-[#8A8A96]">{label}</span>
            <div className="flex min-w-0 items-center gap-1">
                <span className={cn('max-w-[220px] truncate text-[13px] font-semibold text-[#14141B]', mono && 'font-mono text-xs')}>{value}</span>
                {copyable && value !== '—' && (
                    <button type="button" onClick={copy} className="p-0.5 text-[#8A8A96] hover:text-[#14141B]" title="Copy">
                        {copied ? <Check className="size-3.5 text-[#059669]" /> : <Copy className="size-3.5" />}
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
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[400px] flex-col justify-between overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {open && (
                    <>
                        <div className="flex flex-col gap-4 p-6">
                            <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 pb-4">
                                <span className="text-base font-semibold text-[#14141B]">{title}</span>
                                <button onClick={onClose} className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                                    <X className="size-5" />
                                </button>
                            </div>
                            {children}
                        </div>
                        {footer && <div className="flex flex-col gap-2 border-t border-[#E4E2DA] bg-white p-5">{footer}</div>}
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
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                        <Inbox className="size-5" />
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[#14141B]">{title}</p>
                    <p className="max-w-xs px-4 text-xs text-[#8A8A96]">{hint}</p>
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
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                {/* Sticky top header — same as Store / Payments */}
                <div className="sticky top-0 z-30 border-b border-[#E4E2DA] bg-[#F6F5F2]/95 backdrop-blur-md">
                    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                        <TabNav active={tab} counts={counts} />
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Audience</h1>
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">Live Sync</span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">The people who buy from you and the people who visit your store.</p>
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
                                <KpiCard label="Total Customers" value={Number(cs.total).toLocaleString('en-IN')} sub={`${cs.new_30d} joined in the last 30 days`} icon={<Users className="size-3.5" />} tone="bg-[#EEF2FF] text-[#4F46E5]" />
                                <KpiCard label="Lifetime Revenue" value={formatCurrency(Number(cs.revenue || 0))} sub="Across all customers" icon={<span className="text-sm font-bold">₹</span>} tone="bg-[#E6F6EC] text-[#059669]" />
                                <KpiCard label="Repeat Buyers" value={Number(cs.repeat).toLocaleString('en-IN')} sub={`${pct(cs.repeat, cs.total)} of customers bought again`} icon={<Repeat className="size-3.5" />} tone="bg-[#F1EAFE] text-[#7C3AED]" />
                                <KpiCard label="New (30 days)" value={Number(cs.new_30d).toLocaleString('en-IN')} sub="Fresh customers this month" icon={<UserPlus className="size-3.5" />} tone="bg-[#E1F6F3] text-[#0D9488]" />
                            </>
                        ) : (
                            <>
                                <KpiCard label="Total Visitors" value={Number(vs.total).toLocaleString('en-IN')} sub="Unique store sessions" icon={<Eye className="size-3.5" />} tone="bg-[#EEF2FF] text-[#4F46E5]" />
                                <KpiCard label="Converted" value={Number(vs.customers).toLocaleString('en-IN')} sub={`${pct(vs.customers, vs.total)} visitor → customer rate`} icon={<BadgeCheck className="size-3.5" />} tone="bg-[#E6F6EC] text-[#059669]" />
                                <KpiCard label="Returning" value={Number(vs.returning).toLocaleString('en-IN')} sub={`${pct(vs.returning, vs.total)} came back more than once`} icon={<Repeat className="size-3.5" />} tone="bg-[#F1EAFE] text-[#7C3AED]" />
                                <KpiCard label="Active (7 days)" value={Number(vs.active_7d).toLocaleString('en-IN')} sub="Seen in the last week" icon={<Activity className="size-3.5" />} tone="bg-[#FFEDE8] text-[#FF6B4A]" />
                            </>
                        )}
                    </div>

                    {/* Search + export */}
                    <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                        <form onSubmit={submitSearch} className="relative max-w-sm flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isCustomers ? 'Search name, email, phone…' : 'Search name, phone, city…'}
                                className="w-full rounded-lg bg-[#F6F5F2] py-2 pr-9 pl-9 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        visit({ search: undefined, page: undefined });
                                    }}
                                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#8A8A96] hover:text-[#14141B]"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </form>
                        <Button variant="outline" onClick={exportCsv} className="border-[#E4E2DA]">
                            <Download /> Export CSV
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[#14141B]">{isCustomers ? 'Customers' : 'Visitors'}</h2>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">
                                    Showing {list?.from ?? 0}–{list?.to ?? 0} of {list?.total ?? 0} {isCustomers ? 'customers' : 'visitors'}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {isCustomers ? (
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                            <th className="px-6 py-3">Customer</th>
                                            <th className="px-4 py-3">Phone</th>
                                            <th className="px-4 py-3 text-center">Orders</th>
                                            <th className="px-4 py-3 text-right">Total spent</th>
                                            <th className="px-4 py-3">First purchase</th>
                                            <th className="px-6 py-3">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E2DA]/50">
                                        {customers?.data.length === 0 && (
                                            <EmptyRow colSpan={6} title="No customers found" hint={applied ? 'Try a different search.' : 'Customers appear here automatically after their first purchase.'} />
                                        )}
                                        {customers?.data.map((c) => (
                                            <tr key={c.id} onClick={() => setSelectedCustomer(c)} className="group cursor-pointer transition hover:bg-[#F6F5F2]/60">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={c.name} className="size-8 text-[11px]" />
                                                        <div className="min-w-0">
                                                            <span className="block truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{c.name ?? 'Unnamed'}</span>
                                                            <span className="block truncate text-xs text-[#8A8A96]">{c.email ?? '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#4B4B57]">{c.phone}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                            c.total_orders > 1 ? 'bg-[#EEF2FF] text-[#4F46E5]' : c.total_orders === 1 ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#F0EFEA] text-[#6B6B78]',
                                                        )}
                                                    >
                                                        {c.total_orders > 1 && <Repeat className="size-3" />}
                                                        {c.total_orders}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[15px] font-bold whitespace-nowrap text-[#14141B]">{formatCurrency(Number(c.total_spent))}</td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#4B4B57]">{formatDate(c.first_purchase_at)}</td>
                                                <td className="px-6 py-3.5 text-[13px] whitespace-nowrap text-[#4B4B57]">{formatDate(c.joined_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                            <th className="px-6 py-3">Visitor</th>
                                            <th className="px-4 py-3">Location</th>
                                            <th className="px-4 py-3">Device</th>
                                            <th className="px-4 py-3 text-center">Visits</th>
                                            <th className="px-4 py-3 text-center">Pages</th>
                                            <th className="px-4 py-3">Last seen</th>
                                            <th className="px-6 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E2DA]/50">
                                        {visitors?.data.length === 0 && (
                                            <EmptyRow colSpan={7} title="No visitors found" hint={applied ? 'Try a different search.' : 'Visitors appear here as people open your store.'} />
                                        )}
                                        {visitors?.data.map((v) => (
                                            <tr key={v.id} onClick={() => setSelectedVisitor(v)} className="group cursor-pointer transition hover:bg-[#F6F5F2]/60">
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={v.name} className="size-8 text-[11px]" />
                                                        <div className="min-w-0">
                                                            <span className="block truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{v.name ?? 'Anonymous visitor'}</span>
                                                            <span className="block truncate text-xs text-[#8A8A96]">{v.phone ?? 'No phone captured'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#4B4B57]">{[v.city, v.country].filter(Boolean).join(', ') || '—'}</td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5 text-[13px] text-[#4B4B57]">
                                                        <DeviceIcon device={v.device} className="size-4 text-[#8A8A96]" />
                                                        {[v.device, v.browser].filter(Boolean).join(' · ') || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center text-[13px] font-semibold text-[#14141B]">{v.visits_count}</td>
                                                <td className="px-4 py-3.5 text-center text-[13px] font-semibold text-[#14141B]">{v.pages_count}</td>
                                                <td className="px-4 py-3.5 text-[13px] whitespace-nowrap text-[#4B4B57]">{timeAgo(v.last_seen_at)}</td>
                                                <td className="px-6 py-3.5 text-center whitespace-nowrap">
                                                    {v.is_customer ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F6EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
                                                            <span className="size-1.5 rounded-full bg-[#059669]" /> Customer
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F0EFEA] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B6B78]">
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

                        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                            <p className="text-xs text-[#8A8A96]">
                                Page <span className="font-semibold text-[#14141B]">{list?.current_page ?? 1}</span> of <span className="font-semibold text-[#14141B]">{list?.last_page ?? 1}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={(list?.current_page ?? 1) <= 1} onClick={() => visit({ page: (list?.current_page ?? 1) - 1 })} className="border-[#E4E2DA]">
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={(list?.current_page ?? 1) >= (list?.last_page ?? 1)} onClick={() => visit({ page: (list?.current_page ?? 1) + 1 })} className="border-[#E4E2DA]">
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
                            <Button onClick={() => router.get('/dashboard/payments', { search: selectedCustomer.phone })} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                                <ReceiptText className="size-4" /> View transactions
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Button asChild variant="outline" className="border-[#E4E2DA]">
                                    <a href={waLink(selectedCustomer.phone)} target="_blank" rel="noreferrer">
                                        <MessageCircle className="size-4" /> WhatsApp
                                    </a>
                                </Button>
                                {selectedCustomer.email ? (
                                    <Button asChild variant="outline" className="border-[#E4E2DA]">
                                        <a href={`mailto:${selectedCustomer.email}`}>
                                            <Mail className="size-4" /> Email
                                        </a>
                                    </Button>
                                ) : (
                                    <Button variant="outline" disabled className="border-[#E4E2DA]">
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
                                <p className="truncate text-base font-semibold text-[#14141B]">{selectedCustomer.name ?? 'Unnamed'}</p>
                                <p className="truncate text-xs text-[#8A8A96]">{selectedCustomer.email ?? 'No email'}</p>
                            </div>
                        </div>

                        <div
                            className={cn(
                                'flex items-center gap-2 rounded-xl p-3 text-[13px] font-semibold',
                                selectedCustomer.total_orders > 1 ? 'bg-[#EEF2FF] text-[#4F46E5]' : selectedCustomer.total_orders === 1 ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#F6F5F2] text-[#4B4B57]',
                            )}
                        >
                            <BadgeCheck className="size-[18px]" />
                            {selectedCustomer.total_orders > 1 ? 'Repeat buyer' : selectedCustomer.total_orders === 1 ? 'First-time buyer' : 'No purchases yet'}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-[#F6F5F2] p-3">
                                <p className="text-[11px] text-[#8A8A96]">Orders</p>
                                <p className="mt-0.5 text-base font-bold text-[#14141B]">{selectedCustomer.total_orders}</p>
                            </div>
                            <div className="rounded-xl bg-[#F6F5F2] p-3">
                                <p className="text-[11px] text-[#8A8A96]">Spent</p>
                                <p className="mt-0.5 text-base font-bold text-[#14141B]">{formatCurrency(Number(selectedCustomer.total_spent))}</p>
                            </div>
                            <div className="rounded-xl bg-[#F6F5F2] p-3">
                                <p className="text-[11px] text-[#8A8A96]">Avg order</p>
                                <p className="mt-0.5 text-base font-bold text-[#14141B]">
                                    {formatCurrency(selectedCustomer.total_orders > 0 ? Number(selectedCustomer.total_spent) / selectedCustomer.total_orders : 0)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Contact</span>
                            <MetaRow label="Phone" value={selectedCustomer.phone} copyable />
                            <MetaRow label="Email" value={selectedCustomer.email ?? '—'} copyable />
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Timeline</span>
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
                        <Button asChild variant="outline" className="w-full border-[#E4E2DA]">
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
                                <p className="truncate text-base font-semibold text-[#14141B]">{selectedVisitor.name ?? 'Anonymous visitor'}</p>
                                <p className="truncate text-xs text-[#8A8A96]">{selectedVisitor.phone ?? 'No phone captured'}</p>
                            </div>
                        </div>

                        <div className={cn('flex items-center gap-2 rounded-xl p-3 text-[13px] font-semibold', selectedVisitor.is_customer ? 'bg-[#E6F6EC] text-[#059669]' : 'bg-[#F6F5F2] text-[#4B4B57]')}>
                            <BadgeCheck className="size-[18px]" />
                            {selectedVisitor.is_customer ? 'Converted to customer' : 'Not purchased yet'}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-[#F6F5F2] p-3">
                                <p className="text-[11px] text-[#8A8A96]">Visits</p>
                                <p className="mt-0.5 text-base font-bold text-[#14141B]">{selectedVisitor.visits_count}</p>
                            </div>
                            <div className="rounded-xl bg-[#F6F5F2] p-3">
                                <p className="text-[11px] text-[#8A8A96]">Pages viewed</p>
                                <p className="mt-0.5 text-base font-bold text-[#14141B]">{selectedVisitor.pages_count}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Session</span>
                            <div className="flex items-center gap-2 rounded-lg bg-[#F6F5F2]/60 p-2.5 text-[13px] text-[#8A8A96]">
                                <MapPin className="size-4" />
                                <span className="font-semibold text-[#14141B]">{[selectedVisitor.city, selectedVisitor.country].filter(Boolean).join(', ') || 'Unknown location'}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-[#F6F5F2]/60 p-2.5 text-[13px] text-[#8A8A96]">
                                <DeviceIcon device={selectedVisitor.device} className="size-4" />
                                <span className="font-semibold text-[#14141B]">{[selectedVisitor.device, selectedVisitor.browser].filter(Boolean).join(' · ') || 'Unknown device'}</span>
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