import { cookie } from '@/components/public/checkout-card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { loadRazorpay } from '@/lib/razorpay';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, BadgeCheck, Check, Crown, FileText, Gift, Info, Loader2, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Billing', href: '/dashboard/settings/billing' }];

interface Quote {
    months: number;
    unit_price: number;
    subtotal: number;
    discount: number;
    credit: number;
    payable: number;
    new_expiry: string;
    taxable: number;
    gst_rate: number;
    gst: number;
}

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
    quotes: { months: number; plain: Quote; withCredit: Quote }[];
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

const post = (url: string, body: unknown) =>
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') },
        body: JSON.stringify(body),
    });

export default function Billing({ plan, pro, freeRate, quotes, creditBalance, billing, states, paymentsReady, savings, invoices }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [months, setMonths] = useState(quotes[0]?.months ?? 1);
    const [useCredit, setUseCredit] = useState(creditBalance > 0);
    const [state, setState] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 6000);
        return () => window.clearTimeout(t);
    }, [notice]);

    const row = quotes.find((q) => q.months === months) ?? quotes[0];
    const quote = useCredit && creditBalance > 0 ? row.withCredit : row.plain;
    const onPro = plan.effective === 'pro';
    const daysLeft = plan.expires_at ? daysUntil(plan.expires_at) : null;
    const endingSoon = onPro && daysLeft !== null && daysLeft <= 7;
    const needsState = !billing.state;
    const unverified = auth.user.email_verified_at === null;
    const canPay = !plan.permanent && !unverified && (quote.payable === 0 || paymentsReady) && (!needsState || state !== '');

    function done(message: string) {
        setNotice(message);
        router.reload();
    }

    async function pay() {
        setBusy(true);
        setError(null);

        try {
            const res = await post('/dashboard/settings/billing/checkout', { months, use_credit: useCredit && creditBalance > 0, ...(needsState ? { state } : {}) });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const first = data?.errors ? (Object.values(data.errors)[0] as string[])[0] : null;
                setError(first ?? data?.message ?? 'Could not start the payment. Please try again.');
                return;
            }

            // poora amount referral credit se ho gaya — gateway ki zaroorat nahi
            if (data.paid) {
                done(data.message);
                return;
            }

            if (!(await loadRazorpay()) || !window.Razorpay) {
                setError('Could not load the payment window. Check your connection and try again.');
                return;
            }

            const checkout = new window.Razorpay({
                key: data.key,
                order_id: data.order_id,
                amount: data.amount,
                currency: 'INR',
                name: data.name,
                description: data.description,
                prefill: data.prefill,
                theme: { color: '#4F46E5' },
                handler: async (response: Record<string, string>) => {
                    setBusy(true);
                    const verify = await post('/dashboard/settings/billing/verify', response);
                    const result = await verify.json().catch(() => null);
                    setBusy(false);

                    if (verify.ok) {
                        done(result?.message ?? 'Payment received — Pro is active.');
                    } else {
                        setError(result?.errors?.payment?.[0] ?? 'We could not confirm the payment yet. If money was deducted, Pro will activate in a few minutes.');
                    }
                },
            });
            checkout.on('payment.failed', (r) => setError(r.error?.description ?? 'The payment did not go through. You were not charged.'));
            checkout.open();
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setBusy(false);
        }
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
                                Pro ends {daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}. It does not renew on its own — after that
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
                        {/* Buy / extend */}
                        <section className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow-sm">
                            <div>
                                <h2 className="text-base font-bold text-[#14141B]">{onPro ? 'Extend Pro' : 'Upgrade to Pro'}</h2>
                                <p className="mt-0.5 text-sm text-[#8A8A96]">
                                    Pay once for the months you want. New months are added after your current end date.
                                </p>
                            </div>

                            {plan.permanent ? (
                                <div className="flex items-start gap-2.5 rounded-lg bg-[#EEF0FF] p-3.5 text-[13px] font-medium text-[#4338CA]">
                                    <BadgeCheck className="mt-px size-4 shrink-0" /> Your account already has Pro with no end date — there is nothing to buy.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" role="radiogroup" aria-label="Duration">
                                        {quotes.map((q) => (
                                            <button
                                                key={q.months}
                                                type="button"
                                                role="radio"
                                                aria-checked={months === q.months}
                                                onClick={() => setMonths(q.months)}
                                                className={cn(
                                                    'rounded-xl border p-3 text-left transition',
                                                    months === q.months
                                                        ? 'border-[#4F46E5] bg-[#EEF0FF] ring-1 ring-[#4F46E5]'
                                                        : 'border-[#E4E2DA] bg-white hover:border-[#C9C6BC]',
                                                )}
                                            >
                                                <span className="block text-sm font-bold text-[#14141B]">
                                                    {q.months} month{q.months > 1 ? 's' : ''}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-[#6B6B78] tabular-nums">{money(q.plain.subtotal - q.plain.discount)}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {creditBalance > 0 && (
                                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E4E2DA] p-3.5">
                                            <input
                                                type="checkbox"
                                                checked={useCredit}
                                                onChange={(e) => setUseCredit(e.target.checked)}
                                                className="mt-0.5 size-4 accent-[#4F46E5]"
                                            />
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#14141B]">
                                                    <Gift className="size-4 text-[#7C3AED]" /> Use referral credit
                                                </span>
                                                <span className="mt-0.5 block text-xs text-[#8A8A96]">
                                                    {money(creditBalance)} available. It is only deducted once the payment succeeds.
                                                </span>
                                            </span>
                                        </label>
                                    )}

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

                                    <dl className="flex flex-col gap-2 rounded-xl bg-[#F6F5F2] p-4 text-sm">
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-[#6B6B78]">
                                                {pro.name} × {quote.months} month{quote.months > 1 ? 's' : ''}
                                            </dt>
                                            <dd className="font-medium text-[#14141B] tabular-nums">{money(quote.subtotal)}</dd>
                                        </div>
                                        {quote.discount > 0 && (
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-[#6B6B78]">Discount</dt>
                                                <dd className="font-medium text-[#059669] tabular-nums">−{money(quote.discount)}</dd>
                                            </div>
                                        )}
                                        {quote.credit > 0 && (
                                            <div className="flex justify-between gap-4">
                                                <dt className="text-[#6B6B78]">Referral credit</dt>
                                                <dd className="font-medium text-[#059669] tabular-nums">−{money(quote.credit)}</dd>
                                            </div>
                                        )}
                                        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-[#E4E2DA] pt-3">
                                            <dt className="font-bold text-[#14141B]">You pay</dt>
                                            <dd className="text-xl font-bold text-[#14141B] tabular-nums">{money(quote.payable)}</dd>
                                        </div>
                                        <p className="text-xs text-[#8A8A96]">
                                            {quote.payable > 0 && `Includes ${money(quote.gst)} GST (${pct(quote.gst_rate)}). `}
                                            Pro will be valid till {date(quote.new_expiry)}.
                                        </p>
                                    </dl>

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
                                        !paymentsReady &&
                                        quote.payable > 0 && (
                                            <div className="flex items-start gap-2 rounded-lg bg-[#FFF4DB] p-3 text-[13px] font-medium text-[#B46E00]">
                                                <Info className="mt-px size-4 shrink-0" /> Online payments are not set up yet. Please check back soon.
                                            </div>
                                        )
                                    )}

                                    <Button onClick={pay} disabled={busy || !canPay} className="h-11 w-full bg-[#4F46E5] text-sm font-bold hover:bg-[#4338CA]">
                                        {busy ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : quote.payable > 0 ? (
                                            `Pay ${money(quote.payable)}`
                                        ) : (
                                            'Activate with referral credit'
                                        )}
                                    </Button>
                                    <p className="flex items-center justify-center gap-1.5 text-xs text-[#8A8A96]">
                                        <ShieldCheck className="size-3.5" /> Secure payment by Razorpay · UPI, cards, netbanking · no auto-debit
                                    </p>
                                </>
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
