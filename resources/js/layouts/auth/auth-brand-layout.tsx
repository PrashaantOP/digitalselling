import { Logo } from '@/components/home/primitives';
import { Link } from '@inertiajs/react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

// PlanPricing::TRIAL_DAYS ke saath sync
const TRIAL_DAYS = 90;

const BENEFITS = [
    'Sell courses, eBooks, events, locked content & 1:1 sessions',
    'Your own store link — live in minutes, no code',
    'Payouts straight to your bank after KYC',
];

/** Login/register/password pages — landing jaisa blue-white, app ke dark mode se independent (.home-light). */
export default function AuthBrandLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="home-light grid min-h-svh bg-white font-sans text-slate-900 antialiased lg:grid-cols-[1fr_1.05fr]">
            {/* brand panel — sirf desktop */}
            <aside className="relative hidden overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-[#0b1f4d] p-12 text-white lg:flex lg:flex-col">
                <div aria-hidden className="home-grid-light pointer-events-none absolute inset-0 opacity-25" />
                <div aria-hidden className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-sky-400/30 blur-3xl" />

                <Link href={route('home')} className="relative w-fit" aria-label="DigitalSelling home">
                    <Logo tone="light" />
                </Link>

                <div className="relative my-auto max-w-md py-12">
                    <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">New creators</span>
                    <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-tight">
                        {TRIAL_DAYS} days of Pro,
                        <br />
                        completely free.
                    </h2>
                    <p className="mt-4 text-blue-100">Keep 90% of every sale while you grow. No card needed to start.</p>

                    <ul className="mt-8 space-y-3">
                        {BENEFITS.map((b) => (
                            <li key={b} className="flex items-start gap-3 text-sm text-blue-50">
                                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sky-300" /> {b}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-8 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                            <p className="text-3xl font-semibold">10%</p>
                            <p className="mt-1 text-xs text-blue-100">Pro commission</p>
                        </div>
                        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                            <p className="text-3xl font-semibold text-blue-100">15%</p>
                            <p className="mt-1 text-xs text-blue-100/80">Free plan</p>
                        </div>
                    </div>
                </div>

                <p className="relative flex items-center gap-2 text-xs text-blue-100/80">
                    <ShieldCheck className="size-4" /> Secure payments by Razorpay · Gateway charges included in commission
                </p>
            </aside>

            {/* form side */}
            <main className="relative flex flex-col px-4 py-8 sm:px-8 lg:px-16">
                <div
                    aria-hidden
                    className="home-grid pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_at_top,black_20%,transparent_70%)] lg:hidden"
                />
                <Link href={route('home')} className="relative w-fit lg:hidden" aria-label="DigitalSelling home">
                    <Logo />
                </Link>

                <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
                        {description && <p className="mt-2 text-slate-600">{description}</p>}
                    </div>
                    {children}
                </div>

                <p className="relative text-center text-xs text-slate-500">
                    <Link href="/terms" className="hover:text-blue-700">
                        Terms
                    </Link>
                    <span className="mx-2">·</span>
                    <Link href="/privacy-policy" className="hover:text-blue-700">
                        Privacy
                    </Link>
                    <span className="mx-2">·</span>
                    <Link href="/contact" className="hover:text-blue-700">
                        Help
                    </Link>
                </p>
            </main>
        </div>
    );
}
