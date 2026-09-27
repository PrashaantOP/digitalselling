import { Badge, BUTTON, Card, ConfirmAction, dateTime, EmptyRow, FilterTabs, PageHeader, Pagination, SearchBox, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface Row {
    uuid: string;
    type: 'upi' | 'bank_transfer';
    destination: string;
    holder: string | null;
    is_default: boolean;
    verified_at: string | null;
    updated_at: string | null;
    creator: { uuid: string; name: string; email: string } | null;
    kyc_status: string;
    kyc_name: string | null;
    name_matches_kyc: boolean | null;
}

const TABS = [
    { key: 'unverified', label: 'To verify' },
    { key: 'verified', label: 'Verified' },
    { key: 'all', label: 'All' },
];

export default function AdminPayoutMethods({ items, filters }: { items: Paginated<Row>; filters: { status: string; q: string | null } }) {
    const [confirm, setConfirm] = useState<{ row: Row; action: 'verify' | 'revoke' } | null>(null);

    return (
        <AdminLayout title="Payout methods">
            <PageHeader title="Payout methods" description="Settlements only go to a verified method. Check the UPI ID / bank account belongs to the creator (KYC name) before verifying." />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FilterTabs base="/admin/payout-methods" tabs={TABS} active={filters.status} params={{ q: filters.q }} />
                <SearchBox base="/admin/payout-methods" value={filters.q} params={{ status: filters.status }} placeholder="UPI ID, holder, creator…" />
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Destination</th>
                                <th className={TH}>Creator / KYC</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Updated</th>
                                <th className={TH} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.data.length === 0 && <EmptyRow colSpan={5}>Nothing to verify right now.</EmptyRow>}
                            {items.data.map((m) => (
                                <tr key={m.uuid}>
                                    <td className={TD}>
                                        <p className="font-mono text-xs font-semibold text-slate-900">{m.destination}</p>
                                        <p className="text-xs text-slate-500">
                                            {m.type === 'upi' ? 'UPI' : `Bank · ${m.holder ?? '—'}`}
                                            {m.is_default && ' · Default'}
                                        </p>
                                    </td>
                                    <td className={TD}>
                                        {m.creator ? (
                                            <Link href={`/admin/creators/${m.creator.uuid}`} className="font-medium text-slate-900 hover:underline">
                                                {m.creator.name}
                                            </Link>
                                        ) : (
                                            '—'
                                        )}
                                        <p className="text-xs text-slate-500">
                                            KYC: <Badge value={m.kyc_status} /> {m.kyc_name && `· ${m.kyc_name}`}
                                            {m.name_matches_kyc === false && <span className="ml-1 font-semibold text-amber-600">holder ≠ KYC name</span>}
                                            {m.name_matches_kyc === true && <span className="ml-1 font-semibold text-emerald-600">✓ name matches</span>}
                                        </p>
                                    </td>
                                    <td className={TD}>
                                        <Badge value={m.verified_at ? 'verified' : 'unverified'} />
                                    </td>
                                    <td className={`${TD} whitespace-nowrap`}>{dateTime(m.updated_at)}</td>
                                    <td className={`${TD} text-right`}>
                                        {m.verified_at ? (
                                            <button onClick={() => setConfirm({ row: m, action: 'revoke' })} className={BUTTON.ghost}>
                                                Revoke
                                            </button>
                                        ) : (
                                            <button onClick={() => setConfirm({ row: m, action: 'verify' })} className={BUTTON.primary}>
                                                Verify
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={items} />
            </Card>

            <ConfirmAction
                open={confirm?.action === 'verify'}
                onClose={() => setConfirm(null)}
                title="Verify this payout method?"
                body={confirm && `Settlements for ${confirm.row.creator?.name ?? 'this creator'} will be sent to ${confirm.row.destination}.`}
                url={`/admin/payout-methods/${confirm?.row.uuid}/verify`}
                confirmLabel="Verify"
            />
            <ConfirmAction
                open={confirm?.action === 'revoke'}
                onClose={() => setConfirm(null)}
                title="Revoke verification?"
                body="New settlements for this creator will be put on hold until it's verified again."
                url={`/admin/payout-methods/${confirm?.row.uuid}/revoke`}
                fields={[{ name: 'reason', label: 'Reason (audit log)', required: true }]}
                confirmLabel="Revoke"
                tone="danger"
            />
        </AdminLayout>
    );
}
