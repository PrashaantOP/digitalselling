import { cn, formatCurrency } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { hasTrend, shortDate, type ChartMetric, type ChartPoint } from './types';

// rang cp tokens se — light / dark dono me apne aap
const metrics: { key: ChartMetric; label: string; color: string }[] = [
    { key: 'revenue', label: 'Revenue', color: 'var(--cp-brand)' },
    { key: 'sales', label: 'Sales', color: 'var(--cp-success)' },
    { key: 'visits', label: 'Visits', color: 'var(--cp-accent)' },
];

function formatMetric(metric: ChartMetric, value: number) {
    return metric === 'revenue' ? formatCurrency(value) : value.toLocaleString('en-IN');
}

// Y-axis pe lambe numbers compact dikhen (₹12K, 1.2L nahi — simple K/M)
function compact(metric: ChartMetric, value: number) {
    const n = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    return metric === 'revenue' ? `₹${n}` : n;
}

export function RevenueChart({ data, days }: { data: ChartPoint[]; days: number }) {
    const [metric, setMetric] = useState<ChartMetric>('revenue');
    const active = metrics.find((m) => m.key === metric)!;
    const total = data.reduce((sum, d) => sum + d[metric], 0);
    const trend = hasTrend(data.map((d) => d[metric]));

    return (
        <section className="rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <h2 className="font-semibold text-cp-ink">Performance</h2>
                    <p className="mt-0.5 text-xs text-cp-muted">Last {days} days · daily breakdown</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-cp-ink">{formatMetric(metric, total)}</p>
                </div>
                <div className="inline-flex w-fit rounded-xl bg-cp-surface-3 p-1">
                    {metrics.map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => setMetric(m.key)}
                            aria-pressed={metric === m.key}
                            className={cn(
                                'rounded-lg px-3 py-2 text-xs font-semibold transition sm:py-1.5',
                                metric === m.key ? 'bg-cp-surface text-cp-ink shadow-sm' : 'text-cp-muted hover:text-cp-ink',
                            )}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {trend ? (
                <div className="mt-6 h-64 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={active.color} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={active.color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="var(--cp-line)" strokeDasharray="4 4" />
                            <XAxis
                                dataKey="day"
                                tickFormatter={shortDate}
                                tick={{ fontSize: 11, fill: 'var(--cp-muted)' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={24}
                            />
                            <YAxis
                                tickFormatter={(v: number) => compact(metric, v)}
                                tick={{ fontSize: 11, fill: 'var(--cp-muted)' }}
                                axisLine={false}
                                tickLine={false}
                                width={52}
                                allowDecimals={metric === 'revenue'}
                            />
                            <Tooltip
                                content={({ active: on, payload, label }) => (
                                    <ChartTooltip on={on} point={payload?.[0]?.payload as ChartPoint | undefined} label={String(label ?? '')} metric={metric} />
                                )}
                                cursor={{ stroke: active.color, strokeOpacity: 0.3 }}
                            />
                            <Area
                                type="monotone"
                                dataKey={metric}
                                stroke={active.color}
                                strokeWidth={2.5}
                                fill="url(#perf-fill)"
                                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--cp-surface)' }}
                                animationDuration={600}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                // ek-do din ka data ho to bada khaali graph nahi — chhota sa sandesh
                <div className="mt-5 flex items-center gap-4 rounded-xl border border-dashed border-cp-line-strong bg-cp-surface-2 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cp-brand-soft text-cp-brand-ink">
                        <TrendingUp className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-cp-ink">Your {active.label.toLowerCase()} trend shows up after a few active days</h3>
                        <p className="mt-0.5 text-xs text-cp-muted">Share your store link on WhatsApp status or your Instagram bio to get things moving.</p>
                    </div>
                    <Link href="/dashboard/store" className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-cp-brand-ink sm:inline-flex">
                        Open store <ArrowRight className="size-3" />
                    </Link>
                </div>
            )}
        </section>
    );
}

function ChartTooltip({ on, point, label, metric }: { on?: boolean; point?: ChartPoint; label: string; metric: ChartMetric }) {
    if (!on || !point) return null;
    return (
        <div className="rounded-lg border border-cp-line bg-cp-surface px-3 py-2 text-xs text-cp-ink shadow-lg">
            <p className="font-semibold">
                {new Date(`${label}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
            <p className="mt-1 text-base font-bold">{formatMetric(metric, point[metric])}</p>
            <p className="mt-0.5 text-cp-muted">
                {point.sales} {point.sales === 1 ? 'sale' : 'sales'} · {point.visits} {point.visits === 1 ? 'visit' : 'visits'}
            </p>
        </div>
    );
}
