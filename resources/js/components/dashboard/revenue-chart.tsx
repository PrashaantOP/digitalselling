import { cn, formatCurrency } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { shortDate, type ChartMetric, type ChartPoint } from './types';

const metrics: { key: ChartMetric; label: string; color: string }[] = [
    { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)' },
    { key: 'sales', label: 'Sales', color: 'var(--chart-3)' },
    { key: 'visits', label: 'Visits', color: 'var(--chart-4)' },
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
    const hasData = data.some((d) => d[metric] > 0);

    return (
        <section className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <h2 className="font-semibold">Performance</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Last {days} days · daily breakdown</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight">{formatMetric(metric, total)}</p>
                </div>
                <div className="inline-flex w-fit rounded-xl bg-muted p-1">
                    {metrics.map((m) => (
                        <button
                            key={m.key}
                            type="button"
                            onClick={() => setMetric(m.key)}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                                metric === m.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative mt-6 h-72">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={active.color} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={active.color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.6} />
                            <XAxis
                                dataKey="day"
                                tickFormatter={shortDate}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={24}
                            />
                            <YAxis
                                tickFormatter={(v: number) => compact(metric, v)}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                axisLine={false}
                                tickLine={false}
                                width={52}
                                allowDecimals={metric === 'revenue'}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => (
                                    <ChartTooltip
                                        active={active}
                                        point={payload?.[0]?.payload as ChartPoint | undefined}
                                        label={String(label ?? '')}
                                        metric={metric}
                                    />
                                )}
                                cursor={{ stroke: active.color, strokeOpacity: 0.3 }}
                            />
                            <Area
                                type="monotone"
                                dataKey={metric}
                                stroke={active.color}
                                strokeWidth={2.5}
                                fill="url(#perf-fill)"
                                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--card)' }}
                                animationDuration={600}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <TrendingUp className="size-5" />
                        </span>
                        <h3 className="mt-3 text-sm font-semibold">No {active.label.toLowerCase()} in this period</h3>
                        <p className="mt-1 max-w-64 text-xs text-muted-foreground">
                            Share your store link on WhatsApp status or Instagram bio to get things moving.
                        </p>
                        <Link href="/dashboard/store" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            Open store <ArrowRight className="size-3" />
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}

function ChartTooltip({ active, point, label, metric }: { active?: boolean; point?: ChartPoint; label: string; metric: ChartMetric }) {
    if (!active || !point) return null;
    return (
        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
            <p className="font-semibold">
                {new Date(`${label}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
            <p className="mt-1 text-base font-bold">{formatMetric(metric, point[metric])}</p>
            <p className="mt-0.5 text-muted-foreground">
                {point.sales} sales · {point.visits} visits
            </p>
        </div>
    );
}
