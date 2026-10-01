import { FIELD, PRIMARY } from '@/components/customer/code-input';
import { CustomerCard } from '@/layouts/customer-layout';
import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { type FormEvent } from 'react';

/** /me/login — password nahi; email ya (verified) mobile daalo, code aata hai. */
export default function CustomerLogin({ prefill }: { prefill: string }) {
    const form = useForm({ login: prefill });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post('/me/login');
    }

    return (
        <CustomerCard title="Sign in">
            <h1 className="text-xl font-bold tracking-tight">Open your purchases</h1>
            <p className="mt-1 text-sm text-[#6B6B78]">Enter the email or mobile number you used when you bought. We'll send a one-time code — no password needed.</p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
                <label htmlFor="login" className="text-sm font-semibold">
                    Email or mobile number
                </label>
                <input
                    id="login"
                    value={form.data.login}
                    onChange={(e) => form.setData('login', e.target.value)}
                    autoFocus
                    autoComplete="username"
                    required
                    maxLength={150}
                    placeholder="you@example.com or 98765 43210"
                    className={FIELD}
                />
                {form.errors.login && (
                    <p role="alert" className="text-xs font-medium text-[#C2410C]">
                        {form.errors.login}
                    </p>
                )}

                <button type="submit" disabled={form.processing || form.data.login.trim() === ''} className={PRIMARY}>
                    {form.processing && <Loader2 className="size-4 animate-spin" />} Send code
                </button>
            </form>

            <p className="mt-5 text-xs text-[#8A8A96]">Mobile sign-in works once you've confirmed your number — do that right after a purchase, or from Account after signing in with email.</p>
        </CustomerCard>
    );
}
