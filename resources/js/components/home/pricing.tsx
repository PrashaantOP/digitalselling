import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Check, Gift, ShieldCheck } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './primitives';
import { type HomePlan } from './types';

export const inr = (v: string | number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v));

export function Pricing({ plans, trialDays }: { plans: HomePlan[]; trialDays: number }) {
    const { auth } = usePage<SharedData>().props;
    // DB me koi active plan nahi → section hi mat dikhao
    if (plans.length === 0) return null;

    const free = plans.find((p) => Number(p.monthly_price) === 0);
    const cta = auth.user ? route('dashboard') : route('register');

    return (
        <section id="pricing" className="relative scroll-mt-20 overflow-hidden bg-linear-to-b from-white to-blue-50/80 py-20 sm:py-28">
            <Container className="relative">
                <SectionHeading
                    eyebrow="Pricing"
                    title={
                        <>
                            Start with <span className="text-blue-600">{trialDays} days of Pro</span>, free
                        </>
                    }
                    description="No setup fee, no card needed to sign up. You only pay a small commission when you make a sale — and it already includes Razorpay payment gateway charges."
                />

                <Reveal className="mx-auto mt-10 flex max-w-2xl items-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-sm text-white shadow-lg shadow-blue-600/25">
                    <Gift className="size-5 shrink-0" />
                    <p>
                        <span className="font-semibold">Every new account starts on Pro.</span> After {trialDays} days, continue on Pro or move to
                        Free — your products, students and store stay exactly as they are.
                    </p>
                </Reveal>

                <div className={cn('mx-auto mt-12 grid gap-6', plans.length === 1 ? 'max-w-md' : 'max-w-4xl md:grid-cols-2')}>
                    {plans.map((plan, i) => {
                        const isFree = Number(plan.monthly_price) === 0;
                        const featured = !isFree;
                        // Pro ko Free se kitna % kam lagta hai
                        const saves = free && featured ? Number(free.commission_rate) - Number(plan.commission_rate) : 0;

                        return (
                            <Reveal key={plan.id} delay={i * 80} className="h-full">
                                <div
                                    className={cn(
                                        'relative flex h-full flex-col rounded-3xl p-7 sm:p-8',
                                        featured
                                            ? 'bg-linear-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-700/30'
                                            : 'bg-white ring-1 ring-slate-200',
                                    )}
                                >
                                    {featured && (
                                        <span className="absolute -top-3 left-6 rounded-full bg-sky-300 px-3 py-1 text-xs font-semibold text-blue-950">
                                            {trialDays} days free on signup
                                        </span>
                                    )}
                                    <h3 className={cn('text-lg font-semibold', featured ? 'text-white' : 'text-slate-900')}>{plan.name}</h3>

                                    {/* commission hi asli price hai — sabse bada */}
                                    <p className="mt-5 flex items-baseline gap-2">
                                        <span className="text-5xl font-semibold tracking-tight">{Number(plan.commission_rate)}%</span>
                                        <span className={featured ? 'text-blue-100' : 'text-slate-500'}>per sale</span>
                                    </p>
                                    <p className={cn('mt-2 text-sm', featured ? 'text-blue-100' : 'text-slate-600')}>
                                        {isFree ? (
                                            <>₹0/month · forever</>
                                        ) : (
                                            <>
                                                <span className="font-semibold text-white">₹0 for {trialDays} days</span>, then ₹
                                                {inr(plan.monthly_price)}/month
                                            </>
                                        )}
                                    </p>
                                    {saves > 0 && (
                                        <p className="mt-3 inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">
                                            Keep {saves}% more of every sale
                                        </p>
                                    )}

                                    <ul className={cn('mt-6 space-y-3 border-t pt-6 text-sm', featured ? 'border-white/15' : 'border-slate-100')}>
                                        {(plan.features ?? []).map((f) => (
                                            <li key={f} className="flex items-start gap-2.5">
                                                <Check className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-sky-300' : 'text-blue-600')} />
                                                <span className={featured ? 'text-white' : 'text-slate-700'}>{f}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link
                                        href={cta}
                                        className={cn(
                                            'mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5',
                                            featured ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700',
                                        )}
                                    >
                                        {isFree ? 'Start selling' : `Start ${trialDays}-day Pro free`}
                                    </Link>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>

                <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-slate-500">
                    <ShieldCheck className="size-4 shrink-0 text-blue-600" />
                    Commission includes Razorpay payment gateway charges — no hidden fees. Subscription price excludes GST.
                </p>
            </Container>
        </section>
    );
}
