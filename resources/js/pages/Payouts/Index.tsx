import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    BadgeCheck,
    Banknote,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    Copy,
    Hourglass,
    Inbox,
    Info,
    Landmark,
    Loader2,
    Plus,
    ShieldCheck,
    Smartphone,
    TrendingUp,
    Wallet,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payouts', href: '/dashboard/payouts' }];

type MethodType = 'upi' | 'bank_transfer';
type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

interface PayoutMethod {
    id: number;
    type: MethodType;
    upi_id: string | null;
    account_holder_name: string | null;
    account_number: string | null;
    ifsc: string | null;
    is_default: boolean;
}

interface PayoutRow {
    id: number;
    amount: string | number;
    status: string;
    reference_number: string | null;
    notes: string | null;
    requested_at: string | null;
    processed_at: string | null;
    payout_method: PayoutMethod | null;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface PayoutBalance {
    earned: number;
    paid_out: number;
    in_process: number;
    available: number;
}

interface PayoutsIndexProps {
    balance: PayoutBalance;
    payouts: Paginated<PayoutRow>;
    methods: PayoutMethod[];
    kycStatus: KycStatus;
    minPayout: number;
}

const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
    pending: { label: 'Pending', chip: 'bg-[#FFF4DB] text-[#B46E00]', dot: 'bg-amber-500 animate-pulse' },
    processing: { label: 'Processing', chip: 'bg-[#E6F2FF] text-[#0284C7]', dot: 'bg-sky-500 animate-pulse' },
    paid: { label: 'Paid', chip: 'bg-[#E6F6EC] text-[#059669]', dot: 'bg-[#059669]' },
    failed: { label: 'Failed', chip: 'bg-[#FFEDE8] text-[#C2410C]', dot: 'bg-[#FF6B4A]' },
    rejected: { label: 'Rejected', chip: 'bg-[#FFEDE8] text-[#C2410C]', dot: 'bg-[#FF6B4A]' },
    cancelled: { label: 'Cancelled', chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' },
};

const FAILED_STATUSES = ['failed', 'rejected', 'cancelled'];

function statusMeta(status: string) {
    return STATUS_META[status] ?? { label: status.charAt(0).toUpperCase() + status.slice(1), chip: 'bg-[#F0EFEA] text-[#6B6B78]', dot: 'bg-current' };
}

const KYC_BANNER: Record<Exclude<KycStatus, 'verified'>, { title: string; body: string; cta: string; tone: string; icon: React.ReactNode }> = {
    not_started: {
        title: 'Complete KYC to unlock payouts',
        body: 'Verify your PAN and bank details once — then you can withdraw your earnings anytime.',
        cta: 'Start KYC verification',
        tone: 'bg-[#FFF4DB] text-[#B46E00]',
        icon: <ShieldCheck className="size-5" />,
    },
    pending: {
        title: 'KYC is under review',
        body: 'You can request payouts as soon as your verification is approved.',
        cta: 'View KYC status',
        tone: 'bg-[#FFF4DB] text-[#B46E00]',
        icon: <Clock className="size-5" />,
    },
    rejected: {
        title: 'KYC needs your attention',
        body: 'Your verification was not approved. Please review the details and re-submit.',
        cta: 'Fix KYC details',
        tone: 'bg-[#FFEDE8] text-[#C2410C]',
        icon: <Info className="size-5" />,
    },
};

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/** formatCurrency() rounds to whole rupees — payouts need paise, so show decimals when present. */
function money(amount: number | string): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount) || 0);
}

