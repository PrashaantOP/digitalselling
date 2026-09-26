import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
    label: string;
    value: string;
    change: number | null;
    icon: LucideIcon;
    color: string;
    tone: string;
    series: number[];
    hint?: string;
}

// ek KPI tile — value, pichhle period se % change aur neeche chhota sparkline
export function KpiCard({ label, value, change, icon: Icon, color, tone, series, hint }: KpiCardProps) {
    const gradientId = useId().replace(/:/g, '');
    const data = series.map((v, i) => ({ i, v }));
    const hasData = series.some((v) => v > 0);

    return (
        <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
                <span className={cn('flex size-10 items-center justify-center rounded-xl', tone)}>
                    <Icon className="size-5" />
                </span>
                <ChangeBadge change={change} />
            </div>
            <p className="mt-4 text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight md:text-[1.7rem]">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{hint ?? 'vs previous period'}</p>
            <div className="pointer-events-none -mx-5 mt-3 -mb-5 h-14">
                {hasData && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

export function ChangeBadge({ change }: { change: number | null }) {
    if (change === null) {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <Minus className="size-3" /> New
            </span>
        );
    }
    const up = change >= 0;
    const Arrow = up ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                up
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
            )}
        >
            <Arrow className="size-3" />
            {Math.abs(change).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%
        </span>
    );
}
