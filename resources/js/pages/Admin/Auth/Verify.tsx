import { Link, router, useForm, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { AdminAuthShell, INPUT } from './Login';

export default function AdminVerify({ email, resendIn }: { email: string; resendIn: number }) {
    const form = useForm({ code: '' });
    const status = usePage<{ flash?: { status?: string | null } }>().props.flash?.status;
    const [wait, setWait] = useState(resendIn);
    const [resending, setResending] = useState(false);

    useEffect(() => setWait(resendIn), [resendIn]);
    useEffect(() => {
        if (wait <= 0) return;
        const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
        return () => window.clearTimeout(t);
    }, [wait]);

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/admin/login/verify', { onError: () => form.reset('code') });
    }

    function resend() {
        setResending(true);
        router.post('/admin/login/resend', {}, { preserveScroll: true, onFinish: () => setResending(false) });
    }

    return (
        <AdminAuthShell title="Check your email" subtitle={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}>
            <form onSubmit={submit} className="flex flex-col gap-4">
                <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    aria-label="6-digit code"
                    value={form.data.code}
                    onChange={(e) => form.setData('code', e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className={`${INPUT} text-center font-mono text-2xl tracking-[0.5em]`}
                />
                {form.errors.code && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{form.errors.code}</p>}
                {status && !form.errors.code && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{status}</p>}
                <button
                    type="submit"
                    disabled={form.processing || form.data.code.length !== 6}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                    {form.processing && <Loader2 className="size-4 animate-spin" />}
                    Verify and sign in
                </button>
                <div className="flex items-center justify-between text-xs">
                    <Link href="/admin/login" className="font-semibold text-slate-500 hover:text-slate-900">
                        ← Use a different account
                    </Link>
                    <button type="button" onClick={resend} disabled={wait > 0 || resending} className="font-semibold text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline">
                        {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
                    </button>
                </div>
            </form>
        </AdminAuthShell>
    );
}
