import { assetUrl, firstError } from '@/components/course-editor/api';
import { RichText, sanitizeHtml, toEditorHtml } from '@/components/course-editor/ui';
import { EditorShell, publishProduct } from '@/components/product-editor/editor-shell';
import {
    checkoutExtraQuestions,
    PreviewCheckoutCard,
    PreviewFrame,
    PreviewLabel,
    resolveAccent,
    type PreviewQuestion,
} from '@/components/product-editor/preview-frame';
import {
    ADD_BUTTON_CLASS,
    CouponsField,
    FieldError,
    HINT_CLASS,
    INPUT_CLASS,
    LABEL_CLASS,
    PickButton,
    RemoveButton,
    SlugField,
    TEXTAREA_CLASS,
    ThumbTile,
    UPLOAD_TILE_CLASS,
    type Coupon,
    type Device,
} from '@/components/product-editor/ui';
import { useAutoSave } from '@/components/product-editor/use-auto-save';
import { VideoEmbed } from '@/components/public/video-embed';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, ChevronDown, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type PricingType = 'fixed' | 'customer_decides' | 'free';
type Status = 'draft' | 'unpublished' | 'published';

interface CoverImage {
    id: number;
    image_path: string;
    sort_order?: number;
}

type PaymentPageFaq = {
    question: string;
    answer: string;
};

interface PaymentPageDetail {
    product_id: number;
    subtitle: string | null;
    whats_included: string[] | null;
    faqs: PaymentPageFaq[] | null;
    collect_full_name: boolean;
    collect_note: boolean;
}

interface PaymentPageItem {
    id: number;
    uuid: string;
    creator_id: number;
    type: 'payment_page';
    title: string;
    slug: string;
    description: string | null;
    cover_type: 'image' | 'video' | null;
    cover_video_url: string | null;
    pricing_type: PricingType;
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    button_text: string;
    post_purchase_message: string | null;
    accent_color: string | null;
    status: Status;
    published_at: string | null;
    created_at: string;
    payment_page_detail: PaymentPageDetail | null;
    cover_images?: CoverImage[];
    coupons?: Coupon[];
    checkout_questions?: PreviewQuestion[];
}

interface PaymentPagesEditProps {
    item: PaymentPageItem;
    publicUrl: string;
}

/* ------------------------------------------------------------------ */
/*  PREVIEW PANE                                                       */
/* ------------------------------------------------------------------ */

