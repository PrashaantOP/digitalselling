import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowUpRight,
    BadgeCheck,
    Banknote,
    ChevronRight,
    Clock,
    Hourglass,
    Inbox,
    Info,
    Landmark,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    TrendingUp,
    Wallet,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Settlements', href: '/dashboard/settlements' }];

type MethodType = 'upi' | 'bank_transfer';
type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

interface PayoutMethod {
    id: number;
    type: MethodType;
    upi_id: string | null;
    account_holder_name: string | null;
    account_number: string | null;
    ifsc: string | null;
    is_default: boolean;
}

interface SettlementRow {
    id: number;
    number: string;
    orders_count: number;
    gross_amount: string | number;
    commission_amount: string | number;
    net_amount: string | number;
    period_start: string | null;
    period_end: string | null;
    status: string;
    reference_number: string | null;
    created_at: string | null;
    processed_at: string | null;
    payout_method: PayoutMethod | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface SettlementBalance {
    lifetime_earned: number;
    settled: number;
    in_transit: number;
    clearing: number;
    ready: number;
    blocked_reason: 'kyc' | 'payout_method' | null;
}

interface SettlementsIndexProps {
    balance: SettlementBalance;
    settlements: Paginated<SettlementRow>;
    methods: PayoutMethod[];
    kycStatus: KycStatus;
    holdDays: number;
    nextRunAt: string;
}

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
    pending: { label: 'Awaiting transfer', chip: 'bg-[#FFF4DB] text-[#B46E00]', dot: 'bg-amber-500 animate-pulse' },
    processing: { label: 'Processing', chip: 'bg-[#E6F2FF] text-[#0284C7]', dot: 'bg-sky-500 animate-pulse' },
    paid: { label: 'Paid', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
    failed: { label: 'Failed', chip: 'bg-[#FFEDE8] text-[#C2410C]', dot: 'bg-[#FF6B4A]' },
};

export function statusMeta(status: string) {
    return STATUS_META[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' };
}

const KYC_BANNER: Record<Exclude<KycStatus, 'verified'>, { title: string; body: string; cta: string; tone: string; icon: React.ReactNode }> = {
    not_started: {
        title: 'Complete KYC to receive your settlements',
        body: 'Verify your PAN and bank details once. Tab tak aapki earnings safe jama hoti rahengi.',
        cta: 'Start KYC verification',
        tone: 'bg-[#FFF4DB] text-[#B46E00]',
        icon: <ShieldCheck className="size-5" />,
    },
    pending: {
        title: 'KYC is under review',
        body: 'Verification approve hote hi agla settlement apne aap ban jayega.',
        cta: 'View KYC status',
        tone: 'bg-[#FFF4DB] text-[#B46E00]',
        icon: <Clock className="size-5" />,
    },
    rejected: {
        title: 'KYC needs your attention',
        body: 'Verification approve nahi hui — details theek karke dobara submit karein.',
        cta: 'Fix KYC details',
        tone: 'bg-[#FFEDE8] text-[#C2410C]',
        icon: <Info className="size-5" />,
    },
};

/* ------------------------------------------------------------------ */
/*  HELPERS (Payouts page se — paise ke liye decimals chahiye)         */
/* ------------------------------------------------------------------ */

export function money(amount: number | string): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount) || 0);
}

