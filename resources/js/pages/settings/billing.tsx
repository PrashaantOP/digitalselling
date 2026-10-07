import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { completePayment, firstError, postJson, type PaymentPayload } from '@/lib/razorpay';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, BadgeCheck, CalendarClock, Check, Crown, FileText, Gift, Info, Loader2, Repeat, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Billing', href: '/dashboard/settings/billing' }];

interface InvoiceRow {
    uuid: string;
    number: string;
    description: string | null;
    amount: number;
    status: 'paid' | 'failed' | 'pending';
    paid_at: string | null;
    period_start: string | null;
    period_end: string | null;
}

interface Props {
    plan: { effective: 'free' | 'pro'; expires_at: string | null; permanent: boolean; commission_rate: number };
    pro: { name: string; monthly_price: number; commission_rate: number; features: string[] };
    freeRate: number;
    /** Monthly price (GST-inclusive) + pehla charge kab — trial / credit ka Pro chal raha ho to uske baad */
    price: { amount: number; first_charge_at: string | null; taxable: number; gst_rate: number; gst: number };
    subscription: {
        status: 'authenticated' | 'active' | 'pending' | 'halted';
        renews: boolean;
        next_charge_at: string | null;
        failure_reason: string | null;
    } | null;
    creditBalance: number;
    billing: { name: string; email: string; gstin: string | null; state: string | null };
    states: string[];
    paymentsReady: boolean;
    savings: { sales_30d: number; extra_commission: number };
    invoices: InvoiceRow[];
}

const money = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(v);
const date = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const daysUntil = (v: string) => Math.max(0, Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000));
const pct = (v: number) => `${Number(v.toFixed(2))}%`;

