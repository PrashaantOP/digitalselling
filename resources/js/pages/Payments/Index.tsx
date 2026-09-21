import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    Copy,
    Download,
    Hourglass,
    Inbox,
    Info,
    ReceiptText,
    Search,
    Send,
    ShoppingBag,
    Wallet,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payments', href: '/dashboard/payments' }];

type ProductType = 'course' | 'event' | 'book' | 'locked_content' | 'payment_page' | 'booking';
type OrderStatus = 'pending' | 'success' | 'failed' | 'refunded';

interface TransactionRow {
    id: number;
    order_number: string;
    created_at: string;
    paid_at: string | null;
    buyer_name: string | null;
    buyer_email: string | null;
    buyer_phone: string;
    total_amount: string | number;
    platform_fee?: string | number;
    net_payout_amount: string | number;
    status: OrderStatus;
    product: { id: number; title: string; type: ProductType } | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface PaymentsSummary {
    orders: number;
    gross: string | number;
    fees: string | number;
    net: string | number;
}

interface PaymentsIndexProps {
    transactions: Paginated<TransactionRow>;
    summary: PaymentsSummary;
    filters: { status: string | null; type: string | null; from: string | null; to: string | null; search: string | null };
}

const TYPE_TABS: { type: 'all' | ProductType; label: string; dot: string }[] = [
    { type: 'all', label: 'All', dot: 'bg-[#4F46E5]' },
    { type: 'course', label: 'Course', dot: 'bg-[#4F46E5]' },
    { type: 'event', label: 'Event', dot: 'bg-[#FF6B4A]' },
    { type: 'book', label: 'Book', dot: 'bg-amber-500' },
    { type: 'locked_content', label: 'Locked content', dot: 'bg-purple-600' },
    { type: 'payment_page', label: 'Payment page', dot: 'bg-teal-600' },
    { type: 'booking', label: 'Booking', dot: 'bg-sky-500' },
];

const TYPE_BADGE: Record<string, string> = {
    course: 'bg-[#EEF2FF] text-[#4F46E5]',
    event: 'bg-[#FFEDE8] text-[#C2410C]',
    book: 'bg-[#FFF4DB] text-[#B46E00]',
    locked_content: 'bg-[#F1EAFE] text-[#7C3AED]',
    payment_page: 'bg-[#E1F6F3] text-[#0D9488]',
    booking: 'bg-[#E6F2FF] text-[#0284C7]',
};

const TYPE_LABEL: Record<string, string> = {
    course: 'Course',
    event: 'Event',
    book: 'Book',
    locked_content: 'Locked Content',
    payment_page: 'Payment Page',
    booking: 'Booking',
};

function initials(name: string | null) {
    if (!name) return 'AN';
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase() || 'AN'
    );
}

const AVATAR_TONES = [
    'bg-[#EEF2FF] text-[#4F46E5]',
    'bg-[#E6F2FF] text-[#0284C7]',
    'bg-[#FFF4DB] text-[#B46E00]',
    'bg-[#FFEDE8] text-[#C2410C]',
    'bg-[#F1EAFE] text-[#7C3AED]',
    'bg-[#E1F6F3] text-[#0D9488]',
];

function avatarTone(name: string | null) {
    const s = name ?? 'anonymous';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return AVATAR_TONES[h % AVATAR_TONES.length];
}

function formatDateTime(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameDay(d, today)) return `Today, ${time}`;
    if (sameDay(d, yesterday)) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

function channelLabel(tx: TransactionRow) {
    if (tx.status === 'pending') return 'UPI Mandate';
    if (tx.status === 'failed') return 'Card ••4932';
    return tx.id % 2 === 0 ? 'Card ••8112' : 'UPI Instant';
}

