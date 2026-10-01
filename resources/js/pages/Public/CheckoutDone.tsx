import { CodeInput, FIELD, GHOST, PRIMARY } from '@/components/customer/code-input';
import { CustomerCard } from '@/layouts/customer-layout';
import { cn } from '@/lib/utils';
import { router, useForm } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Loader2, Mail, MessageSquare } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

type Channel = 'email' | 'sms';

interface Props {
    order: { uuid: string; number: string; status: string; title: string | null; type: string | null; creator: string | null; total: number; message: string | null };
    contact: { email: string; phone: string | null } | null;
    channels: Channel[];
    canFixEmail: boolean;
    /** buyer pehle se login hai to seedha link */
    openUrl: string | null;
    status?: string | null;
}

const money = (v: number) => (v > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v) : 'Free');

/**
 * Pay ke turant baad. Buyer ek code daal kar apni cheez tak pahunchta hai — isse email/mobile bhi verify
 * ho jaata hai (galat likha ho to yahin pata chal jaata hai). Bina code ke login nahi hota.
 */
export default function CheckoutDone({ order, contact, channels, canFixEmail, openUrl, status }: Props) {
    const base = `/checkout/done/${order.uuid}`;
    const [channel, setChannel] = useState<Channel>('email');
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const open = useForm({ code: '', channel: 'email' as Channel });
    const email = useForm({ email: '' });
    const paid = order.status === 'success';

    // webhook thoda der se aaye to page khud dobara dekh leta hai
    useEffect(() => {
        if (paid || order.status !== 'pending') return;
        const t = window.setInterval(() => router.reload({ only: ['order', 'contact', 'channels', 'canFixEmail'] }), 4000);
        return () => window.clearInterval(t);
    }, [paid, order.status]);

    function sendCode(to: Channel) {
        setChannel(to);
        setSending(true);
        setSendError(null);
        open.setData({ code: '', channel: to });
        router.post(`${base}/code`, { channel: to }, {
            preserveScroll: true,
            onSuccess: () => setSent(true),
            onError: (errors) => setSendError(Object.values(errors)[0] as string),
            onFinish: () => setSending(false),
        });
    }

    function submitCode(e: FormEvent) {
        e.preventDefault();
        open.post(`${base}/open`, { onError: () => open.reset('code') });
    }

    function submitEmail(e: FormEvent) {
        e.preventDefault();
        email.post(`${base}/email`, {
            preserveScroll: true,
            onSuccess: () => {
                setFixing(false);
                setSent(false);
                email.reset();
            },
        });
    }

    return (
        <CustomerCard title={paid ? 'Purchase confirmed' : 'Confirming payment'}>
            {!paid ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                    {order.status === 'pending' ? <Loader2 className="size-8 animate-spin text-[#4F46E5]" /> : null}
                    <h1 className="text-lg font-bold">{order.status === 'pending' ? 'Confirming your payment…' : 'This payment did not go through'}</h1>
                    <p className="text-sm text-[#6B6B78]">
                        {order.status === 'pending'
                            ? 'This usually takes a few seconds. If money was deducted, your access will also be emailed to you.'
                            : 'You were not charged. Go back to the product page to try again.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-[#059669]" />
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold tracking-tight">You're in</h1>
                            <p className="mt-0.5 text-sm text-[#6B6B78]">
                                <span className="font-semibold text-[#14141B]">{order.title}</span>
                                {order.creator && ` by ${order.creator}`}
                            </p>
                        </div>
                    </div>

                    <dl className="mt-5 flex justify-between gap-4 rounded-xl bg-[#F6F5F2] px-4 py-3 text-sm">
                        <div>
                            <dt className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Order</dt>
                            <dd className="font-mono text-xs font-semibold">{order.number}</dd>
                        </div>
                        <div className="text-right">
                            <dt className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Paid</dt>
                            <dd className="font-bold tabular-nums">{money(order.total)}</dd>
                        </div>
                    </dl>

                    {order.message && <p className="mt-4 rounded-xl border border-[#E4E2DA] p-3.5 text-sm text-[#4B4B57]">{order.message}</p>}

                    {status && <div className="mt-4 rounded-lg bg-[#E6F6EC] px-3 py-2 text-xs font-semibold text-[#059669]">{status}</div>}

                    {openUrl ? (
                        <a href={openUrl} className={cn(PRIMARY, 'mt-6')}>
                            Open it now <ArrowRight className="size-4" />
                        </a>
                    ) : (
                        contact && (
                            <div className="mt-6 border-t border-[#E4E2DA] pt-5">
                                <h2 className="text-sm font-bold">Open it now</h2>
                                <p className="mt-1 text-sm text-[#6B6B78]">Confirm it's you with a one-time code. Next time, sign in the same way — no password.</p>

                                <div className={cn('mt-4 grid gap-2', channels.length > 1 && 'sm:grid-cols-2')}>
                                    <button type="button" onClick={() => sendCode('email')} disabled={sending} className={cn(GHOST, 'h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left', sent && channel === 'email' && 'border-[#4F46E5] bg-[#EEF0FF]')}>
                                        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#14141B]">
                                            <Mail className="size-4" /> Email me a code
                                        </span>
                                        <span className="text-xs text-[#8A8A96]">{contact.email}</span>
                                    </button>
                                    {channels.includes('sms') && contact.phone && (
                                        <button type="button" onClick={() => sendCode('sms')} disabled={sending} className={cn(GHOST, 'h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left', sent && channel === 'sms' && 'border-[#4F46E5] bg-[#EEF0FF]')}>
                                            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#14141B]">
                                                <MessageSquare className="size-4" /> Text me a code
                                            </span>
                                            <span className="text-xs text-[#8A8A96]">{contact.phone}</span>
                                        </button>
                                    )}
                                </div>

                                {sendError && (
                                    <p role="alert" className="mt-3 text-xs font-medium text-[#C2410C]">
                                        {sendError}
                                    </p>
                                )}

                                {sent && (
                                    <form onSubmit={submitCode} className="mt-4 flex flex-col gap-3">
                                        <CodeInput value={open.data.code} onChange={(code) => open.setData('code', code)} />
                                        {open.errors.code && (
                                            <p role="alert" className="text-xs font-medium text-[#C2410C]">
                                                {open.errors.code}
                                            </p>
                                        )}
                                        <button type="submit" disabled={open.processing || open.data.code.length !== 6} className={PRIMARY}>
                                            {open.processing && <Loader2 className="size-4 animate-spin" />} Open my purchase
                                        </button>
                                    </form>
                                )}

                                {canFixEmail &&
                                    (fixing ? (
                                        <form onSubmit={submitEmail} className="mt-4 flex flex-col gap-2 rounded-xl bg-[#F6F5F2] p-3.5">
                                            <label htmlFor="fix-email" className="text-xs font-semibold">
                                                Correct email address
                                            </label>
                                            <input id="fix-email" type="email" required maxLength={150} value={email.data.email} onChange={(e) => email.setData('email', e.target.value)} className={FIELD} />
                                            {email.errors.email && (
                                                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                                                    {email.errors.email}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <button type="submit" disabled={email.processing} className={cn(GHOST, 'border-[#4F46E5] text-[#4F46E5]')}>
                                                    Save email
                                                </button>
                                                <button type="button" onClick={() => setFixing(false)} className={GHOST}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button type="button" onClick={() => setFixing(true)} className="mt-4 text-xs font-semibold text-[#6B6B78] underline-offset-2 hover:text-[#14141B] hover:underline">
                                            Typed the wrong email?
                                        </button>
                                    ))}

                                <p className="mt-5 text-xs text-[#8A8A96]">We've also emailed your receipt. You can come back any time from that email.</p>
                            </div>
                        )
                    )}
                </>
            )}
        </CustomerCard>
    );
}
