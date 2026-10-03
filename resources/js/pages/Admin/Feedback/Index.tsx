import { Badge, BUTTON, Card, dateTime, FilterTabs, PageHeader, Pagination, type Paginated } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link, router } from '@inertiajs/react';
import { Bug, ExternalLink, Image as ImageIcon, Lightbulb, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface Report {
    uuid: string;
    type: 'bug' | 'feature';
    title: string;
    details: string;
    page_url: string | null;
    status: string;
    admin_note: string | null;
    screenshot_url: string | null;
    by: { name: string; email: string } | null;
    creator: { uuid: string; name: string; email: string } | null;
    created_at: string | null;
}

const TABS = [
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
    { key: 'all', label: 'All' },
];

const STATUSES = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

/** Admin → Feedback: creators ke bug reports / feature requests. */
export default function AdminFeedback({ items, filters, openCount }: { items: Paginated<Report>; filters: { status: string; type: string | null }; openCount: number }) {
    return (
        <AdminLayout title="Feedback">
            <PageHeader title="Feedback" description={`${openCount} open report${openCount === 1 ? '' : 's'} from creators — bugs and feature ideas.`} />
            <FilterTabs base="/admin/feedback" tabs={TABS} active={filters.status} params={{ type: filters.type }} />

            {items.data.length === 0 && (
                <Card>
                    <p className="p-8 text-center text-sm text-slate-500">Nothing here.</p>
                </Card>
            )}

            <div className="flex flex-col gap-4">
                {items.data.map((report) => (
                    <ReportCard key={report.uuid} report={report} />
                ))}
            </div>

            <Pagination page={items} />
        </AdminLayout>
    );
}

function ReportCard({ report }: { report: Report }) {
    const [status, setStatus] = useState(report.status);
    const [note, setNote] = useState(report.admin_note ?? '');
    const [saving, setSaving] = useState(false);
    const dirty = status !== report.status || note !== (report.admin_note ?? '');
    const Icon = report.type === 'bug' ? Bug : Lightbulb;

    function save() {
        setSaving(true);
        router.put(`/admin/feedback/${report.uuid}`, { status, admin_note: note.trim() || null }, { preserveScroll: true, onFinish: () => setSaving(false) });
    }

    return (
        <Card>
            <div className="flex flex-col gap-4 p-5 lg:flex-row">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${report.type === 'bug' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                            <Icon className="size-3.5" /> {report.type === 'bug' ? 'Bug' : 'Feature'}
                        </span>
                        <Badge value={report.status} />
                        <span className="text-xs text-slate-500">{dateTime(report.created_at)}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{report.title}</h3>
                    <p className="mt-1.5 text-sm whitespace-pre-line text-slate-700">{report.details}</p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {report.creator && (
                            <Link href={`/admin/creators/${report.creator.uuid}`} className="hover:text-indigo-600">
                                Store: <span className="font-medium text-slate-700">{report.creator.name}</span>
                            </Link>
                        )}
                        {report.by && (
                            <span>
                                Sent by {report.by.name} · {report.by.email}
                            </span>
                        )}
                        {report.page_url && (
                            <span className="flex items-center gap-1">
                                <ExternalLink className="size-3" /> {report.page_url}
                            </span>
                        )}
                        {report.screenshot_url && (
                            <a href={report.screenshot_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                                <ImageIcon className="size-3" /> Screenshot
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
                    <label className="text-xs font-semibold text-slate-600" htmlFor={`status-${report.uuid}`}>
                        Status
                    </label>
                    <select id={`status-${report.uuid}`} value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-indigo-500">
                        {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <label className="text-xs font-semibold text-slate-600" htmlFor={`note-${report.uuid}`}>
                        Reply to the creator
                    </label>
                    <textarea
                        id={`note-${report.uuid}`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Shown to the creator under their report"
                        className="rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <button onClick={save} disabled={!dirty || saving} className={BUTTON.primary}>
                        {saving && <Loader2 className="size-4 animate-spin" />} Save
                    </button>
                </div>
            </div>
        </Card>
    );
}