export function formatDate(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function fullDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function maskAccount(no: string | null) {
    return no ? `•••• ${no.slice(-4)}` : '••••';
}

export function methodTitle(m: PayoutMethod | null) {
    if (!m) return 'Method removed';
    return m.type === 'upi' ? (m.upi_id ?? 'UPI') : `Bank ${maskAccount(m.account_number)}`;
}

export function methodSub(m: PayoutMethod | null) {
    if (!m) return '—';
    return m.type === 'upi' ? 'UPI' : [m.account_holder_name, m.ifsc].filter(Boolean).join(' · ') || 'Bank transfer';
}

export function MethodIcon({ type, className }: { type?: MethodType; className?: string }) {
    const Icon = type === 'bank_transfer' ? Landmark : type === 'upi' ? Smartphone : Wallet;
    return <Icon className={className ?? 'size-4'} />;
}

export function StatusPill({ status }: { status: string }) {
    const meta = statusMeta(status);
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
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

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function SettlementsIndex({ balance, settlements, methods, kycStatus, holdDays, nextRunAt }: SettlementsIndexProps) {
    const kycVerified = kycStatus === 'verified';
    const hasMethods = methods.length > 0;
    const kycBanner = kycVerified ? null : (KYC_BANNER[kycStatus] ?? KYC_BANNER.not_started);
    const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];
    const blockedAmount = balance.blocked_reason ? balance.ready : 0;

    function goToPage(page: number) {
        router.get('/dashboard/settlements', { page }, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Settlements" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Settlements</h1>
                                <span className="rounded-full bg-[#E6F6EC] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#059669] uppercase">Automatic</span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">
                                Aapki sales apne aap batch hokar bank me aati hain — kuch request nahi karna padta.
                            </p>
                        </div>
                    </div>

                    {/* Auto-settlement explainer */}
                    <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                                <RefreshCw className="size-5" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-[#14141B]">Har payment {holdDays} din baad settle hota hai</p>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">
                                    Us din tak ki saari bookings ek hi settlement me aati hain — chahe woh ek din ki hon ya kai din ki.
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 rounded-lg bg-[#F6F5F2] px-3 py-2 text-center">
                            <p className="text-[10px] font-semibold tracking-wider text-[#8A8A96] uppercase">Next run</p>
                            <p className="mt-0.5 text-[13px] font-semibold text-[#14141B]">{fullDateTime(nextRunAt)}</p>
                        </div>
                    </div>

                    {/* Blockers — paisa rukka hua hai, kho nahi raha */}
                    {kycBanner && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', kycBanner.tone)}>{kycBanner.icon}</span>
                                <div>
                                    <p className="text-sm font-semibold text-[#14141B]">{kycBanner.title}</p>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">
                                        {kycBanner.body}
                                        {blockedAmount > 0 && <> <span className="font-semibold text-[#B46E00]">{money(blockedAmount)} ruka hua hai.</span></>}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account/kyc"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white transition hover:bg-[#4338CA]"
                            >
                                {kycBanner.cta}
                            </Link>
                        </div>
                    )}
                    {kycVerified && !hasMethods && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E1F6F3] text-[#0D9488]">
                                    <Wallet className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-[#14141B]">Add a payout method</p>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">
                                        Batao paisa kahan bhejna hai — UPI ID ya bank account.
                                        {blockedAmount > 0 && <> <span className="font-semibold text-[#B46E00]">{money(blockedAmount)} ruka hua hai.</span></>}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white transition hover:bg-[#4338CA]"
                            >
                                Add payout method
                            </Link>
                        </div>
                    )}

                    {/* KPI cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label="Clearing"
                            value={money(balance.clearing + (balance.blocked_reason ? balance.ready : 0))}
                            sub={balance.blocked_reason ? 'Settlement ruka hai — upar dekhein' : `Agle settlement me aayega`}
                            icon={<Hourglass className="size-3.5" />}
                            tone="bg-[#FFF4DB] text-[#B46E00]"
                        />
                        <KpiCard label="In transit" value={money(balance.in_transit)} sub="Settlement bana, transfer baaki" icon={<Banknote className="size-3.5" />} tone="bg-[#E6F2FF] text-[#0284C7]" />
                        <KpiCard label="Settled" value={money(balance.settled)} sub="Aapke account me pahuncha" icon={<BadgeCheck className="size-3.5" />} tone="bg-[#E6F6EC] text-[#059669]" />
                        <KpiCard label="Lifetime earned" value={money(balance.lifetime_earned)} sub="Platform fees ke baad" icon={<TrendingUp className="size-3.5" />} tone="bg-[#E1F6F3] text-[#0D9488]" />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        {/* Settlement history */}
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                                <div>
                                    <h2 className="text-base font-semibold text-[#14141B]">Settlement history</h2>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">
                                        {settlements.total > 0
                                            ? `Showing ${settlements.from ?? 0}–${settlements.to ?? 0} of ${settlements.total} settlements`
                                            : 'Pehla settlement bante hi yahan dikhega'}
                                    </p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                            <th className="px-6 py-3">Settlement</th>
                                            <th className="px-4 py-3">Bookings</th>
                                            <th className="px-4 py-3 text-right">Gross</th>
                                            <th className="px-4 py-3 text-right">Commission</th>
                                            <th className="px-4 py-3 text-right">Net paid</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3">UTR</th>
                                            <th className="px-6 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E2DA]/50">
                                        {settlements.data.length === 0 && <TableEmptyState holdDays={holdDays} />}
                                        {settlements.data.map((row) => (
                                            <tr
                                                key={row.id}
                                                onClick={() => router.visit(`/dashboard/settlements/${row.number}`)}
                                                className="group cursor-pointer transition hover:bg-[#F6F5F2]/60"
                                            >
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className="block text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{formatDate(row.created_at)}</span>
                                                    <span className="font-mono text-xs text-[#8A8A96]">{row.number}</span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="text-[13px] font-semibold text-[#14141B]">
                                                        {row.orders_count} {row.orders_count === 1 ? 'booking' : 'bookings'}
                                                    </span>
                                                    <span className="block text-xs text-[#8A8A96]">
                                                        {formatDate(row.period_start)} – {formatDate(row.period_end)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[13px] whitespace-nowrap text-[#14141B]">{money(row.gross_amount)}</td>
                                                <td className="px-4 py-3.5 text-right text-[13px] whitespace-nowrap text-[#C2410C]">− {money(row.commission_amount)}</td>
                                                <td className="px-4 py-3.5 text-right text-[15px] font-bold whitespace-nowrap text-[#14141B]">{money(row.net_amount)}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <StatusPill status={row.status} />
                                                </td>
                                                <td className="max-w-32.5 truncate px-4 py-3.5 font-mono text-xs text-[#6B6B78]" title={row.reference_number ?? undefined}>
                                                    {row.reference_number ?? '—'}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <ChevronRight className="ml-auto size-4 text-[#8A8A96] transition group-hover:translate-x-0.5 group-hover:text-[#14141B]" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {settlements.total > 0 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                                    <p className="text-xs text-[#8A8A96]">
                                        Page <span className="font-semibold text-[#14141B]">{settlements.current_page}</span> of{' '}
                                        <span className="font-semibold text-[#14141B]">{settlements.last_page}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" disabled={settlements.current_page <= 1} onClick={() => goToPage(settlements.current_page - 1)} className="border-[#E4E2DA]">
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={settlements.current_page >= settlements.last_page}
                                            onClick={() => goToPage(settlements.current_page + 1)}
                                            className="border-[#E4E2DA]"
                                        >
                                            Next <ArrowUpRight className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Side cards */}
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[#14141B]">Payout destination</h3>
                                    <Link href="/dashboard/payments/account" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                                        {hasMethods ? 'Manage' : 'Add'}
                                    </Link>
                                </div>
                                {hasMethods ? (
                                    <div className="mt-4 flex flex-col gap-2">
                                        {methods.map((m) => (
                                            <div key={m.id} className="flex items-center gap-3 rounded-lg bg-[#F6F5F2] p-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#4F46E5]">
                                                    <MethodIcon type={m.type} className="size-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-[#14141B]">{methodTitle(m)}</span>
                                                    <span className="block truncate text-xs text-[#8A8A96]">{methodSub(m)}</span>
                                                </div>
                                                {m.id === defaultMethod?.id && <span className="rounded-full bg-[#E6F6EC] px-2 py-0.5 text-[10px] font-semibold text-[#059669]">Default</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-[#8A8A96]">Abhi koi payout method nahi. UPI ya bank account add karein.</p>
                                )}
                            </div>

                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-[#14141B]">Settlement kaise chalta hai</h3>
                                <ul className="mt-4 flex flex-col gap-3.5">
                                    {[
                                        { icon: <Hourglass className="size-4" />, tone: 'bg-[#FFF4DB] text-[#B46E00]', text: `Har payment ${holdDays} din hold hota hai — refund ke liye buffer.` },
                                        { icon: <RefreshCw className="size-4" />, tone: 'bg-[#EEF2FF] text-[#4F46E5]', text: 'Roz ek cycle chalti hai jo us waqt ki saari ready bookings ek settlement me daal deti hai.' },
                                        { icon: <ShieldCheck className="size-4" />, tone: 'bg-[#F1EAFE] text-[#7C3AED]', text: 'KYC verified aur payout method zaroori hai — nahi to paisa jama hota rehta hai, kho nahi jaata.' },
                                        { icon: <Banknote className="size-4" />, tone: 'bg-[#E1F6F3] text-[#0D9488]', text: 'Kisi bhi settlement pe click karke uski saari bookings aur commission dekh sakte hain.' },
                                    ].map((item) => (
                                        <li key={item.text} className="flex items-start gap-3">
                                            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', item.tone)}>{item.icon}</span>
                                            <span className="text-xs leading-relaxed text-[#6B6B78]">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function TableEmptyState({ holdDays }: { holdDays: number }) {
    return (
        <tr>
            <td colSpan={8} className="px-6 py-8">
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                        <Inbox className="size-5" />
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[#14141B]">Abhi koi settlement nahi</p>
                    <p className="max-w-sm px-4 text-xs text-[#8A8A96]">
                        Pehli sale ke {holdDays} din baad aapka pehla settlement apne aap ban jayega — yahan uski saari bookings ka hisaab milega.
                    </p>
                </div>
            </td>
        </tr>
    );
}
