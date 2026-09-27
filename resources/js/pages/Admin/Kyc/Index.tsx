import { Badge, Card, dateTime, EmptyRow, FilterTabs, PageHeader, Pagination, SearchBox, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { router } from '@inertiajs/react';

interface Row {
    uuid: string;
    status: string;
    legal_name: string;
    submitted_at: string | null;
    creator: { uuid: string; name: string; email: string; username: string | null } | null;
}

const TABS = [
    { key: 'pending', label: 'Pending' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
];

export default function AdminKycIndex({ items, filters }: { items: Paginated<Row>; filters: { status: string; q: string | null } }) {
    return (
        <AdminLayout title="KYC review">
            <PageHeader title="KYC review" description="Oldest submissions first. Settlements stay on hold until a creator's KYC is approved." />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FilterTabs base="/admin/kyc" tabs={TABS} active={filters.status} params={{ q: filters.q }} />
                <SearchBox base="/admin/kyc" value={filters.q} params={{ status: filters.status }} placeholder="Legal name or creator email…" />
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Legal name</th>
                                <th className={TH}>Creator</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.data.length === 0 && <EmptyRow colSpan={4}>Nothing in this queue.</EmptyRow>}
                            {items.data.map((k) => (
                                <tr key={k.uuid} onClick={() => router.visit(`/admin/kyc/${k.uuid}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className={`${TD} font-semibold text-slate-900`}>{k.legal_name}</td>
                                    <td className={TD}>
                                        <p>{k.creator?.name ?? '—'}</p>
                                        <p className="text-xs text-slate-500">{k.creator?.email}</p>
                                    </td>
                                    <td className={TD}>
                                        <Badge value={k.status} />
                                    </td>
                                    <td className={`${TD} whitespace-nowrap`}>{dateTime(k.submitted_at)}</td>
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
