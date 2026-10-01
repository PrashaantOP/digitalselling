import { firstError, postJson } from '@/lib/razorpay';
import { Check, ChevronDown, Loader2, Package, Tag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/*
 * Checkout form ke andar: add-on products + coupon code + live total.
 * Total hamesha server ke /quote se aata hai (wahi hisaab jisse order banta hai) — yahan koi price math nahi.
 */

export type CheckoutAddon = {
    id: number;
    title: string;
    type: string;
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    /** buyer se jo liya jayega (creator ka offer, warna product ka daam) — server se */
    addon_price?: number;
    /** product ka normal daam — offer ho to kata hua dikhta hai */
    regular_price?: number;
    /** details toggle ke liye — chhoti image, ek line, chhota text */
    cover?: string | null;
    meta?: string | null;
    summary?: string | null;
};

const TYPE_LABEL: Record<string, string> = { book: 'E-book', course: 'Course', locked_content: 'Exclusive content', event: 'Event' };

export type CheckoutExtrasValue = { coupon_code: string | null; addons: number[] };

type Quote = { base: number; discount: number; addons: number; total: number; coupon: { code: string; discount_percent: string | number } | null };

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

const addonPrice = (a: CheckoutAddon) => {
    if (typeof a.addon_price === 'number') return a.addon_price;
    if (a.pricing_type === 'free') return 0;
    const price = Number(a.price) || 0;
    const discounted = a.has_discount && a.discounted_price != null && Number(a.discounted_price) < price;

    return discounted ? Number(a.discounted_price) : price;
};

export function CheckoutExtras({
    checkoutUrl,
    addons = [],
    amount,
    accent,
    showCoupon = true,
    onChange,
    onTotal,
}: {
    /** POST …/order ka URL — quote uske saath wale …/quote pe jaata hai */
    checkoutUrl: string;
    addons?: CheckoutAddon[];
    /** pay-what-you-want me buyer ka amount */
    amount?: number;
    accent: string;
    /** free product pe coupon ka koi matlab nahi */
    showCoupon?: boolean;
    onChange: (value: CheckoutExtrasValue) => void;
    /** null = abhi koi extra nahi laga, page apna normal price dikhaye */
    onTotal?: (total: number | null) => void;
}) {
    const quoteUrl = checkoutUrl.replace(/\/order$/, '/quote');
    const [selected, setSelected] = useState<number[]>([]);
    // ek waqt me ek hi add-on ke details khule — chhoti jagah me list lambi na ho
    const [openId, setOpenId] = useState<number | null>(null);
    const [code, setCode] = useState('');
    const [applied, setApplied] = useState<string | null>(null);
    const [couponOpen, setCouponOpen] = useState(false);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const request = useRef(0);

    const active = selected.length > 0 || applied !== null;

    async function fetchQuote(coupon: string | null, addonIds: number[]) {
        const id = ++request.current;
        setBusy(true);

        try {
            const res = await postJson(quoteUrl, { coupon_code: coupon, addons: addonIds, ...(amount ? { amount } : {}) });
            const data = await res.json().catch(() => null);
            if (id !== request.current) return null; // purana jawab — naya request chal raha hai

            if (!res.ok) {
                setError(firstError(data, 'Could not update the total.'));
                return null;
            }

            setError(null);
            setQuote(data);
            onTotal?.(data.total);

            return data as Quote;
        } catch {
            if (id === request.current) setError('Could not reach the server.');
            return null;
        } finally {
            if (id === request.current) setBusy(false);
        }
    }

    // add-on ya amount badle to total dobara
    useEffect(() => {
        onChange({ coupon_code: applied, addons: selected });

        if (!active) {
            setQuote(null);
            onTotal?.(null);
            return;
        }

        void fetchQuote(applied, selected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, applied, amount]);

    async function applyCoupon() {
        const wanted = code.trim().toUpperCase();
        if (!wanted) return;

        const result = await fetchQuote(wanted, selected);
        if (result?.coupon) {
            setApplied(result.coupon.code);
            setCode('');
        }
    }

    if (addons.length === 0 && !showCoupon) return null;

    return (
        <div className="flex flex-col gap-3">
            {addons.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold tracking-[0.14em] text-[#8A8A96] uppercase">Add to your order</p>
                    {addons.map((addon) => {
                        const on = selected.includes(addon.id);

                        const open = openId === addon.id;

                        return (
                            <div
                                key={addon.id}
                                className="rounded-lg border text-sm transition"
                                style={on ? { borderColor: accent, backgroundColor: `${accent}0D` } : { borderColor: '#E4E2DA' }}
                            >
                                <div className="flex items-center">
                                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-3">
                                        <input
                                            type="checkbox"
                                            checked={on}
                                            onChange={() => setSelected((ids) => (on ? ids.filter((id) => id !== addon.id) : [...ids, addon.id]))}
                                            className="size-4 shrink-0"
                                            style={{ accentColor: accent }}
                                        />
                                        <span className="min-w-0 flex-1 font-medium text-[#14141B]">{addon.title}</span>
                                        <span className="shrink-0 text-right tabular-nums">
                                            {typeof addon.regular_price === 'number' && addon.regular_price > addonPrice(addon) && (
                                                <span className="mr-1.5 text-xs text-[#8A8A96] line-through">{money(addon.regular_price)}</span>
                                            )}
                                            <span className="font-semibold text-[#14141B]">{addonPrice(addon) > 0 ? `+ ${money(addonPrice(addon))}` : 'Free'}</span>
                                        </span>
                                    </label>
                                    {/* label ke bahar — details kholne se checkbox na badle */}
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(open ? null : addon.id)}
                                        aria-expanded={open}
                                        aria-label={`${open ? 'Hide' : 'Show'} details of ${addon.title}`}
                                        className="flex size-9 shrink-0 items-center justify-center text-[#8A8A96] transition hover:text-[#14141B]"
                                    >
                                        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>

                                {open && <AddonDetails addon={addon} />}
                            </div>
                        );
                    })}
                </div>
            )}

            {showCoupon &&
                (applied ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-[#E6F6EC] px-3 py-2 text-xs font-semibold text-[#059669]">
                        <span className="flex items-center gap-1.5">
                            <Check className="size-3.5" /> Coupon {applied} applied
                        </span>
                        <button type="button" onClick={() => setApplied(null)} aria-label="Remove coupon" className="rounded p-0.5 hover:bg-[#059669]/10">
                            <X className="size-3.5" />
                        </button>
                    </div>
                ) : couponOpen ? (
                    <div className="flex gap-2">
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void applyCoupon();
                                }
                            }}
                            maxLength={30}
                            placeholder="Coupon code"
                            aria-label="Coupon code"
                            className="h-10 min-w-0 flex-1 rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] uppercase outline-none placeholder:normal-case focus:border-[#4F46E5]"
                        />
                        <button
                            type="button"
                            onClick={() => void applyCoupon()}
                            disabled={busy || !code.trim()}
                            className="h-10 shrink-0 rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm font-semibold text-[#14141B] disabled:opacity-50"
                        >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setCouponOpen(true)} className="flex w-fit items-center gap-1.5 text-xs font-semibold text-[#6B6B78] hover:text-[#14141B]">
                        <Tag className="size-3.5" /> Have a coupon?
                    </button>
                ))}

            {error && (
                <p role="alert" className="text-xs font-medium text-[#C2410C]">
                    {error}
                </p>
            )}

            {active && quote && (
                <dl className="flex flex-col gap-1 rounded-lg bg-[#F6F5F2] p-3 text-xs text-[#6B6B78]">
                    <div className="flex justify-between">
                        <dt>Price</dt>
                        <dd className="tabular-nums">{money(quote.base)}</dd>
                    </div>
                    {quote.discount > 0 && (
                        <div className="flex justify-between text-[#059669]">
                            <dt>Coupon</dt>
                            <dd className="tabular-nums">− {money(quote.discount)}</dd>
                        </div>
                    )}
                    {quote.addons > 0 && (
                        <div className="flex justify-between">
                            <dt>Add-ons</dt>
                            <dd className="tabular-nums">+ {money(quote.addons)}</dd>
                        </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-[#E4E2DA] pt-2 text-sm font-bold text-[#14141B]">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{money(quote.total)}</dd>
                    </div>
                </dl>
            )}
        </div>
    );
}

/** Add-on ka chhota parichay: chhoti image + type/meta + do-teen line ka text. */
function AddonDetails({ addon }: { addon: CheckoutAddon }) {
    const [broken, setBroken] = useState(false);

    return (
        <div className="flex gap-3 border-t border-[#E4E2DA]/70 px-3 py-2.5">
            {addon.cover && !broken ? (
                <img src={`/assets/${addon.cover}`} alt="" loading="lazy" onError={() => setBroken(true)} className="size-12 shrink-0 rounded-md border border-[#E4E2DA] object-cover" />
            ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#F0EFEA] text-[#8A8A96]">
                    <Package className="size-5" />
                </span>
            )}
            <div className="min-w-0 text-xs leading-relaxed">
                <p className="font-semibold text-[#14141B]">
                    {TYPE_LABEL[addon.type] ?? 'Product'}
                    {addon.meta && <span className="font-normal text-[#6B6B78]"> · {addon.meta}</span>}
                </p>
                <p className="mt-0.5 line-clamp-3 text-[#6B6B78]">{addon.summary ?? 'Included with your order right after payment.'}</p>
            </div>
        </div>
    );
}