function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    if (sameDay(d, today)) return `Today, ${time}`;
    if (sameDay(d, yesterday)) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })}, ${time}`;
}

function fullDateTime(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function maskAccount(no: string | null) {
    return no ? `•••• ${no.slice(-4)}` : '••••';
}

function methodTitle(m: PayoutMethod | null) {
    if (!m) return 'Method removed';
    return m.type === 'upi' ? (m.upi_id ?? 'UPI') : `Bank ${maskAccount(m.account_number)}`;
}

function methodSub(m: PayoutMethod | null) {
    if (!m) return '—';
    return m.type === 'upi' ? 'UPI' : [m.account_holder_name, m.ifsc].filter(Boolean).join(' · ') || 'Bank transfer';
}

function MethodIcon({ type, className }: { type?: MethodType; className?: string }) {
    const Icon = type === 'bank_transfer' ? Landmark : type === 'upi' ? Smartphone : Wallet;
    return <Icon className={className ?? 'size-4'} />;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Store / Payments)                      */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value}</span>
            <span className="mt-1 text-xs text-[#8A8A96]">{sub}</span>
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    const meta = statusMeta(status);
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', meta.chip)}>
            <span className={cn('size-1.5 rounded-full', meta.dot)} /> {meta.label}
        </span>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <span className="text-xs text-[#D93838]">{message}</span>;
}

function MetaRow({ label, value, mono, copy, copied }: { label: string; value: string; mono?: boolean; copy?: () => void; copied?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F5F2]/60 p-2.5">
            <span className="text-[13px] text-[#8A8A96]">{label}</span>
            <div className="flex items-center gap-1">
                <span className={cn('max-w-[200px] truncate text-[13px] font-semibold text-[#14141B]', mono && 'font-mono text-xs')}>{value}</span>
                {copy && (
                    <button onClick={copy} className="p-0.5 text-[#8A8A96] hover:text-[#14141B]" title="Copy">
                        {copied ? <Check className="size-3.5 text-[#059669]" /> : <Copy className="size-3.5" />}
                    </button>
                )}
            </div>
        </div>
    );
}

function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return (
        <>
            <div onClick={onClose} className={cn('fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'pointer-events-none opacity-0')} />
            <div
                className={cn(
                    'fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col justify-between overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out',
                    open ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <div className="flex flex-col gap-5 p-6">
                    <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 pb-4">
                        <span className="text-base font-semibold text-[#14141B]">{title}</span>
                        <button onClick={onClose} className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F0EFEA] hover:text-[#14141B]">
                            <X className="size-5" />
                        </button>
                    </div>
                    {children}
                </div>
                {footer && <div className="flex flex-col gap-2 border-t border-[#E4E2DA] bg-white p-5">{footer}</div>}
            </div>
        </>
    );
}

function InlineAlert({ tone, icon, children }: { tone: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className={cn('flex items-start gap-2.5 rounded-xl p-3.5 text-[13px] font-medium', tone)}>
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div>{children}</div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  REQUEST PAYOUT DRAWER                                              */
/* ------------------------------------------------------------------ */

function RequestDrawer({
    open,
    onClose,
    onSuccess,
    balance,
    methods,
    minPayout,
    kycStatus,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: (amount: number) => void;
    balance: PayoutBalance;
    methods: PayoutMethod[];
    minPayout: number;
    kycStatus: KycStatus;
}) {
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };
    const available = Number(balance.available) || 0;
    const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];

    const [amount, setAmount] = useState('');
    const [methodId, setMethodId] = useState<number | null>(defaultMethod?.id ?? null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // server errors stay in page props until the next visit — only show them until the user edits again
    const [dirty, setDirty] = useState(true);

    useEffect(() => {
        if (!open) return;
        setAmount('');
        setNotes('');
        setMethodId((methods.find((m) => m.is_default) ?? methods[0])?.id ?? null);
        setDirty(true);
    }, [open, methods]);

    const kycVerified = kycStatus === 'verified';
    const amountNum = Number(amount) || 0;
    const clientError =
        amount === '' ? undefined : amountNum < minPayout ? `Minimum payout is ${money(minPayout)}.` : amountNum > available ? 'Amount exceeds your available balance.' : undefined;
    const amountError = clientError ?? (dirty ? undefined : errors.amount);
    const canSubmit = kycVerified && methodId !== null && amountNum >= minPayout && amountNum <= available && !submitting;

    function onAmountChange(value: string) {
        const cleaned = value.replace(/[^\d.]/g, '');
        const [whole, ...rest] = cleaned.split('.');
        setAmount(rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole);
        setDirty(true);
    }

    function fill(value: number) {
        setAmount(String(Number(value.toFixed(2))));
        setDirty(true);
    }

    function submit() {
        if (!canSubmit) return;
        setSubmitting(true);
        setDirty(false);
        router.post(
            '/dashboard/payouts',
            { amount: amountNum, payout_method_id: methodId, notes: notes.trim() || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onSuccess(amountNum);
                    onClose();
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    const halfAmount = Math.floor((available / 2) * 100) / 100;
    const chips = [
        { label: `Min ${money(minPayout)}`, value: minPayout, show: available >= minPayout },
        { label: '50%', value: halfAmount, show: halfAmount >= minPayout && halfAmount < available },
        { label: 'Max', value: available, show: available >= minPayout },
    ].filter((c) => c.show);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Request Payout"
            footer={
                <>
                    <Button onClick={submit} disabled={!canSubmit} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]">
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
                        {submitting ? 'Requesting…' : amountNum >= minPayout && amountNum <= available ? `Request ${money(amountNum)}` : 'Request payout'}
                    </Button>
                    <p className="text-center text-[11px] text-[#8A8A96]">The requested amount is reserved from your balance right away.</p>
                </>
            }
        >
            <div className="flex items-center justify-between rounded-xl bg-[#F6F5F2] p-4">
                <div>
                    <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Available to withdraw</span>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-[#14141B]">{money(available)}</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                    <Wallet className="size-5" />
                </span>
            </div>

            {!kycVerified && (
                <InlineAlert tone="bg-[#FFF4DB] text-[#B46E00]" icon={<ShieldCheck className="size-[18px]" />}>
                    Complete KYC verification before requesting a payout.{' '}
                    <Link href="/dashboard/payments/account/kyc" className="font-semibold underline">
                        Go to KYC
                    </Link>
                </InlineAlert>
            )}
            {kycVerified && methods.length === 0 && (
                <InlineAlert tone="bg-[#FFF4DB] text-[#B46E00]" icon={<Wallet className="size-[18px]" />}>
                    Add a UPI ID or bank account first.{' '}
                    <Link href="/dashboard/payments/account" className="font-semibold underline">
                        Add payout method
                    </Link>
                </InlineAlert>
            )}
            {kycVerified && methods.length > 0 && available < minPayout && (
                <InlineAlert tone="bg-[#F0EFEA] text-[#4B4B57]" icon={<Info className="size-[18px]" />}>
                    You need at least {money(minPayout)} available to request a payout.
                </InlineAlert>
            )}

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="payout_amount" className={LABEL_CLASS}>
                    Amount <span className="text-[#D93838]">*</span>
                </Label>
                <div className="relative">
                    <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-base font-semibold text-[#8A8A96]">₹</span>
                    <input
                        id="payout_amount"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => onAmountChange(e.target.value)}
                        placeholder="0"
                        disabled={!kycVerified || methods.length === 0}
                        className={cn(
                            'h-11 w-full rounded-lg border bg-white pr-3 pl-8 text-base font-semibold text-[#14141B] shadow-sm transition outline-none placeholder:font-normal placeholder:text-[#8A8A96] disabled:cursor-not-allowed disabled:bg-[#F6F5F2]',
                            amountError ? 'border-[#D93838] focus:ring-2 focus:ring-[#D93838]/15' : 'border-[#E4E2DA] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15',
                        )}
                    />
                </div>
                {chips.length > 0 && kycVerified && (
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {chips.map((c) => (
                            <button
                                key={c.label}
                                type="button"
                                onClick={() => fill(c.value)}
                                className="rounded-full bg-[#F6F5F2] px-2.5 py-1 text-[11px] font-semibold text-[#4B4B57] transition hover:bg-[#EEF2FF] hover:text-[#4F46E5]"
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                )}
                {amountError ? <FieldError message={amountError} /> : <span className="text-[11px] text-[#8A8A96]">Minimum {money(minPayout)} per request.</span>}
            </div>

            {/* Method */}
            <div className="flex flex-col gap-1.5">
                <Label className={LABEL_CLASS}>Send to</Label>
                {methods.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#E4E2DA] bg-[#FAF9F5] p-4 text-center text-xs text-[#8A8A96]">No payout method added yet.</div>
                ) : (
                    <div role="radiogroup" className="flex flex-col gap-2">
                        {methods.map((m) => {
                            const active = methodId === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => {
                                        setMethodId(m.id);
                                        setDirty(true);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                                        active ? 'border-[#4F46E5] bg-[#EEF2FF]' : 'border-[#E4E2DA] bg-white hover:bg-[#F6F5F2]',
                                    )}
                                >
                                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-white text-[#4F46E5]' : 'bg-[#F6F5F2] text-[#8A8A96]')}>
                                        <MethodIcon type={m.type} className="size-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-semibold text-[#14141B]">{methodTitle(m)}</span>
                                        <span className="block truncate text-xs text-[#8A8A96]">{methodSub(m)}</span>
                                    </span>
                                    {m.is_default && <span className="rounded-full bg-[#4F46E5] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">Default</span>}
                                    <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#E4E2DA]')}>
                                        {active && <Check className="size-3" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
                <FieldError message={dirty ? undefined : errors.payout_method_id} />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="payout_notes" className={LABEL_CLASS}>
                        Note
                    </Label>
                    <span className="text-[11px] text-[#8A8A96]">{notes.length}/255</span>
                </div>
                <textarea
                    id="payout_notes"
                    value={notes}
                    maxLength={255}
                    rows={2}
                    onChange={(e) => {
                        setNotes(e.target.value);
                        setDirty(true);
                    }}
                    placeholder="Optional — anything we should know?"
                    className="w-full resize-none rounded-lg border border-[#E4E2DA] bg-white px-3 py-2 text-sm text-[#14141B] shadow-sm outline-none placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                />
                <FieldError message={dirty ? undefined : errors.notes} />
            </div>

            {/* Summary */}
            {amountNum >= minPayout && amountNum <= available && (
                <div className="flex flex-col gap-2 rounded-xl bg-[#F6F5F2] p-4 text-[13px] text-[#6B6B78]">
                    <div className="flex items-center justify-between">
                        <span>Payout amount</span>
                        <span className="font-semibold text-[#14141B]">{money(amountNum)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Balance after request</span>
                        <span className="font-semibold text-[#14141B]">{money(Math.max(available - amountNum, 0))}</span>
                    </div>
                </div>
            )}
        </Drawer>
    );
}

/* ------------------------------------------------------------------ */
/*  PAYOUT DETAIL DRAWER                                               */
/* ------------------------------------------------------------------ */

function DetailDrawer({ payout, open, onClose }: { payout: PayoutRow | null; open: boolean; onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    function copyRef(ref: string) {
        navigator.clipboard?.writeText(ref);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    const failed = payout ? FAILED_STATUSES.includes(payout.status) : false;
    const stage = payout?.status === 'paid' ? 2 : payout?.status === 'processing' ? 1 : 0;

    const steps = payout
        ? failed
            ? [
                  { label: 'Requested', at: payout.requested_at, state: 'done' as const },
                  { label: statusMeta(payout.status).label, at: payout.processed_at, state: 'fail' as const },
              ]
            : [
                  { label: 'Requested', at: payout.requested_at, state: 'done' as const },
                  { label: 'Processing', at: null, state: stage > 1 ? ('done' as const) : stage === 1 ? ('current' as const) : ('todo' as const) },
                  { label: 'Paid', at: payout.processed_at, state: stage === 2 ? ('done' as const) : ('todo' as const) },
              ]
        : [];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title="Payout Details"
            footer={
                <Button variant="outline" onClick={onClose} className="w-full border-[#E4E2DA]">
                    Close
                </Button>
            }
        >
            {payout && (
                <>
                    <div
                        className={cn(
                            'flex items-center justify-between rounded-xl p-3 text-[13px] font-semibold',
                            payout.status === 'paid' ? 'bg-[#E6F6EC] text-[#059669]' : failed ? 'bg-[#FFEDE8] text-[#C2410C]' : payout.status === 'processing' ? 'bg-[#E6F2FF] text-[#0284C7]' : 'bg-[#FFF4DB] text-[#B46E00]',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {payout.status === 'paid' ? <CheckCircle2 className="size-[18px]" /> : failed ? <XCircle className="size-[18px]" /> : <Hourglass className="size-[18px]" />}
                            {payout.status === 'paid' ? 'Payout sent' : failed ? `Payout ${statusMeta(payout.status).label.toLowerCase()}` : payout.status === 'processing' ? 'Payout processing' : 'Awaiting processing'}
                        </div>
                    </div>

                    <div className="rounded-xl bg-[#F6F5F2] p-4 text-center">
                        <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Amount</span>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-[#14141B]">{money(payout.amount)}</p>
                        {failed && <p className="mt-1 text-xs text-[#8A8A96]">This amount has been returned to your available balance.</p>}
                    </div>

                    {/* Timeline */}
                    <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Progress</span>
                        <ol className="flex flex-col">
                            {steps.map((step, i) => (
                                <li key={step.label} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <span
                                            className={cn(
                                                'flex size-6 shrink-0 items-center justify-center rounded-full',
                                                step.state === 'done' && 'bg-[#E6F6EC] text-[#059669]',
                                                step.state === 'current' && 'bg-[#E6F2FF] text-[#0284C7]',
                                                step.state === 'fail' && 'bg-[#FFEDE8] text-[#C2410C]',
                                                step.state === 'todo' && 'bg-[#F0EFEA] text-[#8A8A96]',
                                            )}
                                        >
                                            {step.state === 'done' ? <Check className="size-3.5" /> : step.state === 'fail' ? <X className="size-3.5" /> : step.state === 'current' ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
                                        </span>
                                        {i < steps.length - 1 && <span className={cn('my-1 w-px flex-1', step.state === 'done' ? 'bg-[#059669]/30' : 'bg-[#E4E2DA]')} />}
                                    </div>
                                    <div className="pb-4">
                                        <p className={cn('text-[13px] font-semibold', step.state === 'todo' ? 'text-[#8A8A96]' : 'text-[#14141B]')}>{step.label}</p>
                                        {step.at && <p className="text-xs text-[#8A8A96]">{fullDateTime(step.at)}</p>}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Payout Metadata</span>
                        <MetaRow label="Payout ID" value={`PO-${String(payout.id).padStart(6, '0')}`} mono />
                        <MetaRow label="Status" value={statusMeta(payout.status).label} />
                        <MetaRow
                            label="Reference / UTR"
                            value={payout.reference_number ?? 'Not available yet'}
                            mono={Boolean(payout.reference_number)}
                            copy={payout.reference_number ? () => copyRef(payout.reference_number as string) : undefined}
                            copied={copied}
                        />
                        <MetaRow label="Requested" value={fullDateTime(payout.requested_at)} />
                        {payout.processed_at && <MetaRow label="Processed" value={fullDateTime(payout.processed_at)} />}
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Destination</span>
                        <div className="flex items-center gap-3 rounded-xl bg-[#F6F5F2] p-3">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-[#4F46E5]">
                                <MethodIcon type={payout.payout_method?.type} className="size-4" />
                            </span>
                            <div className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-[#14141B]">{methodTitle(payout.payout_method)}</span>
                                <span className="block truncate text-xs text-[#6B6B78]">{methodSub(payout.payout_method)}</span>
                            </div>
                        </div>
                    </div>

                    {payout.notes && (
                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Your Note</span>
                            <p className="rounded-xl bg-[#F6F5F2] p-3 text-[13px] break-words text-[#4B4B57]">{payout.notes}</p>
                        </div>
                    )}
                </>
            )}
        </Drawer>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function PayoutsIndex({ balance, payouts, methods, kycStatus, minPayout }: PayoutsIndexProps) {
    const [requestOpen, setRequestOpen] = useState(false);
    const [selected, setSelected] = useState<PayoutRow | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 6000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const kycVerified = kycStatus === 'verified';
    const hasMethods = methods.length > 0;
    const canRequest = kycVerified && hasMethods;
    const kycBanner = kycVerified ? null : KYC_BANNER[kycStatus] ?? KYC_BANNER.not_started;
    const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];

    function goToPage(page: number) {
        router.get('/dashboard/payouts', { page }, { preserveState: true, preserveScroll: true });
    }

    function openDetail(row: PayoutRow) {
        setSelected(row);
        setDetailOpen(true);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payouts" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Payouts</h1>
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">Live Sync</span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">Withdraw your earnings and track every payout request.</p>
                        </div>
                        <Button
                            onClick={() => setRequestOpen(true)}
                            disabled={!canRequest}
                            title={!canRequest ? 'Complete KYC and add a payout method first' : undefined}
                            className="w-fit bg-[#4F46E5] hover:bg-[#4338CA]"
                        >
                            <Plus className="size-4" /> Request payout
                        </Button>
                    </div>

                    {/* Success notice */}
                    {notice && (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#E6F6EC] p-3.5 text-[13px] font-semibold text-[#059669]">
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="size-[18px]" /> {notice}
                            </span>
                            <button onClick={() => setNotice(null)} className="rounded p-0.5 hover:bg-white/60">
                                <X className="size-4" />
                            </button>
                        </div>
                    )}

                    {/* Blockers */}
                    {kycBanner && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', kycBanner.tone)}>{kycBanner.icon}</span>
                                <div>
                                    <p className="text-sm font-semibold text-[#14141B]">{kycBanner.title}</p>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">{kycBanner.body}</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account/kyc"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white transition hover:bg-[#4338CA]"
                            >
                                {kycBanner.cta}
                            </Link>
                        </div>
                    )}
                    {kycVerified && !hasMethods && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E1F6F3] text-[#0D9488]">
                                    <Wallet className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-[#14141B]">Add a payout method</p>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">Tell us where to send your money — a UPI ID or a bank account.</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/payments/account"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white transition hover:bg-[#4338CA]"
                            >
                                Add payout method
                            </Link>
                        </div>
                    )}

                    {/* KPI cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Available Balance" value={money(balance.available)} sub={`Min. payout ${money(minPayout)}`} icon={<Wallet className="size-3.5" />} tone="bg-[#EEF2FF] text-[#4F46E5]" />
                        <KpiCard label="In Process" value={money(balance.in_process)} sub="Pending & processing requests" icon={<Hourglass className="size-3.5" />} tone="bg-[#FFF4DB] text-[#B46E00]" />
                        <KpiCard label="Paid Out" value={money(balance.paid_out)} sub="Transferred to your account" icon={<BadgeCheck className="size-3.5" />} tone="bg-[#E6F6EC] text-[#059669]" />
                        <KpiCard label="Total Earned" value={money(balance.earned)} sub="Net of platform fees" icon={<TrendingUp className="size-3.5" />} tone="bg-[#E1F6F3] text-[#0D9488]" />
                    </div>

                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        {/* Payout history */}
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-[#E4E2DA]/70 px-6 py-4">
                                <div>
                                    <h2 className="text-base font-semibold text-[#14141B]">Payout history</h2>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">
                                        {payouts.total > 0 ? `Showing ${payouts.from ?? 0}–${payouts.to ?? 0} of ${payouts.total} requests` : 'Your payout requests will show up here'}
                                    </p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-[#F6F5F2]/60 text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                            <th className="px-6 py-3">Requested</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3">Method</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                            <th className="px-4 py-3">Reference</th>
                                            <th className="px-6 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E4E2DA]/50">
                                        {payouts.data.length === 0 && <TableEmptyState canRequest={canRequest} onRequest={() => setRequestOpen(true)} />}
                                        {payouts.data.map((row) => (
                                            <tr key={row.id} onClick={() => openDetail(row)} className="group cursor-pointer transition hover:bg-[#F6F5F2]/60">
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <span className="block text-[13px] font-semibold text-[#14141B]">{formatDateTime(row.requested_at)}</span>
                                                    <span className="text-xs text-[#8A8A96]">PO-{String(row.id).padStart(6, '0')}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right text-[15px] font-bold whitespace-nowrap text-[#14141B]">{money(row.amount)}</td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F6F5F2] text-[#8A8A96]">
                                                            <MethodIcon type={row.payout_method?.type} className="size-4" />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <span className="block max-w-[180px] truncate text-[13px] font-semibold text-[#14141B] group-hover:text-[#4F46E5]">{methodTitle(row.payout_method)}</span>
                                                            <span className="block text-xs text-[#8A8A96]">{row.payout_method?.type === 'bank_transfer' ? 'Bank transfer' : row.payout_method ? 'UPI' : '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <StatusPill status={row.status} />
                                                </td>
                                                <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-[#6B6B78]">{row.reference_number ?? '—'}</td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <ChevronRight className="ml-auto size-4 text-[#8A8A96] transition group-hover:translate-x-0.5 group-hover:text-[#14141B]" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {payouts.total > 0 && (
                                <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E4E2DA]/60 p-4 sm:flex-row">
                                    <p className="text-xs text-[#8A8A96]">
                                        Page <span className="font-semibold text-[#14141B]">{payouts.current_page}</span> of <span className="font-semibold text-[#14141B]">{payouts.last_page}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" disabled={payouts.current_page <= 1} onClick={() => goToPage(payouts.current_page - 1)} className="border-[#E4E2DA]">
                                            Previous
                                        </Button>
                                        <Button variant="outline" size="sm" disabled={payouts.current_page >= payouts.last_page} onClick={() => goToPage(payouts.current_page + 1)} className="border-[#E4E2DA]">
                                            Next <ArrowUpRight className="size-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Side cards */}
                        <div className="flex flex-col gap-5">
                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[#14141B]">Payout destination</h3>
                                    <Link href="/dashboard/payments/account" className="text-xs font-semibold text-[#4F46E5] hover:underline">
                                        {hasMethods ? 'Manage' : 'Add'}
                                    </Link>
                                </div>
                                {hasMethods ? (
                                    <div className="mt-4 flex flex-col gap-2">
                                        {methods.map((m) => (
                                            <div key={m.id} className="flex items-center gap-3 rounded-lg bg-[#F6F5F2] p-3">
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#4F46E5]">
                                                    <MethodIcon type={m.type} className="size-4" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-[#14141B]">{methodTitle(m)}</span>
                                                    <span className="block truncate text-xs text-[#8A8A96]">{methodSub(m)}</span>
                                                </div>
                                                {m.id === defaultMethod?.id && <span className="rounded-full bg-[#E6F6EC] px-2 py-0.5 text-[10px] font-semibold text-[#059669]">Default</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-[#8A8A96]">No payout method yet. Add a UPI ID or bank account to get paid.</p>
                                )}
                            </div>

                            <div className="rounded-xl bg-white p-5 shadow-sm">
                                <h3 className="text-sm font-semibold text-[#14141B]">How payouts work</h3>
                                <ul className="mt-4 flex flex-col gap-3.5">
                                    {[
                                        { icon: <ShieldCheck className="size-4" />, tone: 'bg-[#F1EAFE] text-[#7C3AED]', text: 'KYC must be verified before you can request a payout.' },
                                        { icon: <Banknote className="size-4" />, tone: 'bg-[#EEF2FF] text-[#4F46E5]', text: `Minimum ${money(minPayout)} per request, up to your available balance.` },
                                        { icon: <Wallet className="size-4" />, tone: 'bg-[#FFF4DB] text-[#B46E00]', text: 'Requested money is reserved from your balance immediately.' },
                                        { icon: <TrendingUp className="size-4" />, tone: 'bg-[#E1F6F3] text-[#0D9488]', text: 'Balance = net earnings from paid orders minus payouts already requested or paid.' },
                                    ].map((item) => (
                                        <li key={item.text} className="flex items-start gap-3">
                                            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', item.tone)}>{item.icon}</span>
                                            <span className="text-xs leading-relaxed text-[#6B6B78]">{item.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <RequestDrawer
                open={requestOpen}
                onClose={() => setRequestOpen(false)}
                onSuccess={(amt) => setNotice(`Payout request of ${money(amt)} submitted.`)}
                balance={balance}
                methods={methods}
                minPayout={minPayout}
                kycStatus={kycStatus}
            />
            <DetailDrawer payout={selected} open={detailOpen} onClose={() => setDetailOpen(false)} />
        </AppLayout>
    );
}

function TableEmptyState({ canRequest, onRequest }: { canRequest: boolean; onRequest: () => void }) {
    return (
        <tr>
            <td colSpan={6} className="px-6 py-8">
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">
                        <Inbox className="size-5" />
                    </span>
                    <p className="mt-1 text-sm font-semibold text-[#14141B]">No payouts yet</p>
                    <p className="max-w-xs px-4 text-xs text-[#8A8A96]">Once you request a withdrawal, it will appear here with live status updates.</p>
                    {canRequest && (
                        <Button size="sm" onClick={onRequest} className="mt-3 bg-[#4F46E5] hover:bg-[#4338CA]">
                            <Plus className="size-4" /> Request your first payout
                        </Button>
                    )}
                </div>
            </td>
        </tr>
    );
}