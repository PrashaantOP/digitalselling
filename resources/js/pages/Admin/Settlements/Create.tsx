import { BUTTON, Card, dateTime, EmptyRow, money, PageHeader, TD, TH } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

type CreatorRef = { uuid: string; name: string; email: string };

interface OrderRow {
    uuid: string;
    order_number: string;
    product: string | null;
    buyer: string | null;
    paid_at: string | null;
    total_amount: number;
    platform_fee: number;
    net: number;
    /** paid hue 24 ghante nahi hue — abhi chuna nahi ja sakta */
    too_new: boolean;
    /** cycle ka hold paar nahi hua — gateway ka paisa abhi aaya nahi hoga */
    on_hold: boolean;
}

interface Props {
    creators: { creator: CreatorRef; orders: number; net: number; blocked_reason: string | null }[];
    selected: {
        creator: CreatorRef;
        blocked_reason: string | null;
        payout: { type: string; destination: string } | null;
        hold_days: number;
        min_hours: number;
        orders: OrderRow[];
        adjustments: { uuid: string; type: string; amount: number; reason: string }[];
    } | null;
}

const BLOCKED: Record<string, string> = { kyc: 'KYC not verified', payout_method: 'No payout method', payout_unverified: 'Payout method unverified' };

/** Admin → Settlements → New settlement. Admin khud chunta hai kaun se orders is settlement me jayenge. */
export default function AdminSettlementCreate({ creators, selected }: Props) {
    return (
        <AdminLayout title="New settlement">
            <Link href={selected ? '/admin/settlements/create' : '/admin/settlements'} className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-3.5" /> {selected ? 'Choose another creator' : 'All settlements'}
            </Link>
            {selected ? <PickOrders key={selected.creator.uuid} selected={selected} /> : <PickCreator creators={creators} />}
        </AdminLayout>
    );
}

