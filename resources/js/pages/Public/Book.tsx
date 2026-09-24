import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronDown, Download, FileText, Link2, Video } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type CheckoutQuestion = {
    id: number;
    label: string;
    field_type: 'text' | 'phone' | 'email' | 'number' | 'dropdown';
    options: string[] | null;
    is_required: boolean;
    is_enabled: boolean;
};

type Product = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    cover_type: 'image' | 'video' | null;
    cover_video_url: string | null;
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
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

type Props = { product: Product; creator: { name: string; username: string; avatar: string | null }; checkoutUrl: string };

const money = (value: string | number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
const asset = (path: string | null) => (path ? `/assets/${path}` : '');
const INPUT = 'h-11 w-full rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';
const FORMAT_LABEL: Record<Product['book']['format'], string> = { pdf: 'PDF', epub: 'EPUB', mobi: 'MOBI', zip: 'ZIP' };

/** Default seeded GSTIN / State checkout questions — book page pe ye nahi dikhte. */
const isGstOrState = (q: { label: string; field_type: string }) => /gstin/i.test(q.label) || (q.field_type === 'dropdown' && /state/i.test(q.label));

const cookie = (key: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))?.[1] ?? '');

export default function Book({ product, creator, checkoutUrl }: Props) {
    const appName = usePage<SharedData>().props.name;
    const book = product.book;
    const accent = /^#[0-9A-Fa-f]{6}$/.test(product.accent_color ?? '') ? product.accent_color! : '#4F46E5';
    const covers = product.cover_images ?? [];
    const basePrice = Number(product.price) || 0;
    const discounted = product.pricing_type === 'fixed' && product.has_discount && Number(product.discounted_price) > 0 && Number(product.discounted_price) < basePrice;
    const price = product.pricing_type === 'free' ? 'Free' : product.pricing_type === 'customer_decides' ? 'Pay what you want' : money(discounted ? product.discounted_price! : basePrice);
    const descriptionText = product.description?.trim() || '<p>Describe your book — what readers will learn, who it is for, why it is worth buying.</p>';

    // Book checkout pe GSTIN/State nahi maangte — email/phone upar hamesha hain,
    // baaki enabled custom questions `answers` me jaate hain.
    const customQuestions = product.checkout_questions.filter((q) => !isGstOrState(q) && !['email', 'phone'].includes(q.field_type));

    const payWhatYouWant = product.pricing_type === 'customer_decides';
    const [amount, setAmount] = useState(basePrice > 0 ? String(basePrice) : '');
    const [fields, setFields] = useState({ name: '', email: '', phone: '' });
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [activeCover, setActiveCover] = useState(0);
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

            setError(response.ok ? 'Payment is not available yet. Please try again later.' : (data?.message ?? 'Could not start checkout. Please check your details.'));
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

    const label = (text: string) => (
        <h3 className="mb-3 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {text}
        </h3>
    );

    const policies = ([
        ['Terms & conditions', product.terms_and_conditions],
        ['Refund policy', product.refund_policy],
        ['Privacy policy', product.privacy_policy],
    ] as const).filter(([, body]) => body?.trim());

    return (
        <>
            <Head title={product.title} />
            <main className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#14141B]">
                <div className="h-1" style={{ backgroundColor: accent }} />
                <header>
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
                        <Link href={`/${creator.username}`} className="flex min-w-0 items-center gap-2.5 transition hover:opacity-70">
                            {creator.avatar ? (
                                <img src={asset(creator.avatar)} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                            ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E4E2DA] text-xs font-bold text-[#4B4B57]">
                                    {(creator.name || creator.username || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                            <span className="truncate text-sm font-bold">{creator.name || creator.username}</span>
                        </Link>
                        <span className="shrink-0 text-xs text-[#6B6B78]">
                            Built with <span aria-hidden="true">♥</span> on <span className="font-semibold text-[#14141B]">{appName}</span>
                        </span>
                    </div>
                </header>

                <section className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
                    <div className="flex min-w-0 flex-col gap-8">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight break-words md:text-5xl">{product.title}</h1>
                            {book.subtitle && <p className="mt-3 text-lg leading-snug text-[#4B4B57] md:text-xl">{book.subtitle}</p>}
                            {book.author_name && <p className="mt-3 text-base text-[#6B6B78]">by {book.author_name}</p>}
                        </div>

                        {/* video trailer cover ke upar */}
                        {product.cover_video_url && (
                            <div className="flex aspect-video items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2] text-sm text-[#6B6B78]">
                                <Video className="size-5" style={{ color: accent }} />
                                <a href={product.cover_video_url} target="_blank" rel="noreferrer" className="max-w-[70%] truncate underline-offset-2 hover:underline">
                                    {product.cover_video_url}
                                </a>
                            </div>
                        )}

                        {covers.length > 0 && (
                                <div className="relative overflow-hidden rounded-xl border border-[#E4E2DA] bg-white">
                                    <div
                                        onScroll={(e) => setActiveCover(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
                                        className="flex aspect-video snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    >
                                        {covers.map((cover, i) => (
                                            <img key={i} src={asset(cover)} alt="" className="size-full shrink-0 snap-center object-cover" />
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
                                <p className="mt-1 text-sm font-semibold">{FORMAT_LABEL[book.format] ?? 'File'}</p>
                            </div>
                            <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                                <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">Pages</p>
                                <p className="mt-1 text-sm font-semibold">{book.pages ?? '—'}</p>
                            </div>
                        </div>

                        <div>
                            {label('About this book')}
                            {/* description server pe Html::sanitize se guzar ke hi save hota hai */}
                            <div className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: descriptionText }} />
                        </div>

                        {book.whats_inside.length > 0 && (
                            <div>
                                {label("What's inside")}
                                <ul className="flex flex-col gap-2.5">
                                    {book.whats_inside.map((point, i) => (
                                        <li key={i} className="flex items-start gap-3 text-[15px] text-[#14141B]">
                                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
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
                                {label('FAQ')}
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

                        {policies.length > 0 && (
                            <div>
                                {label('Policies')}
                                <div className="flex flex-col gap-2">
                                    {policies.map(([title, body]) => (
                                        <details key={title} className="group rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#14141B]">
                                                {title}
                                                <ChevronDown className="size-4 shrink-0 text-[#6B6B78] transition group-open:rotate-180" />
                                            </summary>
                                            <p className="mt-1.5 text-sm whitespace-pre-line text-[#6B6B78]">{body}</p>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="h-fit rounded-2xl border border-[#E4E2DA] bg-white p-5 shadow-sm lg:sticky lg:top-6">
                        <div className="flex items-center gap-2.5 text-sm text-[#6B6B78]">
                            <FileText className="size-4" /> {FORMAT_LABEL[book.format] ?? 'File'}
                            {book.pages ? ` · ${book.pages} pages` : ''}
                        </div>
                        <div className="mt-2 flex items-center gap-2.5 text-sm text-[#6B6B78]">
                            <Download className="size-4" /> Instant download after payment
                        </div>

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
                            <input value={fields.name} onChange={(e) => set('name', e.target.value)} required maxLength={150} placeholder="Full name" className={INPUT} />
                            <input type="email" value={fields.email} onChange={(e) => set('email', e.target.value)} required maxLength={150} placeholder="Email address" className={INPUT} />
                            <div className="flex h-11 items-center rounded-lg border border-[#DAD8D0] bg-white pl-3 transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                                <span className="border-r border-[#E4E2DA] pr-2 text-sm text-[#6B6B78]">+91</span>
                                <input type="tel" value={fields.phone} onChange={(e) => set('phone', e.target.value)} required pattern="[0-9]{8,15}" placeholder="Phone number" className="h-full min-w-0 flex-1 rounded-r-lg px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]" />
                            </div>
                            {customQuestions.map((question) => (
                                question.field_type === 'dropdown' ? (
                                    <select
                                        key={question.id}
                                        value={answers[question.id] ?? ''}
                                        onChange={(e) => setAnswers((a) => ({ ...a, [question.id]: e.target.value }))}
                                        required={question.is_required}
                                        className={INPUT}
                                    >
                                        <option value="">{question.label}{question.is_required ? '' : ' (optional)'}</option>
                                        {(question.options ?? []).map((option) => (
                                            <option key={option} value={option}>{option}</option>
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
                                )
                            ))}

                            {error && <p role="alert" className="rounded-lg bg-[#FFEDE8] px-3 py-2 text-xs font-medium text-[#C2410C]">{error}</p>}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-12 w-full items-center justify-between gap-2 rounded-xl px-4 text-sm font-bold tracking-wide text-white uppercase disabled:opacity-60"
                                style={{ backgroundColor: accent }}
                            >
                                <span className="truncate">{submitting ? 'Please wait…' : product.button_text || 'Buy & Download'}</span>
                                {product.pricing_type !== 'customer_decides' && (
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
                            <Link2 className="size-3.5" /> {copied ? 'Link copied' : 'Copy link — share with your readers'}
                        </button>
                    </aside>
                </section>

                <footer className="py-5 text-center text-xs text-[#6B6B78]">
                    Built with <span className="font-semibold text-[#14141B]">{appName}</span>
                </footer>
            </main>
        </>
    );
}
