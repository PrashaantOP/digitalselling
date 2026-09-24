import { CheckoutCard, type CheckoutPricing, type CheckoutQuestion } from '@/components/public/checkout-card';
import {
    assetPath,
    PoliciesSection,
    PublicProductLayout,
    resolvePublicAccent,
    SectionLabel,
    type PublicCreator,
} from '@/components/public/public-product-layout';
import { Check, ChevronDown, Download, FileText, Video } from 'lucide-react';
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
    book: {
        author_name: string | null;
        subtitle: string | null;
        pages: number | null;
        format: 'pdf' | 'epub' | 'mobi' | 'zip';
        whats_inside: string[];
        faqs: { question: string; answer: string }[];
    };
};

type Props = { product: Product; creator: PublicCreator; checkoutUrl: string };

const FORMAT_LABEL: Record<Product['book']['format'], string> = { pdf: 'PDF', epub: 'EPUB', mobi: 'MOBI', zip: 'ZIP' };

export default function Book({ product, creator, checkoutUrl }: Props) {
    const book = product.book;
    const accent = resolvePublicAccent(product.accent_color);
    const covers = product.cover_images ?? [];
    const format = FORMAT_LABEL[book.format] ?? 'File';
    const descriptionText =
        product.description?.trim() || '<p>Describe your book — what readers will learn, who it is for, why it is worth buying.</p>';
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
                    cta={product.button_text || 'Buy & Download'}
                    checkoutUrl={checkoutUrl}
                    shareText="Copy link — share with your readers"
                    rows={[
                        { icon: FileText, text: `${format}${book.pages ? ` · ${book.pages} pages` : ''}` },
                        { icon: Download, text: 'Instant download after payment' },
                    ]}
                />
            }
        >
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight break-words md:text-5xl">{product.title}</h1>
                {book.subtitle && <p className="mt-3 text-lg leading-snug text-[#4B4B57] md:text-xl">{book.subtitle}</p>}
                {book.author_name && <p className="mt-3 text-base text-[#6B6B78]">by {book.author_name}</p>}
            </div>

            {/* video trailer cover ke upar */}
            {product.cover_video_url && (
                <div className="flex aspect-video items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2] text-sm text-[#6B6B78]">
                    <Video className="size-5" style={{ color: accent }} />
                    <a
                        href={product.cover_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-[70%] truncate underline-offset-2 hover:underline"
                    >
                        {product.cover_video_url}
                    </a>
                </div>
            )}

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

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                    <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">Format</p>
                    <p className="mt-1 text-sm font-semibold">{format}</p>
                </div>
                <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                    <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">Pages</p>
                    <p className="mt-1 text-sm font-semibold">{book.pages ?? '—'}</p>
                </div>
            </div>

            <div>
                <SectionLabel accent={accent}>About this book</SectionLabel>
                {/* description server pe Html::sanitize se guzar ke hi save hota hai */}
                <div
                    className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: descriptionText }}
                />
            </div>

            {book.whats_inside.length > 0 && (
                <div>
                    <SectionLabel accent={accent}>What's inside</SectionLabel>
                    <ul className="flex flex-col gap-2.5">
                        {book.whats_inside.map((point, i) => (
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

            {book.faqs.length > 0 && (
                <div>
                    <SectionLabel accent={accent}>FAQ</SectionLabel>
                    <div className="flex flex-col gap-2">
                        {book.faqs.map((faq, i) => (
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