function PickCreator({ creators }: { creators: Props['creators'] }) {
    return (
        <>
            <PageHeader title="New settlement" description="Pick a creator, then choose which of their paid orders go into this settlement. An order can be settled 24 hours after it was paid. Anything you leave out is picked up by the next settlement cycle." />
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Creator</th>
                                <th className={`${TH} text-right`}>Unsettled orders</th>
                                <th className={`${TH} text-right`}>Net</th>
                                <th className={TH} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {creators.length === 0 && <EmptyRow colSpan={4}>No creator has unsettled paid orders.</EmptyRow>}
                            {creators.map((row) => (
                                <tr key={row.creator.uuid} onClick={() => router.visit(`/admin/settlements/create?creator=${row.creator.uuid}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className={TD}>
                                        <p className="font-medium text-slate-900">{row.creator.name}</p>
                                        <p className="text-xs text-slate-500">{row.creator.email}</p>
                                    </td>
                                    <td className={`${TD} text-right tabular-nums`}>{row.orders}</td>
                                    <td className={`${TD} text-right font-bold text-slate-900 tabular-nums`}>{money(row.net)}</td>
                                    <td className={`${TD} text-right`}>
                                        {row.blocked_reason ? (
                                            <span className="text-xs font-semibold text-amber-600">{BLOCKED[row.blocked_reason] ?? row.blocked_reason}</span>
                                        ) : (
                                            <ChevronRight className="ml-auto size-4 text-slate-400" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
}

function PickOrders({ selected }: { selected: NonNullable<Props['selected']> }) {
    const { creator, orders, adjustments } = selected;
    // 24 ghante purane saare orders shuru me tick (isse naye chune hi nahi ja sakte) + saare adjustments
    const selectable = useMemo(() => orders.filter((o) => !o.too_new), [orders]);
    const [picked, setPicked] = useState<Set<string>>(() => new Set(orders.filter((o) => !o.too_new).map((o) => o.uuid)));
    const [pickedAdjustments, setPickedAdjustments] = useState<Set<string>>(() => new Set(adjustments.map((a) => a.uuid)));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const totals = useMemo(() => {
        const chosen = orders.filter((o) => picked.has(o.uuid));
        const adjustment = adjustments.filter((a) => pickedAdjustments.has(a.uuid)).reduce((sum, a) => sum + a.amount, 0);
        const gross = chosen.reduce((sum, o) => sum + o.total_amount, 0);
        const fee = chosen.reduce((sum, o) => sum + o.platform_fee, 0);

        return { count: chosen.length, held: chosen.filter((o) => o.on_hold).length, gross, fee, adjustment, net: chosen.reduce((sum, o) => sum + o.net, 0) + adjustment };
    }, [orders, adjustments, picked, pickedAdjustments]);

    const toggle = (set: Set<string>, uuid: string) => {
        const next = new Set(set);
        if (next.has(uuid)) next.delete(uuid);
        else next.add(uuid);

        return next;
    };

    const allPicked = selectable.length > 0 && picked.size === selectable.length;
    const blocked = selected.blocked_reason;
    const canCreate = !blocked && totals.count > 0 && totals.net > 0 && !saving;

    function create() {
        setSaving(true);
        setError(null);
        router.post(
            '/admin/settlements',
            { creator: creator.uuid, orders: [...picked], adjustments: [...pickedAdjustments] },
            { onError: (errors) => setError(Object.values(errors)[0] as string), onFinish: () => setSaving(false) },
        );
    }

    return (
        <>
            <PageHeader title={`New settlement · ${creator.name}`} description={`${creator.email}${selected.payout ? ` · pays to ${selected.payout.destination}` : ''}`} />

            {blocked && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                        {BLOCKED[blocked] ?? blocked}. A settlement can’t be created until this is fixed —{' '}
                        <Link href={`/admin/creators/${creator.uuid}`} className="underline">
                            open the creator
                        </Link>
                        .
                    </span>
                </div>
            )}

            <Card title="Orders">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={`${TH} w-10`}>
                                    <input
                                        type="checkbox"
                                        aria-label="Select all orders"
                                        checked={allPicked}
                                        disabled={selectable.length === 0}
                                        onChange={() => setPicked(allPicked ? new Set() : new Set(selectable.map((o) => o.uuid)))}
                                        className="size-4 accent-indigo-600"
                                    />
                                </th>
                                <th className={TH}>Order</th>
                                <th className={TH}>Paid</th>
                                <th className={`${TH} text-right`}>Amount</th>
                                <th className={`${TH} text-right`}>Fee</th>
                                <th className={`${TH} text-right`}>Net</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.length === 0 && <EmptyRow colSpan={6}>This creator has no unsettled paid orders.</EmptyRow>}
                            {orders.map((o) => (
                                <tr key={o.uuid} onClick={() => !o.too_new && setPicked((set) => toggle(set, o.uuid))} className={o.too_new ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}>
                                    <td className={TD}>
                                        <input type="checkbox" aria-label={`Select ${o.order_number}`} checked={picked.has(o.uuid)} disabled={o.too_new} onChange={() => {}} className="size-4 accent-indigo-600" />
                                    </td>
                                    <td className={TD}>
                                        <p className="font-mono text-xs font-semibold text-slate-900">{o.order_number}</p>
                                        <p className="text-xs text-slate-500">
                                            {o.product ?? '—'}
                                            {o.buyer ? ` · ${o.buyer}` : ''}
                                        </p>
                                    </td>
                                    <td className={TD}>
                                        <p className="text-xs">{dateTime(o.paid_at)}</p>
                                        {o.too_new ? (
                                            <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">Available {selected.min_hours}h after payment</span>
                                        ) : (
                                            o.on_hold && <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">In {selected.hold_days}-day hold</span>
                                        )}
                                    </td>
                                    <td className={`${TD} text-right tabular-nums`}>{money(o.total_amount)}</td>
                                    <td className={`${TD} text-right text-slate-500 tabular-nums`}>− {money(o.platform_fee)}</td>
                                    <td className={`${TD} text-right font-semibold text-slate-900 tabular-nums`}>{money(o.net)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {adjustments.length > 0 && (
                <Card title="Pending adjustments">
                    <ul className="divide-y divide-slate-100">
                        {adjustments.map((a) => (
                            <li key={a.uuid} onClick={() => setPickedAdjustments((set) => toggle(set, a.uuid))} className="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50">
                                <input type="checkbox" aria-label={`Include adjustment: ${a.reason}`} checked={pickedAdjustments.has(a.uuid)} onChange={() => {}} className="size-4 accent-indigo-600" />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-slate-900">{a.reason}</span>
                                    <span className="text-xs text-slate-500">{a.type.replace(/_/g, ' ')}</span>
                                </span>
                                <span className={`font-semibold tabular-nums ${a.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {a.amount < 0 ? '− ' : '+ '}
                                    {money(Math.abs(a.amount))}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {totals.held > 0 && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>
                        <b>
                            {totals.held} selected order{totals.held === 1 ? ' is' : 's are'} still in the {selected.hold_days}-day hold.
                        </b>{' '}
                        Check that the gateway has paid you for {totals.held === 1 ? 'it' : 'them'} before you transfer — a refund after that has to be recovered from the creator.
                    </span>
                </div>
            )}

            {error && <div role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{error}</div>}

            <Card>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                        <div>
                            <dt className="text-xs text-slate-500">Orders</dt>
                            <dd className="font-semibold text-slate-900 tabular-nums">{totals.count}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Gross</dt>
                            <dd className="font-semibold text-slate-900 tabular-nums">{money(totals.gross)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Fee</dt>
                            <dd className="font-semibold text-slate-900 tabular-nums">− {money(totals.fee)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Adjustments</dt>
                            <dd className="font-semibold text-slate-900 tabular-nums">
                                {totals.adjustment < 0 ? '− ' : ''}
                                {money(Math.abs(totals.adjustment))}
                            </dd>
                        </div>
                    </dl>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Amount to transfer</p>
                            <p className={`text-xl font-bold tabular-nums ${totals.net > 0 ? 'text-slate-900' : 'text-rose-600'}`}>{money(totals.net)}</p>
                        </div>
                        <button onClick={create} disabled={!canCreate} className={BUTTON.primary}>
                            {saving && <Loader2 className="size-4 animate-spin" />} Create settlement
                        </button>
                    </div>
                </div>
                {totals.count > 0 && totals.net <= 0 && <p className="px-5 pb-4 text-xs font-medium text-rose-600">The selected debits are larger than the orders. Untick an adjustment or add more orders.</p>}
            </Card>
        </>
    );
}
