import { Button } from '@/components/ui/button';
import { MetaDot, MobileCard, MobileCardList } from '@/components/mobile-card-list';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, Hourglass, XCircle } from 'lucide-react';
import { useState } from 'react';
import { formatDate, fullDateTime, MethodIcon, methodSub, methodTitle, money, StatusPill, statusMeta } from './Index';

/* Ek settlement ka pura hisaab: kaunsi bookings thi, kis pe kitna commission kata. */

type MethodType = 'upi' | 'bank_transfer';

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

interface Settlement {
    id: number;
    uuid: string;
    number: string;
    orders_count: number;
    gross_amount: string | number;
    commission_amount: string | number;
    adjustment_amount: string | number;
    net_amount: string | number;
    period_start: string | null;
    period_end: string | null;
    status: string;
    reference_number: string | null;
    failure_reason: string | null;
    notes: string | null;
    created_at: string | null;
    processed_at: string | null;
    payout_method: PayoutMethod | null;
}

interface SettlementOrder {
    id: number;
    order_number: string;
    buyer_name: string | null;
    buyer_email: string | null;
    paid_at: string | null;
    total_amount: string | number;
    commission_rate: string | number;
    platform_fee: string | number;
    net_payout_amount: string | number;
    product: { id: number; title: string; type: string } | null;
}

interface Adjustment {
    uuid: string;
    label: string;
    amount: number;
    reason: string;
}

interface Props {
    settlement: Settlement;
    orders: SettlementOrder[];
    adjustments: Adjustment[];
}

const TYPE_LABEL: Record<string, string> = {
    course: 'Course',
    event: 'Event',
    book: 'Book',
    locked_content: 'Locked content',
    payment_page: 'Payment page',
    booking: 'Session',
};

function SummaryTile({ label, value, tone, hint }: { label: string; value: string; tone?: string; hint?: string }) {
    return (
        <div className="rounded-xl bg-cp-canvas p-4">
            <p className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">{label}</p>
            <p className={cn('mt-1 text-xl font-semibold tracking-tight text-cp-ink', tone)}>{value}</p>
            {hint && <p className="mt-0.5 text-xs text-cp-muted">{hint}</p>}
        </div>
    );
}

function MetaRow({ label, value, mono, copy, copied }: { label: string; value: string; mono?: boolean; copy?: () => void; copied?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-cp-canvas/60 p-2.5">
            <span className="text-[13px] text-cp-muted">{label}</span>
            <div className="flex items-center gap-1">
                <span className={cn('max-w-[220px] truncate text-[13px] font-semibold text-cp-ink', mono && 'font-mono text-xs')}>{value}</span>
                {copy && (
                    <button onClick={copy} className="p-0.5 text-cp-muted hover:text-cp-ink" title="Copy">
                        {copied ? <Check className="size-3.5 text-cp-success-ink" /> : <Copy className="size-3.5" />}
                    </button>
                )}
            </div>
        </div>
    );
}

