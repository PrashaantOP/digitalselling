import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './primitives';

export type FaqItem = { q: string; a: string };

// Pricing wale sawaal trial days pe depend karte hain — isliye function
const pricingFaqs = (trialDays: number): FaqItem[] => [
    {
        q: 'How much does DigitalSelling cost?',
        a: 'There is no setup fee. On Free you pay 15% commission per sale; on Pro (₹499/month) you pay only 10%. The commission already includes Razorpay payment gateway charges — nothing else is deducted.',
    },
    {
        q: `What happens after my ${trialDays}-day Pro trial?`,
        a: `Every new account gets Pro free for ${trialDays} days — no card needed. When the trial ends you move to Free (15%) automatically, or upgrade to Pro for ₹499/month. Your products, students and store are never affected.`,
    },
];

const FAQS: FaqItem[] = [
    {
        q: 'Do I need a website or any technical skills?',
        a: 'No. Sign up, pick a username and your store is live at your own link. Every product gets its own page and checkout automatically — no code, hosting or plugins.',
    },
    {
        q: 'How do my students pay, and when do I receive the money?',
        a: 'Buyers pay through Razorpay using UPI, cards, netbanking or wallets. Your earnings are credited to your DigitalSelling balance, and you can withdraw to your bank or UPI once your KYC is verified.',
    },
    {
        q: 'What kind of lessons can I add to a course?',
        a: 'Six formats: video, text with images, audio, quizzes, assignments and downloadable notes (PDF). You can mix them in any module and mark any lesson as a free preview.',
    },
    {
        q: 'Can I run live classes along with recorded content?',
        a: 'Yes. Schedule live classes inside a course with a date, duration and join link (Zoom, Google Meet, YouTube Live, etc.). Enrolled students see them in their course.',
    },
    {
        q: 'Do students get a certificate?',
        a: 'If you enable certificates for a course, students automatically receive one with a unique certificate number when they complete it.',
    },
    {
        q: 'Can I limit how long a student has access?',
        a: 'Yes. Choose lifetime access or access for a fixed number of days per course.',
    },
    {
        q: 'Can I sell things other than courses?',
        a: 'Absolutely — events and webinars, eBooks and downloads, locked content, payment pages for services or donations, and paid 1:1 booking sessions.',
    },
    {
        q: 'Can I offer discounts or collect GST details?',
        a: 'Create coupon codes per product, add upsell add-ons, and ask custom checkout questions. Buyers can also enter their GSTIN at checkout.',
    },
    {
        q: 'Can my team help me manage the store?',
        a: 'Yes. Invite sub-admins and give them only the permissions they need — for example, managing courses but not viewing payouts.',
    },
];

export function Faq({ trialDays, items, title = 'Questions creators ask us' }: { trialDays: number; items?: FaqItem[]; title?: string }) {
    // product pages apne FAQs dete hain — pricing wale sawaal har jagah saath me
    const list = [...(items ?? FAQS), ...pricingFaqs(trialDays)];

    return (
        <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-28">
            <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <SectionHeading
                        align="left"
                        eyebrow="FAQ"
                        title={title}
                        description={
                            <>
                                Can’t find what you’re looking for?{' '}
                                <a href="/contact" className="font-semibold text-blue-700 underline-offset-4 hover:underline">
                                    Contact our team
                                </a>
                                .
                            </>
                        }
                    />
                </div>

                <div className="space-y-3">
                    {list.map((f, i) => (
                        <Reveal key={f.q} delay={i * 40}>
                            <Collapsible className="group rounded-2xl bg-white ring-1 ring-slate-200 transition data-[state=open]:bg-blue-50/50 data-[state=open]:ring-blue-200">
                                <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5">
                                    <span className="font-semibold text-slate-900">{f.q}</span>
                                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 transition group-data-[state=open]:rotate-45 group-data-[state=open]:bg-blue-600 group-data-[state=open]:text-white">
                                        <Plus className="size-4" />
                                    </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="home-collapsible overflow-hidden">
                                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:px-6">{f.a}</p>
                                </CollapsibleContent>
                            </Collapsible>
                        </Reveal>
                    ))}
                </div>
            </Container>
        </section>
    );
}