function PreviewPane({ item, host, device }: { item: PaymentPageItem; host: string; device: Device }) {
    const accent = resolveAccent(item.accent_color);
    const title = item.title?.trim() || 'Your payment page title here';
    const description = sanitizeHtml(toEditorHtml(item.description ?? ''));
    const cta = item.button_text?.trim() || 'Get it now';
    const covers = item.cover_images ?? [];
    const videoUrl = item.cover_video_url?.trim();
    const subtitle = item.payment_page_detail?.subtitle?.trim();
    const points = item.payment_page_detail?.whats_included ?? [];
    const faqs = item.payment_page_detail?.faqs ?? [];
    const collectNote = item.payment_page_detail?.collect_note ?? false;
    const collectName = item.payment_page_detail?.collect_full_name ?? true;
    const questions = checkoutExtraQuestions(item.checkout_questions);
    // "A short note / reference" ek fake question ki tarah preview me dikhta hai — koi naya component nahi chahiye
    const previewQuestions = collectNote ? [...questions, { id: -1, label: 'Note / reference', field_type: 'text', is_required: false, is_enabled: true }] : questions;

    const label = (text: string) => <PreviewLabel accent={accent}>{text}</PreviewLabel>;

    const main = (
        <div className="flex min-w-0 flex-col gap-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight break-words text-[#14141B]">{title}</h1>
                {subtitle && <p className="mt-2 text-lg leading-snug text-[#4B4B57]">{subtitle}</p>}
            </div>

            {/* video, cover ke bajaye "shown instead of the first image" */}
            <VideoEmbed url={videoUrl} accent={accent} />

            {covers.length > 0 && (
                <div className="relative aspect-video overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2]">
                    <img src={assetUrl(covers[0].image_path)} alt="" className="size-full object-cover" />
                </div>
            )}

            <div>
                {label('About this page')}
                {description ? (
                    <div
                        className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: description }}
                    />
                ) : (
                    <p className="text-[15px] leading-relaxed text-[#6B6B78]">Describe your page so buyers know what they're paying for.</p>
                )}
            </div>

            {points.length > 0 && (
                <div>
                    {label("What's included")}
                    <ul className="flex flex-col gap-2.5">
                        {points.map((point, i) => (
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

            {faqs.length > 0 && (
                <div>
                    {label('FAQ')}
                    <div className="flex flex-col gap-2">
                        {faqs.map((faq, i) => (
                            <div key={i} className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-[#14141B]">
                                    {faq.question} <ChevronDown className="size-4 shrink-0 text-[#6B6B78]" />
                                </div>
                                {faq.answer && <p className="mt-1.5 text-sm whitespace-pre-line text-[#6B6B78]">{faq.answer}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const side = (
        <PreviewCheckoutCard
            accent={accent}
            pricing={item}
            questions={previewQuestions}
            cta={cta}
            collectName={collectName}
            rows={[
                { icon: ShieldCheck, text: 'Secure payment via Razorpay' },
                { icon: Zap, text: 'Instant confirmation after payment' },
            ]}
        />
    );

    return <PreviewFrame device={device} url={`${host}/p/${item.slug || 'your-page'}`} accent={accent} main={main} side={side} />;
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function PaymentPagesEdit({ item, publicUrl }: PaymentPagesEditProps) {
    const initial = useMemo(
        () => ({
            title: item.title ?? '',
            // server description ko sanitized HTML me save karta hai — purana plain text bhi paragraphs ban jaata hai
            description: toEditorHtml(item.description ?? ''),
            cover_video_url: item.cover_video_url ?? '',
            subtitle: item.payment_page_detail?.subtitle ?? '',
            whats_included: item.payment_page_detail?.whats_included ?? [],
            faqs: item.payment_page_detail?.faqs ?? [],
            collect_full_name: item.payment_page_detail?.collect_full_name ?? true,
            collect_note: item.payment_page_detail?.collect_note ?? false,
            pricing_type: item.pricing_type,
            price: Number(item.price ?? 0),
            has_discount: item.has_discount ?? false,
            discounted_price: (item.discounted_price === null ? '' : Number(item.discounted_price)) as number | '',
            button_text: item.button_text ?? 'Get it now',
            post_purchase_message: item.post_purchase_message ?? 'Payment received. Thank you!',
            slug: item.slug ?? '',
        }),
        [item],
    );

    const [form, setForm] = useState(initial);
    const [device, setDevice] = useState<Device>('desktop');
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [coverImages, setCoverImages] = useState<CoverImage[]>(item.cover_images ?? []);
    const [coverBusy, setCoverBusy] = useState(false);
    const [coverError, setCoverError] = useState<string | null>(null);

    const { status: saveStatus, errors: saveErrors, errorFor, queue: queueSave, flush: flushSave } = useAutoSave(`/dashboard/payment-pages/${item.uuid}`);

    useEffect(() => setCoverImages(item.cover_images ?? []), [item.cover_images]);

    async function uploadCovers(files: File[]) {
        const remaining = 8 - coverImages.length;
        if (files.length > remaining) return setCoverError(`You can upload up to 8 cover images (${remaining} remaining).`);
        if (files.some((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024))
            return setCoverError('Each cover image must be an image up to 10 MB.');

        setCoverBusy(true);
        setCoverError(null);
        router.post(
            `/dashboard/products/${item.id}/cover-images`,
            { images: files },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => router.reload({ only: ['item'] }),
                onError: (errors) => setCoverError(firstError(errors as Record<string, string>, 'Upload failed. Please try again.')),
                onFinish: () => setCoverBusy(false),
            },
        );
    }

    function removeCover(id: number) {
        setCoverBusy(true);
        router.delete(`/dashboard/cover-images/${id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setCoverImages((current) => current.filter((image) => image.id !== id)),
            onFinish: () => setCoverBusy(false),
        });
    }

    // ----- field updaters (each one schedules an auto-save) ---------

    function patch(p: Partial<typeof form>) {
        setForm((prev) => {
            const next = { ...prev, ...p };
            queueSave(toPayload(next));
            return next;
        });
    }

    function toPayload(f: typeof form) {
        return {
            title: f.title,
            description: f.description,
            cover_video_url: f.cover_video_url || null,
            pricing_type: f.pricing_type,
            price: f.pricing_type === 'free' ? 0 : f.price,
            has_discount: f.has_discount,
            discounted_price: f.has_discount && f.discounted_price !== '' ? f.discounted_price : null,
            button_text: f.button_text,
            post_purchase_message: f.post_purchase_message,
            slug: f.slug,
            subtitle: f.subtitle || null,
            whats_included: f.whats_included,
            faqs: f.faqs,
            collect_full_name: f.collect_full_name,
            collect_note: f.collect_note,
        };
    }

    // ----- publish / unpublish -------------------------------------

    function publish() {
        publishProduct(`/dashboard/payment-pages/${item.uuid}/publish`, flushSave, setPublishing, setPublishError);
    }

    // ----- preview item (same shape, but live) ----------------------

    const previewItem: PaymentPageItem = useMemo(
        () => ({
            ...item,
            cover_images: coverImages,
            title: form.title,
            description: form.description,
            cover_type: form.cover_video_url ? 'video' : item.cover_type,
            cover_video_url: form.cover_video_url || null,
            pricing_type: form.pricing_type,
            price: form.pricing_type === 'free' ? 0 : form.price,
            has_discount: form.has_discount,
            discounted_price: form.has_discount && form.discounted_price !== '' ? Number(form.discounted_price) : null,
            button_text: form.button_text,
            post_purchase_message: form.post_purchase_message,
            slug: form.slug,
            payment_page_detail: {
                product_id: item.id,
                subtitle: form.subtitle || null,
                whats_included: form.whats_included.filter((p) => p.trim()),
                faqs: form.faqs.filter((f) => f.question.trim()),
                collect_full_name: form.collect_full_name,
                collect_note: form.collect_note,
            },
        }),
        [item, form, coverImages],
    );
    const previewHost = publicUrl.replace(/^https?:\/\//, '').split('/')[0];

    // ----- helpers -------------------------------------------------

    const titleCount = form.title.length;
    const titleOk = titleCount > 0 && titleCount <= 75;
    const descCount = form.description?.length ?? 0;

    return (
        <EditorShell
            headTitle={`${item.title || 'Untitled payment page'} · Edit payment page`}
            title={item.title || 'Your payment page title here'}
            status={item.status}
            backHref="/dashboard/payment-pages"
            backLabel="Back to payment pages"
            heading="Tell us about your payment page"
            publishError={publishError}
            saveStatus={saveStatus}
            onSaveDraft={flushSave}
            onPublish={publish}
            publishing={publishing}
            device={device}
            onDeviceChange={setDevice}
            publicUrl={publicUrl}
            preview={<PreviewPane item={previewItem} host={previewHost} device={device} />}
            tip="Tip — buyers get a receipt by email the moment their payment settles."
        >
            {/* Title */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="pp_title" className={LABEL_CLASS}>
                        Payment page title <span className="text-[#D93838]">*</span>
                    </label>
                    <span className={cn('text-[11px]', titleOk ? 'text-[#8A8A96]' : 'text-[#D93838]')}>{titleCount}/75</span>
                </div>
                <input
                    id="pp_title"
                    maxLength={75}
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Your payment page title here"
                    className={INPUT_CLASS}
                />
                <FieldError message={errorFor('title')} />
            </div>

            {/* Subtitle */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="pp_subtitle" className={LABEL_CLASS}>
                    Subtitle
                </label>
                <input
                    id="pp_subtitle"
                    maxLength={150}
                    value={form.subtitle}
                    onChange={(e) => patch({ subtitle: e.target.value })}
                    className={INPUT_CLASS}
                />
                <p className={HINT_CLASS}>One short line under the title (optional)</p>
                <FieldError message={errorFor('subtitle')} />
            </div>

            {/* Cover image */}
            <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS}>Cover image</label>
                <div className="grid grid-cols-4 gap-2">
                    {coverImages.map((image, index) => (
                        <ThumbTile
                            key={image.id}
                            src={assetUrl(image.image_path)}
                            alt={`cover image ${index + 1}`}
                            onRemove={() => removeCover(image.id)}
                            busy={coverBusy}
                        />
                    ))}
                    {coverImages.length < 8 && (
                        <PickButton accept="image/*" multiple onPick={uploadCovers} disabled={coverBusy} className={UPLOAD_TILE_CLASS}>
                            {coverBusy ? <Loader2 className="size-4 animate-spin" /> : '+ Upload'}
                        </PickButton>
                    )}
                </div>
                <p className={HINT_CLASS}>1280 × 720 recommended · up to 10 MB each</p>
                {coverError && <FieldError message={coverError} />}
            </div>

            {/* Video link */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="pp_video" className={LABEL_CLASS}>
                    Or add a video link
                </label>
                <input
                    id="pp_video"
                    type="url"
                    value={form.cover_video_url}
                    onChange={(e) => patch({ cover_video_url: e.target.value })}
                    placeholder="https://youtu.be/…"
                    className={INPUT_CLASS}
                />
                <p className={HINT_CLASS}>YouTube or Vimeo — shown instead of the first image</p>
                <FieldError message={errorFor('cover_video_url')} />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="pp_desc" className={LABEL_CLASS}>
                        Description <span className="text-[#D93838]">*</span>
                    </label>
                    <span className="text-[11px] text-[#8A8A96]">{descCount}/20000</span>
                </div>
                <RichText
                    id="pp_desc"
                    value={form.description}
                    onChange={(html) => patch({ description: html })}
                    placeholder="Describe your page so buyers know what they're paying for. Include what's included, who it's for and what happens after payment."
                    error={Boolean(saveErrors.description)}
                />
                <p className={HINT_CLASS}>What is this payment for? What does the buyer get?</p>
                <FieldError message={errorFor('description')} />
            </div>

            {/* What's included */}
            <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS}>What's included</label>
                {form.whats_included.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            value={point}
                            maxLength={150}
                            autoFocus={point === '' && index === form.whats_included.length - 1}
                            onChange={(e) => patch({ whats_included: form.whats_included.map((p, i) => (i === index ? e.target.value : p)) })}
                            placeholder={`Point ${index + 1} — e.g. 1:1 call, template file …`}
                            className={INPUT_CLASS}
                        />
                        <RemoveButton
                            label={`Remove point ${index + 1}`}
                            onClick={() => patch({ whats_included: form.whats_included.filter((_, i) => i !== index) })}
                        />
                    </div>
                ))}
                {form.whats_included.length < 20 && (
                    <button type="button" onClick={() => patch({ whats_included: [...form.whats_included, ''] })} className={ADD_BUTTON_CLASS}>
                        + Add point
                    </button>
                )}
                <p className={HINT_CLASS}>What buyers get — shown as a checklist</p>
                <FieldError message={errorFor('whats_included')} />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { value: 'fixed' as const, label: 'Fixed amount' },
                    { value: 'customer_decides' as const, label: 'Customer decides' },
                ].map((option) => {
                    const active = form.pricing_type === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                                patch({ pricing_type: option.value, ...(option.value === 'customer_decides' ? { has_discount: false } : {}) })
                            }
                            className={cn(
                                'flex h-14 items-center justify-between rounded-xl border px-4 text-sm font-semibold transition',
                                active
                                    ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#14141B]'
                                    : 'border-[#E4E2DA] bg-white text-[#14141B] hover:border-[#4F46E5]/45',
                            )}
                        >
                            {option.label}
                            <span
                                className={cn(
                                    'flex size-5 items-center justify-center rounded-full border',
                                    active ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#D9D7CE]',
                                )}
                            >
                                {active && <Check className="size-3" />}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="pp_price" className={LABEL_CLASS}>
                    {form.pricing_type === 'customer_decides' ? 'Minimum amount (₹)' : 'Amount (₹)'} <span className="text-[#D93838]">*</span>
                </label>
                <input
                    id="pp_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => patch({ price: Number(e.target.value) || 0 })}
                    className={INPUT_CLASS}
                />
                {form.pricing_type === 'customer_decides' && <p className={HINT_CLASS}>Buyers can pay this amount or more.</p>}
                <FieldError message={errorFor('price')} />
            </div>

            {form.pricing_type === 'fixed' && (
                <>
                    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-[#14141B]">
                        <input
                            type="checkbox"
                            checked={form.has_discount}
                            onChange={(e) => patch({ has_discount: e.target.checked })}
                            className="size-4 rounded border-[#D9D7CE] text-[#4F46E5] focus:ring-[#4F46E5]"
                        />
                        Offer discounted price
                    </label>

                    {form.has_discount && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="pp_discounted_price" className={LABEL_CLASS}>
                                Discounted price (₹)
                            </label>
                            <input
                                id="pp_discounted_price"
                                type="number"
                                min="0"
                                step="0.01"
                                max={form.price || undefined}
                                value={form.discounted_price}
                                onChange={(e) => patch({ discounted_price: e.target.value === '' ? '' : Number(e.target.value) })}
                                placeholder="0"
                                className={INPUT_CLASS}
                            />
                            <FieldError message={errorFor('discounted_price')} />
                        </div>
                    )}
                </>
            )}

            <CouponsField productId={item.id} initial={item.coupons ?? []} />

            {/* What to collect from the buyer */}
            <div className="flex flex-col gap-2">
                <label className={LABEL_CLASS}>What to collect from the buyer</label>
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-[#14141B]">
                    <input
                        type="checkbox"
                        checked={form.collect_full_name}
                        onChange={(e) => patch({ collect_full_name: e.target.checked })}
                        className="size-4 rounded border-[#D9D7CE] text-[#4F46E5] focus:ring-[#4F46E5]"
                    />
                    Full name
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-[#14141B]">
                    <input
                        type="checkbox"
                        checked={form.collect_note}
                        onChange={(e) => patch({ collect_note: e.target.checked })}
                        className="size-4 rounded border-[#D9D7CE] text-[#4F46E5] focus:ring-[#4F46E5]"
                    />
                    A short note / reference
                </label>
                <p className={HINT_CLASS}>Email and phone are always collected for the receipt</p>
            </div>

            {/* FAQs */}
            <div className="flex flex-col gap-2">
                <label className={LABEL_CLASS}>FAQs</label>
                {form.faqs.map((faq, index) => (
                    <div key={index} className="flex flex-col gap-2 rounded-xl border border-[#E4E2DA] bg-[#F8F7F4] p-3">
                        <div className="flex items-center gap-2">
                            <input
                                value={faq.question}
                                maxLength={200}
                                autoFocus={faq.question === '' && index === form.faqs.length - 1}
                                onChange={(e) => patch({ faqs: form.faqs.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)) })}
                                placeholder="Question"
                                className={INPUT_CLASS}
                            />
                            <RemoveButton
                                label={`Remove FAQ ${index + 1}`}
                                onClick={() => patch({ faqs: form.faqs.filter((_, i) => i !== index) })}
                            />
                        </div>
                        <textarea
                            rows={2}
                            value={faq.answer}
                            maxLength={1000}
                            onChange={(e) => patch({ faqs: form.faqs.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)) })}
                            placeholder="Answer"
                            className={TEXTAREA_CLASS}
                        />
                    </div>
                ))}
                {form.faqs.length < 20 && (
                    <button type="button" onClick={() => patch({ faqs: [...form.faqs, { question: '', answer: '' }] })} className={ADD_BUTTON_CLASS}>
                        + Add FAQ
                    </button>
                )}
                <p className={HINT_CLASS}>Answer the questions buyers ask before paying</p>
                <FieldError message={errorFor('faqs')} />
            </div>

            {/* Thank-you message */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="pp_thankyou" className={LABEL_CLASS}>
                    Thank-you message
                </label>
                <input
                    id="pp_thankyou"
                    maxLength={255}
                    value={form.post_purchase_message}
                    onChange={(e) => patch({ post_purchase_message: e.target.value })}
                    placeholder="Payment received. Thank you!"
                    className={INPUT_CLASS}
                />
                <p className={HINT_CLASS}>Shown right after a successful payment</p>
                <FieldError message={errorFor('post_purchase_message')} />
            </div>

            {/* Button text */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="pp_button_text" className={LABEL_CLASS}>
                        Button text
                    </label>
                    <span className="text-[11px] text-[#8A8A96]">{form.button_text.length}/25</span>
                </div>
                <input
                    id="pp_button_text"
                    maxLength={25}
                    value={form.button_text}
                    onChange={(e) => patch({ button_text: e.target.value })}
                    placeholder="Get it now"
                    className={INPUT_CLASS}
                />
                <FieldError message={errorFor('button_text')} />
            </div>

            <SlugField prefix="/p/" value={form.slug} onChange={(slug) => patch({ slug })} placeholder="your-page" error={errorFor('slug')} />
        </EditorShell>
    );
}
