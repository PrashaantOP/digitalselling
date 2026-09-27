import { Badge, BUTTON, Card, ConfirmAction, dateTime, Field, PageHeader } from '@/components/admin/ui';
import AdminLayout from '@/layouts/admin-layout';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';

interface Props {
    kyc: {
        uuid: string;
        status: string;
        legal_name: string;
        pan_number: string;
        gst_number: string | null;
        bank_account_holder: string | null;
        bank_account_number: string | null;
        ifsc: string | null;
        rejection_reason: string | null;
        submitted_at: string | null;
        verified_at: string | null;
        has_document: boolean;
        document_is_pdf: boolean;
        creator: { uuid: string; name: string; email: string; username: string | null; phone: string | null } | null;
    };
}

export default function AdminKycShow({ kyc }: Props) {
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const docUrl = `/admin/kyc/${kyc.uuid}/document`;
    const pending = kyc.status === 'pending';
    const namesMatch = kyc.bank_account_holder && kyc.bank_account_holder.trim().toLowerCase() === kyc.legal_name.trim().toLowerCase();

    return (
        <AdminLayout title={`KYC · ${kyc.legal_name}`}>
            <Link href="/admin/kyc" className="flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                <ArrowLeft className="size-3.5" /> KYC queue
            </Link>
            <PageHeader
                title={kyc.legal_name}
                description="Check the PAN and bank details against the uploaded document before approving."
                action={
                    pending && (
                        <div className="flex gap-2">
                            <button onClick={() => setAction('reject')} className={BUTTON.ghost}>
                                Reject
                            </button>
                            <button onClick={() => setAction('approve')} className={BUTTON.primary}>
                                Approve KYC
                            </button>
                        </div>
                    )
                }
            />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card title="Submitted details">
                    <dl className="divide-y divide-slate-100 px-5">
                        <Field label="Status">
                            <Badge value={kyc.status} />
                        </Field>
                        <Field label="Legal name">{kyc.legal_name}</Field>
                        <Field label="PAN">
                            <span className="font-mono">{kyc.pan_number}</span>
                        </Field>
                        <Field label="GSTIN">
                            <span className="font-mono">{kyc.gst_number ?? '—'}</span>
                        </Field>
                        <Field label="Account holder">
                            {kyc.bank_account_holder ?? '—'}
                            {kyc.bank_account_holder && (
                                <span className={`ml-2 text-xs font-semibold ${namesMatch ? 'text-emerald-600' : 'text-amber-600'}`}>{namesMatch ? '✓ matches legal name' : '≠ legal name'}</span>
                            )}
                        </Field>
                        <Field label="Account number">
                            <span className="font-mono">{kyc.bank_account_number ?? '—'}</span>
                        </Field>
                        <Field label="IFSC">
                            <span className="font-mono">{kyc.ifsc ?? '—'}</span>
                        </Field>
                        <Field label="Submitted">{dateTime(kyc.submitted_at)}</Field>
                        {kyc.verified_at && <Field label="Verified">{dateTime(kyc.verified_at)}</Field>}
                        {kyc.rejection_reason && <Field label="Rejection reason">{kyc.rejection_reason}</Field>}
                    </dl>
                </Card>

                <div className="flex flex-col gap-5">
                    <Card title="Creator" action={kyc.creator && <Link href={`/admin/creators/${kyc.creator.uuid}`} className="text-xs font-semibold text-indigo-600 hover:underline">Open creator</Link>}>
                        <dl className="divide-y divide-slate-100 px-5">
                            <Field label="Name">{kyc.creator?.name ?? '—'}</Field>
                            <Field label="Email">{kyc.creator?.email ?? '—'}</Field>
                            <Field label="Phone">{kyc.creator?.phone ?? '—'}</Field>
                        </dl>
                    </Card>

                    <Card title="ID document" action={kyc.has_document && <a href={docUrl} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">Open <ExternalLink className="size-3" /></a>}>
                        {!kyc.has_document ? (
                            <p className="p-5 text-sm text-slate-500">No document uploaded.</p>
                        ) : kyc.document_is_pdf ? (
                            <a href={docUrl} target="_blank" rel="noopener" className="m-5 flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm font-medium hover:bg-slate-50">
                                <FileText className="size-5 text-slate-400" /> View PDF document
                            </a>
                        ) : (
                            <img src={docUrl} alt="KYC document" className="max-h-[480px] w-full rounded-b-xl object-contain bg-slate-50" />
                        )}
                        <p className="border-t border-slate-100 px-5 py-2 text-[11px] text-slate-400">Every view of this document is recorded in the audit log.</p>
                    </Card>
                </div>
            </div>

            <ConfirmAction
                open={action === 'approve'}
                onClose={() => setAction(null)}
                title="Approve this KYC?"
                body={`${kyc.legal_name} will be able to receive settlements (once their payout method is verified).`}
                url={`/admin/kyc/${kyc.uuid}/approve`}
                confirmLabel="Approve"
            />
            <ConfirmAction
                open={action === 'reject'}
                onClose={() => setAction(null)}
                title="Reject this KYC?"
                body="The creator sees this reason and can correct and resubmit."
                url={`/admin/kyc/${kyc.uuid}/reject`}
                fields={[{ name: 'reason', label: 'Reason shown to the creator', required: true, multiline: true, placeholder: 'e.g. PAN name does not match the bank account' }]}
                confirmLabel="Reject"
                tone="danger"
            />
        </AdminLayout>
    );
}
