import { DEFAULT_ACCENT, HEX_RE } from '@/components/course-editor/types';
import { cn, formatCurrency } from '@/lib/utils';
import { ArrowRight, Lock, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Device } from './ui';

/* Live preview ka frame + checkout card — Book aur Locked content dono isi se bante hain. */

export interface PreviewQuestion {
    id: number;
    label: string;
    field_type: string;
    is_required: boolean;
    is_enabled: boolean;
}

export const resolveAccent = (color: string | null | undefined) => (HEX_RE.test(color ?? '') ? (color as string) : DEFAULT_ACCENT);

/** GSTIN / State default questions book aur locked content checkout pe nahi dikhte. */
export const isGstOrState = (q: { label: string; field_type: string }) =>
    /gstin/i.test(q.label) || (q.field_type === 'dropdown' && /state/i.test(q.label));

/** email/phone upar hamesha dikhte hain; baaki sirf tab jab creator ne on rakha ho */
export const checkoutExtraQuestions = <T extends PreviewQuestion>(questions: T[] | undefined) =>
    (questions ?? []).filter((q) => q.is_enabled && !['email', 'phone'].includes(q.field_type) && !isGstOrState(q));

export function PreviewLabel({ accent, children }: { accent: string; children: ReactNode }) {
    return (
        <h3 className="mb-3 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {children}
        </h3>
    );
}

export function PreviewPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">{label}</p>
            <p className="mt-1 truncate text-[14px] font-semibold text-[#14141B]">{value}</p>
        </div>
    );
}

export interface PreviewPricing {
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
}

/** Sidebar ka checkout card — fake (disabled) inputs, public page ke CheckoutCard jaisa hi dikhta hai. */
export function PreviewCheckoutCard({
    accent,
    pricing,
    rows,
    questions,
    cta,
}: {
    accent: string;
    pricing: PreviewPricing;
    rows: { icon: LucideIcon; text: string }[];
    questions: PreviewQuestion[];
    cta: string;
}) {
    const price = Number(pricing.price) || 0;
    const discounted =
        pricing.pricing_type === 'fixed' && pricing.has_discount && Number(pricing.discounted_price) > 0 && Number(pricing.discounted_price) < price;
    const payWhatYouWant = pricing.pricing_type === 'customer_decides';
    const shownPrice = pricing.pricing_type === 'free' ? 'Free' : formatCurrency(discounted ? Number(pricing.discounted_price) : price);

    const fakeInput = (text: string, prefix?: string) => (
        <div className="flex h-11 items-center gap-2 rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#8A8A96]">
            {prefix && <span className="border-r border-[#E4E2DA] pr-2">{prefix}</span>}
            <span className="truncate">{text}</span>
        </div>
    );

    return (
        <aside className="flex flex-col gap-3 rounded-2xl border border-[#E4E2DA] bg-white p-5 text-[#14141B] shadow-sm">
            {rows.map((row) => (
                <div key={row.text} className="flex items-center gap-2.5 text-sm text-[#6B6B78]">
                    <row.icon className="size-4 shrink-0" /> <span className="min-w-0 truncate">{row.text}</span>
                </div>
            ))}
            <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{payWhatYouWant ? 'Pay what you want' : shownPrice}</span>
                {discounted && <span className="text-sm text-[#8A8A96] line-through">{formatCurrency(price)}</span>}
            </div>
            {payWhatYouWant && price > 0 && <p className="-mt-2 text-xs text-[#6B6B78]">Minimum {formatCurrency(price)}</p>}
            <p className="text-xs text-[#6B6B78]">Access to this purchase will be sent to this email</p>
            {payWhatYouWant && fakeInput(`Your amount (min ${formatCurrency(price)})`, '₹')}
            {fakeInput('Full name')}
            {fakeInput('Email address')}
            {fakeInput('Phone number', '+91')}
            {questions.map((q) => (
                <div key={q.id}>{fakeInput(`${q.label}${q.is_required ? '' : ' (optional)'}`)}</div>
            ))}
            <button
                type="button"
                disabled
                className="flex h-12 w-full cursor-not-allowed items-center justify-between gap-2 rounded-xl px-4 text-sm font-bold tracking-wide text-white uppercase"
                style={{ background: accent }}
            >
                <span className="truncate">{cta}</span>
                <span className="flex shrink-0 items-center gap-1">
                    {!payWhatYouWant && shownPrice} <ArrowRight className="size-4" />
                </span>
            </button>
        </aside>
    );
}

/**
 * Browser chrome (desktop) ya phone frame (mobile) ke andar public page ka layout:
 * desktop pe 2 column (content + sticky checkout), mobile pe stacked.
 */
export function PreviewFrame({ device, url, accent, main, side }: { device: Device; url: string; accent: string; main: ReactNode; side: ReactNode }) {
    const mobile = device === 'mobile';

    return (
        <div className={cn('mx-auto flex h-full max-h-[760px] w-full transition-all duration-300', mobile ? 'max-w-[390px]' : 'max-w-[1040px]')}>
            <div
                className={cn(
                    'flex h-full w-full flex-col overflow-hidden bg-[#FAF9F5] shadow-2xl shadow-black/40',
                    mobile ? 'rounded-[2.5rem] border-[10px] border-[#14141B]' : 'rounded-xl border border-white/10',
                )}
            >
                {mobile ? (
                    <div className="mx-auto my-1 h-1.5 w-20 shrink-0 rounded-full bg-[#14141B]/80" />
                ) : (
                    <div className="flex shrink-0 items-center gap-2 bg-[#2A2A35] px-4 py-3">
                        <span className="size-3 rounded-full bg-[#FF5F57]" />
                        <span className="size-3 rounded-full bg-[#FEBC2E]" />
                        <span className="size-3 rounded-full bg-[#28C840]" />
                        <span className="mx-auto flex max-w-[60%] min-w-0 items-center gap-1.5 rounded-md bg-[#14141B] px-4 py-1 text-[11px] text-[#C9C9D4]">
                            <Lock className="size-3 shrink-0" />
                            <span className="truncate">{url}</span>
                        </span>
                    </div>
                )}
                <div className="h-1 shrink-0" style={{ background: accent }} />
                <div
                    className={cn(
                        'min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto [&::-webkit-scrollbar]:hidden',
                        mobile ? 'flex flex-col gap-6 p-5' : 'grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8 p-8',
                    )}
                >
                    {mobile ? (
                        <>
                            {main}
                            {side}
                        </>
                    ) : (
                        <>
                            {main}
                            <div className="sticky top-0">{side}</div>
                        </>
                    )}
                    <p className={cn('text-center text-[11px] text-[#8A8A96]', !mobile && 'col-span-2')}>
                        Built with <span className="font-semibold text-[#4F46E5]">SuperCreators</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
