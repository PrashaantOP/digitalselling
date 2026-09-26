import { cn } from '@/lib/utils';
import {
    Award,
    BarChart3,
    CalendarClock,
    Check,
    ClipboardCheck,
    CreditCard,
    Eye,
    FileText,
    Headphones,
    Image as ImageIcon,
    Layers,
    LayoutTemplate,
    ListChecks,
    type LucideIcon,
    PenLine,
    PlayCircle,
    Rocket,
    ShoppingCart,
    Unlock,
    Video,
} from 'lucide-react';
import { useState } from 'react';
import { Container, Reveal, SectionHeading } from './primitives';

type Step = {
    icon: LucideIcon;
    title: string;
    summary: string;
    points: string[];
    chips?: string[];
};

// Har step asli schema/feature pe based hai (course_details, course_lessons, live_classes, certificates…)
const CREATOR_STEPS: Step[] = [
    {
        icon: PenLine,
        title: 'Create your course',
        summary: 'Give it a name, a cover and a price. Your course page is generated instantly.',
        points: [
            'Title, rich-text description, cover images or a promo video',
            'Pricing: fixed, “pay what you want” or free — with optional strike-through discount',
            'Access: lifetime, or limited to a set number of days',
            'Custom button text, theme and accent colour to match your brand',
        ],
        chips: ['Fixed', 'Pay what you want', 'Free'],
    },
    {
        icon: Layers,
        title: 'Build the curriculum',
        summary: 'Organise lessons into modules and drag to reorder. Six lesson formats cover every style of teaching.',
        points: [
            'Unlimited modules and lessons, reordered with drag & drop',
            'Mark any lesson as a free preview to win buyers’ trust',
            'Publish or hide individual lessons while you’re still recording',
        ],
        chips: ['Video', 'Text + Image', 'Audio', 'Quiz', 'Assignment', 'Notes PDF'],
    },
    {
        icon: CalendarClock,
        title: 'Schedule live classes',
        summary: 'Add live sessions right inside the course so recorded and live learning live together.',
        points: [
            'Set date, time and duration for each class',
            'Attach your Zoom / Meet / YouTube Live link',
            'Enrolled students see upcoming classes in their course',
        ],
    },
    {
        icon: LayoutTemplate,
        title: 'Design the sales page',
        summary: 'Turn on the sections that sell — no designer needed.',
        points: [
            'Highlights, benefits, instructions and image gallery',
            'Student testimonials and FAQs',
            'Your own terms, refund and privacy policy per product',
            'Facebook Pixel and Google Analytics tracking IDs',
        ],
        chips: ['Highlights', 'Benefits', 'Gallery', 'Testimonials', 'FAQs'],
    },
    {
        icon: ShoppingCart,
        title: 'Set up checkout',
        summary: 'Collect exactly what you need and increase order value.',
        points: [
            'Custom checkout questions (text, number, email, dropdown) with GSTIN capture',
            'Coupon codes for launches and festive offers',
            'Add-ons — upsell a workbook or 1:1 call at checkout',
            'A thank-you message shown right after purchase',
        ],
    },
    {
        icon: Rocket,
        title: 'Publish & share',
        summary: 'Hit publish and your course is live on its own link and on your store.',
        points: [
            'Short course link and a place on your /username store',
            'Full webapp website for your brand',
            'Instagram AutoDM sends the link when people comment a keyword',
        ],
    },
    {
        icon: BarChart3,
        title: 'Track & get paid',
        summary: 'Watch views, sales and students grow — and withdraw earnings to your bank.',
        points: ['Orders, revenue and page views per product', 'Enrollments with each student’s progress', 'Payouts to your bank after one-time KYC'],
    },
];

