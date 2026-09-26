import { Link } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './primitives';
import { PRODUCTS, productUrl, type ProductKey } from './products';

export const WORKFLOW_EVENT = 'home:workflow';

// Card click → neeche "workflows" tab select karo (course ka apna alag section hai)
function openWorkflow(key: ProductKey) {
    window.dispatchEvent(new CustomEvent<ProductKey>(WORKFLOW_EVENT, { detail: key }));
}

export function ProductGrid() {
    return (
        <section id="products" className="scroll-mt-20 bg-white py-20 sm:py-28">
            <Container>
                <SectionHeading
                    eyebrow="Everything you can sell"
                    title={
                        <>
                            Six ways to earn, <span className="text-blue-600">one dashboard</span>
                        </>
                    }
                    description="Courses are the heart of DigitalSelling, but you’re never limited to one format. Mix and match products on your store — every one of them comes with checkout, payments and analytics built in."
                />

                <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {PRODUCTS.map((p, i) => {
                        const featured = p.key === 'course';
                        const href = featured ? '#course-workflow' : '#workflows';

                        return (
                            <Reveal key={p.key} delay={(i % 3) * 90}>
                                <div
                                    className={`group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 sm:p-7 ${
                                        featured
                                            ? 'bg-linear-to-br from-blue-600 to-blue-800 text-white shadow-2xl shadow-blue-700/30'
                                            : 'bg-white ring-1 ring-slate-200/80 hover:shadow-xl hover:shadow-blue-900/5 hover:ring-blue-200'
                                    }`}
                                >
                                    {featured && <div aria-hidden className="home-grid-light pointer-events-none absolute inset-0 opacity-30" />}
                                    <div className="relative flex items-start justify-between gap-3">
                                        <span
                                            className={`grid size-12 place-items-center rounded-2xl ${
                                                featured
                                                    ? 'bg-white/15 text-white ring-1 ring-white/25'
                                                    : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
                                            }`}
                                        >
                                            <p.icon className="size-6" />
                                        </span>
                                        {featured && (
                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">Most popular</span>
                                        )}
                                    </div>

                                    <h3 className={`relative mt-6 text-xl font-semibold ${featured ? 'text-white' : 'text-slate-900'}`}>{p.name}</h3>
                                    <p className={`relative mt-2 text-sm leading-relaxed ${featured ? 'text-blue-100' : 'text-slate-600'}`}>
                                        {p.tagline}
                                    </p>

                                    <ul className="relative mt-5 space-y-2.5">
                                        {p.features.map((f) => (
                                            <li key={f} className={`flex items-start gap-2.5 text-sm ${featured ? 'text-white' : 'text-slate-700'}`}>
                                                <Check className={`mt-0.5 size-4 shrink-0 ${featured ? 'text-sky-300' : 'text-blue-600'}`} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {featured && (
                                        <div className="relative mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                                            <p className="text-xs font-semibold tracking-wider text-blue-100 uppercase">Lesson formats</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {['Video', 'Text + Image', 'Audio', 'Quiz', 'Assignment', 'Notes PDF'].map((t) => (
                                                    <span key={t} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className={`relative mt-auto pt-6 text-xs ${featured ? 'text-blue-100/80' : 'text-slate-500'}`}>{p.example}</p>
                                    {/* do links: in-page workflow + poora product page */}
                                    <div className="relative mt-4 flex flex-wrap items-center gap-2">
                                        <Link
                                            href={productUrl(p.key)}
                                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                                featured ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            Learn more <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                                        </Link>
                                        <a
                                            href={href}
                                            onClick={() => !featured && openWorkflow(p.key)}
                                            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                                                featured ? 'text-white hover:bg-white/10' : 'text-blue-700 hover:bg-blue-50'
                                            }`}
                                        >
                                            See workflow
                                        </a>
                                    </div>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
}
