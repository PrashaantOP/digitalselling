import { CheckoutCard, type CheckoutPricing, type CheckoutQuestion } from '@/components/public/checkout-card';
import { categoryLabel, LockedContentCard, lockedSummaryText, type LockedSummary } from '@/components/public/locked-content-card';
import { PoliciesSection, PublicProductLayout, resolvePublicAccent, type PublicCreator } from '@/components/public/public-product-layout';
import { Lock, LockOpen } from 'lucide-react';

type Product = CheckoutPricing & {
    id: number;
    title: string;
    slug: string;
    button_text: string | null;
    accent_color: string | null;
    terms_and_conditions: string | null;
    refund_policy: string | null;
    privacy_policy: string | null;
    checkout_questions: CheckoutQuestion[];
    // server sirf ginti bhejta hai — hidden message / video / files kabhi yahan nahi aate
    locked: LockedSummary & { category: string; public_teaser: string | null };
};

type Props = { product: Product; creator: PublicCreator; checkoutUrl: string };

export default function LockedContent({ product, creator, checkoutUrl }: Props) {
    const locked = product.locked;
    const accent = resolvePublicAccent(product.accent_color);
    const summary = lockedSummaryText(locked);

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
                    cta={product.button_text || 'Unlock now'}
                    checkoutUrl={checkoutUrl}
                    shareText="Copy link — share with your audience"
                    rows={[
                        { icon: Lock, text: summary || 'Hidden content' },
                        { icon: LockOpen, text: 'Unlocks instantly after payment' },
                    ]}
                />
            }
        >
            <div>
                <span
                    className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase"
                    style={{ background: `${accent}1A`, color: accent }}
                >
                    {categoryLabel(locked.category)}
                </span>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight break-words md:text-5xl">{product.title}</h1>
                <p className="mt-4 text-base leading-relaxed whitespace-pre-line text-[#4B4B57] md:text-lg">
                    {locked.public_teaser?.trim() || 'Unlock this content to view it.'}
                </p>
            </div>

            <LockedContentCard accent={accent} summary={locked} />

            <PoliciesSection accent={accent} product={product} />
        </PublicProductLayout>
    );
}
