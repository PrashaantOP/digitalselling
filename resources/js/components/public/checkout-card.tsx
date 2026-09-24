import { ArrowRight, Link2, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

/* Public product pages (Book / Locked content) ka checkout sidebar — editor ka PreviewCheckoutCard isi jaisa dikhta hai. */

export type CheckoutQuestion = {
    id: number;
    label: string;
    field_type: 'text' | 'phone' | 'email' | 'number' | 'dropdown';
    options: string[] | null;
    is_required: boolean;
    is_enabled: boolean;
};

export type CheckoutPricing = {
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
};

export const money = (value: string | number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);

const INPUT =
    'h-11 w-full rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';

/** Default seeded GSTIN / State checkout questions — in pages pe ye nahi maange jaate. */
const isGstOrState = (q: { label: string; field_type: string }) => /gstin/i.test(q.label) || (q.field_type === 'dropdown' && /state/i.test(q.label));

const cookie = (key: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))?.[1] ?? '');

export function CheckoutCard({
    accent,
    pricing,
    rows,
    questions,
    cta,
    checkoutUrl,
    shareText,
}: {
    accent: string;
    pricing: CheckoutPricing;
    rows: { icon: LucideIcon; text: string }[];
    questions: CheckoutQuestion[];
    cta: string;
    checkoutUrl: string;
    shareText: string;
}) {
    const basePrice = Number(pricing.price) || 0;
    const discounted =
        pricing.pricing_type === 'fixed' &&
        pricing.has_discount &&
        Number(pricing.discounted_price) > 0 &&
        Number(pricing.discounted_price) < basePrice;
    const payWhatYouWant = pricing.pricing_type === 'customer_decides';
    const price =
        pricing.pricing_type === 'free' ? 'Free' : payWhatYouWant ? 'Pay what you want' : money(discounted ? pricing.discounted_price! : basePrice);

    // email/phone upar hamesha hain, GSTIN/State nahi maangte; baaki enabled custom questions `answers` me jaate hain
    const customQuestions = questions.filter((q) => !isGstOrState(q) && !['email', 'phone'].includes(q.field_type));

    const [amount, setAmount] = useState(basePrice > 0 ? String(basePrice) : '');
    const [fields, setFields] = useState({ name: '', email: '', phone: '' });
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const set = (key: keyof typeof fields, value: string) => setFields((f) => ({ ...f, [key]: value }));

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(checkoutUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') },
                // customer_decides pe OrderController `amount` maangta hai
                body: JSON.stringify({ ...fields, answers, ...(payWhatYouWant ? { amount: Number(amount) } : {}) }),
            });
            const data = await response.json().catch(() => null);

            setError(
                response.ok
                    ? 'Payment is not available yet. Please try again later.'
                    : (data?.message ?? 'Could not start checkout. Please check your details.'),
            );
        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    async function copyLink() {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <aside className="h-fit rounded-2xl border border-[#E4E2DA] bg-white p-5 shadow-sm lg:sticky lg:top-6">
            {rows.map((row, i) => (
                <div key={row.text} className={`${i > 0 ? 'mt-2' : ''}flex items-center gap-2.5 text-sm text-[#6B6B78]`}>
                    <row.icon className="size-4 shrink-0" /> <span className="min-w-0">{row.text}</span>
                </div>
            ))}

            <div className="mt-6 flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-[#14141B]">{price}</p>
                {discounted && <span className="text-sm text-[#8A8A96] line-through">{money(basePrice)}</span>}
            </div>
            {payWhatYouWant && basePrice > 0 && <p className="mt-1 text-xs text-[#6B6B78]">Minimum {money(basePrice)}</p>}
            <p className="mt-2 text-xs text-[#6B6B78]">Access to this purchase will be sent to this email</p>

            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                {payWhatYouWant && (
                    <div className="flex h-11 items-center rounded-lg border border-[#DAD8D0] bg-white pl-3 transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                        <span className="border-r border-[#E4E2DA] pr-2 text-sm text-[#6B6B78]">₹</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min={Math.max(1, basePrice)}
                            step="0.01"
                            placeholder="Your amount"
                            aria-label="Amount you want to pay"
                            className="h-full min-w-0 flex-1 rounded-r-lg px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]"
                        />
                    </div>
                )}
                <input
                    value={fields.name}
                    onChange={(e) => set('name', e.target.value)}
                    required
                    maxLength={150}
                    placeholder="Full name"
                    className={INPUT}
                />
                <input
                    type="email"
                    value={fields.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                    maxLength={150}
                    placeholder="Email address"
                    className={INPUT}
                />
                <div className="flex h-11 items-center rounded-lg border border-[#DAD8D0] bg-white pl-3 transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                    <span className="border-r border-[#E4E2DA] pr-2 text-sm text-[#6B6B78]">+91</span>
                    <input
                        type="tel"
                        value={fields.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        required
                        pattern="[0-9]{8,15}"
                        placeholder="Phone number"
                        className="h-full min-w-0 flex-1 rounded-r-lg px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]"
                    />
                </div>
                {customQuestions.map((question) =>
                    question.field_type === 'dropdown' ? (
                        <select
                            key={question.id}
                            value={answers[question.id] ?? ''}
                            onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                            required={question.is_required}
                            className={INPUT}
                        >
                            <option value="">
                                {question.label}
                                {question.is_required ? '' : ' (optional)'}
                            </option>
                            {(question.options ?? []).map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            key={question.id}
                            type={question.field_type === 'number' ? 'number' : 'text'}
                            value={answers[question.id] ?? ''}
                            onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                            required={question.is_required}
                            placeholder={`${question.label}${question.is_required ? '' : ' (optional)'}`}
                            className={INPUT}
                        />
                    ),
                )}

                {error && (
                    <p role="alert" className="rounded-lg bg-[#FFEDE8] px-3 py-2 text-xs font-medium text-[#C2410C]">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-between gap-2 rounded-xl px-4 text-sm font-bold tracking-wide text-white uppercase disabled:opacity-60"
                    style={{ backgroundColor: accent }}
                >
                    <span className="truncate">{submitting ? 'Please wait…' : cta}</span>
                    {!payWhatYouWant && (
                        <span className="flex shrink-0 items-center gap-1">
                            {price} <ArrowRight className="size-4" />
                        </span>
                    )}
                </button>
            </form>

            <p className="mt-3 text-center text-[11px] text-[#8A8A96]">Secure payment via Razorpay · no account needed</p>

            <button
                type="button"
                onClick={copyLink}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#E4E2DA] text-xs font-semibold text-[#4B4B57] transition hover:bg-[#FAF9F5]"
            >
                <Link2 className="size-3.5" /> {copied ? 'Link copied' : shareText}
            </button>
        </aside>
    );
}
