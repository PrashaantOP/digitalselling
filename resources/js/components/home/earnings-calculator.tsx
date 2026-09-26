import { cn } from '@/lib/utils';
import { Calculator, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { inr } from './pricing';
import { Container, Reveal, SectionHeading } from './primitives';
import { type HomePlan } from './types';

// DB me plan na ho tab bhi calculator kaam kare (PlanPricing::FALLBACK_RATES jaisa)
const FALLBACK = { free: { rate: 15, price: 0 }, pro: { rate: 10, price: 499 } };

function rates(plans: HomePlan[]) {
    const free = plans.find((p) => p.slug === 'free');
    const pro = plans.find((p) => p.slug === 'pro');
    return {
        free: free ? { rate: Number(free.commission_rate), price: Number(free.monthly_price) } : FALLBACK.free,
        pro: pro ? { rate: Number(pro.commission_rate), price: Number(pro.monthly_price) } : FALLBACK.pro,
    };
}

function Slider({
    label,
    value,
    min,
    max,
    step,
    onChange,
    format,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <label className="block">
            <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700 tabular-nums">{format(value)}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="home-range mt-3 w-full"
                style={{ background: `linear-gradient(to right, #2563eb ${pct}%, #dbeafe ${pct}%)` }}
            />
            <span className="mt-1 flex justify-between text-xs text-slate-400">
                <span>{format(min)}</span>
                <span>{format(max)}</span>
            </span>
        </label>
    );
}

export function EarningsCalculator({ plans, trialDays }: { plans: HomePlan[]; trialDays: number }) {
    const [price, setPrice] = useState(999);
    const [sales, setSales] = useState(50);
    const [plan, setPlan] = useState<'free' | 'pro'>('pro');
    const r = rates(plans);

    const gross = price * sales;
    const fee = (gross * r[plan].rate) / 100;
    const earn = gross - fee;

    // Pro vs Free: commission ka farak − Pro subscription. Trial me subscription ₹0.
    const commissionSaved = (gross * (r.free.rate - r.pro.rate)) / 100;
    const proGainAfterTrial = commissionSaved - r.pro.price;

    return (
        <section id="calculator" className="scroll-mt-20 bg-white py-20 sm:py-28">
            <Container>
                <SectionHeading
                    eyebrow="Earnings calculator"
                    title={
                        <>
                            See exactly what <span className="text-blue-600">you take home</span>
                        </>
                    }
                    description="Move the sliders to estimate your monthly earnings. The commission already includes payment gateway charges, so this is what reaches your payouts."
                />

                <Reveal className="mt-12">
                    <div className="grid overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(30,64,175,0.3)] ring-1 ring-blue-100 lg:grid-cols-[1.1fr_1fr]">
                        {/* inputs */}
                        <div className="space-y-8 p-6 sm:p-10">
                            <div className="flex items-center gap-3">
                                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                                    <Calculator className="size-5" />
                                </span>
                                <p className="font-semibold text-slate-900">Your numbers</p>
                            </div>

                            <Slider
                                label="Product price"
                                value={price}
                                min={49}
                                max={19999}
                                step={50}
                                onChange={setPrice}
                                format={(v) => `₹${inr(v)}`}
                            />
                            <Slider label="Sales per month" value={sales} min={1} max={1000} step={1} onChange={setSales} format={(v) => inr(v)} />

                            <div>
                                <span className="text-sm font-medium text-slate-700">Plan</span>
                                <div role="radiogroup" className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-200">
                                    {(['free', 'pro'] as const).map((p) => (
                                        <button
                                            key={p}
                                            role="radio"
                                            aria-checked={plan === p}
                                            onClick={() => setPlan(p)}
                                            className={cn(
                                                'rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                                                plan === p
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                                    : 'text-slate-600 hover:text-blue-700',
                                            )}
                                        >
                                            {p === 'free' ? 'Free' : 'Pro'} · {r[p].rate}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* result */}
                        <div className="relative flex flex-col justify-between gap-8 overflow-hidden bg-linear-to-br from-blue-600 to-[#0b1f4d] p-6 text-white sm:p-10">
                            <div aria-hidden className="home-grid-light pointer-events-none absolute inset-0 opacity-20" />
                            <div className="relative">
                                <p className="text-sm font-medium text-blue-100">You earn every month</p>
                                <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl" aria-live="polite">
                                    ₹{inr(earn)}
                                </p>
                                <dl className="mt-8 space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-blue-100">Total sales</dt>
                                        <dd className="font-semibold tabular-nums">₹{inr(gross)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <dt className="text-blue-100">Platform commission ({r[plan].rate}%, incl. gateway)</dt>
                                        <dd className="font-semibold tabular-nums">− ₹{inr(fee)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4 border-t border-white/15 pt-3">
                                        <dt className="font-semibold">Your payout</dt>
                                        <dd className="font-semibold tabular-nums">₹{inr(earn)}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="relative rounded-2xl bg-white/10 p-4 text-sm ring-1 ring-white/20">
                                <p className="flex items-center gap-2 font-semibold">
                                    <TrendingUp className="size-4 text-sky-300" /> Pro vs Free
                                </p>
                                <p className="mt-1.5 text-blue-100">
                                    For your first {trialDays} days, Pro saves you{' '}
                                    <span className="font-semibold text-white">₹{inr(commissionSaved)}/month</span> at no cost.{' '}
                                    {proGainAfterTrial > 0 ? (
                                        <>
                                            After that, Pro still leaves you{' '}
                                            <span className="font-semibold text-white">₹{inr(proGainAfterTrial)} more</span> each month after the ₹
                                            {inr(r.pro.price)} subscription.
                                        </>
                                    ) : (
                                        <>After the trial, Free works out cheaper at this volume — switch anytime.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </Reveal>
                <p className="mt-4 text-center text-xs text-slate-500">
                    Estimate only. Excludes GST on the Pro subscription and any refunds or chargebacks.
                </p>
            </Container>
        </section>
    );
}
