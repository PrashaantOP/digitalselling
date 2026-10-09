import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, Check, Clock, Landmark, Loader2, ShieldCheck, Smartphone, UserRound, Wallet } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Payments', href: '/dashboard/payments' },
    { title: 'Account', href: '/dashboard/payments/account' },
];

type Section = 'profile' | 'payout' | 'kyc';
type MethodType = 'upi' | 'bank_transfer';
type KycStatus = 'not_started' | 'pending' | 'verified' | 'rejected';

interface PayoutProfile {
    id?: number;
    full_name: string | null;
    business_name: string | null;
    email: string | null;
    profession: string | null;
}

interface PayoutMethod {
    id: number;
    type: MethodType;
    upi_id: string | null;
    account_holder_name: string | null;
    account_number: string | null;
    ifsc: string | null;
    is_default: boolean;
    verified_at: string | null;
}

interface AccountProps {
    profile: PayoutProfile | null;
    methods: PayoutMethod[];
    kycStatus: KycStatus;
}

const KYC_META: Record<KycStatus, { label: string; chip: string }> = {
    verified: { label: 'Verified', chip: 'bg-cp-success-soft text-cp-success-ink' },
    pending: { label: 'Pending', chip: 'bg-cp-warning-soft text-cp-warning-ink' },
    rejected: { label: 'Rejected', chip: 'bg-cp-coral-soft text-cp-coral-dark-ink' },
    not_started: { label: 'Not started', chip: 'bg-cp-surface-3 text-cp-subtle' },
};

const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-cp-ink uppercase';
const INPUT_CLASS = 'h-10 border-cp-line shadow-sm focus-visible:ring-cp-brand/15';

function maskAccount(no: string | null) {
    if (!no) return '••••';
    return `•••• ${no.slice(-4)}`;
}

/* ------------------------------------------------------------------ */
/*  SHARED UI (same patterns as Store / Payments)                      */
/* ------------------------------------------------------------------ */

