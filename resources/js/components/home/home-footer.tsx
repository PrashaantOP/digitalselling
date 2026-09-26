import { Link } from '@inertiajs/react';
import { Mail, ShieldCheck } from 'lucide-react';
import { Container, Logo } from './primitives';
import { PRODUCTS, productUrl } from './products';

const COLUMNS = [
    {
        title: 'Products',
        links: PRODUCTS.map((p) => ({ label: p.name, href: productUrl(p.key) })),
    },
    {
        title: 'Platform',
        links: [
            { label: 'How it works', href: '/#course-workflow' },
            { label: 'Growth tools', href: '/#growth' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'FAQ', href: '/#faq' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About us', href: '/about' },
            { label: 'Contact', href: '/contact' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Privacy Policy', href: '/privacy-policy' },
            { label: 'Terms & Conditions', href: '/terms' },
            { label: 'Refund & Cancellation', href: '/refund-policy' },
        ],
    },
];

export function HomeFooter() {
    return (
        <footer className="relative overflow-hidden bg-[#0b1f4d] text-blue-100">
            <div aria-hidden className="pointer-events-none absolute -top-40 right-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
            <Container className="relative py-14 sm:py-16">
                <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
                    <div className="max-w-sm">
                        <Logo tone="light" />
                        <p className="mt-4 text-sm leading-relaxed text-blue-100/70">
                            The all-in-one platform for creators to sell courses, events, eBooks, locked content, services and 1:1 sessions — from a
                            single link.
                        </p>
                        <div className="mt-6 flex flex-col gap-2 text-sm">
                            <a href="/contact" className="inline-flex items-center gap-2 text-blue-100/80 transition hover:text-white">
                                <Mail className="size-4" /> Get in touch
                            </a>
                            <span className="inline-flex items-center gap-2 text-blue-100/80">
                                <ShieldCheck className="size-4" /> Secure payments via Razorpay
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                        {COLUMNS.map((col) => (
                            <div key={col.title}>
                                <h3 className="text-xs font-semibold tracking-wider text-white uppercase">{col.title}</h3>
                                <ul className="mt-4 space-y-2.5">
                                    {col.links.map((l) => (
                                        <li key={l.label}>
                                            {/* legal pages Inertia se, hash links plain anchor se (same-page scroll) */}
                                            {l.href.includes('#') ? (
                                                <a href={l.href} className="text-sm text-blue-100/70 transition hover:text-white">
                                                    {l.label}
                                                </a>
                                            ) : (
                                                <Link href={l.href} className="text-sm text-blue-100/70 transition hover:text-white">
                                                    {l.label}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-blue-100/60 sm:flex-row">
                    <p>© {new Date().getFullYear()} DigitalSelling. All rights reserved.</p>
                    <p className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                        <Link href="/privacy-policy" className="hover:text-white">
                            Privacy
                        </Link>
                        <Link href="/terms" className="hover:text-white">
                            Terms
                        </Link>
                        <Link href="/refund-policy" className="hover:text-white">
                            Refunds
                        </Link>
                        <span>Made in India 🇮🇳</span>
                    </p>
                </div>
            </Container>
        </footer>
    );
}
