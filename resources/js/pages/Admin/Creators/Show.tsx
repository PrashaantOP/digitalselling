import { Badge, BUTTON, Card, ConfirmAction, dateOnly, dateTime, Field, money, PageHeader, TD, TH } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Props {
    creator: {
        uuid: string;
        name: string;
        email: string;
        phone: string | null;
        username: string | null;
        plan: 'free' | 'plus';
        effective_plan: string;
        plan_expires_at: string | null;
        commission_rate: number;
        status: 'active' | 'suspended';
        two_factor_enabled: boolean;
        email_verified: boolean;
        joined_at: string | null;
        business_name: string | null;
        /** creator ne khud account delete kiya (soft) — login band */
        deleted_at: string | null;
    };
    balance: { clearing: number; ready: number; in_transit: number; adjustments: number };
    kyc: { uuid: string; status: string; legal_name: string; submitted_at: string | null; verified_at: string | null; rejection_reason: string | null } | null;
    payoutMethods: { uuid: string; type: string; destination: string; holder: string | null; is_default: boolean; verified_at: string | null }[];
    totals: { orders: number; gross: number; commission: number; net: number; settled: number };
    recentOrders: { uuid: string; order_number: string; product: string | null; total_amount: number; status: string; created_at: string | null }[];
    pendingAdjustments: { uuid: string; type: string; amount: number; reason: string; created_at: string | null }[];
    planPurchases: { uuid: string; months: number; amount: number; credit: number; gateway: string; paid_at: string | null; invoice: { uuid: string; invoice_number: string } | null }[];
    recentSettlements: { uuid: string; number: string; net_amount: string | number; status: string; reference_number: string | null; created_at: string | null }[];
}