function TabNav({ active }: { active: 'transactions' | 'account' }) {
    return (
        <nav className="flex items-center gap-6 border-b border-cp-line">
            {[
                { key: 'transactions', label: 'Transactions', href: '/dashboard/payments' },
                { key: 'account', label: 'Account', href: '/dashboard/payments/account' },
            ].map((tab) => {
                const isActive = active === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => router.get(tab.href, {}, { preserveScroll: true })}
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                            isActive ? 'border-cp-brand text-cp-brand-ink' : 'border-transparent text-cp-muted hover:border-cp-line hover:text-cp-ink',
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
}

function SectionCard({
    icon,
    title,
    description,
    children,
    tone = 'bg-cp-brand-soft text-cp-brand-ink',
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    children: React.ReactNode;
    tone?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl bg-cp-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-cp-line/70 pb-5">
                <div className="flex items-start gap-3.5">
                    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</div>
                    <div>
                        <h2 className="text-base font-semibold text-cp-ink">{title}</h2>
                        {description && <p className="mt-0.5 text-xs text-cp-muted">{description}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="mt-6">{children}</div>
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <span className="text-xs text-cp-red-ink">{message}</span>;
}

/* ------------------------------------------------------------------ */
/*  LEFT SIDEBAR                                                       */
/* ------------------------------------------------------------------ */

function SideNav({ active, onChange, kycStatus, hasMethod }: { active: Section; onChange: (s: Section) => void; kycStatus: KycStatus; hasMethod: boolean }) {
    const items: { key: Section; label: string; icon: React.ComponentType<{ className?: string }>; badge: { label: string; chip: string } | null }[] = [
        { key: 'profile', label: 'Profile', icon: UserRound, badge: null },
        { key: 'payout', label: 'Payout method', icon: Wallet, badge: hasMethod ? null : { label: 'Required', chip: 'bg-cp-warning-soft text-cp-warning-ink' } },
        { key: 'kyc', label: 'KYC verification', icon: ShieldCheck, badge: KYC_META[kycStatus] },
    ];

    return (
        <nav className="flex gap-1.5 overflow-x-auto rounded-xl bg-cp-surface p-2 shadow-sm lg:sticky lg:top-20 lg:flex-col lg:overflow-visible">
            {items.map((item) => {
                const isActive = active === item.key;
                return (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onChange(item.key)}
                        className={cn(
                            'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors',
                            isActive ? 'bg-cp-brand-soft text-cp-brand-ink' : 'text-cp-muted hover:bg-cp-canvas hover:text-cp-ink',
                        )}
                    >
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', item.badge.chip)}>{item.badge.label}</span>}
                    </button>
                );
            })}
        </nav>
    );
}

/* ------------------------------------------------------------------ */
/*  SECTIONS                                                           */
/* ------------------------------------------------------------------ */

function ProfileSection({ profile }: { profile: PayoutProfile | null }) {
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: profile?.full_name ?? '',
        business_name: profile?.business_name ?? '',
        email: profile?.email ?? '',
        profession: profile?.profession ?? '',
    });

    function save() {
        setSaving(true);
        router.put('/dashboard/payments/account/profile', form, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    }

    return (
        <SectionCard icon={<UserRound className="size-5" />} title="Profile" description="This name appears on invoices and payout statements.">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="full_name" className={LABEL_CLASS}>
                        Full name <span className="text-cp-red-ink">*</span>
                    </Label>
                    <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Prashant Kumar" className={INPUT_CLASS} />
                    <FieldError message={errors.full_name} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="business_name" className={LABEL_CLASS}>
                        Business name
                    </Label>
                    <Input id="business_name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="e.g. Prashant's Academy" className={INPUT_CLASS} />
                    <FieldError message={errors.business_name} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="payout_email" className={LABEL_CLASS}>
                        Payout email
                    </Label>
                    <Input id="payout_email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className={INPUT_CLASS} />
                    <FieldError message={errors.email} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="profession" className={LABEL_CLASS}>
                        Profession
                    </Label>
                    <Input id="profession" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} placeholder="e.g. Design Educator" className={INPUT_CLASS} />
                    <FieldError message={errors.profession} />
                </div>
            </div>
            <Button onClick={save} disabled={saving || !form.full_name.trim()} className="mt-6 text-white bg-cp-brand hover:bg-cp-brand-hover">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {saving ? 'Saving…' : 'Save profile'}
            </Button>
        </SectionCard>
    );
}

function PayoutSection({ methods }: { methods: PayoutMethod[] }) {
    const { errors } = usePage().props as unknown as { errors: Record<string, string> };
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState<MethodType>('upi');

    // one UPI + one bank per user — inputs are prefilled from what is already saved
    const upiMethod = methods.find((m) => m.type === 'upi');
    const bankMethod = methods.find((m) => m.type === 'bank_transfer');
    const existing = type === 'upi' ? upiMethod : bankMethod;

    const [upiId, setUpiId] = useState(upiMethod?.upi_id ?? '');
    const [bank, setBank] = useState({
        account_holder_name: bankMethod?.account_holder_name ?? '',
        account_number: bankMethod?.account_number ?? '',
        ifsc: bankMethod?.ifsc ?? '',
    });
    const [makeDefault, setMakeDefault] = useState<Record<MethodType, boolean>>({
        upi: upiMethod?.is_default ?? methods.length === 0,
        bank_transfer: bankMethod?.is_default ?? methods.length === 0,
    });

    const [password, setPassword] = useState('');
    const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];
    const canSave = (type === 'upi' ? upiId.trim().length > 0 : Boolean(bank.account_holder_name.trim() && bank.account_number.trim() && bank.ifsc.trim())) && password.length > 0;

    function save() {
        if (!canSave) return;
        const base = { ...(existing ? { id: existing.id } : {}), is_default: existing?.is_default ? true : makeDefault[type] || methods.length === 0, current_password: password };
        const payload =
            type === 'upi'
                ? { ...base, type: 'upi', upi_id: upiId.trim() }
                : {
                      ...base,
                      type: 'bank_transfer',
                      account_holder_name: bank.account_holder_name.trim(),
                      account_number: bank.account_number.trim(),
                      ifsc: bank.ifsc.trim(),
                  };

        setSaving(true);
        router.put('/dashboard/payments/account/payout-method', payload, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setSaving(false);
                setPassword('');
            },
        });
    }

    return (
        <SectionCard
            icon={<Wallet className="size-5" />}
            tone="bg-cp-teal-soft text-cp-teal-ink"
            title="Payout method"
            description="Where your settlements are sent automatically."
            action={
                defaultMethod && (
                    <span className="hidden max-w-[220px] truncate rounded-full bg-cp-success-soft px-2.5 py-1 text-[11px] font-semibold text-cp-success-ink sm:block">
                        Default: {defaultMethod.type === 'upi' ? defaultMethod.upi_id : maskAccount(defaultMethod.account_number)}
                    </span>
                )
            }
        >
            {/* UPI / Bank transfer toggle */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { key: 'upi' as const, label: 'UPI', icon: Smartphone, isDefault: upiMethod?.is_default },
                    { key: 'bank_transfer' as const, label: 'Bank transfer', icon: Landmark, isDefault: bankMethod?.is_default },
                ].map((t) => {
                    const isActive = type === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setType(t.key)}
                            className={cn(
                                'flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors',
                                isActive ? 'border-cp-brand bg-cp-brand-soft text-cp-brand-ink' : 'border-cp-line bg-cp-surface text-cp-body hover:bg-cp-canvas',
                            )}
                        >
                            <t.icon className="size-4" />
                            {t.label}
                            {t.isDefault && <span className="rounded-full bg-cp-brand px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">Default</span>}
                        </button>
                    );
                })}
            </div>

            {/* Form */}
            {type === 'upi' ? (
                <div className="mt-6 flex flex-col gap-1.5">
                    <Label htmlFor="upi_id" className={LABEL_CLASS}>
                        UPI ID
                    </Label>
                    <Input id="upi_id" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" className={cn(INPUT_CLASS, 'font-mono')} />
                    <FieldError message={errors.upi_id} />
                    <span className="text-[11px] text-cp-muted">Format: name@bank — instant settlement, no IFSC needed.</span>
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label htmlFor="account_holder_name" className={LABEL_CLASS}>
                            Account holder name
                        </Label>
                        <Input id="account_holder_name" value={bank.account_holder_name} onChange={(e) => setBank({ ...bank, account_holder_name: e.target.value })} placeholder="As per bank records" className={INPUT_CLASS} />
                        <FieldError message={errors.account_holder_name} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="account_number" className={LABEL_CLASS}>
                            Account number
                        </Label>
                        <Input id="account_number" value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} placeholder="501002…" className={cn(INPUT_CLASS, 'font-mono')} />
                        <FieldError message={errors.account_number} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="ifsc" className={LABEL_CLASS}>
                            IFSC
                        </Label>
                        <Input id="ifsc" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" className={cn(INPUT_CLASS, 'font-mono uppercase')} />
                        <FieldError message={errors.ifsc} />
                    </div>
                </div>
            )}

            {/* Verification status — settlement sirf verified method pe jaata hai */}
            {existing && (
                <div
                    className={cn(
                        'mt-5 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-medium',
                        existing.verified_at ? 'bg-cp-success-soft text-cp-success-ink' : 'bg-cp-warning-soft text-cp-warning-ink',
                    )}
                >
                    {existing.verified_at ? <BadgeCheck className="mt-px size-4 shrink-0" /> : <Clock className="mt-px size-4 shrink-0" />}
                    <span>
                        {existing.verified_at
                            ? 'Verified. Changing these details will require verification again.'
                            : "Pending verification. Settlements to this method will start once it's verified."}
                    </span>
                </div>
            )}

            {/* Default toggle — only when this type is not already the default */}
            {!existing?.is_default && methods.length > 0 && (
                <label className="mt-5 flex items-center gap-3">
                    <input type="checkbox" checked={makeDefault[type]} onChange={(e) => setMakeDefault({ ...makeDefault, [type]: e.target.checked })} className="size-4 accent-cp-brand" />
                    <span className="text-sm font-medium text-cp-ink">Use this as my default payout method</span>
                </label>
            )}

            {/* paisa kahan jayega — chori hua session akele ise badal na sake */}
            <div className="mt-5 flex max-w-sm flex-col gap-1.5">
                <Label htmlFor="payout_password" className={LABEL_CLASS}>
                    Your account password
                </Label>
                <Input id="payout_password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm it's you" className={INPUT_CLASS} />
                <FieldError message={errors.current_password} />
                <span className="text-[11px] text-cp-muted">We'll email you whenever your payout account changes.</span>
            </div>

            <Button onClick={save} disabled={!canSave || saving} className="mt-6 text-white bg-cp-brand hover:bg-cp-brand-hover">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {saving ? 'Saving…' : 'Save payout method'}
            </Button>
        </SectionCard>
    );
}