export default function Billing({ plan, pro, freeRate, price, subscription, creditBalance, billing, states, paymentsReady, savings, invoices }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [state, setState] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 6000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const onPro = plan.effective === 'pro';
    const renewing = subscription?.renews ?? false;
    const daysLeft = plan.expires_at ? daysUntil(plan.expires_at) : null;
    const endingSoon = onPro && !renewing && daysLeft !== null && daysLeft <= 7;
    const needsState = !billing.state;
    const unverified = auth.user.email_verified_at === null;
    // halted = auto-debit ruk gaya; cancel ho chuka (mahina chal raha) — dono me naya subscribe ho sakta hai
    const canSubscribe = !plan.permanent && !renewing && !unverified && paymentsReady && (!needsState || state !== '');

    async function subscribe() {
        setBusy(true);
        setError(null);

        try {
            const res = await postJson('/dashboard/settings/billing/subscribe', needsState ? { state } : {});
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setError(firstError(data, 'Could not start auto-renew. Please try again.'));
                return;
            }

            const result = await completePayment(data as PaymentPayload, '/dashboard/settings/billing/verify');

            if (result.ok) {
                setNotice(result.message ?? 'Auto-renew is on.');
                router.reload();
            } else if (result.error) {
                setError(result.error);
            }
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    function cancel() {
        setBusy(true);
        setError(null);
        router.post(
            '/dashboard/settings/billing/cancel',
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setConfirmCancel(false);
                    setNotice('Auto-renew is off. Pro stays on until the end of the period you have paid for.');
                },
                onError: (errors) => setError(Object.values(errors)[0] ?? 'Could not turn off auto-renew. Please try again.'),
                onFinish: () => setBusy(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Billing" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col gap-1 pt-1">
                        <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Billing</h1>
                        <p className="text-sm text-[#8A8A96]">Your plan, Pro payments and tax invoices.</p>
                    </div>

                    {notice && (
                        <div role="status" className="flex items-center gap-2 rounded-xl bg-[#E6F6EC] p-3.5 text-[13px] font-semibold text-[#059669]">
                            <Check className="size-4 shrink-0" /> {notice}
                        </div>
                    )}

                    {endingSoon && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-[#FFF4DB] p-3.5 text-[13px] font-medium text-[#B46E00]">
                            <AlertTriangle className="mt-px size-4 shrink-0" />
                            <span>
                                Pro ends {daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}. Auto-renew is off — after that
                                commission goes back to {pct(freeRate)}.
                            </span>
                        </div>
                    )}

                    {/* Current plan */}
                    <section className="flex flex-col justify-between gap-4 rounded-xl bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3.5">
                            <span
                                className={cn(
                                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                                    onPro ? 'bg-[#F1EAFE] text-[#7C3AED]' : 'bg-[#F0EFEA] text-[#6B6B78]',
                                )}
                            >
                                {onPro ? <Crown className="size-5" /> : <Zap className="size-5" />}
                            </span>
                            <div>
                                <p className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">Current plan</p>
                                <p className="mt-0.5 text-lg font-bold text-[#14141B]">{onPro ? pro.name : 'Free'}</p>
                                <p className="mt-0.5 text-sm text-[#6B6B78]">
                                    {plan.permanent
                                        ? 'Pro with no end date.'
                                        : renewing && subscription?.next_charge_at
                                          ? `Renews on ${date(subscription.next_charge_at)} · ${money(price.amount)}/month`
                                          : onPro && plan.expires_at
                                            ? `Valid till ${date(plan.expires_at)} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                                            : 'No expiry — upgrade any time.'}
                                </p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-[#F6F5F2] px-4 py-3 sm:text-right">
                            <p className="text-2xl font-bold text-[#14141B] tabular-nums">{pct(plan.commission_rate)}</p>
                            <p className="text-xs text-[#8A8A96]">commission per sale</p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
                        {/* Subscribe / manage auto-renew */}
                        <section className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow-sm">
                            <div>
                                <h2 className="text-base font-bold text-[#14141B]">{renewing ? 'Auto-renew' : onPro ? 'Keep Pro with auto-renew' : 'Upgrade to Pro'}</h2>
                                <p className="mt-0.5 text-sm text-[#8A8A96]">
                                    {money(price.amount)} a month, charged automatically to your card or UPI. Turn it off any time.
                                </p>
                            </div>

                            {plan.permanent ? (
                                <div className="flex items-start gap-2.5 rounded-lg bg-[#EEF0FF] p-3.5 text-[13px] font-medium text-[#4338CA]">
                                    <BadgeCheck className="mt-px size-4 shrink-0" /> Your account already has Pro with no end date — there is nothing to buy.
                                </div>
                            ) : renewing && subscription ? (
                                <>
                                    <div className="flex flex-col gap-3 rounded-xl bg-[#F6F5F2] p-4 text-sm">
                                        <div className="flex items-center gap-2 font-semibold text-[#059669]">
                                            <Repeat className="size-4" /> Auto-renew is on
                                        </div>
                                        <dl className="flex flex-col gap-1.5">
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-[#6B6B78]">Plan</dt>
                                                <dd className="font-medium text-[#14141B]">{pro.name} · monthly</dd>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-[#6B6B78]">Next charge</dt>
                                                <dd className="font-medium text-[#14141B] tabular-nums">
                                                    {money(price.amount)} on {date(subscription.next_charge_at)}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {subscription.status === 'pending' && (
                                        <div className="flex items-start gap-2 rounded-lg bg-[#FFF4DB] p-3 text-[13px] font-medium text-[#B46E00]">
                                            <AlertTriangle className="mt-px size-4 shrink-0" />
                                            <span>
                                                The last charge did not go through{subscription.failure_reason ? ` (${subscription.failure_reason})` : ''}. Razorpay will try again
                                                over the next few days — keep enough balance on your card or UPI.
                                            </span>
                                        </div>
                                    )}

                                    {error && (
                                        <div role="alert" className="flex items-start gap-2 rounded-lg bg-[#FDECEC] p-3 text-[13px] font-medium text-[#B42318]">
                                            <AlertTriangle className="mt-px size-4 shrink-0" /> {error}
                                        </div>
                                    )}

                                    {confirmCancel ? (
                                        <div className="flex flex-col gap-3 rounded-xl border border-[#F3C7C3] p-4">
                                            <p className="text-sm text-[#4B4B57]">
                                                Turn off auto-renew? Pro stays on until {date(plan.expires_at ?? subscription.next_charge_at)}, then commission goes
                                                back to {pct(freeRate)}. You can subscribe again later.
                                            </p>
                                            <div className="flex gap-2">
                                                <Button onClick={cancel} disabled={busy} className="h-10 flex-1 bg-[#B42318] text-sm font-bold hover:bg-[#912018]">
                                                    {busy ? <Loader2 className="size-4 animate-spin" /> : 'Turn off auto-renew'}
                                                </Button>
                                                <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={busy} className="h-10 flex-1 text-sm font-semibold">
                                                    Keep it on
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmCancel(true)}
                                            className="self-start text-sm font-semibold text-[#B42318] hover:underline"
                                        >
                                            Cancel auto-renew
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {subscription?.status === 'halted' && (
                                        <div className="flex items-start gap-2 rounded-lg bg-[#FDECEC] p-3 text-[13px] font-medium text-[#B42318]">
                                            <AlertTriangle className="mt-px size-4 shrink-0" />
                                            <span>
                                                Auto-renew stopped because the payments kept failing{subscription.failure_reason ? ` (${subscription.failure_reason})` : ''}.
                                                Subscribe again with a working card or UPI to keep Pro.
                                            </span>
                                        </div>
                                    )}

                                    <ul className="flex flex-col gap-2 rounded-xl bg-[#F6F5F2] p-4 text-sm text-[#4B4B57]">
                                        <li className="flex gap-2">
                                            <CalendarClock className="mt-0.5 size-4 shrink-0 text-[#4F46E5]" />
                                            {price.first_charge_at
                                                ? `Your current Pro runs till ${date(price.first_charge_at)} — the first ${money(price.amount)} is charged then, not today.`
                                                : `${money(price.amount)} today, then every month on the same date.`}
                                        </li>
                                        <li className="flex gap-2">
                                            <Repeat className="mt-0.5 size-4 shrink-0 text-[#4F46E5]" /> Renews on its own — no reminders to miss. Cancel any time; the month
                                            you paid for still runs out.
                                        </li>
                                        <li className="flex gap-2">
                                            <FileText className="mt-0.5 size-4 shrink-0 text-[#4F46E5]" /> A GST invoice for every payment (includes {money(price.gst)} GST at{' '}
                                            {pct(price.gst_rate)}).
                                        </li>
                                    </ul>

                                    {needsState && (
                                        <div>
                                            <label htmlFor="billing-state" className="text-sm font-semibold text-[#14141B]">
                                                Your state
                                            </label>
                                            <p className="mt-0.5 text-xs text-[#8A8A96]">Needed once, for the GST lines on your invoice.</p>
                                            <select
                                                id="billing-state"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                className="mt-2 h-10 w-full rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                            >
                                                <option value="">Select state</option>
                                                {states.map((s) => (
                                                    <option key={s} value={s}>
                                                        {s}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {error && (
                                        <div role="alert" className="flex items-start gap-2 rounded-lg bg-[#FDECEC] p-3 text-[13px] font-medium text-[#B42318]">
                                            <AlertTriangle className="mt-px size-4 shrink-0" /> {error}
                                        </div>
                                    )}

                                    {unverified ? (
                                        <div className="flex items-start gap-2 rounded-lg bg-[#FFF4DB] p-3 text-[13px] font-medium text-[#B46E00]">
                                            <Info className="mt-px size-4 shrink-0" /> Verify your email address before making a payment.
                                        </div>
                                    ) : (
                                        !paymentsReady && (
                                            <div className="flex items-start gap-2 rounded-lg bg-[#FFF4DB] p-3 text-[13px] font-medium text-[#B46E00]">
                                                <Info className="mt-px size-4 shrink-0" /> Online payments are not set up yet. Please check back soon.
                                            </div>
                                        )
                                    )}

                                    <Button onClick={subscribe} disabled={busy || !canSubscribe} className="h-11 w-full bg-[#4F46E5] text-sm font-bold hover:bg-[#4338CA]">
                                        {busy ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : price.first_charge_at ? (
                                            'Turn on auto-renew'
                                        ) : (
                                            `Subscribe — ${money(price.amount)}/month`
                                        )}
                                    </Button>
                                    <p className="flex items-center justify-center gap-1.5 text-xs text-[#8A8A96]">
                                        <ShieldCheck className="size-3.5" /> Secure payment by Razorpay · cards and UPI AutoPay
                                    </p>
                                </>
                            )}

                            {creditBalance > 0 && !plan.permanent && (
                                <div className="flex items-start gap-2.5 rounded-lg border border-[#E4E2DA] p-3 text-[13px] text-[#4B4B57]">
                                    <Gift className="mt-px size-4 shrink-0 text-[#7C3AED]" />
                                    <span>
                                        You have {money(creditBalance)} referral credit.{' '}
                                        {renewing ? (
                                            'It can be turned into Pro months only while auto-renew is off, so you are never charged twice.'
                                        ) : (
                                            <>
                                                Turn it into Pro months on{' '}
                                                <Link href="/dashboard/refer-earn" className="font-semibold text-[#4F46E5] hover:underline">
                                                    Refer &amp; Earn
                                                </Link>
                                                .
                                            </>
                                        )}
                                    </span>
                                </div>
                            )}
                        </section>

                        {/* Why Pro */}
                        <aside className="flex flex-col gap-5">
                            <section className="rounded-xl bg-white p-5 shadow-sm">
                                <h2 className="text-base font-bold text-[#14141B]">What Pro changes</h2>
                                <div className="mt-3 grid grid-cols-2 gap-2.5">
                                    <div className="rounded-lg bg-[#F6F5F2] p-3">
                                        <p className="text-xs text-[#8A8A96]">Free</p>
                                        <p className="text-lg font-bold text-[#14141B] tabular-nums">{pct(freeRate)}</p>
                                    </div>
                                    <div className="rounded-lg bg-[#F1EAFE] p-3">
                                        <p className="text-xs text-[#7C3AED]">Pro</p>
                                        <p className="text-lg font-bold text-[#14141B] tabular-nums">{pct(pro.commission_rate)}</p>
                                    </div>
                                </div>
                                <ul className="mt-4 flex flex-col gap-2 text-sm text-[#4B4B57]">
                                    {pro.features.map((feature) => (
                                        <li key={feature} className="flex gap-2">
                                            <Check className="mt-0.5 size-4 shrink-0 text-[#059669]" /> {feature}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {savings.sales_30d > 0 && (
                                <section className="flex items-start gap-3 rounded-xl bg-white p-5 shadow-sm">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E6F6EC] text-[#059669]">
                                        <TrendingUp className="size-5" />
                                    </span>
                                    <div className="text-sm text-[#4B4B57]">
                                        <p className="font-semibold text-[#14141B]">Your last 30 days</p>
                                        <p className="mt-0.5">
                                            You sold {money(savings.sales_30d)}. The gap between Free and Pro commission on that is{' '}
                                            <span className="font-semibold text-[#14141B]">{money(savings.extra_commission)}</span>, against{' '}
                                            {money(pro.monthly_price)} for a month of Pro.
                                        </p>
                                    </div>
                                </section>
                            )}

                            <section className="rounded-xl bg-white p-5 text-sm shadow-sm">
                                <h2 className="text-base font-bold text-[#14141B]">Invoice details</h2>
                                <dl className="mt-3 flex flex-col gap-1.5">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-[#8A8A96]">Billed to</dt>
                                        <dd className="truncate font-medium text-[#14141B]">{billing.name}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-[#8A8A96]">GSTIN</dt>
                                        <dd className="font-medium text-[#14141B]">{billing.gstin ?? 'Not added'}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-[#8A8A96]">State</dt>
                                        <dd className="font-medium text-[#14141B]">{billing.state ?? 'Not set'}</dd>
                                    </div>
                                </dl>
                                <p className="mt-3 text-xs text-[#8A8A96]">
                                    Name comes from your{' '}
                                    <Link href="/dashboard/payments/account" className="font-semibold text-[#4F46E5] hover:underline">
                                        payout profile
                                    </Link>
                                    ; GSTIN from your verified KYC.
                                </p>
                            </section>
                        </aside>
                    </div>

                    {/* Invoices */}
                    <section className="rounded-xl bg-white shadow-sm">
                        <div className="flex items-center justify-between p-5 pb-3">
                            <h2 className="text-base font-bold text-[#14141B]">Invoices</h2>
                        </div>
                        {invoices.length === 0 ? (
                            <p className="px-5 pb-6 text-sm text-[#8A8A96]">No invoices yet. A GST invoice appears here after each Pro payment.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[560px] text-sm">
                                    <thead>
                                        <tr className="border-y border-[#F0EFEA] bg-[#FAFAF8] text-left text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">
                                            <th className="px-5 py-2.5">Invoice</th>
                                            <th className="px-3 py-2.5">Date</th>
                                            <th className="px-3 py-2.5">Period</th>
                                            <th className="px-3 py-2.5 text-right">Amount</th>
                                            <th className="px-5 py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((invoice) => (
                                            <tr key={invoice.uuid} className="border-b border-[#F0EFEA] last:border-0">
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-[#14141B]">{invoice.number}</p>
                                                    <p className="text-xs text-[#8A8A96]">{invoice.description ?? 'Pro plan'}</p>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap text-[#4B4B57]">{date(invoice.paid_at)}</td>
                                                <td className="px-3 py-3 whitespace-nowrap text-[#4B4B57]">
                                                    {invoice.period_start ? `${date(invoice.period_start)} – ${date(invoice.period_end)}` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-right font-semibold text-[#14141B] tabular-nums">{money(invoice.amount)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <a
                                                        href={`/dashboard/settings/billing/invoices/${invoice.uuid}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:underline"
                                                    >
                                                        <FileText className="size-3.5" /> View
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
