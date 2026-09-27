import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Monitor, ShieldCheck, ShieldOff } from 'lucide-react';
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security settings" />

            <SettingsLayout>
                <div className="space-y-10">
                    {status && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{status}</p>}

                    {/* ---- two-step ---- */}
                    <section className="space-y-5">
                        <HeadingSmall title="Two-step verification" description="Ask for a code from your email every time you sign in — so a stolen password alone can't get into your store and payouts." />

                        <div className="flex items-center gap-3 rounded-lg border p-4">
                            {twoFactorEnabled ? <ShieldCheck className="size-5 text-emerald-600" /> : <ShieldOff className="size-5 text-muted-foreground" />}
                            <p className="text-sm font-medium">{twoFactorEnabled ? 'On — we email you a code at each sign-in.' : 'Off'}</p>
                        </div>

                        {twoFactorLocked ? (
                            <p className="text-sm text-muted-foreground">Required by your store owner for all team members — it can't be turned off.</p>
                        ) : twoFactorEnabled ? (
                            <form onSubmit={submitDisable} className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="disable_password">Confirm your password to turn it off</Label>
                                    <Input id="disable_password" type="password" autoComplete="current-password" value={disable.data.password} onChange={(e) => disable.setData('password', e.target.value)} />
                                    <InputError message={disable.errors.password} />
                                </div>
                                <Button variant="outline" disabled={disable.processing || !disable.data.password}>
                                    {disable.processing && <LoaderCircle className="size-4 animate-spin" />} Turn off
                                </Button>
                            </form>
                        ) : twoFactorPending ? (
                            <form onSubmit={submitConfirm} className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Enter the 6-digit code we emailed you</Label>
                                    <Input
                                        id="code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={confirm.data.code}
                                        onChange={(e) => confirm.setData('code', e.target.value.replace(/\D/g, ''))}
                                        className="max-w-40 font-mono tracking-[0.4em]"
                                    />
                                    <InputError message={confirm.errors.code} />
                                </div>
                                <Button disabled={confirm.processing || confirm.data.code.length !== 6}>
                                    {confirm.processing && <LoaderCircle className="size-4 animate-spin" />} Turn on
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={submitSendCode} className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="enable_password">Confirm your password</Label>
                                    <Input id="enable_password" type="password" autoComplete="current-password" value={sendCode.data.password} onChange={(e) => sendCode.setData('password', e.target.value)} />
                                    <InputError message={sendCode.errors.password} />
                                </div>
                                <Button disabled={sendCode.processing || !sendCode.data.password}>
                                    {sendCode.processing && <LoaderCircle className="size-4 animate-spin" />} Send me a code
                                </Button>
                            </form>
                        )}
                    </section>

                    {/* ---- sessions ---- */}
                    <section className="space-y-5">
                        <HeadingSmall title="Where you're signed in" description="If you see a device you don't recognise, sign out everywhere and change your password." />

                        <ul className="divide-y rounded-lg border">
                            {sessions.map((s, i) => (
                                <li key={i} className="flex items-center gap-3 p-4">
                                    <Monitor className="size-5 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                            {s.device}
                                            {s.is_current && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">This device</span>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {s.ip ?? 'Unknown IP'} · {s.is_current ? 'Active now' : ago(s.last_active)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {others > 0 && (
                            <form onSubmit={submitLogoutOthers} className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="logout_password">Confirm your password</Label>
                                    <Input id="logout_password" type="password" autoComplete="current-password" value={logoutOthers.data.password} onChange={(e) => logoutOthers.setData('password', e.target.value)} />
                                    <InputError message={logoutOthers.errors.password} />
                                </div>
                                <Button variant="destructive" disabled={logoutOthers.processing || !logoutOthers.data.password}>
                                    {logoutOthers.processing && <LoaderCircle className="size-4 animate-spin" />} Sign out of {others} other device{others === 1 ? '' : 's'}
                                </Button>
                            </form>
                        )}
                    </section>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