function KycSection({ kycStatus }: { kycStatus: KycStatus }) {
    const tone =
        kycStatus === 'verified'
            ? 'bg-cp-success-soft text-cp-success-ink'
            : kycStatus === 'pending'
              ? 'bg-cp-warning-soft text-cp-warning-ink'
              : kycStatus === 'rejected'
                ? 'bg-cp-coral-soft text-cp-coral-dark-ink'
                : 'bg-cp-canvas text-cp-body';

    const headline =
        kycStatus === 'verified'
            ? 'PAN & bank verified — payouts unlocked'
            : kycStatus === 'pending'
              ? 'Submitted — usually reviewed in 24–48 hrs'
              : kycStatus === 'rejected'
                ? 'Verification needs attention — please re-submit'
                : 'Verify PAN & bank to unlock payouts';

    return (
        <SectionCard
            icon={<ShieldCheck className="size-5" />}
            tone="bg-cp-accent-soft text-cp-accent-ink"
            title="KYC verification"
            description="Verify your identity so we can release payouts to your account."
            action={<span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', KYC_META[kycStatus].chip)}>{KYC_META[kycStatus].label}</span>}
        >
            <div className={cn('flex items-center gap-2.5 rounded-xl p-3.5 text-[13px] font-semibold', tone)}>
                {kycStatus === 'verified' ? <BadgeCheck className="size-[18px]" /> : kycStatus === 'pending' ? <Clock className="size-[18px]" /> : <ShieldCheck className="size-[18px]" />}
                {headline}
            </div>

            <Link
                href="/dashboard/payments/account/kyc"
                className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-cp-brand px-5 text-sm font-medium text-white transition hover:bg-cp-brand-hover"
            >
                {kycStatus === 'not_started' ? 'Start KYC verification' : 'View KYC details'}
            </Link>
            <p className="mt-2 text-[11px] text-cp-muted">PAN + bank + ID document · 5 MB max</p>
        </SectionCard>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function PaymentsAccount({ profile, methods, kycStatus }: AccountProps) {
    const [section, setSection] = useState<Section>('payout');
    // payout / KYC / profile sirf store owner badal sakta hai (server pe `owner` middleware)
    const isOwner = (usePage().props as unknown as { auth: { user: { role?: string } } }).auth.user.role === 'creator';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payout Account" />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                {/* Sticky top header — same as Store / Payments */}
                <div className="sticky top-14 z-30 border-b border-cp-line bg-cp-canvas/95 backdrop-blur-md lg:top-0">
                    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                        <TabNav active="account" />
                    </div>
                </div>

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Payout Account</h1>
                                <span className="rounded-full bg-cp-brand-soft px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cp-brand-ink uppercase">Live Sync</span>
                            </div>
                            <p className="text-sm text-cp-muted">Where your earnings land — UPI or bank, plus verification.</p>
                        </div>
                        {/* <span className="flex w-fit items-center gap-1.5 text-xs text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Live tracking
                        </span> */}
                    </div>

                    {/* Sidebar + content */}
                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <SideNav active={section} onChange={setSection} kycStatus={kycStatus} hasMethod={methods.length > 0} />

                        <fieldset disabled={!isOwner} className="w-full max-w-3xl min-w-0">
                            {!isOwner && (
                                <p className="mb-4 rounded-xl bg-cp-warning-soft px-4 py-3 text-sm font-medium text-cp-warning-ink">
                                    Only the store owner can change payout details, KYC or the payout profile. You can view them here.
                                </p>
                            )}
                            {/* kept mounted (just hidden) so half-typed values survive tab switches */}
                            <div className={section === 'profile' ? 'block' : 'hidden'}>
                                <ProfileSection profile={profile} />
                            </div>
                            <div className={section === 'payout' ? 'block' : 'hidden'}>
                                <PayoutSection methods={methods} />
                            </div>
                            <div className={section === 'kyc' ? 'block' : 'hidden'}>
                                <KycSection kycStatus={kycStatus} />
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}