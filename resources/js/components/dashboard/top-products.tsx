import { formatCurrency } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, Trophy } from 'lucide-react';
import { productTypeLabels, type TopProduct } from './types';

// period ke best sellers, revenue ke hisaab se relative bar
export function TopProducts({ products }: { products: TopProduct[] }) {
    const max = Math.max(1, ...products.map((p) => p.revenue));

    return (
        <section className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="font-semibold">Top products</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Best sellers by revenue</p>
                </div>
                <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    All <ArrowRight className="size-3" />
                </Link>
            </div>
            {products.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Trophy className="size-5" />
                    </span>
                    <p className="mt-3 text-xs text-muted-foreground">Your best sellers will show up here.</p>
                </div>
            ) : (
                <ol className="mt-5 space-y-4">
                    {products.map((p, i) => (
                        <li key={p.id}>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}
                                >
                                    {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-2">
                                        <p className="truncate text-sm font-medium">{p.title}</p>
                                        <p className="text-sm font-semibold whitespace-nowrap">{formatCurrency(p.revenue)}</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {productTypeLabels[p.type] ?? p.type} · {p.sales} {p.sales === 1 ? 'sale' : 'sales'}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                                    style={{ width: `${(p.revenue / max) * 100}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
