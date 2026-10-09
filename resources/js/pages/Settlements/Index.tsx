import { Button } from '@/components/ui/button';
import { MetaDot, MobileCard, MobileCardList } from '@/components/mobile-card-list';
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
    verified_at: string | null;
}

interface SettlementRow {
    id: number;
    uuid: string;
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
    adjustments: number;
    blocked_reason: 'kyc' | 'payout_method' | 'payout_unverified' | null;
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
    pending: { label: 'Awaiting transfer', chip: 'bg-cp-warning-soft text-cp-warning-ink', dot: 'bg-amber-500 animate-pulse' },
    processing: { label: 'Processing', chip: 'bg-cp-sky-soft text-cp-sky-ink', dot: 'bg-sky-500 animate-pulse' },
    paid: { label: 'Paid', chip: 'bg-cp-success-soft text-cp-success-ink', dot: 'bg-cp-success' },
    failed: { label: 'Failed', chip: 'bg-cp-coral-soft text-cp-coral-dark-ink', dot: 'bg-cp-coral' },
};

export function statusMeta(status: string) {
    return STATUS_META[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), chip: 'bg-cp-surface-3 text-cp-subtle', dot: 'bg-current' };
}

const KYC_BANNER: Record<Exclude<KycStatus, 'verified'>, { title: string; body: string; cta: string; tone: string; icon: React.ReactNode }> = {
    not_started: {
        title: 'Complete KYC to receive your settlements',
        body: 'Verify your PAN and bank details once. Until then, your earnings are held safely.',
        cta: 'Start KYC verification',
        tone: 'bg-cp-warning-soft text-cp-warning-ink',
        icon: <ShieldCheck className="size-5" />,
    },
    pending: {
        title: 'KYC is under review',
        body: 'Your next settlement will be created automatically once verification is approved.',
        cta: 'View KYC status',
        tone: 'bg-cp-warning-soft text-cp-warning-ink',
        icon: <Clock className="size-5" />,
    },
    rejected: {
        title: 'KYC needs your attention',
        body: 'Your verification was not approved. Please correct your details and resubmit.',
        cta: 'Fix KYC details',
        tone: 'bg-cp-coral-soft text-cp-coral-dark-ink',
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
        <div className="flex flex-col justify-between rounded-xl bg-cp-surface p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-xl font-semibold tracking-tight text-cp-ink sm:text-2xl">{value}</span>
            <span className="mt-1 text-xs text-cp-muted">{sub}</span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function SettlementsIndex({ balance, settlements, methods, kycStatus, nextRunAt }: SettlementsIndexProps) {
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
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Settlements</h1>
                                <span className="rounded-full bg-cp-success-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cp-success-ink uppercase">Automatic</span>
                            </div>
                            <p className="text-sm text-cp-muted">
                                Your sales are automatically batched and sent to your bank — no need to request a payout.
                            </p>
                        </div>
                        <a
                            href="/dashboard/settlements/export"
                            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-cp-line bg-cp-surface px-3.5 text-sm font-medium text-cp-body transition hover:bg-cp-canvas"
                        >
                            Export CSV
                        </a>
                    </div>

                    {balance.adjustments !== 0 && (
                        <div className="rounded-xl bg-cp-surface p-4 text-sm text-cp-body shadow-sm">
                            <span className="font-semibold text-cp-ink">
                                {money(Math.abs(balance.adjustments))} will be {balance.adjustments < 0 ? 'deducted from' : 'added to'} your next settlement.
                            </span>{' '}
                            The reason is shown on that settlement once it is created.
                        </div>
                    )}

                    {/* Auto-settlement explainer */}
                    <div className="flex flex-col justify-between gap-3 rounded-xl bg-cp-surface p-4 shadow-sm sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cp-brand-soft text-cp-brand-ink">
                                <RefreshCw className="size-5" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-cp-ink">Payments are settled automatically</p>
                                <p className="mt-0.5 text-xs text-cp-muted">
                                    All ready bookings are grouped into a single settlement and sent to your payout method.
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 rounded-lg bg-cp-canvas px-3 py-2 text-center">
                            <p className="text-[10px] font-semibold tracking-wider text-cp-muted uppercase">Next run</p>
                            <p className="mt-0.5 text-[13px] font-semibold text-cp-ink">{fullDateTime(nextRunAt)}</p>
                        </div>
                    </div>

                    {/* Blockers — paisa rukka hua hai, kho nahi raha */}
                    {kycBanner && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-cp-surface p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', kycBanner.tone)}>{kycBanner.icon}</span>
                                <div>
                                    <p className="text-sm font-semibold text-cp-ink">{kycBanner.title}</p>
                                    <p className="mt-0.5 text-xs text-cp-muted">
                                        {kycBanner.body}
                                        {blockedAmount > 0 && <> <span className="font-semibold text-cp-warning-ink">{money(blockedAmount)} is on hold.</span></>}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account/kyc"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-cp-brand px-4 text-sm font-medium text-white transition hover:bg-cp-brand-hover"
                            >
                                {kycBanner.cta}
                            </Link>
                        </div>
                    )}
                    {kycVerified && !hasMethods && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-cp-surface p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cp-teal-soft text-cp-teal-ink">
                                    <Wallet className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-cp-ink">Add a payout method</p>
                                    <p className="mt-0.5 text-xs text-cp-muted">
                                        Tell us where to send your money — a UPI ID or bank account.
                                        {blockedAmount > 0 && <> <span className="font-semibold text-cp-warning-ink">{money(blockedAmount)} is on hold.</span></>}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-cp-brand px-4 text-sm font-medium text-white transition hover:bg-cp-brand-hover"
                            >
                                Add payout method
                            </Link>
                        </div>
                    )}
                    {kycVerified && balance.blocked_reason === 'payout_unverified' && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-cp-surface p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-cp-warning-soft text-cp-warning-ink">
                                    <Clock className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-cp-ink">Payout method under verification</p>
                                    <p className="mt-0.5 text-xs text-cp-muted">
                                        We're verifying {defaultMethod ? methodTitle(defaultMethod) : 'your payout method'}. Settlements will resume automatically once it's verified.
                                        {blockedAmount > 0 && <> <span className="font-semibold text-cp-warning-ink">{money(blockedAmount)} is on hold.</span></>}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-cp-line bg-cp-surface px-4 text-sm font-medium text-cp-ink transition hover:bg-cp-canvas"
                            >
                                View payout methods
                            </Link>
                        </div>
                    )}

                    {/* KPI cards */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                        <KpiCard
                            label="Clearing"
                            value={money(balance.clearing + (balance.blocked_reason ? balance.ready : 0))}
                            sub={balance.blocked_reason ? 'Settlement on hold — see above' : 'Included in the next settlement'}
                            icon={<Hourglass className="size-3.5" />}
                            tone="bg-cp-warning-soft text-cp-warning-ink"
                        />
                        <KpiCard label="In transit" value={money(balance.in_transit)} sub="Settlement created, transfer pending" icon={<Banknote className="size-3.5" />} tone="bg-cp-sky-soft text-cp-sky-ink" />
                        <KpiCard label="Settled" value={money(balance.settled)} sub="Credited to your account" icon={<BadgeCheck className="size-3.5" />} tone="bg-cp-success-soft text-cp-success-ink" />
                        <KpiCard label="Lifetime earned" value={money(balance.lifetime_earned)} sub="After platform fees" icon={<TrendingUp className="size-3.5" />} tone="bg-cp-teal-soft text-cp-teal-ink" />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        {/* Settlement history */}
                        <div className="overflow-hidden rounded-xl bg-cp-surface shadow-sm">
                            <div className="flex items-center justify-between border-b border-cp-line/70 px-6 py-4">
                                <div>
                                    <h2 className="text-base font-semibold text-cp-ink">Settlement history</h2>
                                    <p className="mt-0.5 text-xs text-cp-muted">
                                        {settlements.total > 0
                                            ? `Showing ${settlements.from ?? 0}–${settlements.to ?? 0} of ${settlements.total} settlements`
                                            : 'Your first settlement will appear here once it is created'}
                                    </p>
                                </div>
                            </div>
                            {/* phone: table ki jagah cards (same data + same actions) */}
                            {settlements.data.length === 0 && (
                                <div className="p-4 md:hidden">
                                    <EmptyBox />
                                </div>
                            )}
                            {settlements.data.length > 0 && (
                                <MobileCardList>
                                    {settlements.data.map((row) => {
                                        return (
                                            <MobileCard
                                                key={row.id}
                                                href={`/dashboard/settlements/${row.uuid}`}
                                                title={formatDate(row.created_at)}
                                                subtitle={
                                                    <>
                                                        {row.orders_count} {row.orders_count === 1 ? 'booking' : 'bookings'} · {formatDate(row.period_start)} – {formatDate(row.period_end)}
                                                    </>
                                                }
                                                trailing={
                                                    <>
                                                        <span className="block text-[15px] font-bold whitespace-nowrap text-cp-ink">{money(row.net_amount)}</span>
                                                        <span className="block text-[11px] whitespace-nowrap text-cp-coral-dark-ink">− {money(row.commission_amount)} fee</span>
                                                    </>
                                                }
                                                meta={
                                                    <>
                                                        <StatusPill status={row.status} />
                                                        <span className="font-mono">{row.number}</span>
                                                        {row.reference_number && (
                                                            <>
                                                                <MetaDot />
                                                                <span className="max-w-32 truncate font-mono">UTR {row.reference_number}</span>
                                                            </>
                                                        )}
                                                    </>
                                                }
                                            />
                                        );
                                    })}
                                </MobileCardList>
                            )}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-cp-canvas/60 text-[11px] font-semibold tracking-wider text-cp-muted uppercase">
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
                                    <tbody className="divide-y divide-cp-line/50">
                                        {settlements.data.length === 0 && <TableEmptyState />}
                                        {settlements.data.map((row) => (
                                            <tr
                                                key={row.id}
                                                onClick={() => router.visit(`/dashboard/settlements/${row.uuid}`)}
                                                className="group cursor-pointer transition hover:bg-cp-canvas/60"
                                            >
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className="block text-[13px] font-semibold text-cp-ink group-hover:text-cp-brand-ink">{formatDate(row.created_at)}</span>
                                                    <span className="font-mono text-xs text-cp-muted">{row.number}</span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className="text-[13px] font-semibold text-cp-ink">
                                                        {row.orders_count} {row.orders_count === 1 ? 'booking' : 'bookings'}
                                                    </span>
                                                    <span className="block text-xs text-cp-muted">
                                                        {formatDate(row.period_start)} – {formatDate(row.period_end)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[13px] whitespace-nowrap text-cp-ink">{money(row.gross_amount)}</td>
                                                <td className="px-4 py-3.5 text-right text-[13px] whitespace-nowrap text-cp-coral-dark-ink">− {money(row.commission_amount)}</td>
                                                <td className="px-4 py-3.5 text-right text-[15px] font-bold whitespace-nowrap text-cp-ink">{money(row.net_amount)}</td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <StatusPill status={row.status} />
                                                </td>
                                                <td className="max-w-32.5 truncate px-4 py-3.5 font-mono text-xs text-cp-subtle" title={row.reference_number ?? undefined}>
                                                    {row.reference_number ?? '—'}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <ChevronRight className="ml-auto size-4 text-cp-muted transition group-hover:translate-x-0.5 group-hover:text-cp-ink" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {settlements.total > 0 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t border-cp-line/60 p-4 sm:flex-row">
                                    <p className="text-xs text-cp-muted">
                                        Page <span className="font-semibold text-cp-ink">{settlements.current_page}</span> of{' '}
                                        <span className="font-semibold text-cp-ink">{settlements.last_page}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" disabled={settlements.current_page <= 1} onClick={() => goToPage(settlements.current_page - 1)} className="border-cp-line">
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={settlements.current_page >= settlements.last_page}
                                            onClick={() => goToPage(settlements.current_page + 1)}
                                            className="border-cp-line"
                                        >
                                            Next <ArrowUpRight className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Side cards */}
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-cp-ink">Payout destination</h3>
                                    <Link href="/dashboard/payments/account" className="text-xs font-semibold text-cp-brand-ink hover:underline">
                                        {hasMethods ? 'Manage' : 'Add'}
                                    </Link>
                                </div>
                                {hasMethods ? (
                                    <div className="mt-4 flex flex-col gap-2">
                                        {methods.map((m) => (
                                            <div key={m.id} className="flex items-center gap-3 rounded-lg bg-cp-canvas p-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cp-surface text-cp-brand-ink">
                                                    <MethodIcon type={m.type} className="size-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-cp-ink">{methodTitle(m)}</span>
                                                    <span className="block truncate text-xs text-cp-muted">{methodSub(m)}</span>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                    {m.id === defaultMethod?.id && <span className="rounded-full bg-cp-success-soft px-2 py-0.5 text-[10px] font-semibold text-cp-success-ink">Default</span>}
                                                    {!m.verified_at && <span className="rounded-full bg-cp-warning-soft px-2 py-0.5 text-[10px] font-semibold text-cp-warning-ink">Unverified</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-cp-muted">No payout method yet. Add a UPI ID or bank account.</p>
                                )}
                            </div>

                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-cp-ink">How settlements work</h3>
                                <ul className="mt-4 flex flex-col gap-3.5">
                                    {[
                                        { icon: <Hourglass className="size-4" />, tone: 'bg-cp-warning-soft text-cp-warning-ink', text: 'Each payment is held for a short period as a buffer for refunds.' },
                                        { icon: <RefreshCw className="size-4" />, tone: 'bg-cp-brand-soft text-cp-brand-ink', text: 'A daily cycle groups all bookings ready at that time into one settlement.' },
                                        { icon: <ShieldCheck className="size-4" />, tone: 'bg-cp-accent-soft text-cp-accent-ink', text: 'A verified KYC and a verified payout method are required — until then, your money stays safely on hold, never lost.' },
                                        { icon: <Banknote className="size-4" />, tone: 'bg-cp-teal-soft text-cp-teal-ink', text: 'Click any settlement to see all its bookings and commission.' },
                                    ].map((item) => (
                                        <li key={item.text} className="flex items-start gap-3">
                                            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', item.tone)}>{item.icon}</span>
                                            <span className="text-xs leading-relaxed text-cp-subtle">{item.text}</span>
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

function TableEmptyState() {
    return (
        <tr>
            <td colSpan={8} className="px-6 py-8">
                <EmptyBox />
            </td>
        </tr>
    );
}

/** table (desktop) aur cards (phone) dono ka "abhi kuch nahi" */
function EmptyBox() {
    return (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cp-line bg-cp-surface-2 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-cp-surface-3 text-cp-muted">
                <Inbox className="size-5" />
            </span>
            <p className="mt-1 text-sm font-semibold text-cp-ink">No settlements yet</p>
            <p className="max-w-sm px-4 text-xs text-cp-muted">
                Your first settlement will be created automatically.
            </p>
        </div>
    );
}
