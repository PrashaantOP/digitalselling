import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { hasTrend } from './types';

interface KpiCardProps {
    label: string;
    value: string;
    change: number | null;
    icon: LucideIcon;
    /** sparkline ka rang — CSS var, jaise 'var(--cp-brand)' (dark me apne aap badalta hai) */
    color: string;
    /** icon chip — cp soft + ink, jaise 'bg-cp-brand-soft text-cp-brand-ink' */
    tone: string;
    series: number[];
    hint?: string;
}

// compact KPI tile — label, value, pichhle period se % change (ya hint), trend ho to chhota sparkline
export function KpiCard({ label, value, change, icon: Icon, color, tone, series, hint }: KpiCardProps) {
    const gradientId = useId().replace(/:/g, '');
    const data = series.map((v, i) => ({ i, v }));

    return (
        <div className="flex min-w-0 flex-col rounded-2xl border border-cp-line bg-cp-surface p-4 shadow-sm">
            <div className="flex items-center gap-2">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', tone)}>
                    <Icon className="size-3.5" />
                </span>
                <p className="truncate text-xs font-medium text-cp-subtle">{label}</p>
            </div>
            <p className="mt-3 truncate text-xl font-bold tracking-tight text-cp-ink md:text-2xl">{value}</p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
                {change !== null && <ChangeBadge change={change} />}
                <p className="truncate text-[11px] text-cp-muted">{hint ?? (change !== null ? 'vs previous period' : 'No earlier data yet')}</p>
            </div>
            {hasTrend(series) && (
                <div className="pointer-events-none mt-3 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

export function ChangeBadge({ change }: { change: number }) {
    const up = change >= 0;
    const Arrow = up ? ArrowUpRight : ArrowDownRight;

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                up ? 'bg-cp-success-soft text-cp-success-ink' : 'bg-cp-danger-soft text-cp-danger-ink',
            )}
        >
            <Arrow className="size-3" />
            {Math.abs(change).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%
        </span>
    );
}