const STUDENT_STEPS: Step[] = [
    {
        icon: Eye,
        title: 'Discover & preview',
        summary: 'The student lands on your course page from Instagram, YouTube or your store link.',
        points: ['Reads highlights, benefits, curriculum and reviews', 'Watches free-preview lessons before buying'],
    },
    {
        icon: CreditCard,
        title: 'Checkout in seconds',
        summary: 'A clean, mobile-first checkout powered by Razorpay.',
        points: [
            'UPI, cards, netbanking and wallets',
            'Applies a coupon, picks add-ons, answers your questions',
            'Can leave a note or GSTIN for the invoice',
        ],
    },
    {
        icon: Unlock,
        title: 'Instant access',
        summary: 'Payment confirmed → enrollment created → course unlocked. No manual work for you.',
        points: ['Lifetime access or time-bound access as you set', 'Sees your post-purchase message right away'],
    },
    {
        icon: PlayCircle,
        title: 'Learn at their pace',
        summary: 'A focused lesson player for every format.',
        points: ['Video, audio, text + image and downloadable notes', 'Progress is saved automatically, lesson by lesson'],
        chips: ['Video', 'Audio', 'Notes'],
    },
    {
        icon: ClipboardCheck,
        title: 'Practice & get feedback',
        summary: 'Learning sticks when students do, not just watch.',
        points: ['Quizzes with instant scoring and saved attempts', 'Assignments submitted online and graded by you'],
    },
    {
        icon: CalendarClock,
        title: 'Join live classes',
        summary: 'Upcoming live sessions appear inside the course with a join link.',
        points: ['Never miss a class — date, time and link in one place'],
    },
    {
        icon: Award,
        title: 'Earn a certificate',
        summary: 'Finish the course and a certificate with a unique number is issued automatically.',
        points: ['Shareable proof of completion — great for word-of-mouth'],
    },
];