function TabNav({ active }: { active: 'transactions' | 'account' }) {
    return (
        <nav className="flex items-center gap-6 border-b border-[#E4E2DA]">
            {[
                { key: 'transactions', label: 'Transactions', href: '/dashboard/payments' },
                { key: 'account', label: 'Account', href: '/dashboard/payments/account' },
            ].map((tab) => {
                const isActive = active === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => router.get(tab.href, {}, { preserveScroll: true })}
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                            isActive ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#8A8A96] hover:border-[#E4E2DA] hover:text-[#14141B]',
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
}

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string }) {
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

function toISODate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function presetRange(key: string): { from?: string; to?: string } {
    const today = new Date();
    const fmt = toISODate;
    if (key === 'today') return { from: fmt(today), to: fmt(today) };
    if (key === 'yesterday') {
        const y = new Date(today);
        y.setDate(today.getDate() - 1);
        return { from: fmt(y), to: fmt(y) };
    }
    if (key === 'last7') {
        const s = new Date(today);
        s.setDate(today.getDate() - 6);
        return { from: fmt(s), to: fmt(today) };
    }
    if (key === 'last30') {
        const s = new Date(today);
        s.setDate(today.getDate() - 29);
        return { from: fmt(s), to: fmt(today) };
    }
    return {};
}

function activePresetKey(filters: PaymentsIndexProps['filters']): string {
    const today = toISODate(new Date());
    const y = new Date();
    y.setDate(new Date().getDate() - 1);
    const yesterday = toISODate(y);
    const last7 = toISODate(new Date(new Date().setDate(new Date().getDate() - 6)));
    const last30 = toISODate(new Date(new Date().setDate(new Date().getDate() - 29)));
    if (!filters.from && !filters.to) return 'all';
    if (filters.from === today && filters.to === today) return 'today';
    if (filters.from === yesterday && filters.to === yesterday) return 'yesterday';
    if (filters.from === last7 && filters.to === today) return 'last7';
    if (filters.from === last30 && filters.to === today) return 'last30';
    return 'custom';
}

const DATE_PRESETS = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 days' },
    { key: 'last30', label: 'Last 30 days' },
    { key: 'all', label: 'All time' },
] as const;

const DATE_LABEL: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    all: 'All time',
    custom: 'Custom range',
};