export default function SettlementShow({ settlement, orders, adjustments }: Props) {
    const [copied, setCopied] = useState(false);
    const failed = settlement.status === 'failed';
    const paid = settlement.status === 'paid';

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settlements', href: '/dashboard/settlements' },
        { title: settlement.number, href: `/dashboard/settlements/${settlement.uuid}` },
    ];

    function copyRef(ref: string) {
        navigator.clipboard?.writeText(ref);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Settlement ${settlement.number}`} />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Header */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <Link href="/dashboard/settlements" className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-cp-muted transition hover:text-cp-ink">
                                <ArrowLeft className="size-3.5" /> Back to settlements
                            </Link>
                            <div className="flex items-center gap-2.5">
                                <h1 className="font-mono text-2xl font-bold tracking-tight text-cp-ink">{settlement.number}</h1>
                                <StatusPill status={settlement.status} />
                            </div>
                            <p className="text-sm text-cp-muted">
                                {settlement.orders_count} {settlement.orders_count === 1 ? 'booking' : 'bookings'} · {formatDate(settlement.period_start)} – {formatDate(settlement.period_end)}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <a
                                href={`/dashboard/settlements/${settlement.uuid}/statement`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cp-line bg-cp-surface px-3.5 text-sm font-medium text-cp-body transition hover:bg-cp-canvas"
                            >
                                Statement
                            </a>
                            <div className="rounded-xl bg-cp-surface p-4 text-right shadow-sm">
                                <p className="text-[11px] font-semibold tracking-wider text-cp-muted uppercase">{paid ? 'Paid to you' : 'Payable to you'}</p>
                                <p className="mt-0.5 text-3xl font-semibold tracking-tight text-cp-ink">{money(settlement.net_amount)}</p>
                            </div>
                        </div>
                    </div>

                    {failed && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-cp-coral-soft p-3.5 text-[13px] font-medium text-cp-coral-dark-ink">
                            <XCircle className="mt-0.5 size-[18px] shrink-0" />
                            <div>
                                This settlement failed{settlement.failure_reason ? ` — ${settlement.failure_reason}` : ''}. All of its bookings have been returned to the queue and will be
                                included in the next settlement automatically.
                            </div>
                        </div>
                    )}
                    {settlement.status === 'pending' && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-cp-warning-soft p-3.5 text-[13px] font-medium text-cp-warning-ink">
                            <Hourglass className="mt-0.5 size-[18px] shrink-0" />
                            <div>The amount has been calculated — the UTR reference will appear here once the bank transfer is complete.</div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        {/* Booking-wise breakdown */}
                        <div className="overflow-hidden rounded-xl bg-cp-surface shadow-sm">
                            <div className="border-b border-cp-line/70 px-6 py-4">
                                <h2 className="text-base font-semibold text-cp-ink">Bookings in this settlement</h2>
                                <p className="mt-0.5 text-xs text-cp-muted">Each row shows its own commission deduction.</p>
                            </div>
                            {/* phone: table ki jagah cards (same data + same actions) */}
                            {orders.length > 0 && (
                                <MobileCardList>
                                    {orders.map((order) => {
                                        return (
                                            <MobileCard
                                                key={order.id}
                                                title={order.product?.title ?? 'Deleted product'}
                                                subtitle={
                                                    <>
                                                        {order.buyer_name ?? '—'} · {formatDate(order.paid_at)}
                                                    </>
                                                }
                                                trailing={
                                                    <>
                                                        <span className="block text-sm font-bold whitespace-nowrap text-cp-ink">{money(order.net_payout_amount)}</span>
                                                        <span className="block text-[11px] whitespace-nowrap text-cp-muted">of {money(order.total_amount)}</span>
                                                    </>
                                                }
                                                meta={
                                                    <>
                                                        <span className="font-mono">{order.order_number}</span>
                                                        <MetaDot />
                                                        <span className="text-cp-coral-dark-ink">
                                                            − {money(order.platform_fee)} ({Number(order.commission_rate)}%)
                                                        </span>
                                                    </>
                                                }
                                            />
                                        );
                                    })}
                                </MobileCardList>
                            )}
                            {/* phone: table ke tfoot jaisa total */}
                            {orders.length > 0 ? (
                                <div className="flex items-center justify-between gap-3 border-t border-cp-line bg-cp-canvas/60 px-4 py-3 text-[13px] font-bold text-cp-ink md:hidden">
                                    <span>
                                        Total · {settlement.orders_count} {settlement.orders_count === 1 ? 'booking' : 'bookings'}
                                    </span>
                                    <span className="text-right">
                                        {money(settlement.net_amount)}
                                        <span className="block text-[11px] font-medium text-cp-coral-dark-ink">− {money(settlement.commission_amount)} fee</span>
                                    </span>
                                </div>
                            ) : (
                                <p className="px-4 py-8 text-center text-sm text-cp-muted md:hidden">The bookings from this settlement have been released (failed settlement).</p>
                            )}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-cp-canvas/60 text-[11px] font-semibold tracking-wider text-cp-muted uppercase">
                                            <th className="px-6 py-3">Booking</th>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3">Buyer</th>
                                            <th className="px-4 py-3 text-right">Gross</th>
                                            <th className="px-4 py-3 text-right">Commission</th>
                                            <th className="px-6 py-3 text-right">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cp-line/50">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="transition hover:bg-cp-canvas/60">
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className="block font-mono text-xs font-semibold text-cp-ink">{order.order_number}</span>
                                                    <span className="text-xs text-cp-muted">{formatDate(order.paid_at)}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="block max-w-[220px] truncate text-[13px] font-semibold text-cp-ink">{order.product?.title ?? 'Deleted product'}</span>
                                                    <span className="text-xs text-cp-muted">{TYPE_LABEL[order.product?.type ?? ''] ?? order.product?.type ?? '—'}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <span className="block max-w-[180px] truncate text-[13px] text-cp-ink">{order.buyer_name ?? '—'}</span>
                                                    <span className="block max-w-[180px] truncate text-xs text-cp-muted">{order.buyer_email ?? ''}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[13px] whitespace-nowrap text-cp-ink">{money(order.total_amount)}</td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <span className="block text-[13px] text-cp-coral-dark-ink">− {money(order.platform_fee)}</span>
                                                    <span className="text-xs text-cp-muted">{Number(order.commission_rate)}%</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-right text-[13px] font-bold whitespace-nowrap text-cp-ink">{money(order.net_payout_amount)}</td>
                                            </tr>
                                        ))}
                                        {orders.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-sm text-cp-muted">
                                                    The bookings from this settlement have been released (failed settlement).
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {orders.length > 0 && (
                                        <tfoot>
                                            <tr className="border-t border-cp-line bg-cp-canvas/60 text-[13px] font-bold text-cp-ink">
                                                <td className="px-6 py-3.5" colSpan={3}>
                                                    Total ({settlement.orders_count} {settlement.orders_count === 1 ? 'booking' : 'bookings'})
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">{money(settlement.gross_amount)}</td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap text-cp-coral-dark-ink">− {money(settlement.commission_amount)}</td>
                                                <td className="px-6 py-3.5 text-right whitespace-nowrap">{money(settlement.net_amount)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Side: summary + meta + destination */}
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-cp-ink">Summary</h3>
                                <div className="mt-4 flex flex-col gap-2.5">
                                    <SummaryTile
                                        label="Gross sales"
                                        value={money(settlement.gross_amount)}
                                        hint={`${settlement.orders_count} ${settlement.orders_count === 1 ? 'booking' : 'bookings'} total`}
                                    />
                                    <SummaryTile label="Platform commission" value={`− ${money(settlement.commission_amount)}`} tone="text-cp-coral-dark-ink" />
                                    {adjustments.map((a) => (
                                        <SummaryTile
                                            key={a.uuid}
                                            label={a.label}
                                            value={`${a.amount < 0 ? '−' : '+'} ${money(Math.abs(a.amount))}`}
                                            hint={a.reason}
                                            tone={a.amount < 0 ? 'text-cp-coral-dark-ink' : 'text-cp-success-ink'}
                                        />
                                    ))}
                                    <SummaryTile label="Net settled" value={money(settlement.net_amount)} tone="text-cp-success-ink" />
                                </div>
                            </div>

                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-cp-ink">Settlement details</h3>
                                <div className="mt-4 flex flex-col gap-2">
                                    <MetaRow label="Settlement ID" value={settlement.number} mono />
                                    <MetaRow label="Status" value={statusMeta(settlement.status).label} />
                                    <MetaRow
                                        label="Bank UTR"
                                        value={settlement.reference_number ?? 'Added once transferred'}
                                        mono={Boolean(settlement.reference_number)}
                                        copy={settlement.reference_number ? () => copyRef(settlement.reference_number as string) : undefined}
                                        copied={copied}
                                    />
                                    <MetaRow label="Created" value={fullDateTime(settlement.created_at)} />
                                    {settlement.processed_at && <MetaRow label="Processed" value={fullDateTime(settlement.processed_at)} />}
                                    {settlement.notes && <MetaRow label="Note" value={settlement.notes} />}
                                </div>
                            </div>

                            <div className="rounded-xl bg-cp-surface p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-cp-ink">Sent to</h3>
                                <div className="mt-4 flex items-center gap-3 rounded-xl bg-cp-canvas p-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cp-surface text-cp-brand-ink">
                                        <MethodIcon type={settlement.payout_method?.type} className="size-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold text-cp-ink">{methodTitle(settlement.payout_method)}</span>
                                        <span className="block truncate text-xs text-cp-subtle">{methodSub(settlement.payout_method)}</span>
                                    </div>
                                </div>
                            </div>

                            <Button variant="outline" asChild className="w-full border-cp-line">
                                <Link href="/dashboard/settlements">Back to settlements</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
