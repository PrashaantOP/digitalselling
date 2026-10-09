import { formatCurrency } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, Trophy } from 'lucide-react';
import { productTypeLabels, type TopProduct } from './types';

// period ke best sellers, revenue ke hisaab se relative bar
export function TopProducts({ products }: { products: TopProduct[] }) {
    const max = Math.max(1, ...products.map((p) => p.revenue));

    return (
        <section className="flex flex-col rounded-2xl border border-cp-line bg-cp-surface p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="font-semibold text-cp-ink">Top products</h2>
                    <p className="mt-0.5 text-xs text-cp-muted">Best sellers by earnings</p>
                </div>
                <Link href="/dashboard/products" className="inline-flex items-center gap-1 text-xs font-semibold text-cp-brand-ink">
                    All <ArrowRight className="size-3" />
                </Link>
            </div>
            {products.length === 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-cp-surface-2 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cp-surface-3 text-cp-muted">
                        <Trophy className="size-4" />
                    </span>
                    <p className="text-xs text-cp-muted">Your best sellers will show up here.</p>
                </div>
            ) : (
                <ol className="mt-5 space-y-4">
                    {products.map((p, i) => (
                        <li key={p.id}>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-cp-warning-soft text-cp-warning-ink' : 'bg-cp-surface-3 text-cp-muted'}`}
                                >
                                    {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-2">
                                        <p className="truncate text-sm font-medium text-cp-ink">{p.title}</p>
                                        <p className="text-sm font-semibold whitespace-nowrap text-cp-ink">{formatCurrency(p.revenue)}</p>
                                    </div>
                                    <p className="text-[11px] text-cp-muted">
                                        {productTypeLabels[p.type] ?? p.type} · {p.sales} {p.sales === 1 ? 'sale' : 'sales'}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-cp-surface-3">
                                <div className="h-full rounded-full bg-cp-brand transition-all duration-500" style={{ width: `${(p.revenue / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