export default function AdminCreatorShow({ creator, kyc, payoutMethods, totals, recentOrders, recentSettlements, pendingAdjustments, planPurchases, balance }: Props) {
    const [restoreOpen, setRestoreOpen] = useState(false);
    const unpaid = balance.clearing + balance.ready + balance.in_transit;
    const [adjustment, setAdjustment] = useState({ type: 'manual_debit', amount: '', reason: '' });
    const [savingAdjustment, setSavingAdjustment] = useState(false);
    const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

    function addAdjustment(e: FormEvent) {
        e.preventDefault();
        setSavingAdjustment(true);
        setAdjustmentError(null);
        router.post(`/admin/creators/${creator.uuid}/adjustments`, adjustment, {
            preserveScroll: true,
            onSuccess: () => setAdjustment({ type: 'manual_debit', amount: '', reason: '' }),
            onError: (errs) => setAdjustmentError(Object.values(errs)[0] as string),
            onFinish: () => setSavingAdjustment(false),
        });
    }

    const [suspendOpen, setSuspendOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [plan, setPlan] = useState({ plan: creator.plan, plan_expires_at: creator.plan_expires_at?.slice(0, 10) ?? '' });
    const [savingPlan, setSavingPlan] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);

    function savePlan(e: FormEvent) {
        e.preventDefault();
        setSavingPlan(true);
        setPlanError(null);
        router.put(`/admin/creators/${creator.uuid}/plan`, { plan: plan.plan, plan_expires_at: plan.plan === 'plus' ? plan.plan_expires_at || null : null }, {
            preserveScroll: true,
            onError: (errs) => setPlanError(Object.values(errs)[0] as string),
            onFinish: () => setSavingPlan(false),
        });
    }

    return (
        <AdminLayout title={creator.name}>
            <Link href="/admin/creators" className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-3.5" /> All creators
            </Link>
            <PageHeader
                title={creator.name}
                description={`${creator.email}${creator.username ? ` · @${creator.username}` : ''}`}
                action={
                    creator.deleted_at ? (
                        <button onClick={() => setRestoreOpen(true)} className={BUTTON.primary}>
                            Restore account
                        </button>
                    ) : creator.status === 'active' ? (
                        <button onClick={() => setSuspendOpen(true)} className={BUTTON.danger}>
                            Suspend creator
                        </button>
                    ) : (
                        <button onClick={() => router.post(`/admin/creators/${creator.uuid}/activate`, {}, { preserveScroll: true })} className={BUTTON.primary}>
                            Re-activate creator
                        </button>
                    )
                }
            />

            {creator.deleted_at && (
                <div role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                    <p className="font-semibold">Account deleted on {dateTime(creator.deleted_at)} — the creator can’t log in and the store is hidden.</p>
                    <p className="mt-0.5 text-rose-700">
                        Buyers keep what they bought. {unpaid > 0 ? `${money(unpaid)} is still waiting to be paid out — settlements keep running for this account.` : 'Nothing is waiting to be paid out.'}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                    ['Paid orders', totals.orders.toLocaleString('en-IN')],
                    ['Gross sales', money(totals.gross)],
                    ['Commission', money(totals.commission)],
                    ['Net earnings', money(totals.net)],
                    ['Settled', money(totals.settled)],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{label}</p>
                        <p className="mt-1.5 text-lg font-bold text-slate-900">{value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title="Account">
                    <dl className="divide-y divide-slate-100 px-5">
                        <Field label="Status">
                            <Badge value={creator.status} />
                        </Field>
                        <Field label="Business">{creator.business_name ?? '—'}</Field>
                        <Field label="Phone">{creator.phone ?? '—'}</Field>
                        <Field label="Joined">{dateOnly(creator.joined_at)}</Field>
                        <Field label="Commission rate">{creator.commission_rate}%</Field>
                        <Field label="Email verified">
                            <Badge value={creator.email_verified ? 'verified' : 'pending'} label={creator.email_verified ? 'Verified' : 'Not verified'} />
                        </Field>
                        <Field label="Two-step verification">
                            {creator.two_factor_enabled ? (
                                <button type="button" onClick={() => setResetOpen(true)} className="text-xs font-semibold text-rose-600 hover:underline">
                                    On · Reset
                                </button>
                            ) : (
                                'Off'
                            )}
                        </Field>
                    </dl>
                </Card>

                <Card title="Plan">
                    <form onSubmit={savePlan} className="flex flex-col gap-3 p-5">
                        <p className="text-sm text-slate-600">
                            Effective plan today: <Badge value={creator.effective_plan} />
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-slate-700">Plan</span>
                                <select value={plan.plan} onChange={(e) => setPlan({ ...plan, plan: e.target.value as 'free' | 'plus' })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
                                    <option value="free">Free</option>
                                    <option value="plus">Plus</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-slate-700">Plus until (empty = no expiry)</span>
                                <input type="date" disabled={plan.plan !== 'plus'} value={plan.plan_expires_at} onChange={(e) => setPlan({ ...plan, plan_expires_at: e.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm disabled:bg-slate-50" />
                            </label>
                        </div>
                        {planError && <p className="text-xs text-rose-600">{planError}</p>}
                        <button type="submit" disabled={savingPlan} className={`${BUTTON.ghost} w-fit`}>
                            {savingPlan && <Loader2 className="size-4 animate-spin" />} Save plan
                        </button>
                    </form>
                </Card>

                <Card title="KYC" action={kyc && <Link href={`/admin/kyc/${kyc.uuid}`} className="text-xs font-semibold text-indigo-600 hover:underline">Open KYC</Link>}>
                    {kyc ? (
                        <dl className="divide-y divide-slate-100 px-5">
                            <Field label="Status">
                                <Badge value={kyc.status} />
                            </Field>
                            <Field label="Legal name">{kyc.legal_name}</Field>
                            <Field label="Submitted">{dateTime(kyc.submitted_at)}</Field>
                            {kyc.rejection_reason && <Field label="Rejection reason">{kyc.rejection_reason}</Field>}
                        </dl>
                    ) : (
                        <p className="p-5 text-sm text-slate-500">KYC not submitted yet.</p>
                    )}
                </Card>

                <Card title="Payout methods" action={<Link href="/admin/payout-methods" className="text-xs font-semibold text-indigo-600 hover:underline">Verify queue</Link>}>
                    {payoutMethods.length ? (
                        <ul className="divide-y divide-slate-100">
                            {payoutMethods.map((m) => (
                                <li key={m.uuid} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-900">{m.destination}</p>
                                        <p className="text-xs text-slate-500">
                                            {m.type === 'upi' ? 'UPI' : `Bank · ${m.holder ?? '—'}`}
                                            {m.is_default && ' · Default'}
                                        </p>
                                    </div>
                                    <Badge value={m.verified_at ? 'verified' : 'unverified'} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="p-5 text-sm text-slate-500">No payout method added.</p>
                    )}
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title="Settlement adjustments">
                    <form onSubmit={addAdjustment} className="flex flex-col gap-3 p-5">
                        <p className="text-sm text-slate-600">Adds a debit or credit to this creator's next settlement. If debits exceed their sales, nothing is settled until sales catch up.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-slate-700">Type</span>
                                <select value={adjustment.type} onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm">
                                    <option value="manual_debit">Debit (take back)</option>
                                    <option value="manual_credit">Credit (pay extra)</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-slate-700">Amount (₹)</span>
                                <input type="number" min="1" step="0.01" required value={adjustment.amount} onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                            </label>
                        </div>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-700">Reason (the creator sees this)</span>
                            <input type="text" required maxLength={255} value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-sm" />
                        </label>
                        {adjustmentError && <p className="text-xs text-rose-600">{adjustmentError}</p>}
                        <button type="submit" disabled={savingAdjustment} className={`${BUTTON.ghost} w-fit`}>
                            {savingAdjustment && <Loader2 className="size-4 animate-spin" />} Add adjustment
                        </button>
                    </form>
                    {pendingAdjustments.length > 0 && (
                        <ul className="divide-y divide-slate-100 border-t border-slate-100">
                            {pendingAdjustments.map((a) => (
                                <li key={a.uuid} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-900">{a.reason}</p>
                                        <p className="text-xs text-slate-500">Waiting for the next settlement · {dateOnly(a.created_at)}</p>
                                    </div>
                                    <span className={`font-semibold ${a.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {a.amount < 0 ? '− ' : '+ '}
                                        {money(Math.abs(a.amount))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Plus payments" action={<Link href={`/admin/billing?status=all&q=${encodeURIComponent(creator.email)}`} className="text-xs font-semibold text-indigo-600 hover:underline">All</Link>}>
                    <ul className="divide-y divide-slate-100">
                        {planPurchases.map((p) => (
                            <li key={p.uuid} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                                <div className="min-w-0">
                                    <p className="font-medium text-slate-900">
                                        {p.months} month{p.months > 1 ? 's' : ''} · {p.gateway === 'credit' ? 'referral credit' : money(p.amount)}
                                    </p>
                                    <p className="text-xs text-slate-500">{dateTime(p.paid_at)}</p>
                                </div>
                                {p.invoice && (
                                    <a href={`/admin/billing/invoices/${p.invoice.uuid}`} target="_blank" rel="noreferrer" className="font-mono text-xs font-semibold text-indigo-600 hover:underline">
                                        {p.invoice.invoice_number}
                                    </a>
                                )}
                            </li>
                        ))}
                        {planPurchases.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">No Plus payments yet.</li>}
                    </ul>
                </Card>
            </div>

            <Card title="Recent orders">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Order</th>
                                <th className={TH}>Product</th>
                                <th className={`${TH} text-right`}>Amount</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentOrders.map((o) => (
                                <tr key={o.uuid} onClick={() => router.visit(`/admin/orders/${o.uuid}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className={`${TD} font-mono text-xs`}>{o.order_number}</td>
                                    <td className={TD}>{o.product ?? '—'}</td>
                                    <td className={`${TD} text-right font-semibold`}>{money(o.total_amount)}</td>
                                    <td className={TD}>
                                        <Badge value={o.status} />
                                    </td>
                                    <td className={`${TD} whitespace-nowrap`}>{dateTime(o.created_at)}</td>
                                </tr>
                            ))}
                            {recentOrders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">
                                        No orders yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Recent settlements">
                <ul className="divide-y divide-slate-100">
                    {recentSettlements.map((s) => (
                        <li key={s.uuid}>
                            <Link href={`/admin/settlements/${s.uuid}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                                <span className="font-mono text-xs">{s.number}</span>
                                <span className="font-semibold">{money(s.net_amount)}</span>
                                <Badge value={s.status} />
                            </Link>
                        </li>
                    ))}
                    {recentSettlements.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">No settlements yet.</li>}
                </ul>
            </Card>

            <ConfirmAction
                open={restoreOpen}
                onClose={() => setRestoreOpen(false)}
                title={`Restore ${creator.name}'s account?`}
                body="They can log in again with the same email and password. Their store, products and orders come back as they were. This is recorded in the audit log."
                url={`/admin/creators/${creator.uuid}/restore`}
                confirmLabel="Restore"
            />
            <ConfirmAction
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                title="Reset two-step verification?"
                body="Only do this after confirming the creator's identity (e.g. from their registered phone). They can sign in with just their password until they turn it on again, and they'll get an email about it."
                url={`/admin/creators/${creator.uuid}/two-factor-reset`}
                fields={[{ name: 'reason', label: 'How was identity verified? (audit log)', required: true, multiline: true }]}
                confirmLabel="Reset"
                tone="danger"
            />
            <ConfirmAction
                open={suspendOpen}
                onClose={() => setSuspendOpen(false)}
                title={`Suspend ${creator.name}?`}
                body="Their store stops working, and they and their team are signed out everywhere immediately. You can re-activate later."
                url={`/admin/creators/${creator.uuid}/suspend`}
                fields={[{ name: 'reason', label: 'Reason (kept in the audit log)', required: true, multiline: true }]}
                confirmLabel="Suspend"
                tone="danger"
            />
        </AdminLayout>
    );
}
