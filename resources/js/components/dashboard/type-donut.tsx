import { formatCurrency } from '@/lib/utils';
import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { productTypeLabels, type TypeRevenue } from './types';

// cp tokens — light / dark dono me apne aap
const colors = ['var(--cp-brand)', 'var(--cp-accent)', 'var(--cp-success)', 'var(--cp-warning-bright)', 'var(--cp-pink)', 'var(--cp-teal)'];

// product type ke hisaab se kamai ka split. Ek hi type ho to donut (100% ka gola) nahi — sirf list
export function TypeDonut({ data }: { data: TypeRevenue[] }) {
    const total = data.reduce((sum, d) => sum + d.revenue, 0);

    return (
        <section className="flex flex-col rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm">
            <h2 className="font-semibold text-cp-ink">Earnings by product type</h2>
            <p className="mt-0.5 text-xs text-cp-muted">Where your money comes from</p>
            {total <= 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-cp-surface-2 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cp-surface-3 text-cp-muted">
                        <PieIcon className="size-4" />
                    </span>
                    <p className="text-xs text-cp-muted">No sales in this period yet.</p>
                </div>
            ) : (
                <>
                    {data.length > 1 && (
                        <div className="relative mx-auto mt-4 size-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data} dataKey="revenue" nameKey="type" innerRadius="68%" outerRadius="100%" paddingAngle={3} stroke="none">
                                        {data.map((d, i) => (
                                            <Cell key={d.type} fill={colors[i % colors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [formatCurrency(Number(value)), productTypeLabels[String(name)] ?? String(name)]}
                                        contentStyle={{ borderRadius: 8, border: '1px solid var(--cp-line)', background: 'var(--cp-surface)', color: 'var(--cp-ink)', fontSize: 12 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] font-medium tracking-wide text-cp-muted uppercase">Total</span>
                                <span className="text-lg font-bold text-cp-ink">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    )}
                    <ul className="mt-5 space-y-3">
                        {data.map((d, i) => {
                            const pct = Math.round((d.revenue / total) * 100);
                            return (
                                <li key={d.type} className="text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
                                        <span className="flex-1 truncate text-cp-body">{productTypeLabels[d.type] ?? d.type}</span>
                                        <span className="text-cp-muted">{pct}%</span>
                                        <span className="w-20 text-right font-semibold text-cp-ink">{formatCurrency(d.revenue)}</span>
                                    </div>
                                    {data.length === 1 && (
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cp-surface-3">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}