export function CourseWorkflow() {
    const [view, setView] = useState<'creator' | 'student'>('creator');
    const [active, setActive] = useState(0);
    const steps = view === 'creator' ? CREATOR_STEPS : STUDENT_STEPS;
    const current = steps[active];

    const switchView = (v: 'creator' | 'student') => {
        setView(v);
        setActive(0);
    };

    return (
        <section id="course-workflow" className="relative scroll-mt-20 overflow-hidden bg-linear-to-b from-blue-50/70 to-white py-20 sm:py-28">
            <div
                aria-hidden
                className="home-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_70%)] opacity-60"
            />
            <Container className="relative">
                <SectionHeading
                    eyebrow="Course workflow"
                    title={
                        <>
                            From idea to certificate — <span className="text-blue-600">every step, covered</span>
                        </>
                    }
                    description="Here’s exactly how a course moves through DigitalSelling. Switch views to see what you do as a creator and what your student experiences."
                />

                <Reveal className="mt-10 flex justify-center">
                    <div role="tablist" aria-label="Workflow view" className="inline-flex rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-blue-100">
                        {(['creator', 'student'] as const).map((v) => (
                            <button
                                key={v}
                                role="tab"
                                aria-selected={view === v}
                                onClick={() => switchView(v)}
                                className={cn(
                                    'rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:px-6',
                                    view === v ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' : 'text-slate-600 hover:text-blue-700',
                                )}
                            >
                                {v === 'creator' ? 'As a creator' : 'As a student'}
                            </button>
                        ))}
                    </div>
                </Reveal>

                <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
                    {/* timeline */}
                    <ol className="relative space-y-3">
                        <span aria-hidden className="absolute top-6 bottom-6 left-8 w-px bg-linear-to-b from-blue-300 via-blue-200 to-transparent" />
                        {steps.map((s, i) => {
                            const isActive = i === active;
                            return (
                                <li key={`${view}-${s.title}`}>
                                    <Reveal delay={i * 50}>
                                        <button
                                            onClick={() => setActive(i)}
                                            aria-expanded={isActive}
                                            className={cn(
                                                'relative flex w-full items-start gap-4 rounded-2xl p-3 text-left transition',
                                                isActive ? 'bg-white shadow-lg ring-1 shadow-blue-900/5 ring-blue-200' : 'hover:bg-white/70',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'relative z-10 grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold transition',
                                                    isActive
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                                        : 'bg-white text-blue-600 ring-1 ring-blue-200',
                                                )}
                                            >
                                                <s.icon className="size-5" />
                                            </span>
                                            <span className="min-w-0 flex-1 pt-0.5">
                                                <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-blue-600 uppercase">
                                                    Step {i + 1}
                                                </span>
                                                <span className="mt-0.5 block text-base font-semibold text-slate-900">{s.title}</span>
                                                <span className="mt-1 block text-sm leading-relaxed text-slate-600">{s.summary}</span>
                                                {/* mobile pe details inline — desktop pe right panel me */}
                                                {isActive && (
                                                    <span className="mt-3 block lg:hidden">
                                                        <StepDetails step={s} />
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    </Reveal>
                                </li>
                            );
                        })}
                    </ol>

                    {/* sticky preview — sirf desktop */}
                    <div className="hidden lg:block">
                        <div className="sticky top-28">
                            <div
                                key={`${view}-${active}`}
                                className="rounded-3xl bg-white p-8 shadow-[0_30px_80px_-30px_rgba(30,64,175,0.35)] ring-1 ring-blue-100 duration-500 animate-in fade-in slide-in-from-bottom-2"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/30">
                                        <current.icon className="size-7" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
                                            {view === 'creator' ? 'Creator' : 'Student'} · Step {active + 1} of {steps.length}
                                        </p>
                                        <h3 className="text-2xl font-semibold text-slate-900">{current.title}</h3>
                                    </div>
                                </div>
                                <p className="mt-5 text-base leading-relaxed text-slate-600">{current.summary}</p>
                                <div className="mt-6">
                                    <StepDetails step={current} />
                                </div>
                                <StepVisual view={view} index={active} />

                                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                                    <button
                                        onClick={() => setActive((a) => Math.max(0, a - 1))}
                                        disabled={active === 0}
                                        className="text-sm font-semibold text-slate-500 transition hover:text-blue-700 disabled:opacity-40"
                                    >
                                        ← Previous
                                    </button>
                                    <div className="flex gap-1.5">
                                        {steps.map((_, i) => (
                                            <span
                                                key={i}
                                                className={cn(
                                                    'h-1.5 rounded-full transition-all',
                                                    i === active ? 'w-6 bg-blue-600' : 'w-1.5 bg-blue-200',
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setActive((a) => Math.min(steps.length - 1, a + 1))}
                                        disabled={active === steps.length - 1}
                                        className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 disabled:opacity-40"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </section>
    );
}

function StepDetails({ step }: { step: Step }) {
    return (
        <>
            <ul className="space-y-2.5">
                {step.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                            <Check className="size-3.5" />
                        </span>
                        {p}
                    </li>
                ))}
            </ul>
            {step.chips && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {step.chips.map((c) => (
                        <span key={c} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
                            {c}
                        </span>
                    ))}
                </div>
            )}
        </>
    );
}

/** Creator ke "curriculum" step pe ek chhota mock, baaki steps pe progress ribbon — panel khali na lage. */
function StepVisual({ view, index }: { view: 'creator' | 'student'; index: number }) {
    if (view === 'creator' && index === 1) {
        const modules = [
            {
                name: 'Module 1 · Foundations',
                lessons: [
                    { i: Video, t: 'Welcome & course roadmap', free: true },
                    { i: FileText, t: 'Starter notes (PDF)' },
                ],
            },
            {
                name: 'Module 2 · Deep dive',
                lessons: [
                    { i: ImageIcon, t: 'Step-by-step walkthrough' },
                    { i: Headphones, t: 'Expert interview' },
                    { i: ListChecks, t: 'Checkpoint quiz' },
                ],
            },
        ];
        return (
            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                {modules.map((m) => (
                    <div key={m.name}>
                        <p className="px-1 text-xs font-semibold text-slate-500">{m.name}</p>
                        <ul className="mt-2 space-y-1.5">
                            {m.lessons.map((l) => (
                                <li key={l.t} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-100">
                                    <l.i className="size-4 text-blue-600" />
                                    <span className="flex-1 truncate text-slate-700">{l.t}</span>
                                    {'free' in l && l.free && (
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            FREE PREVIEW
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        );
    }

    const total = view === 'creator' ? CREATOR_STEPS.length : STUDENT_STEPS.length;
    const pct = Math.round(((index + 1) / total) * 100);
    return (
        <div className="mt-6 rounded-2xl bg-blue-50/70 p-4 ring-1 ring-blue-100">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                <span>{view === 'creator' ? 'Course launch progress' : 'Student journey'}</span>
                <span>{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                    className="h-full rounded-full bg-linear-to-r from-blue-500 to-sky-400 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
