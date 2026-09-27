import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BadgeCheck, Check, Clock, FileText, Info, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Payments', href: '/dashboard/payments' },
    { title: 'KYC verification', href: '/dashboard/payments/account/kyc' },
];

type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

interface KycDetails {
    status: KycStatus;
    legal_name?: string;
    pan_number?: string | null;
    gst_number?: string | null;
    bank_account_holder?: string | null;
    bank_account_number?: string | null;
    ifsc?: string | null;
    has_document?: boolean;
    rejection_reason?: string | null;
    submitted_at?: string | null;
    verified_at?: string | null;
}

const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';
const INPUT_CLASS = 'h-10 border-[#E4E2DA] shadow-sm focus-visible:ring-[#4F46E5]/15';

const STATUS_META: Record<KycStatus, { label: string; chip: string; banner: string; title: string; body: string }> = {
    not_started: {
        label: 'Not started',
        chip: 'bg-[#F0EFEA] text-[#6B6B78]',
        banner: 'bg-[#F6F5F2] text-[#4B4B57]',
        title: 'Verify your PAN and bank account to unlock settlements',
        body: 'Until then, your earnings are held safely and will be settled once you are verified.',
    },
    pending: {
        label: 'Pending',
        chip: 'bg-[#FFF4DB] text-[#B46E00]',
        banner: 'bg-[#FFF4DB] text-[#B46E00]',
        title: 'Your KYC is under review',
        body: 'Reviews usually take 24–48 hours. Settlements start automatically once approved.',
    },
    verified: {
        label: 'Verified',
        chip: 'bg-[#E6F6EC] text-[#059669]',
        banner: 'bg-[#E6F6EC] text-[#059669]',
        title: 'Your KYC is verified',
        body: 'Your PAN and bank details are verified. Settlements are unlocked.',
    },
    rejected: {
        label: 'Rejected',
        chip: 'bg-[#FFEDE8] text-[#C2410C]',
        banner: 'bg-[#FFEDE8] text-[#C2410C]',
        title: 'Your KYC was not approved',
        body: 'Please correct your details below and submit again.',
    },
};

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <span className="text-xs text-[#D93838]">{message}</span>;
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-[#F6F5F2]/60 p-3">
            <span className="text-[13px] text-[#8A8A96]">{label}</span>
            <span className={cn('truncate text-[13px] font-semibold text-[#14141B]', mono && 'font-mono text-xs')}>{value || '—'}</span>
        </div>
    );
}

