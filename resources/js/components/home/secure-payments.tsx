import { BadgeCheck, Banknote, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Wallet, Zap } from 'lucide-react';
import { Container, Reveal } from './primitives';

const METHODS = [
    { icon: Smartphone, label: 'UPI' },
    { icon: CreditCard, label: 'Credit & debit cards' },
    { icon: Landmark, label: 'Netbanking' },
    { icon: Wallet, label: 'Wallets' },
];

const POINTS = [
    {
        icon: ShieldCheck,
        title: 'Powered by Razorpay',
        body: 'Checkout runs on Razorpay, a PCI-DSS compliant payment gateway trusted by Indian businesses.',
    },
    {
        icon: Lock,
        title: 'We never see card details',
        body: 'Card and UPI credentials go straight to the gateway over an encrypted connection — never stored by us.',
    },
    {
        icon: Zap,
        title: 'Instant confirmation',
        body: 'The moment a payment succeeds, the buyer gets access and the order shows up in your dashboard.',
    },
    { icon: Banknote, title: 'Payouts to your bank', body: 'Complete KYC once and withdraw earnings to your bank account or UPI.' },
];

export function SecurePayments() {
    return (
        <section id="payments" className="relative scroll-mt-20 overflow-hidden bg-[#0b1f4d] py-16 text-white sm:py-20">
            <div aria-hidden className="home-grid-light pointer-events-none absolute inset-0 opacity-15" />
            <Container className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
                <Reveal>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider text-blue-100 uppercase ring-1 ring-white/15">
                        <BadgeCheck className="size-3.5" /> Secure payments
                    </span>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                        Every rupee, safely collected with Razorpay
                    </h2>
                    <p className="mt-4 text-blue-100/80">Your buyers pay the way they already do — and you never touch payment integrations.</p>
                    <ul className="mt-6 flex flex-wrap gap-2">
                        {METHODS.map((m) => (
                            <li
                                key={m.label}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-blue-900"
                            >
                                <m.icon className="size-4 text-blue-600" /> {m.label}
                            </li>
                        ))}
                    </ul>
                </Reveal>

                <div className="grid gap-4 sm:grid-cols-2">
                    {POINTS.map((p, i) => (
                        <Reveal key={p.title} delay={i * 70}>
                            <div className="h-full rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur">
                                <p.icon className="size-6 text-sky-300" />
                                <h3 className="mt-3 font-semibold">{p.title}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-blue-100/75">{p.body}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Container>
        </section>
    );
}
