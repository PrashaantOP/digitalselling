import { formatCurrency } from '@/lib/utils';
import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { productTypeLabels, type TypeRevenue } from './types';

const colors = ['var(--chart-1)', 'var(--chart-4)', 'var(--chart-3)', '#f59e0b', '#ec4899', '#14b8a6'];

// product type ke hisaab se revenue ka split
export function TypeDonut({ data }: { data: TypeRevenue[] }) {
    const total = data.reduce((sum, d) => sum + d.revenue, 0);

    return (
        <section className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Revenue by product type</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Where your money comes from</p>
            {total <= 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <PieIcon className="size-5" />
                    </span>
                    <p className="mt-3 text-xs text-muted-foreground">No sales in this period yet.</p>
                </div>
            ) : (
                <>
                    <div className="relative mx-auto mt-4 size-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="revenue"
                                    nameKey="type"
                                    innerRadius="68%"
                                    outerRadius="100%"
                                    paddingAngle={data.length > 1 ? 3 : 0}
                                    stroke="none"
                                >
                                    {data.map((d, i) => (
                                        <Cell key={d.type} fill={colors[i % colors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [formatCurrency(Number(value)), productTypeLabels[String(name)] ?? String(name)]}
                                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--popover)', fontSize: 12 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Total</span>
                            <span className="text-lg font-bold">{formatCurrency(total)}</span>
                        </div>
                    </div>
                    <ul className="mt-5 space-y-2">
                        {data.map((d, i) => (
                            <li key={d.type} className="flex items-center gap-2 text-xs">
                                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
                                <span className="flex-1 truncate">{productTypeLabels[d.type] ?? d.type}</span>
                                <span className="text-muted-foreground">{Math.round((d.revenue / total) * 100)}%</span>
                                <span className="w-20 text-right font-semibold">{formatCurrency(d.revenue)}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
