import { Badge, Card, dateOnly, EmptyRow, money, PageHeader, Pagination, SearchBox, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { router } from '@inertiajs/react';

interface CreatorRow {
    uuid: string;
    name: string;
    email: string;
    username: string | null;
    plan: string;
    status: string;
    kyc_status: string;
    gross: number;
    joined_at: string | null;
}

type Filters = { q?: string | null; plan?: string | null; status?: string | null; kyc?: string | null };

const SELECT = 'h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500';

export default function AdminCreators({ creators, filters }: { creators: Paginated<CreatorRow>; filters: Filters }) {
    function setFilter(key: keyof Filters, value: string) {
        router.get('/admin/creators', { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    }

    return (
        <AdminLayout title="Creators">
            <PageHeader title="Creators" description="Every store on the platform. Open one to suspend it or change its plan." />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchBox base="/admin/creators" value={filters.q} params={{ plan: filters.plan, status: filters.status, kyc: filters.kyc }} placeholder="Name, email, username, phone…" />
                <select aria-label="Plan" value={filters.plan ?? ''} onChange={(e) => setFilter('plan', e.target.value)} className={SELECT}>
                    <option value="">All plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                </select>
                <select aria-label="Status" value={filters.status ?? ''} onChange={(e) => setFilter('status', e.target.value)} className={SELECT}>
                    <option value="">Any status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select aria-label="KYC" value={filters.kyc ?? ''} onChange={(e) => setFilter('kyc', e.target.value)} className={SELECT}>
                    <option value="">Any KYC</option>
                    <option value="not_started">Not started</option>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Creator</th>
                                <th className={TH}>Plan</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>KYC</th>
                                <th className={`${TH} text-right`}>Sales</th>
                                <th className={TH}>Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {creators.data.length === 0 && <EmptyRow colSpan={6}>No creators match these filters.</EmptyRow>}
                            {creators.data.map((c) => (
                                <tr key={c.uuid} onClick={() => router.visit(`/admin/creators/${c.uuid}`)} className="cursor-pointer transition hover:bg-slate-50">
                                    <td className={TD}>
                                        <p className="font-semibold text-slate-900">{c.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {c.email}
                                            {c.username && ` · @${c.username}`}
                                        </p>
                                    </td>
                                    <td className={TD}>
                                        <Badge value={c.plan} />
                                    </td>
                                    <td className={TD}>
                                        <Badge value={c.status} />
                                    </td>
                                    <td className={TD}>
                                        <Badge value={c.kyc_status} />
                                    </td>
                                    <td className={`${TD} text-right font-semibold`}>{money(c.gross)}</td>
                                    <td className={`${TD} whitespace-nowrap`}>{dateOnly(c.joined_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={creators} />
            </Card>
        </AdminLayout>
    );
}
