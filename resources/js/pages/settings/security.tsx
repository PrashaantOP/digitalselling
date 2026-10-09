import AppLayout from '@/layouts/app-layout';
import SettingsLayout, { Field, SaveButton, SettingsCard, TextInput } from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, LaptopMinimal, Lock, LogOut, MailCheck, MonitorSmartphone, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Security settings', href: '/settings/security' }];

interface Session {
    device: string;
    ip: string | null;
    last_active: string;
    is_current: boolean;
}

interface Props {
    sessions: Session[];
    twoFactorEnabled: boolean;
    twoFactorPending: boolean;
    // team member ke liye hamesha on — band nahi kar sakta
    twoFactorLocked?: boolean;
    status?: string | null;
}

function ago(iso: string) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 2) return 'Active now';
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const isPhone = (device: string) => /iphone|android|ipad|mobile/i.test(device);

export default function Security({ sessions, twoFactorEnabled, twoFactorPending, twoFactorLocked, status }: Props) {
    const logoutOthers = useForm({ password: '' });
    const sendCode = useForm({ password: '' });
    const confirm = useForm({ code: '' });
    const disable = useForm({ password: '' });
    const others = sessions.filter((s) => !s.is_current).length;

    function submitLogoutOthers(e: FormEvent) {
        e.preventDefault();
        logoutOthers.delete('/settings/security/sessions', { preserveScroll: true, onFinish: () => logoutOthers.reset() });
    }

    function submitSendCode(e: FormEvent) {
        e.preventDefault();
        sendCode.post('/settings/security/two-factor/code', { preserveScroll: true, onFinish: () => sendCode.reset() });
    }

    function submitConfirm(e: FormEvent) {
        e.preventDefault();
        confirm.post('/settings/security/two-factor', { preserveScroll: true, onFinish: () => confirm.reset() });
    }

    function submitDisable(e: FormEvent) {
        e.preventDefault();
        disable.delete('/settings/security/two-factor', { preserveScroll: true, onFinish: () => disable.reset() });
    }

    const step = twoFactorEnabled ? 3 : twoFactorPending ? 2 : 1;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security settings" />

            <SettingsLayout>
                {status && (
                    <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-cp-success-soft p-4 text-sm font-semibold text-cp-success-strong-ink ring-1 ring-cp-success-line">
                        <CheckCircle2 className="size-5 shrink-0" /> {status}
                    </div>
                )}

                {/* ---- two-step ---- */}
                <SettingsCard
                    icon={twoFactorEnabled ? ShieldCheck : ShieldOff}
                    tone={twoFactorEnabled ? 'bg-cp-success-soft text-cp-success-ink' : 'bg-cp-warning-soft text-cp-warning-ink'}
                    title="Two-step verification"
                    description="We email you a code at every sign-in, so a stolen password alone can't open your store and payouts."
                    action={
                        <span
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
                                twoFactorEnabled ? 'bg-cp-success-soft text-cp-success-strong-ink' : 'bg-cp-surface-3 text-cp-subtle',
                            )}
                        >
                            <span className={cn('size-1.5 rounded-full', twoFactorEnabled ? 'bg-cp-success-bright' : 'bg-cp-faint')} />
                            {twoFactorEnabled ? 'On' : 'Off'}
                        </span>
                    }
                >
                    {twoFactorLocked ? (
                        <p className="flex items-start gap-2.5 rounded-xl bg-cp-brand-soft p-4 text-sm text-cp-brand-strong-ink">
                            <Lock className="mt-0.5 size-4 shrink-0" />
                            Your store owner requires this for every team member, so it can't be turned off.
                        </p>
                    ) : twoFactorEnabled ? (
                        <form onSubmit={submitDisable} className="grid gap-4">
                            <p className="flex items-start gap-2.5 rounded-xl bg-cp-success-soft p-4 text-sm text-cp-success-strong-ink">
                                <MailCheck className="mt-0.5 size-4 shrink-0" />
                                You're protected. Each new sign-in asks for a 6-digit code from your email.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <Field id="disable_password" label="Turn it off — confirm your password" error={disable.errors.password}>
                                        <TextInput
                                            id="disable_password"
                                            type="password"
                                            autoComplete="current-password"
                                            value={disable.data.password}
                                            onChange={(e) => disable.setData('password', e.target.value)}
                                            invalid={Boolean(disable.errors.password)}
                                        />
                                    </Field>
                                </div>
                                <SaveButton tone="outline" processing={disable.processing} disabled={!disable.data.password}>
                                    Turn off
                                </SaveButton>
                            </div>
                        </form>
                    ) : (
                        <div className="grid gap-5">
                            {/* 3 steps */}
                            <ol className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                                {['Confirm password', 'Enter email code', 'Protected'].map((label, i) => {
                                    const n = i + 1;
                                    const done = n < step;
                                    const current = n === step;

                                    return (
                                        <li key={label} className="flex flex-col items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    'flex size-7 items-center justify-center rounded-full text-xs font-bold',
                                                    done ? 'bg-cp-success-bright text-white' : current ? 'bg-cp-brand text-white ring-4 ring-cp-brand-soft' : 'bg-cp-surface-3 text-cp-faint',
                                                )}
                                            >
                                                {done ? '✓' : n}
                                            </span>
                                            <span className={current ? 'text-cp-ink' : 'text-cp-muted'}>{label}</span>
                                        </li>
                                    );
                                })}
                            </ol>

                            {twoFactorPending ? (
                                <form onSubmit={submitConfirm} className="grid gap-4">
                                    <Field id="code" label="Enter the 6-digit code we emailed you" error={confirm.errors.code} hint="Didn't get it? Check spam, or wait a minute and send a new one.">
                                        <TextInput
                                            id="code"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            value={confirm.data.code}
                                            onChange={(e) => confirm.setData('code', e.target.value.replace(/\D/g, ''))}
                                            placeholder="••••••"
                                            invalid={Boolean(confirm.errors.code)}
                                            className="h-14 max-w-56 text-center font-mono text-2xl font-bold tracking-[0.45em]"
                                        />
                                    </Field>
                                    <div>
                                        <SaveButton processing={confirm.processing} disabled={confirm.data.code.length !== 6}>
                                            <ShieldCheck className="size-4" /> Turn on
                                        </SaveButton>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={submitSendCode} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <Field id="enable_password" label="Confirm your password" error={sendCode.errors.password}>
                                            <TextInput
                                                id="enable_password"
                                                type="password"
                                                autoComplete="current-password"
                                                value={sendCode.data.password}
                                                onChange={(e) => sendCode.setData('password', e.target.value)}
                                                invalid={Boolean(sendCode.errors.password)}
                                            />
                                        </Field>
                                    </div>
                                    <SaveButton processing={sendCode.processing} disabled={!sendCode.data.password}>
                                        <MailCheck className="size-4" /> Send me a code
                                    </SaveButton>
                                </form>
                            )}
                        </div>
                    )}
                </SettingsCard>

                {/* ---- sessions ---- */}
                <SettingsCard
                    icon={MonitorSmartphone}
                    title="Where you're signed in"
                    description="See a device you don't recognise? Sign out of the others and change your password."
                    tone="bg-cp-sky-soft text-cp-sky-ink"
                >
                    <ul className="divide-y divide-cp-surface-3 overflow-hidden rounded-xl ring-1 ring-cp-surface-3">
                        {sessions.map((s, i) => {
                            const Icon = isPhone(s.device) ? Smartphone : LaptopMinimal;

                            return (
                                <li key={i} className={cn('flex items-center gap-3 p-3.5', s.is_current && 'bg-cp-surface-2')}>
                                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', s.is_current ? 'bg-cp-brand-soft text-cp-brand-ink' : 'bg-cp-canvas text-cp-subtle')}>
                                        <Icon className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-cp-ink">
                                            {s.device}
                                            {s.is_current && <span className="rounded-full bg-cp-success-soft px-2 py-0.5 text-[11px] font-bold text-cp-success-strong-ink">This device</span>}
                                        </p>
                                        <p className="mt-0.5 text-xs text-cp-muted">
                                            {s.ip ?? 'Unknown IP'} · {s.is_current ? 'Active now' : ago(s.last_active)}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {others > 0 ? (
                        <form onSubmit={submitLogoutOthers} className="mt-5 grid gap-3 rounded-xl border border-cp-danger-line-soft bg-cp-danger-tint p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <Field id="logout_password" label="Confirm your password" error={logoutOthers.errors.password}>
                                <TextInput
                                    id="logout_password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={logoutOthers.data.password}
                                    onChange={(e) => logoutOthers.setData('password', e.target.value)}
                                    invalid={Boolean(logoutOthers.errors.password)}
                                />
                            </Field>
                            <SaveButton tone="danger" processing={logoutOthers.processing} disabled={!logoutOthers.data.password}>
                                <LogOut className="size-4" /> Sign out of {others} other device{others === 1 ? '' : 's'}
                            </SaveButton>
                        </form>
                    ) : (
                        <p className="mt-4 flex items-center gap-2 text-sm text-cp-muted">
                            <CheckCircle2 className="size-4 text-cp-success-ink" /> You're only signed in on this device.
                        </p>
                    )}
                </SettingsCard>
            </SettingsLayout>
        </AppLayout>
    );
}
