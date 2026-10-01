import { Badge, BUTTON, Card, ConfirmAction, dateTime, Field, money, PageHeader, TD, TH } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { SettlementRow } from './Index';

interface Props {
    settlement: SettlementRow & {
        gross_amount: number;
        commission_amount: number;
        adjustment_amount: number;
        period_start: string | null;
        period_end: string | null;
        failure_reason: string | null;
        notes: string | null;
        processed_at: string | null;
        payout_holder: string | null;
    };
    adjustments: { uuid: string; type: string; amount: number; reason: string }[];
    orders: { uuid: string; order_number: string; product: string | null; buyer: string | null; paid_at: string | null; total_amount: number; platform_fee: number; net: number }[];
}

export default function AdminSettlementShow({ settlement: s, orders, adjustments }: Props) {
    const [action, setAction] = useState<'paid' | 'failed' | null>(null);
    const open = s.status === 'pending' || s.status === 'processing';

    return (
        <AdminLayout title={s.number}>
            <Link href="/admin/settlements" className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-3.5" /> All settlements
            </Link>
            <PageHeader
                title={`${s.number} · ${money(s.net_amount)}`}
                description={s.creator ? `${s.creator.name} · ${s.creator.email}` : undefined}
                action={
                    open && (
                        <div className="flex gap-2">
                            <button onClick={() => setAction('failed')} className={BUTTON.ghost}>
                                Mark failed
                            </button>
                            <button onClick={() => setAction('paid')} className={BUTTON.primary}>
                                Mark paid
                            </button>
                        </div>
                    )
                }
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title="Transfer">
                    <dl className="divide-y divide-slate-100 px-5">
                        <Field label="Status">
                            <Badge value={s.status} />
                        </Field>
                        <Field label="Amount to transfer">
                            <span className="text-base font-bold">{money(s.net_amount)}</span>
                        </Field>
                        <Field label="Pay to">
                            <span className="font-mono text-xs">{s.payout?.destination ?? '—'}</span>
                        </Field>
                        {s.payout_holder && <Field label="Account holder">{s.payout_holder}</Field>}
                        {s.reference_number && (
                            <Field label="UTR">
                                <span className="font-mono">{s.reference_number}</span>
                            </Field>
                        )}
                        {s.processed_at && <Field label="Processed">{dateTime(s.processed_at)}</Field>}
                        {s.failure_reason && <Field label="Failure reason">{s.failure_reason}</Field>}
                        {s.notes && <Field label="Notes">{s.notes}</Field>}
                    </dl>
                </Card>
                <Card title="Breakdown">
                    <dl className="divide-y divide-slate-100 px-5">
                        <Field label="Orders">{s.orders_count}</Field>
                        <Field label="Gross">{money(s.gross_amount)}</Field>
                        <Field label="Platform commission">− {money(s.commission_amount)}</Field>
                        {adjustments.map((a) => (
                            <Field key={a.uuid} label={`Adjustment · ${a.reason}`}>
                                {a.amount < 0 ? '− ' : '+ '}
                                {money(Math.abs(a.amount))}
                            </Field>
                        ))}
                        <Field label="Net">{money(s.net_amount)}</Field>
                        <Field label="Period">
                            {dateTime(s.period_start)} → {dateTime(s.period_end)}
                        </Field>
                        <Field label="Created">{dateTime(s.created_at)}</Field>
                    </dl>
                </Card>
            </div>

            <Card title="Orders in this settlement">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Order</th>
                                <th className={TH}>Product</th>
                                <th className={TH}>Buyer</th>
                                <th className={`${TH} text-right`}>Gross</th>
                                <th className={`${TH} text-right`}>Fee</th>
                                <th className={`${TH} text-right`}>Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((o) => (
                                <tr key={o.uuid} onClick={() => router.visit(`/admin/orders/${o.uuid}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className={TD}>
                                        <p className="font-mono text-xs">{o.order_number}</p>
                                        <p className="text-xs text-slate-500">{dateTime(o.paid_at)}</p>
                                    </td>
                                    <td className={TD}>{o.product ?? '—'}</td>
                                    <td className={TD}>{o.buyer ?? '—'}</td>
                                    <td className={`${TD} text-right`}>{money(o.total_amount)}</td>
                                    <td className={`${TD} text-right text-rose-600`}>− {money(o.platform_fee)}</td>
                                    <td className={`${TD} text-right font-semibold`}>{money(o.net)}</td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-500">
                                        Orders were released back to the queue (failed settlement).
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmAction
                open={action === 'paid'}
                onClose={() => setAction(null)}
                title={`Mark ${s.number} as paid?`}
                body={`Only after ${money(s.net_amount)} has actually reached ${s.payout?.destination ?? 'the creator'}.`}
                url={`/admin/settlements/${s.uuid}/paid`}
                fields={[
                    { name: 'reference', label: 'Bank UTR / reference', required: true },
                    { name: 'notes', label: 'Notes', multiline: true },
                ]}
                confirmLabel="Mark paid"
            />
            <ConfirmAction
                open={action === 'failed'}
                onClose={() => setAction(null)}
                title={`Mark ${s.number} as failed?`}
                body="Its orders are released and will be picked up by the next settlement cycle."
                url={`/admin/settlements/${s.uuid}/failed`}
                fields={[{ name: 'reason', label: 'Reason (shown to the creator)', required: true, multiline: true }]}
                confirmLabel="Mark failed"
                tone="danger"
            />
        </AdminLayout>
    );
}
