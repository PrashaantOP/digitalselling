import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Award, CheckCircle2, FileText, Headphones, Lock, PlayCircle, Sparkles, Users } from 'lucide-react';
import { Container, Reveal, primaryBtn, secondaryBtn } from './primitives';
import { type HomeStats } from './types';

// Isse chhote live numbers landing pe kamzor lagte hain — tab platform facts dikhate hain
const MIN_LIVE_STAT = 50;

const compact = (n: number) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function statsStrip(stats: HomeStats) {
    const live = [
        { value: stats.creators, label: 'Creators selling' },
        { value: stats.products, label: 'Products live' },
        { value: stats.lessons, label: 'Lessons published' },
        { value: stats.learners, label: 'Learners enrolled' },
    ]
        .filter((s) => s.value >= MIN_LIVE_STAT)
        .map((s) => ({ value: `${compact(s.value)}+`, label: s.label }));

    const facts = [
        { value: '6', label: 'Product types' },
        { value: '6', label: 'Lesson formats' },
        { value: '0', label: 'Code needed' },
        { value: '24×7', label: 'Your store is open' },
    ];

    // live numbers pehle, baaki jagah facts se bharo — hamesha 4 tiles
    return [...live, ...facts].slice(0, 4);
}

export function Hero({ stats, trialDays }: { stats: HomeStats; trialDays: number }) {
    const { auth } = usePage<SharedData>().props;

    return (
        <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 lg:pt-20 lg:pb-24">
            {/* background: grid + blue glow */}
            <div
                aria-hidden
                className="home-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-blue-400/25 blur-3xl"
            />
            <div aria-hidden className="pointer-events-none absolute top-40 -right-40 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />

            <Container className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
                <div className="text-center lg:text-left">
                    <Reveal>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 backdrop-blur">
                            <Sparkles className="size-3.5" /> The all-in-one store for Indian creators
                        </span>
                    </Reveal>
                    <Reveal delay={80}>
                        <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
                            Turn what you know into{' '}
                            <span className="bg-linear-to-r from-blue-600 via-blue-500 to-sky-500 bg-clip-text text-transparent">
                                courses that sell
                            </span>
                        </h1>
                    </Reveal>
                    <Reveal delay={160}>
                        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
                            Build video courses, run live classes, sell eBooks, events, 1:1 sessions and locked content — all from one link. Checkout,
                            payments, certificates and payouts are handled for you.
                        </p>
                    </Reveal>
                    <Reveal delay={240} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                        <Link href={auth.user ? route('dashboard') : route('register')} className={primaryBtn}>
                            {auth.user ? 'Go to dashboard' : `Start free — ${trialDays} days of Pro`} <ArrowRight className="size-4" />
                        </Link>
                        <a href="#course-workflow" className={secondaryBtn}>
                            <PlayCircle className="size-4 text-blue-600" /> See how a course works
                        </a>
                    </Reveal>
                    <Reveal delay={320}>
                        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 lg:justify-start">
                            {[`${trialDays}-day Pro trial`, 'No setup fee', 'Secure payments by Razorpay'].map((t) => (
                                <li key={t} className="flex items-center gap-1.5">
                                    <CheckCircle2 className="size-4 text-blue-600" /> {t}
                                </li>
                            ))}
                        </ul>
                    </Reveal>
                </div>

                <Reveal delay={200} className="relative mx-auto w-full max-w-lg lg:max-w-none">
                    <CoursePlayerMock />
                </Reveal>
            </Container>

            <Container className="relative mt-16 lg:mt-20">
                <Reveal>
                    {/* gap-px + blue bg = tiles ke beech hairline dividers */}
                    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-blue-100 shadow-sm ring-1 ring-blue-100 sm:grid-cols-4">
                        {statsStrip(stats).map((s) => (
                            <div key={s.label} className="flex flex-col-reverse bg-white px-4 py-6 text-center sm:py-8">
                                <dt className="mt-1 text-xs font-medium tracking-wide text-slate-500 uppercase sm:text-sm">{s.label}</dt>
                                <dd className="text-3xl font-semibold tracking-tight text-blue-700 sm:text-4xl">{s.value}</dd>
                            </div>
                        ))}
                    </dl>
                </Reveal>
            </Container>
        </section>
    );
}

/** Sirf CSS se bana preview — koi image asset nahi chahiye. */
function CoursePlayerMock() {
    const lessons = [
        { icon: PlayCircle, title: 'Welcome & roadmap', meta: 'Video · 6 min', done: true },
        { icon: FileText, title: 'Cheat sheet (PDF)', meta: 'Notes', done: true },
        { icon: Headphones, title: 'Mindset audio', meta: 'Audio · 12 min', done: false, active: true },
        { icon: Lock, title: 'Module quiz', meta: 'Quiz · 10 Qs', done: false },
    ];

    return (
        <div className="relative">
            <div className="relative rounded-3xl bg-white p-3 shadow-[0_30px_80px_-20px_rgba(30,64,175,0.35)] ring-1 ring-blue-100 sm:p-4">
                {/* video area */}
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-linear-to-br from-blue-700 via-blue-600 to-sky-500">
                    <div aria-hidden className="home-grid-light absolute inset-0 opacity-40" />
                    <div className="absolute inset-0 grid place-items-center">
                        <span className="grid size-16 place-items-center rounded-full bg-white/95 shadow-xl sm:size-20">
                            <PlayCircle className="size-8 text-blue-600 sm:size-10" />
                        </span>
                    </div>
                    <div className="absolute inset-x-4 bottom-4">
                        <div className="flex items-center justify-between text-[11px] font-medium text-white/90">
                            <span>Module 2 · Lesson 3</span>
                            <span>08:24 / 12:00</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/30">
                            <div className="h-full w-[70%] rounded-full bg-white" />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between px-1">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Instagram Growth Masterclass</p>
                        <p className="text-xs text-slate-500">4 modules · 28 lessons · Certificate</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">62% done</span>
                </div>

                <ul className="mt-3 space-y-1.5">
                    {lessons.map((l) => (
                        <li
                            key={l.title}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${l.active ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}
                        >
                            <span
                                className={`grid size-8 shrink-0 place-items-center rounded-lg ${l.done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                            >
                                {l.done ? <CheckCircle2 className="size-4" /> : <l.icon className="size-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-slate-800">{l.title}</span>
                                <span className="block text-xs text-slate-500">{l.meta}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* floating chips — sirf sm+ pe, mobile pe overflow na ho */}
            <div className="absolute top-8 -left-6 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-blue-100 motion-safe:animate-[home-float_6s_ease-in-out_infinite] sm:flex">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 font-semibold text-emerald-600">₹</span>
                <span>
                    <span className="block text-xs text-slate-500">New sale</span>
                    <span className="block text-sm font-semibold text-slate-900">₹2,499 received</span>
                </span>
            </div>
            <div className="absolute -right-4 bottom-24 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-blue-100 motion-safe:animate-[home-float_7s_ease-in-out_infinite_1s] sm:flex">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Award className="size-5" />
                </span>
                <span>
                    <span className="block text-xs text-slate-500">Certificate issued</span>
                    <span className="block text-sm font-semibold text-slate-900">Aman completed 🎉</span>
                </span>
            </div>
            <div className="absolute -bottom-5 left-8 hidden items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 sm:flex">
                <Users className="size-4" /> Live class tonight · 8 PM
            </div>
        </div>
    );
}
