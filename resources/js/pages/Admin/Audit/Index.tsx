import { Card, dateTime, EmptyRow, PageHeader, Pagination, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { router } from '@inertiajs/react';

interface Row {
    id: number;
    action: string;
    admin: { uuid: string; name: string; email: string } | null;
    subject: string | null;
    meta: Record<string, unknown> | null;
    ip: string | null;
    user_agent: string | null;
    created_at: string | null;
}

const ACTION_GROUPS = [
    { key: '', label: 'All actions' },
    { key: 'admin.', label: 'Admin sign-ins' },
    { key: 'kyc.', label: 'KYC' },
    { key: 'payout_method.', label: 'Payout methods' },
    { key: 'settlement', label: 'Settlements' },
    { key: 'creator.', label: 'Creators' },
];

const CONTROL = 'h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500';

const tone = (action: string) =>
    action.includes('failed') || action.includes('suspended') || action.includes('rejected') || action.includes('revoked')
        ? 'text-rose-700 bg-rose-50'
        : action.includes('login') || action.includes('viewed') || action.includes('otp')
          ? 'text-slate-700 bg-slate-100'
          : 'text-emerald-700 bg-emerald-50';

export default function AdminAudit({ logs, filters, admins }: { logs: Paginated<Row>; filters: { action?: string | null; admin?: string | null }; admins: { uuid: string; name: string }[] }) {
    const set = (key: 'action' | 'admin', value: string) => router.get('/admin/audit', { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });

    return (
        <AdminLayout title="Audit log">
            <PageHeader title="Audit log" description="Every admin sign-in and action — who did what, to which record, from where. Entries can't be edited or deleted from the panel." />

            <div className="flex flex-col gap-2 sm:flex-row">
                <select aria-label="Action" value={filters.action ?? ''} onChange={(e) => set('action', e.target.value)} className={CONTROL}>
                    {ACTION_GROUPS.map((g) => (
                        <option key={g.key} value={g.key}>
                            {g.label}
                        </option>
                    ))}
                </select>
                <select aria-label="Admin" value={filters.admin ?? ''} onChange={(e) => set('admin', e.target.value)} className={CONTROL}>
                    <option value="">All admins</option>
                    {admins.map((a) => (
                        <option key={a.uuid} value={a.uuid}>
                            {a.name}
                        </option>
                    ))}
                </select>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>When</th>
                                <th className={TH}>Action</th>
                                <th className={TH}>By</th>
                                <th className={TH}>Details</th>
                                <th className={TH}>From</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.data.length === 0 && <EmptyRow colSpan={5}>No entries.</EmptyRow>}
                            {logs.data.map((l) => (
                                <tr key={l.id} className="align-top">
                                    <td className={`${TD} whitespace-nowrap text-xs`}>{dateTime(l.created_at)}</td>
                                    <td className={TD}>
                                        <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${tone(l.action)}`}>{l.action}</span>
                                        {l.subject && <p className="mt-1 text-xs text-slate-500">{l.subject}</p>}
                                    </td>
                                    <td className={`${TD} text-xs`}>{l.admin ? l.admin.name : <span className="text-slate-400">CLI / system</span>}</td>
                                    <td className={`${TD} max-w-sm`}>
                                        {l.meta ? (
                                            <code className="block text-[11px] break-all whitespace-pre-wrap text-slate-600">{JSON.stringify(l.meta)}</code>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className={`${TD} text-xs`}>
                                        <p className="font-mono">{l.ip ?? '—'}</p>
                                        <p className="max-w-48 truncate text-slate-400" title={l.user_agent ?? ''}>
                                            {l.user_agent}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={logs} />
            </Card>
        </AdminLayout>
    );
}
