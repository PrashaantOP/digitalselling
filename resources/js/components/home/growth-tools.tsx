import { BadgePercent, BarChart3, Globe, Instagram, Landmark, Link2, type LucideIcon, Share2, UsersRound } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './primitives';

const TOOLS: { icon: LucideIcon; title: string; body: string }[] = [
    {
        icon: Link2,
        title: 'Link-in-bio store',
        body: 'One /username link that lists all your products — with your photo, bio, social links and header buttons.',
    },
    {
        icon: Globe,
        title: 'Full webapp website',
        body: 'A complete marketing website for your brand, generated from the same products. No hosting needed.',
    },
    {
        icon: Instagram,
        title: 'Instagram AutoDM',
        body: 'Someone comments “LINK” on your reel? They get your course link in their DMs automatically.',
    },
    { icon: BadgePercent, title: 'Coupons & add-ons', body: 'Run launch discounts and upsell extras at checkout to grow every order’s value.' },
    { icon: Share2, title: 'Referrals', body: 'Turn happy buyers into promoters with referral codes that track every signup.' },
    { icon: BarChart3, title: 'Analytics', body: 'Store page views, link clicks, product views, sales and revenue — all in one dashboard.' },
    { icon: UsersRound, title: 'Audience & team', body: 'Every buyer in one customer list. Invite sub-admins with role-based permissions.' },
    { icon: Landmark, title: 'Payouts & KYC', body: 'Complete KYC once, add your bank or UPI and withdraw your earnings anytime.' },
];

export function GrowthTools() {
    return (
        <section id="growth" className="scroll-mt-20 bg-white py-20 sm:py-28">
            <Container>
                <SectionHeading
                    eyebrow="Built-in growth tools"
                    title={
                        <>
                            Everything after “publish” is <span className="text-blue-600">already handled</span>
                        </>
                    }
                    description="No plugins, no zaps, no five different subscriptions. Marketing, payments and operations live in the same place as your products."
                />

                <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-blue-100 ring-1 ring-blue-100 sm:grid-cols-2 lg:grid-cols-4">
                    {TOOLS.map((t, i) => (
                        <Reveal key={t.title} delay={(i % 4) * 70} className="h-full">
                            <div className="group h-full bg-white p-6 transition hover:bg-blue-50/60 sm:p-7">
                                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition group-hover:bg-blue-600 group-hover:text-white">
                                    <t.icon className="size-5" />
                                </span>
                                <h3 className="mt-5 font-semibold text-slate-900">{t.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.body}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </Container>
        </section>
    );
}
