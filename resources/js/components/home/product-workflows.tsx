import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Container, Reveal, SectionHeading } from './primitives';
import { WORKFLOW_EVENT } from './product-grid';
import { PRODUCTS, type ProductKey } from './products';

const OTHERS = PRODUCTS.filter((p) => p.key !== 'course');

export function ProductWorkflows() {
    const [active, setActive] = useState<ProductKey>(OTHERS[0].key);
    const product = OTHERS.find((p) => p.key === active) ?? OTHERS[0];

    // Product grid ke card se aaya click → wahi tab khol do
    useEffect(() => {
        const onSelect = (e: Event) => {
            const key = (e as CustomEvent<ProductKey>).detail;
            if (OTHERS.some((p) => p.key === key)) setActive(key);
        };
        window.addEventListener(WORKFLOW_EVENT, onSelect);
        return () => window.removeEventListener(WORKFLOW_EVENT, onSelect);
    }, []);

    // Footer / legal pages se "/#workflows-event" jaisa link → tab select + scroll
    useEffect(() => {
        const fromHash = () => {
            const key = window.location.hash.replace('#workflows-', '') as ProductKey;
            if (!window.location.hash.startsWith('#workflows-') || !OTHERS.some((p) => p.key === key)) return;
            setActive(key);
            document.getElementById('workflows')?.scrollIntoView();
        };
        fromHash();
        window.addEventListener('hashchange', fromHash);
        return () => window.removeEventListener('hashchange', fromHash);
    }, []);

    return (
        <section id="workflows" className="relative scroll-mt-20 overflow-hidden bg-[#0b1f4d] py-20 text-white sm:py-28">
            <div aria-hidden className="home-grid-light pointer-events-none absolute inset-0 opacity-20" />
            <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />

            <Container className="relative">
                <SectionHeading
                    tone="dark"
                    eyebrow="Beyond courses"
                    title="Every product has a simple, proven flow"
                    description="Pick a product to see what you set up and what your buyer experiences — usually live in under 10 minutes."
                />

                {/* tabs: mobile pe horizontal scroll, desktop pe centered */}
                <Reveal className="mt-10">
                    <div
                        role="tablist"
                        aria-label="Products"
                        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
                    >
                        {OTHERS.map((p) => (
                            <button
                                key={p.key}
                                role="tab"
                                aria-selected={p.key === active}
                                onClick={() => setActive(p.key)}
                                className={cn(
                                    'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                                    p.key === active
                                        ? 'bg-white text-blue-700 shadow-lg'
                                        : 'bg-white/5 text-blue-100 ring-1 ring-white/10 hover:bg-white/10',
                                )}
                            >
                                <p.icon className="size-4" />
                                {p.name}
                            </button>
                        ))}
                    </div>
                </Reveal>

                <div
                    key={product.key}
                    role="tabpanel"
                    className="mt-10 grid gap-8 duration-500 animate-in fade-in slide-in-from-bottom-3 lg:grid-cols-[0.9fr_1.4fr] lg:gap-12"
                >
                    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur sm:p-8">
                        <span className="grid size-14 place-items-center rounded-2xl bg-blue-500/20 text-sky-300 ring-1 ring-sky-300/30">
                            <product.icon className="size-7" />
                        </span>
                        <h3 className="mt-5 text-2xl font-semibold">{product.name}</h3>
                        <p className="mt-3 leading-relaxed text-blue-100/80">{product.tagline}</p>
                        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                            {product.features.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm text-blue-50">
                                    <span className="size-1.5 rounded-full bg-sky-300" /> {f}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-6 rounded-xl bg-white/5 px-4 py-3 text-sm text-blue-100/80 ring-1 ring-white/10">{product.example}</p>
                    </div>

                    <ol className="grid gap-4 sm:grid-cols-2">
                        {product.steps.map((s, i) => (
                            <li key={s.title} className="relative rounded-3xl bg-white p-6 text-slate-900 shadow-xl shadow-black/10">
                                <span className="text-5xl leading-none font-semibold text-blue-100">{String(i + 1).padStart(2, '0')}</span>
                                <h4 className="mt-3 text-lg font-semibold">{s.title}</h4>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </Container>
        </section>
    );
}
