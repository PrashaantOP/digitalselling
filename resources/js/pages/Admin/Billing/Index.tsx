import { Badge, Card, dateTime, dateOnly, EmptyRow, FilterTabs, money, PageHeader, Pagination, SearchBox, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link } from '@inertiajs/react';

interface PurchaseRow {
    uuid: string;
    status: string;
    months: number;
    amount: number;
    credit: number;
    gateway: string;
    payment_id: string | null;
    paid_at: string | null;
    created_at: string | null;
    period_end: string | null;
    failure_reason: string | null;
    creator: { uuid: string; name: string; email: string } | null;
    invoice: { uuid: string; invoice_number: string } | null;
}

interface Props {
    items: Paginated<PurchaseRow>;
    filters: { status: string; q: string | null };
    totals: { month_revenue: number; month_taxable: number; month_gst: number; active_pro: number };
}

const TABS = [
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'failed', label: 'Failed' },
    { key: 'all', label: 'All' },
];

export default function AdminBilling({ items, filters, totals }: Props) {
    const tiles = [
        { label: 'Pro revenue this month', value: money(totals.month_revenue), sub: 'GST-inclusive' },
        { label: 'Taxable value', value: money(totals.month_taxable), sub: 'This month' },
        { label: 'GST collected', value: money(totals.month_gst), sub: 'This month' },
        { label: 'Creators on Pro', value: String(totals.active_pro), sub: 'Trial, paid and granted' },
    ];

    return (
        <AdminLayout title="Billing">
            <PageHeader title="Billing" description="What creators paid for the Pro plan, with the tax invoice for each payment." />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <Card key={tile.label} className="p-4">
                        <p className="text-xs font-medium text-slate-500">{tile.label}</p>
                        <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{tile.value}</p>
                        <p className="text-[11px] text-slate-400">{tile.sub}</p>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FilterTabs base="/admin/billing" tabs={TABS} active={filters.status} params={{ q: filters.q }} />
                <SearchBox base="/admin/billing" value={filters.q} params={{ status: filters.status }} placeholder="Invoice no., payment id, creator…" />
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Creator</th>
                                <th className={TH}>Plan</th>
                                <th className={`${TH} text-right`}>Paid</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.data.length === 0 && <EmptyRow colSpan={5}>No purchases here.</EmptyRow>}
                            {items.data.map((p) => (
                                <tr key={p.uuid}>
                                    <td className={TD}>
                                        {p.creator ? (
                                            <Link href={`/admin/creators/${p.creator.uuid}`} className="font-medium text-slate-900 hover:underline">
                                                {p.creator.name}
                                            </Link>
                                        ) : (
                                            '—'
                                        )}
                                        <p className="text-xs text-slate-500">{p.creator?.email}</p>
                                    </td>
                                    <td className={TD}>
                                        <p className="font-medium text-slate-900">
                                            Pro · {p.months} month{p.months > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-xs text-slate-500">{p.period_end ? `Valid till ${dateOnly(p.period_end)}` : dateTime(p.created_at)}</p>
                                    </td>
                                    <td className={`${TD} text-right`}>
                                        <p className="font-bold text-slate-900 tabular-nums">{money(p.amount)}</p>
                                        {p.credit > 0 && <p className="text-[11px] text-slate-500">+ {money(p.credit)} referral credit</p>}
                                    </td>
                                    <td className={TD}>
                                        <Badge value={p.status} />
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            {p.status === 'paid' ? dateTime(p.paid_at) : (p.failure_reason ?? '')}
                                        </p>
                                        {p.payment_id && <p className="font-mono text-[11px] text-slate-400">{p.payment_id}</p>}
                                    </td>
                                    <td className={TD}>
                                        {p.invoice ? (
                                            <a
                                                href={`/admin/billing/invoices/${p.invoice.uuid}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono text-xs font-semibold text-indigo-600 hover:underline"
                                            >
                                                {p.invoice.invoice_number}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-slate-400">{p.gateway === 'credit' ? 'Credit only' : '—'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={items} />
            </Card>
        </AdminLayout>
    );
}
