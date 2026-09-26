import { HomeShell } from '@/components/home/home-shell';
import { Container } from '@/components/home/primitives';
import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { PAGES, type PageKey } from './content';

// Sidebar me sirf legal teeno — about/contact ke liye sidebar nahi
const LEGAL: PageKey[] = ['privacy-policy', 'terms', 'refund-policy'];

export default function Policy({ page }: { page: PageKey }) {
    const content = PAGES[page];
    const isLegal = LEGAL.includes(page);

    return (
        <HomeShell title={content.title} description={content.intro}>
            <div
                aria-hidden
                className="home-grid pointer-events-none absolute inset-x-0 top-0 h-96 mask-[linear-gradient(to_bottom,black,transparent)]"
            />
            <header className="relative pt-12 pb-10 sm:pt-16">
                <Container className="max-w-4xl">
                    <p className="text-xs font-semibold tracking-wider text-blue-600 uppercase">{isLegal ? 'Legal' : 'Company'}</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{content.title}</h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{content.intro}</p>
                    {isLegal && <p className="mt-4 text-sm text-slate-500">Last updated: {content.updated}</p>}
                </Container>
            </header>

            <div className="relative pb-20 sm:pb-28">
                <Container className={isLegal ? 'grid max-w-6xl gap-10 lg:grid-cols-[220px_1fr]' : 'max-w-4xl'}>
                    {isLegal && (
                        <nav aria-label="Legal pages" className="lg:sticky lg:top-28 lg:self-start">
                            <ul className="flex gap-2 overflow-x-auto lg:flex-col">
                                {LEGAL.map((k) => (
                                    <li key={k} className="shrink-0">
                                        <Link
                                            href={`/${k}`}
                                            className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                                                k === page
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                                    : 'text-slate-600 ring-1 ring-slate-200 hover:text-blue-700 hover:ring-blue-200 lg:ring-0'
                                            }`}
                                        >
                                            {PAGES[k].title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}

                    <article className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 sm:p-10">
                        {content.sections.map((s) => (
                            <section key={s.heading} className="border-b border-slate-100 py-6 first:pt-0 last:border-0 last:pb-0">
                                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{s.heading}</h2>
                                {s.paragraphs?.map((p) => (
                                    <p key={p} className="mt-3 leading-relaxed text-slate-600">
                                        {p}
                                    </p>
                                ))}
                                {s.bullets && (
                                    <ul className="mt-4 space-y-2.5">
                                        {s.bullets.map((b) => (
                                            <li key={b} className="flex items-start gap-2.5 text-slate-600">
                                                <span className="mt-1 grid size-4.5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                                                    <Check className="size-3" />
                                                </span>
                                                <span className="leading-relaxed">{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        ))}
                    </article>
                </Container>
            </div>
        </HomeShell>
    );
}
