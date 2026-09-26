import { CheckoutCard, type CheckoutPricing, type CheckoutQuestion } from '@/components/public/checkout-card';
import { assetPath, PoliciesSection, PublicProductLayout, resolvePublicAccent, SectionLabel, type PublicCreator } from '@/components/public/public-product-layout';
import { VideoEmbed } from '@/components/public/video-embed';
import { Check, ChevronDown, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';

type Product = CheckoutPricing & {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_type: 'image' | 'video' | null;
    cover_video_url: string | null;
    button_text: string | null;
    theme: string | null;
    accent_color: string | null;
    terms_and_conditions: string | null;
    refund_policy: string | null;
    privacy_policy: string | null;
    cover_images: string[];
    checkout_questions: CheckoutQuestion[];
    payment_page: {
        subtitle: string | null;
        whats_included: string[];
        faqs: { question: string; answer: string }[];
        collect_full_name: boolean;
        collect_note: boolean;
    };
};

type Props = { product: Product; creator: PublicCreator; checkoutUrl: string };

export default function PaymentPage({ product, creator, checkoutUrl }: Props) {
    const page = product.payment_page;
    const accent = resolvePublicAccent(product.accent_color);
    const covers = product.cover_images ?? [];
    const descriptionText = product.description?.trim() ?? '';
    const [activeCover, setActiveCover] = useState(0);

    return (
        <PublicProductLayout
            title={product.title}
            accent={accent}
            creator={creator}
            aside={
                <CheckoutCard
                    accent={accent}
                    pricing={product}
                    questions={product.checkout_questions}
                    cta={product.button_text || 'Get it now'}
                    checkoutUrl={checkoutUrl}
                    shareText="Copy link — share with your audience"
                    collectName={page.collect_full_name}
                    collectNote={page.collect_note}
                    rows={[
                        { icon: ShieldCheck, text: 'Secure payment via Razorpay' },
                        { icon: Zap, text: 'Instant confirmation after payment' },
                    ]}
                />
            }
        >
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight break-words md:text-5xl">{product.title}</h1>
                {page.subtitle && <p className="mt-3 text-lg leading-snug text-[#4B4B57] md:text-xl">{page.subtitle}</p>}
            </div>

            {/* video shown instead of the first image — thumbnail pe click karte hi player chalta hai */}
            <VideoEmbed url={product.cover_video_url} accent={accent} />

            {covers.length > 0 && (
                <div className="relative overflow-hidden rounded-xl border border-[#E4E2DA] bg-white">
                    <div
                        onScroll={(e) => setActiveCover(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                        className="flex aspect-video snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
                    >
                        {covers.map((cover, i) => (
                            <img key={i} src={assetPath(cover)} alt="" className="size-full shrink-0 snap-center object-cover" />
                        ))}
                    </div>
                    {covers.length > 1 && (
                        <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {activeCover + 1} / {covers.length}
                        </span>
                    )}
                </div>
            )}

            {/* khaali description pe buyer ko editor ka placeholder nahi dikhna chahiye — section hi hat jaata hai */}
            {descriptionText && (
                <div>
                    <SectionLabel accent={accent}>About this page</SectionLabel>
                    {/* description server pe Html::sanitize se guzar ke hi save hota hai */}
                    <div
                        className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: descriptionText }}
                    />
                </div>
            )}

            {page.whats_included.length > 0 && (
                <div>
                    <SectionLabel accent={accent}>What's included</SectionLabel>
                    <ul className="flex flex-col gap-2.5">
                        {page.whats_included.map((point, i) => (
                            <li key={i} className="flex items-start gap-3 text-[15px] text-[#14141B]">
                                <span
                                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                                    style={{ background: accent }}
                                >
                                    <Check className="size-3" />
                                </span>
                                <span className="min-w-0 break-words">{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {page.faqs.length > 0 && (
                <div>
                    <SectionLabel accent={accent}>FAQ</SectionLabel>
                    <div className="flex flex-col gap-2">
                        {page.faqs.map((faq, i) => (
                            <details key={i} className="group rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#14141B]">
                                    {faq.question}
                                    <ChevronDown className="size-4 shrink-0 text-[#6B6B78] transition group-open:rotate-180" />
                                </summary>
                                {faq.answer && <p className="mt-1.5 text-sm whitespace-pre-line text-[#6B6B78]">{faq.answer}</p>}
                            </details>
                        ))}
                    </div>
                </div>
            )}

            <PoliciesSection accent={accent} product={product} />
        </PublicProductLayout>
    );
}
