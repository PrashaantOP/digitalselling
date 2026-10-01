import { CodeInput, PRIMARY } from '@/components/customer/code-input';
import { CustomerCard } from '@/layouts/customer-layout';
import { Link, router, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

export default function CustomerVerify({ channel, to, resendIn, status }: { channel: 'email' | 'sms'; to: string; resendIn: number; status?: string | null }) {
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
        form.post('/me/login/verify', { onError: () => form.reset('code') });
    }

    function resend() {
        setResending(true);
        router.post('/me/login/resend', {}, { preserveScroll: true, onFinish: () => setResending(false) });
    }

    return (
        <CustomerCard title="Enter code">
            <h1 className="text-xl font-bold tracking-tight">{channel === 'sms' ? 'Check your messages' : 'Check your email'}</h1>
            {/* account hai ya nahi ye yahan kabhi nahi bataya jaata */}
            <p className="mt-1 text-sm text-[#6B6B78]">
                If <span className="font-semibold text-[#14141B]">{to}</span> has purchases here, a 6-digit code is on its way.
                {channel === 'sms' && ' No SMS? Sign in with your email instead.'}
            </p>

            {status && <div className="mt-4 rounded-lg bg-[#E6F6EC] px-3 py-2 text-xs font-semibold text-[#059669]">{status}</div>}

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <CodeInput value={form.data.code} onChange={(code) => form.setData('code', code)} />
                {form.errors.code && (
                    <p role="alert" className="text-xs font-medium text-[#C2410C]">
                        {form.errors.code}
                    </p>
                )}

                <button type="submit" disabled={form.processing || form.data.code.length !== 6} className={PRIMARY}>
                    {form.processing && <Loader2 className="size-4 animate-spin" />} Verify and continue
                </button>

                <div className="flex items-center justify-between text-sm">
                    <Link href="/me/login" className="font-medium text-[#6B6B78] hover:text-[#14141B]">
                        Use something else
                    </Link>
                    <button type="button" onClick={resend} disabled={wait > 0 || resending} className="font-semibold text-[#4F46E5] hover:underline disabled:text-[#8A8A96] disabled:no-underline">
                        {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
                    </button>
                </div>
            </form>
        </CustomerCard>
    );
}
