import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/layouts/auth-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

export default function VerifyOtp({ email, resendIn, status }: { email: string; resendIn: number; status?: string | null }) {
    const form = useForm({ code: '' });
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
        form.post(route('login.verify'), { onError: () => form.reset('code') });
    }

    function resend() {
        setResending(true);
        router.post(route('login.resend'), {}, { preserveScroll: true, onFinish: () => setResending(false) });
    }

    return (
        <AuthLayout title="Check your email" description={`Two-step verification is on. Enter the 6-digit code we sent to ${email}.`}>
            <Head title="Verify sign-in" />

            {status && <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">{status}</div>}

            <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="grid gap-2">
                    <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        aria-label="6-digit code"
                        value={form.data.code}
                        onChange={(e) => form.setData('code', e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="h-12 rounded-xl bg-white text-center font-mono text-2xl tracking-[0.5em]"
                    />
                    <InputError message={form.errors.code} />
                </div>

                <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={form.processing || form.data.code.length !== 6}>
                    {form.processing && <LoaderCircle className="size-4 animate-spin" />}
                    Verify and sign in
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <TextLink href={route('login')}>Use a different account</TextLink>
                    <button type="button" onClick={resend} disabled={wait > 0 || resending} className="font-semibold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline">
                        {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
