import { Badge, BUTTON, Card, dateTime, EmptyRow, FilterTabs, money, PageHeader, Pagination, SearchBox, TD, TH, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { router } from '@inertiajs/react';
import { Download, Loader2, Play, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

export interface SettlementRow {
    uuid: string;
    number: string;
    status: string;
    orders_count: number;
    net_amount: number;
    reference_number: string | null;
    created_at: string | null;
    creator: { uuid: string; name: string; email: string } | null;
    payout: { type: string; destination: string } | null;
}

type Preview = { cutoff: string; rows: { creator: { uuid: string; name: string; email: string }; orders: number; net: number; blocked_reason: string | null }[] };

const TABS = [
    { key: 'pending', label: 'To pay' },
    { key: 'processing', label: 'Processing' },
    { key: 'paid', label: 'Paid' },
    { key: 'failed', label: 'Failed' },
    { key: 'all', label: 'All' },
];

const BLOCKED: Record<string, string> = { kyc: 'KYC not verified', payout_method: 'No payout method', payout_unverified: 'Payout method unverified' };

export default function AdminSettlements({ items, filters, pendingTotal }: { items: Paginated<SettlementRow>; filters: { status: string; q: string | null }; pendingTotal: number }) {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loading, setLoading] = useState(false);
    const [running, setRunning] = useState(false);

    async function openPreview() {
        setLoading(true);
        try {
            const res = await fetch('/admin/settlements/preview', { headers: { Accept: 'application/json' } });
            setPreview(await res.json());
        } finally {
            setLoading(false);
        }
    }

    function run() {
        setRunning(true);
        router.post('/admin/settlements/run', {}, { preserveScroll: true, onFinish: () => { setRunning(false); setPreview(null); } });
    }

    const [exporting, setExporting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    // Bank ke bulk transfer ki CSV. Server isi call me un settlements ko "processing" kar deta hai.
    async function exportPending() {
        setExporting(true);
        setFileError(null);
        try {
            const xsrf = decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? '');
            const res = await fetch('/admin/settlements/export', { method: 'POST', headers: { 'X-XSRF-TOKEN': xsrf, Accept: 'text/csv, application/json' } });

            if (!res.ok) {
                setFileError(res.status === 422 ? 'There are no pending settlements to export.' : 'Could not export. Please try again.');
                return;
            }

            const url = URL.createObjectURL(await res.blob());
            const link = document.createElement('a');
            link.href = url;
            link.download = res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)/)?.[1] ?? 'settlements.csv';
            link.click();
            URL.revokeObjectURL(url);
            router.reload();
        } finally {
            setExporting(false);
        }
    }

    // Wahi file, UTR column bhar ke — har bhari hui row paid ho jaati hai.
    function uploadUtrs(file: File | undefined) {
        if (!file) return;
        setUploading(true);
        setFileError(null);
        router.post('/admin/settlements/bulk-paid', { file }, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errors) => setFileError(Object.values(errors)[0] as string),
            onFinish: () => {
                setUploading(false);
                if (fileInput.current) fileInput.current.value = '';
            },
        });
    }

    const willSettle = preview?.rows.filter((r) => !r.blocked_reason) ?? [];

    return (
        <AdminLayout title="Settlements">
            <PageHeader
                title="Settlements"
                description={`${money(pendingTotal)} waiting to be transferred. Mark each one paid with its bank UTR after the transfer.`}
                action={
                    <div className="flex flex-wrap gap-2">
                        <button onClick={exportPending} disabled={exporting} className={BUTTON.ghost}>
                            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export to pay
                        </button>
                        <button onClick={() => fileInput.current?.click()} disabled={uploading} className={BUTTON.ghost}>
                            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload UTRs
                        </button>
                        <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={(e) => uploadUtrs(e.target.files?.[0])} />
                        <button onClick={openPreview} disabled={loading} className={BUTTON.ghost}>
                            {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run settlement cycle
                        </button>
                    </div>
                }
            />

            {fileError && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{fileError}</div>}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <FilterTabs base="/admin/settlements" tabs={TABS} active={filters.status} params={{ q: filters.q }} />
                <SearchBox base="/admin/settlements" value={filters.q} params={{ status: filters.status }} placeholder="STL number, UTR, creator…" />
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className={TH}>Settlement</th>
                                <th className={TH}>Creator</th>
                                <th className={TH}>Pay to</th>
                                <th className={`${TH} text-right`}>Net</th>
                                <th className={TH}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.data.length === 0 && <EmptyRow colSpan={5}>No settlements here.</EmptyRow>}
                            {items.data.map((s) => (
                                <tr key={s.uuid} onClick={() => router.visit(`/admin/settlements/${s.uuid}`)} className="cursor-pointer hover:bg-slate-50">
                                    <td className={TD}>
                                        <p className="font-mono text-xs font-semibold text-slate-900">{s.number}</p>
                                        <p className="text-xs text-slate-500">
                                            {s.orders_count} order(s) · {dateTime(s.created_at)}
                                        </p>
                                    </td>
                                    <td className={TD}>
                                        <p className="font-medium text-slate-900">{s.creator?.name ?? '—'}</p>
                                        <p className="text-xs text-slate-500">{s.creator?.email}</p>
                                    </td>
                                    <td className={`${TD} font-mono text-xs`}>{s.payout?.destination ?? '—'}</td>
                                    <td className={`${TD} text-right font-bold text-slate-900`}>{money(s.net_amount)}</td>
                                    <td className={TD}>
                                        <Badge value={s.status} />
                                        {s.reference_number && <p className="mt-0.5 font-mono text-[11px] text-slate-500">UTR {s.reference_number}</p>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={items} />
            </Card>

            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setPreview(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div role="dialog" aria-modal="true" className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Run settlement cycle</h3>
                                <p className="mt-1 text-sm text-slate-500">Paid orders up to {preview.cutoff} are grouped per creator. Blocked creators are skipped — their money keeps waiting.</p>
                            </div>
                            <button onClick={() => setPreview(null)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                                <X className="size-5" />
                            </button>
                        </div>
                        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
                            {preview.rows.length === 0 && <li className="p-4 text-center text-sm text-slate-500">Nothing is ready to settle.</li>}
                            {preview.rows.map((r) => (
                                <li key={r.creator.uuid} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{r.creator.name}</p>
                                        <p className="text-xs text-slate-500">{r.orders} order(s)</p>
                                    </div>
                                    {r.blocked_reason ? <span className="text-xs font-semibold text-amber-600">{BLOCKED[r.blocked_reason] ?? r.blocked_reason}</span> : <span className="font-semibold">{money(r.net)}</span>}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-5 flex justify-end gap-2">
                            <button onClick={() => setPreview(null)} className={BUTTON.ghost}>
                                Cancel
                            </button>
                            <button onClick={run} disabled={running || willSettle.length === 0} className={BUTTON.primary}>
                                {running && <Loader2 className="size-4 animate-spin" />} Create {willSettle.length} settlement(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