export default function PaymentsKyc({ kyc }: { kyc: KycDetails }) {
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };
    const status = kyc.status ?? 'not_started';
    const meta = STATUS_META[status];
    const canSubmit = status === 'not_started' || status === 'rejected';

    // PAN / account number masked aate hain — rejected pe dobara type karwana padega
    const [form, setForm] = useState({
        legal_name: kyc.legal_name ?? '',
        pan_number: '',
        gst_number: kyc.gst_number ?? '',
        bank_account_holder: kyc.bank_account_holder ?? '',
        bank_account_number: '',
        ifsc: kyc.ifsc ?? '',
    });
    const [idDocument, setIdDocument] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [password, setPassword] = useState('');

    const needsDocument = !kyc.has_document;
    const ready =
        form.legal_name.trim() &&
        form.pan_number.trim() &&
        form.bank_account_holder.trim() &&
        form.bank_account_number.trim() &&
        form.ifsc.trim() &&
        password &&
        (!needsDocument || idDocument);

    function submit(e: FormEvent) {
        e.preventDefault();
        if (!ready || saving) return;

        setSaving(true);
        router.post(
            '/dashboard/payments/account/kyc',
            {
                ...form,
                pan_number: form.pan_number.trim().toUpperCase(),
                gst_number: form.gst_number.trim().toUpperCase() || null,
                ifsc: form.ifsc.trim().toUpperCase(),
                ...(idDocument ? { id_document: idDocument } : {}),
                current_password: password,
            },
            { forceFormData: true, preserveScroll: true, onFinish: () => setSaving(false) },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="KYC verification" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <Link
                        href="/dashboard/payments/account"
                        className="flex w-fit items-center gap-1.5 text-xs font-semibold text-[#8A8A96] transition hover:text-[#14141B]"
                    >
                        <ArrowLeft className="size-3.5" /> Back to payout account
                    </Link>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">KYC verification</h1>
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase', meta.chip)}>
                                {meta.label}
                            </span>
                        </div>
                        <p className="text-sm text-[#8A8A96]">We need your PAN, bank account and an ID document to release settlements.</p>
                    </div>

                    <div className={cn('flex items-start gap-3 rounded-xl p-4', meta.banner)}>
                        {status === 'verified' ? (
                            <BadgeCheck className="mt-0.5 size-5 shrink-0" />
                        ) : status === 'pending' ? (
                            <Clock className="mt-0.5 size-5 shrink-0" />
                        ) : status === 'rejected' ? (
                            <Info className="mt-0.5 size-5 shrink-0" />
                        ) : (
                            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                        )}
                        <div>
                            <p className="text-sm font-semibold">{meta.title}</p>
                            <p className="mt-0.5 text-xs opacity-90">{meta.body}</p>
                            {status === 'rejected' && kyc.rejection_reason && (
                                <p className="mt-2 text-xs font-semibold">Reason: {kyc.rejection_reason}</p>
                            )}
                        </div>
                    </div>

                    {canSubmit ? (
                        <form onSubmit={submit} className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-[#14141B]">Identity</h2>
                            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <Label htmlFor="legal_name" className={LABEL_CLASS}>
                                        Legal name <span className="text-[#D93838]">*</span>
                                    </Label>
                                    <Input
                                        id="legal_name"
                                        value={form.legal_name}
                                        onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                                        placeholder="As per PAN card"
                                        className={INPUT_CLASS}
                                    />
                                    <FieldError message={errors.legal_name} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="pan_number" className={LABEL_CLASS}>
                                        PAN <span className="text-[#D93838]">*</span>
                                    </Label>
                                    <Input
                                        id="pan_number"
                                        value={form.pan_number}
                                        onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className={cn(INPUT_CLASS, 'font-mono uppercase')}
                                    />
                                    <FieldError message={errors.pan_number} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="gst_number" className={LABEL_CLASS}>
                                        GSTIN <span className="font-normal tracking-normal text-[#8A8A96] normal-case">(optional)</span>
                                    </Label>
                                    <Input
                                        id="gst_number"
                                        value={form.gst_number}
                                        onChange={(e) => setForm({ ...form, gst_number: e.target.value.toUpperCase() })}
                                        placeholder="22ABCDE1234F1Z5"
                                        maxLength={15}
                                        className={cn(INPUT_CLASS, 'font-mono uppercase')}
                                    />
                                    <FieldError message={errors.gst_number} />
                                </div>
                            </div>

                            <h2 className="mt-8 text-base font-semibold text-[#14141B]">Bank account</h2>
                            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="flex flex-col gap-1.5 md:col-span-2">
                                    <Label htmlFor="bank_account_holder" className={LABEL_CLASS}>
                                        Account holder name <span className="text-[#D93838]">*</span>
                                    </Label>
                                    <Input
                                        id="bank_account_holder"
                                        value={form.bank_account_holder}
                                        onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })}
                                        placeholder="As per bank records"
                                        className={INPUT_CLASS}
                                    />
                                    <FieldError message={errors.bank_account_holder} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="bank_account_number" className={LABEL_CLASS}>
                                        Account number <span className="text-[#D93838]">*</span>
                                    </Label>
                                    <Input
                                        id="bank_account_number"
                                        value={form.bank_account_number}
                                        onChange={(e) => setForm({ ...form, bank_account_number: e.target.value.replace(/\D/g, '') })}
                                        placeholder="501002…"
                                        inputMode="numeric"
                                        className={cn(INPUT_CLASS, 'font-mono')}
                                    />
                                    <FieldError message={errors.bank_account_number} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="ifsc" className={LABEL_CLASS}>
                                        IFSC <span className="text-[#D93838]">*</span>
                                    </Label>
                                    <Input
                                        id="ifsc"
                                        value={form.ifsc}
                                        onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
                                        placeholder="HDFC0001234"
                                        maxLength={11}
                                        className={cn(INPUT_CLASS, 'font-mono uppercase')}
                                    />
                                    <FieldError message={errors.ifsc} />
                                </div>
                            </div>

                            <h2 className="mt-8 text-base font-semibold text-[#14141B]">ID document</h2>
                            <label
                                htmlFor="id_document"
                                className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] p-4 transition hover:border-[#4F46E5]/50"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#4F46E5] shadow-sm">
                                    {idDocument ? <FileText className="size-5" /> : <Upload className="size-5" />}
                                </span>
                                <div className="min-w-0">
                                    <span className="block truncate text-[13px] font-semibold text-[#14141B]">
                                        {idDocument
                                            ? idDocument.name
                                            : kyc.has_document
                                              ? 'Document already uploaded — choose a file to replace it'
                                              : 'Upload PAN card or Aadhaar'}
                                    </span>
                                    <span className="text-xs text-[#8A8A96]">JPG, PNG or PDF · 5 MB max</span>
                                </div>
                                <input
                                    id="id_document"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="sr-only"
                                    onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
                                />
                            </label>
                            <FieldError message={errors.id_document} />

                            <div className="mt-6 flex max-w-sm flex-col gap-1.5">
                                <Label htmlFor="kyc_password" className={LABEL_CLASS}>
                                    Your account password <span className="text-[#D93838]">*</span>
                                </Label>
                                <Input
                                    id="kyc_password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Confirm it's you"
                                    className={INPUT_CLASS}
                                />
                                <FieldError message={errors.current_password} />
                            </div>

                            <Button type="submit" disabled={!ready || saving} className="mt-6 bg-[#4F46E5] hover:bg-[#4338CA]">
                                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                {saving ? 'Submitting…' : 'Submit for verification'}
                            </Button>
                            <p className="mt-2 text-[11px] text-[#8A8A96]">Your documents are stored privately and only used for verification.</p>
                        </form>
                    ) : (
                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="text-base font-semibold text-[#14141B]">Submitted details</h2>
                            <div className="mt-4 flex flex-col gap-2">
                                <DetailRow label="Legal name" value={kyc.legal_name} />
                                <DetailRow label="PAN" value={kyc.pan_number} mono />
                                <DetailRow label="GSTIN" value={kyc.gst_number} mono />
                                <DetailRow label="Account holder" value={kyc.bank_account_holder} />
                                <DetailRow label="Account number" value={kyc.bank_account_number} mono />
                                <DetailRow label="IFSC" value={kyc.ifsc} mono />
                                <DetailRow label="ID document" value={kyc.has_document ? 'Uploaded' : 'Not uploaded'} />
                                <DetailRow label="Submitted" value={formatDate(kyc.submitted_at)} />
                                {status === 'verified' && <DetailRow label="Verified" value={formatDate(kyc.verified_at)} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
