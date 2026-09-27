import { Badge, Card, dateTime, EmptyRow, money, PageHeader, Pagination, SearchBox, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { router } from '@inertiajs/react';

interface Row {
    uuid: string;
    order_number: string;
    status: string;
    total_amount: number;
    platform_fee: number;
    buyer: string | null;
    product: string | null;
    creator: { uuid: string; name: string; username: string | null } | null;
    created_at: string | null;
}

type Filters = { q?: string | null; status?: string | null; from?: string | null; to?: string | null };

const CONTROL = 'h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500';

export default function AdminOrders({ orders, filters }: { orders: Paginated<Row>; filters: Filters }) {
    const set = (key: keyof Filters, value: string) => router.get('/admin/orders', { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });

    return (
        <AdminLayout title="Orders">
            <PageHeader title="Orders" description="Search any order on the platform — by order number, buyer, payment ID or creator." />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchBox base="/admin/orders" value={filters.q} params={{ status: filters.status, from: filters.from, to: filters.to }} placeholder="Order no., buyer email/phone, pay_…" />
                <select aria-label="Status" value={filters.status ?? ''} onChange={(e) => set('status', e.target.value)} className={CONTROL}>
                    <option value="">Any status</option>
                    <option value="success">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                </select>
                <input type="date" aria-label="From" value={filters.from ?? ''} onChange={(e) => set('from', e.target.value)} className={CONTROL} />
                <input type="date" aria-label="To" value={filters.to ?? ''} onChange={(e) => set('to', e.target.value)} className={CONTROL} />
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Order</th>
                                <th className={TH}>Creator</th>
                                <th className={TH}>Buyer</th>
                                <th className={`${TH} text-right`}>Amount</th>
                                <th className={TH}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.data.length === 0 && <EmptyRow colSpan={5}>No orders match.</EmptyRow>}
                            {orders.data.map((o) => (
                                <tr key={o.uuid} onClick={() => router.visit(`/admin/orders/${o.uuid}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className={TD}>
                                        <p className="font-mono text-xs font-semibold text-slate-900">{o.order_number}</p>
                                        <p className="max-w-56 truncate text-xs text-slate-500">
                                            {o.product ?? '—'} · {dateTime(o.created_at)}
                                        </p>
                                    </td>
                                    <td className={TD}>{o.creator?.name ?? '—'}</td>
                                    <td className={TD}>{o.buyer ?? '—'}</td>
                                    <td className={`${TD} text-right`}>
                                        <p className="font-semibold text-slate-900">{money(o.total_amount)}</p>
                                        <p className="text-xs text-slate-500">fee {money(o.platform_fee)}</p>
                                    </td>
                                    <td className={TD}>
                                        <Badge value={o.status} label={o.status === 'success' ? 'Paid' : undefined} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={orders} />
            </Card>
        </AdminLayout>
    );
}
