import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Container, Reveal } from './primitives';

export function CtaBand() {
    const { auth } = usePage<SharedData>().props;

    return (
        <section className="bg-white pb-20 sm:pb-28">
            <Container>
                <Reveal>
                    <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-blue-600 via-blue-700 to-[#0b1f4d] px-6 py-14 text-center shadow-2xl shadow-blue-800/30 sm:px-12 sm:py-20">
                        <div aria-hidden className="home-grid-light pointer-events-none absolute inset-0 opacity-25" />
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-sky-400/30 blur-3xl"
                        />
                        <div className="relative">
                            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
                                Your first course could be live today
                            </h2>
                            <p className="mx-auto mt-5 max-w-xl text-base text-blue-100 sm:text-lg">
                                Create your store in minutes, upload your first lesson and share the link. We’ll take care of checkout, delivery and
                                payouts.
                            </p>
                            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                                <Link
                                    href={auth.user ? route('dashboard') : route('register')}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
                                >
                                    {auth.user ? 'Go to dashboard' : 'Create my free store'} <ArrowRight className="size-4" />
                                </Link>
                                <a
                                    href="#products"
                                    className="inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10"
                                >
                                    Explore products
                                </a>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}
