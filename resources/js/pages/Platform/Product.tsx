import { CourseWorkflow } from '@/components/home/course-workflow';
import { CtaBand } from '@/components/home/cta-band';
import { Faq } from '@/components/home/faq';
import { HomeShell } from '@/components/home/home-shell';
import { Container, Reveal, SectionHeading, primaryBtn, secondaryBtn } from '@/components/home/primitives';
import { PRODUCT_DETAILS } from '@/components/home/product-details';
import { PRODUCTS, productUrl, type ProductKey } from '@/components/home/products';
import { type HomePlan } from '@/components/home/types';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';

type Props = { type: ProductKey; plans: HomePlan[]; trialDays: number };

/** GET /products/{slug} — ek product type ka detailed page (content: components/home/product-details.ts). */
export default function ProductPage({ type, trialDays }: Props) {
    const { auth } = usePage<SharedData>().props;
    const product = PRODUCTS.find((p) => p.key === type)!;
    const detail = PRODUCT_DETAILS[type];
    const others = PRODUCTS.filter((p) => p.key !== type);
    // course ke buyer steps CourseWorkflow ke "student view" me hain
    const creatorSteps = product.steps;

    return (
        <HomeShell title={product.name} description={detail.subheadline}>
            {/* hero */}
            <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 lg:pb-24">
                <div
                    aria-hidden
                    className="home-grid pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-40 left-1/2 h-130 w-225 -translate-x-1/2 rounded-full bg-blue-400/20 blur-3xl"
                />
                <Container className="relative text-center">
                    <Reveal>
                        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
                            <Link href="/" className="hover:text-blue-700">
                                Home
                            </Link>
                            <span className="mx-2">/</span>
                            <a href="/#products" className="hover:text-blue-700">
                                Products
                            </a>
                            <span className="mx-2">/</span>
                            <span className="font-medium text-slate-700">{product.name}</span>
                        </nav>
                    </Reveal>
                    <Reveal delay={60}>
                        <span className="mx-auto mt-8 grid size-16 place-items-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-600/30">
                            <product.icon className="size-8" />
                        </span>
                    </Reveal>
                    <Reveal delay={120}>
                        <h1 className="mx-auto mt-6 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
                            {detail.headline}
                        </h1>
                    </Reveal>
                    <Reveal delay={180}>
                        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{detail.subheadline}</p>
                    </Reveal>
                    <Reveal delay={240} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link href={auth.user ? route('dashboard') : route('register')} className={primaryBtn}>
                            {auth.user ? 'Go to dashboard' : `Start free — ${trialDays} days of Pro`} <ArrowRight className="size-4" />
                        </Link>
                        <a href="#how-it-works" className={secondaryBtn}>
                            See how it works
                        </a>
                    </Reveal>
                    <Reveal delay={300}>
                        <p className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500">
                            <ShieldCheck className="size-4 text-blue-600" /> Secure payments by Razorpay · UPI, cards & netbanking
                        </p>
                    </Reveal>
                </Container>
            </section>

            {/* capabilities */}
            <section className="bg-white py-20 sm:py-24">
                <Container>
                    <SectionHeading eyebrow="What you get" title={`Everything you need to sell ${product.name.toLowerCase()}`} />
                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {detail.capabilities.map((c, i) => (
                            <Reveal key={c.title} delay={(i % 3) * 80} className="h-full">
                                <div className="h-full rounded-3xl bg-white p-6 ring-1 ring-slate-200 transition hover:shadow-xl hover:shadow-blue-900/5 hover:ring-blue-200 sm:p-7">
                                    <h3 className="text-lg font-semibold text-slate-900">{c.title}</h3>
                                    <ul className="mt-4 space-y-2.5">
                                        {c.items.map((it) => (
                                            <li key={it} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                <Check className="mt-0.5 size-4 shrink-0 text-blue-600" /> {it}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            {/* workflow: course ke liye interactive creator/student, baaki ke liye creator + buyer columns */}
            <div id="how-it-works" className="scroll-mt-20">
                {type === 'course' ? (
                    <CourseWorkflow />
                ) : (
                    <section className="bg-linear-to-b from-blue-50/70 to-white py-20 sm:py-24">
                        <Container>
                            <SectionHeading eyebrow="How it works" title="Your side and your buyer’s side" />
                            <div className="mt-12 grid gap-8 lg:grid-cols-2">
                                <StepList title="You set it up" steps={creatorSteps} />
                                <StepList title="Your buyer’s experience" steps={detail.buyerSteps} tone="dark" />
                            </div>
                        </Container>
                    </section>
                )}
            </div>

            {/* use cases */}
            <section className="bg-white py-20 sm:py-24">
                <Container>
                    <SectionHeading eyebrow="Ideas" title="What creators sell with it" />
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {detail.useCases.map((u, i) => (
                            <Reveal key={u.title} delay={i * 70} className="h-full">
                                <div className="h-full rounded-2xl bg-blue-50/60 p-5 ring-1 ring-blue-100">
                                    <Sparkles className="size-5 text-blue-600" />
                                    <h3 className="mt-3 font-semibold text-slate-900">{u.title}</h3>
                                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{u.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </Container>
            </section>

            <Faq trialDays={trialDays} items={detail.faqs} title={`${product.name}: common questions`} />

            {/* related */}
            <section className="bg-white pb-20">
                <Container>
                    <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">Sell more than one thing</h2>
                    <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {others.map((o) => (
                            <Link
                                key={o.key}
                                href={productUrl(o.key)}
                                className="group flex flex-col items-center gap-3 rounded-2xl p-5 text-center ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-300"
                            >
                                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                                    <o.icon className="size-5" />
                                </span>
                                <span className="text-sm font-semibold text-slate-800">{o.name}</span>
                            </Link>
                        ))}
                    </div>
                </Container>
            </section>

            <CtaBand />
        </HomeShell>
    );
}

function StepList({ title, steps, tone = 'light' }: { title: string; steps: { title: string; body: string }[]; tone?: 'light' | 'dark' }) {
    const dark = tone === 'dark';
    return (
        <Reveal className="h-full">
            <div className={`h-full rounded-3xl p-6 sm:p-8 ${dark ? 'bg-[#0b1f4d] text-white' : 'bg-white ring-1 ring-blue-100'}`}>
                <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                <ol className="mt-6 space-y-5">
                    {steps.map((s, i) => (
                        <li key={s.title} className="flex gap-4">
                            <span
                                className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold ${
                                    dark ? 'bg-white/10 text-sky-300 ring-1 ring-white/15' : 'bg-blue-600 text-white'
                                }`}
                            >
                                {i + 1}
                            </span>
                            <span>
                                <span className={`block font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{s.title}</span>
                                <span className={`mt-1 block text-sm leading-relaxed ${dark ? 'text-blue-100/75' : 'text-slate-600'}`}>{s.body}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </Reveal>
    );
}