export default function PaymentsIndex({ transactions, summary, filters }: PaymentsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<TransactionRow | null>(null);
    const [copied, setCopied] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const dateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false);
        }
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const activePreset = activePresetKey(filters);

    const gross = Number(summary.gross || 0);
    const net = Number(summary.net || 0);
    const fees = Number(summary.fees || 0);

    const pendingTotal = useMemo(
        () => transactions.data.filter((t) => t.status === 'pending').reduce((s, t) => s + Number(t.total_amount || 0), 0),
        [transactions.data],
    );

    function updateFilters(overrides: Partial<typeof filters>) {
        router.get(
            '/dashboard/payments',
            {
                status: filters.status ?? undefined,
                type: filters.type ?? undefined,
                from: filters.from ?? undefined,
                to: filters.to ?? undefined,
                search: search || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    }

    function submitSearch(e: FormEvent) {
        e.preventDefault();
        updateFilters({ search: search || undefined });
    }

    function goToPage(page: number) {
        router.get(
            '/dashboard/payments',
            {
                status: filters.status ?? undefined,
                type: filters.type ?? undefined,
                search: filters.search ?? undefined,
                from: filters.from ?? undefined,
                to: filters.to ?? undefined,
                page,
            },
            { preserveState: true },
        );
    }

    function exportCsv() {
        const params = new URLSearchParams();
        if (filters.type) params.set('type', filters.type);
        if (filters.status) params.set('status', filters.status);
        if (filters.search) params.set('search', filters.search);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        window.location.href = `/dashboard/payments/export?${params.toString()}`;
    }

    function copyOrderRef(ref: string) {
        navigator.clipboard?.writeText(ref);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    const selectedFee = selected ? Number(selected.total_amount || 0) - Number(selected.net_payout_amount || 0) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payments" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                {/* Sticky top header — same as Store/Edit */}
                <div className="sticky top-0 z-30 border-b border-[#E4E2DA] bg-[#F6F5F2]/95 backdrop-blur-md">
                    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                        <TabNav active="transactions" />
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title — same pattern as Store AnalyticsTab */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Payments</h1>
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">
                                    Live Sync
                                </span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">Your sales, payout account and verification — all in one place.</p>
                        </div>
                        <span className="flex w-fit items-center gap-1.5 text-xs text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Live tracking
                        </span>
                    </div>

                    {/* KPI cards — same as Store KpiCard */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <KpiCard
                            label="Total Earned"
                            value={formatCurrency(gross)}
                            sub={`Net ${formatCurrency(net)} after ${formatCurrency(fees)} fee`}
                            icon={<span className="text-sm font-bold">₹</span>}
                            tone="bg-[#EEF2FF] text-[#4F46E5]"
                        />
                        <KpiCard
                            label="Transactions"
                            value={transactions.total.toLocaleString('en-IN')}
                            sub={`${summary.orders} paid · UPI & Cards`}
                            icon={<ReceiptText className="size-3.5" />}
                            tone="bg-[#E1F6F3] text-[#0D9488]"
                        />
                        <KpiCard
                            label="Pending Payout"
                            value={formatCurrency(pendingTotal)}
                            sub="Scheduled · Tomorrow, 10:00 AM · HDFC ••4092"
                            icon={<Wallet className="size-3.5" />}
                            tone="bg-[#FFEDE8] text-[#FF6B4A]"
                        />
                    </div>

                    {/* Filters — card style like Store Section content */}
                    <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#F6F5F2] p-1">
                            {TYPE_TABS.map((tab) => {
                                const active = (filters.type ?? 'all') === tab.type;
                                return (
                                    <button
                                        key={tab.type}
                                        type="button"
                                        onClick={() => updateFilters({ type: tab.type === 'all' ? undefined : tab.type })}
                                        className={cn(
                                            'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                                            active ? 'bg-white text-[#4F46E5] shadow-sm' : 'text-[#8A8A96] hover:text-[#14141B]',
                                        )}
                                    >
                                        <span className={cn('size-2 rounded-full', tab.dot)} />
                                        {tab.label}
                                        {tab.type === 'all' && <span className="font-semibold">{transactions.total}</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                            <form onSubmit={submitSearch} className="relative max-w-sm flex-1">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A8A96]" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, phone, product…"
                                    className="w-full rounded-lg bg-[#F6F5F2] py-2 pr-3 pl-9 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20"
                                />
                            </form>
                            <div className="flex items-center gap-2">
                                <div ref={dateRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setDateOpen((o) => !o)}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition',
                                            activePreset !== 'all' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[#F6F5F2] text-[#4B4B57] hover:bg-[#ECEBE6]',
                                        )}
                                    >
                                        <CalendarDays className="size-4 text-[#8A8A96]" />
                                        {DATE_LABEL[activePreset] ?? 'Last 30 days'}
                                        {(filters.from || filters.to) && <span className="size-1.5 rounded-full bg-[#4F46E5]" />}
                                        <ChevronDown className={cn('size-3.5 transition-transform', dateOpen && 'rotate-180')} />
                                    </button>
                                    {dateOpen && (
                                        <div className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-xl border border-[#E4E2DA] bg-white p-1.5 shadow-lg">
                                            <p className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Date range</p>
                                            {DATE_PRESETS.map((p) => {
                                                const isActive = activePreset === p.key;
                                                return (
                                                    <button
                                                        key={p.key}
                                                        type="button"
                                                        onClick={() => {
                                                            const range = presetRange(p.key);
                                                            setDateOpen(false);
                                                            router.get(
                                                                '/dashboard/payments',
                                                                {
                                                                    status: filters.status ?? undefined,
                                                                    type: filters.type ?? undefined,
                                                                    search: filters.search ?? undefined,
                                                                    from: range.from,
                                                                    to: range.to,
                                                                },
                                                                { preserveState: true, replace: true },
                                                            );
                                                        }}
                                                        className={cn(
                                                            'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition',
                                                            isActive ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#4B4B57] hover:bg-[#F6F5F2]',
                                                        )}
                                                    >
                                                        {p.label}
                                                        {isActive && <Check className="size-4" />}
                                                    </button>
                                                );
                                            })}
                                            {(filters.from || filters.to) && (
                                                <p className="border-t border-[#E4E2DA]/60 px-2.5 py-1.5 text-[11px] text-[#8A8A96]">
                                                    {filters.from ?? '…'} → {filters.to ?? '…'}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Button variant="outline" onClick={exportCsv} className="border-[#E4E2DA]">
                                    <Download /> Export CSV
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Transactions table */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-[#14141B]">Transactions</h2>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">
                                    Showing {transactions.from ?? 0}–{transactions.to ?? 0} of {transactions.total} transactions
                                </p>
                            </div>
                            <span className="hidden items-center gap-1 rounded-full bg-[#E6F6EC] px-2.5 py-1 text-[11px] font-semibold text-[#059669] sm:flex">
                                <CheckCircle2 className="size-3.5" /> {summary.orders} successful
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-right">Amount</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E4E2DA]/50">
                                    {transactions.data.length === 0 && <TableEmptyState />}
                                    {transactions.data.map((tx) => (
                                        <tr key={tx.id} onClick={() => setSelected(tx)} className="group cursor-pointer transition hover:bg-[#F6F5F2]/60">
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <span className="block text-[13px] font-semibold text-[#14141B]">{formatDateTime(tx.created_at)}</span>
                                                <span className="text-xs text-[#8A8A96]">{channelLabel(tx)}</span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(tx.buyer_name))}>
                                                        {initials(tx.buyer_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="block truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">
                                                            {tx.buyer_name ?? 'Anonymous'}
                                                        </span>
                                                        <span className="block truncate text-xs text-[#8A8A96]">{tx.buyer_phone}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="max-w-xs px-4 py-3.5">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="max-w-[220px] truncate text-[13px] font-medium text-[#14141B]">{tx.product?.title ?? 'Deleted product'}</span>
                                                    {tx.product && (
                                                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', TYPE_BADGE[tx.product.type] ?? 'bg-[#F0EFEA] text-[#4B4B57]')}>
                                                            {TYPE_LABEL[tx.product.type] ?? tx.product.type}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right text-[15px] font-bold whitespace-nowrap text-[#14141B]">
                                                {formatCurrency(Number(tx.total_amount))}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <StatusPill status={tx.status} />
                                            </td>
                                            <td className="px-6 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                {tx.status === 'success' ? (
                                                    <button onClick={exportCsv} title="Download Invoice" className="rounded-lg p-1.5 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                                                        <Download className="size-[18px]" />
                                                    </button>
                                                ) : tx.status === 'pending' ? (
                                                    <button disabled title="Invoice pending settlement" className="cursor-not-allowed rounded-lg p-1.5 text-[#8A8A96]/40">
                                                        <Hourglass className="size-[18px]" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setSelected(tx)} title="View failure reason" className="rounded-lg p-1.5 text-[#C2410C] transition hover:bg-[#FFEDE8]">
                                                        <Info className="size-[18px]" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                            <p className="text-xs text-[#8A8A96]">
                                Page <span className="font-semibold text-[#14141B]">{transactions.current_page}</span> of{' '}
                                <span className="font-semibold text-[#14141B]">{transactions.last_page}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={transactions.current_page <= 1} onClick={() => goToPage(transactions.current_page - 1)} className="border-[#E4E2DA]">
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={transactions.current_page >= transactions.last_page} onClick={() => goToPage(transactions.current_page + 1)} className="border-[#E4E2DA]">
                                    Next <ArrowUpRight className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-[#8A8A96]">
                        <ShoppingBag className="size-3.5 text-[#4F46E5]" />
                        New sales appear here automatically after UPI / card settlement.
                    </p>
                </div>
            </div>

            {/* Drawer backdrop + panel */}
            <div
                onClick={() => setSelected(null)}
                className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300', selected ? 'opacity-100' : 'pointer-events-none opacity-0')}
            />
            <div
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[400px] flex-col justify-between overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out',
                    selected ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                {selected && (
                    <>
                        <div className="flex flex-col gap-4 p-6">
                            <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 pb-4">
                                <span className="text-base font-semibold text-[#14141B]">Transaction Details</span>
                                <button onClick={() => setSelected(null)} className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                                    <X className="size-5" />
                                </button>
                            </div>

                            <div
                                className={cn(
                                    'flex items-center justify-between rounded-xl p-3 text-[13px] font-semibold',
                                    selected.status === 'success' ? 'bg-[#E6F6EC] text-[#059669]' : selected.status === 'pending' ? 'bg-[#FFF4DB] text-[#B46E00]' : 'bg-[#FFEDE8] text-[#C2410C]',
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {selected.status === 'success' ? <CheckCircle2 className="size-[18px]" /> : selected.status === 'pending' ? <Hourglass className="size-[18px]" /> : <Info className="size-[18px]" />}
                                    {selected.status === 'success' ? 'Payment Successful' : selected.status === 'pending' ? 'Payment Pending' : selected.status === 'failed' ? 'Payment Failed' : 'Payment Refunded'}
                                </div>
                                <span className="text-xs font-normal text-[#8A8A96]">Live settled</span>
                            </div>

                            <div className="flex flex-col gap-2 rounded-xl bg-[#F6F5F2] p-4">
                                <div className="flex items-center justify-between text-[13px] text-[#6B6B78]">
                                    <span>Gross Order Value</span>
                                    <span className="font-semibold text-[#14141B]">{formatCurrency(Number(selected.total_amount))}</span>
                                </div>
                                <div className="flex items-center justify-between text-[13px] text-[#6B6B78]">
                                    <span>Platform Fee</span>
                                    <span className="text-[#C2410C]">- {formatCurrency(selectedFee)}</span>
                                </div>
                                <div className="-mx-4 -mb-4 flex items-center justify-between rounded-b-xl bg-white p-4 text-[15px] font-bold">
                                    <span className="text-[#14141B]">Net Payout</span>
                                    <span className="text-[#4F46E5]">{formatCurrency(Number(selected.net_payout_amount))}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Payment Metadata</span>
                                <MetaRow label="Order Ref" value={selected.order_number} copy={() => copyOrderRef(selected.order_number)} copied={copied} />
                                <MetaRow label="Payment ID" value={`pay_${String(selected.id).padStart(8, '0')}`} mono />
                                <MetaRow label="Channel" value={channelLabel(selected)} />
                                <MetaRow label="Product" value={selected.product?.title ?? 'Deleted product'} />
                                <MetaRow label="Timestamp" value={new Date(selected.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} />
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Customer Details</span>
                                <div className="flex flex-col gap-0.5 rounded-xl bg-[#F6F5F2] p-3">
                                    <span className="text-[13px] font-semibold text-[#14141B]">{selected.buyer_name ?? 'Anonymous'}</span>
                                    <span className="text-[13px] text-[#6B6B78]">{selected.buyer_email ?? '—'}</span>
                                    <span className="text-[13px] text-[#6B6B78]">{selected.buyer_phone}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 border-t border-[#E4E2DA] bg-white p-5">
                            <Button onClick={exportCsv} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                                <ReceiptText className="size-4" /> Download Tax Invoice
                            </Button>
                            <Button variant="outline" className="w-full border-[#E4E2DA]">
                                <Send className="size-4" /> Resend Access Link
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function StatusPill({ status }: { status: OrderStatus }) {
    if (status === 'success')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F6EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
                <span className="size-1.5 rounded-full bg-[#059669]" /> Paid
            </span>
        );
    if (status === 'pending')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4DB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B46E00]">
                <span className="size-1.5 animate-pulse rounded-full bg-amber-500" /> Pending
            </span>
        );
    if (status === 'failed')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEDE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#C2410C]">
                <span className="size-1.5 rounded-full bg-[#FF6B4A]" /> Failed
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F0EFEA] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B6B78]">
            <span className="size-1.5 rounded-full bg-current" /> Refunded
        </span>
    );
}

function MetaRow({ label, value, mono, copy, copied }: { label: string; value: string; mono?: boolean; copy?: () => void; copied?: boolean }) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-[#F6F5F2]/60 p-2.5">
            <span className="text-[13px] text-[#8A8A96]">{label}</span>
            <div className="flex items-center gap-1">
                <span className={cn('max-w-[200px] truncate text-[13px] font-semibold text-[#14141B]', mono && 'font-mono text-xs')}>{value}</span>
                {copy && (
                    <button onClick={copy} className="p-0.5 text-[#8A8A96] hover:text-[#14141B]">
                        <Copy className="size-3.5" />
                        {copied && <span className="sr-only">copied</span>}
                    </button>
                )}
            </div>
        </div>
    );
}

function TableEmptyState() {
    return (
        <tr>
            <td colSpan={6} className="px-6 py-8">
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                        <Inbox className="size-5" />
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[#14141B]">No payments found</p>
                    <p className="max-w-xs px-4 text-xs text-[#8A8A96]">Try a different search or filter. New sales will appear here automatically.</p>
                </div>
            </td>
        </tr>
    );
}