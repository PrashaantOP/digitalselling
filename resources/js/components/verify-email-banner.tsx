import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { MailWarning } from 'lucide-react';
import { useState } from 'react';

/**
 * Email verify nahi hua to dashboard pe har jagah ye patti — publish, KYC aur payout account tab tak
 * band hain (`verified` middleware). Resend Laravel ke `verification.send` route se.
 */
export function VerifyEmailBanner() {
    const { auth } = usePage<SharedData>().props;
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!auth?.user || auth.user.email_verified_at) return null;

    function resend() {
        setBusy(true);
        router.post(
            route('verification.send'),
            {},
            { preserveScroll: true, preserveState: true, onSuccess: () => setSent(true), onFinish: () => setBusy(false) },
        );
    }

    return (
        <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <span className="flex items-center gap-2">
                <MailWarning className="size-4 shrink-0" />
                Verify your email ({auth.user.email}) to publish products and set up payouts.
            </span>
            {sent ? (
                <span className="text-xs font-semibold text-emerald-700">Verification link sent — check your inbox.</span>
            ) : (
                <button
                    type="button"
                    onClick={resend}
                    disabled={busy}
                    className="w-fit text-xs font-semibold text-amber-900 underline underline-offset-2 disabled:opacity-50"
                >
                    Resend verification link
                </button>
            )}
        </div>
    );
}
