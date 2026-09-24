import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import type { RequestPayload } from '@inertiajs/core';
import { Head, router } from '@inertiajs/react';
import { assetUrl, firstError } from '@/components/course-editor/api';
import { DEFAULT_ACCENT, HEX_RE } from '@/components/course-editor/types';
import { RichText, sanitizeHtml, toEditorHtml } from '@/components/course-editor/ui';
import {
    ArrowRight,
    Check,
    ChevronDown,
    Download,
    ExternalLink,
    Eye,
    FileText,
    Info,
    Link2,
    Loader2,
    Lock,
    Monitor,
    Play,
    Rocket,
    Save,
    Smartphone,
    Sparkles,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type BookFormat = 'pdf' | 'epub' | 'mobi' | 'zip';
type PricingType = 'fixed' | 'customer_decides' | 'free';
type Status = 'draft' | 'unpublished' | 'published';

interface CoverImage {
    id: number;
    image_path: string;
    sort_order?: number;
}

interface BookDetail {
    product_id: number;
    author_name: string | null;
    subtitle: string | null;
    pages: number | null;
    format: BookFormat | null;
    file_path: string | null;
    external_link: string | null;
    whats_inside: string[] | null;
    faqs: BookFaq[] | null;
}

type BookFaq = {
    question: string;
    answer: string;
};

interface CheckoutQuestion {
    id: number;
    label: string;
    field_type: string;
    is_required: boolean;
    is_enabled: boolean;
}

interface BookItem {
    id: number;
    uuid: string;
    creator_id: number;
    type: 'book';
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
    accent_color: string | null;
    status: Status;
    published_at: string | null;
    created_at: string;
    book_detail: BookDetail | null;
    cover_images?: CoverImage[];
    coupons?: Coupon[];
    checkout_questions?: CheckoutQuestion[];
}

interface Coupon {
    id: number;
    code: string;
    discount_percent: string | number;
    usage_limit: number | null;
    is_active: boolean;
}

interface BooksEditProps {
    item: BookItem;
    publicUrl: string;
}

const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';
const HINT_CLASS = 'text-[11px] text-[#8A8A96]';
const INPUT_CLASS =
    'h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 disabled:cursor-not-allowed disabled:bg-[#F6F5F2] disabled:text-[#8A8A96]';
const ADD_BUTTON_CLASS = 'h-11 w-fit rounded-lg border border-[#E4E2DA] bg-white px-4 text-[13px] font-semibold text-[#14141B] shadow-sm transition hover:bg-[#F6F5F2]';

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-[#FFF4DB] text-[#B46E00]' },
    published: { label: 'Published', cls: 'bg-[#E6F6EC] text-[#059669]' },
    unpublished: { label: 'Unpublished', cls: 'bg-[#F0EFEA] text-[#6B6B78]' },
};

const FORMAT_LABEL: Record<BookFormat, string> = { pdf: 'PDF', epub: 'EPUB', mobi: 'MOBI', zip: 'ZIP' };

/* ------------------------------------------------------------------ */
/*  AUTO-SAVE HOOK                                                     */
/* ------------------------------------------------------------------ */

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function useAutoSave(url: string) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef<RequestPayload | null>(null);
    const inflight = useRef(false);

    const send = useCallback(
        (data: RequestPayload, opts?: { silent?: boolean }) => {
            if (inflight.current) {
                // queue latest and try again after current finishes
                latest.current = data;
                return;
            }
            inflight.current = true;
            setStatus('saving');
            router.put(url, data, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setErrors({});
                    if (!opts?.silent) setStatus('saved');
                    window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
                },
                onError: (validationErrors) => {
                    setErrors(validationErrors as Record<string, string>);
                    setStatus('error');
                },
                onFinish: () => {
                    inflight.current = false;
                    if (latest.current) {
                        const next = latest.current;
                        latest.current = null;
                        // small debounce so we don't ping the server in a tight loop
                        window.setTimeout(() => send(next), 50);
                    }
                },
            });
        },
        [url],
    );

    const queue = useCallback(
        (data: RequestPayload) => {
            latest.current = data;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => send(data), 700);
        },
        [send],
    );

    const flush = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        if (latest.current) send(latest.current);
    }, [send]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    return { status, errors, queue, flush, send };
}

/* ------------------------------------------------------------------ */
/*  SMALL FORM PIECES                                                  */
/* ------------------------------------------------------------------ */

/** Kisi bhi button ko file picker bana deta hai (hidden input + click). */
function PickButton({
    onPick,
    accept,
    multiple,
    disabled,
    className,
    children,
}: {
    onPick: (files: File[]) => void;
    accept: string;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className={cn(className, 'disabled:cursor-wait disabled:opacity-60')}>
                {children}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) onPick(files);
                    e.target.value = '';
                }}
            />
        </>
    );
}

function RemoveButton({ label, onClick, busy }: { label: string; onClick: () => void; busy?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            aria-label={label}
            className="shrink-0 rounded-lg p-1.5 text-[#D93838] transition hover:bg-[#FFEDE8] disabled:opacity-50"
        >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        </button>
    );
}

function FieldError({ message }: { message?: string | null }) {
    return message ? <p className="text-[11px] font-medium text-[#D93838]">{message}</p> : null;
}

/* ------------------------------------------------------------------ */
/*  PREVIEW PANE                                                       */
/* ------------------------------------------------------------------ */

function PreviewPane({ item, host, device }: { item: BookItem; host: string; device: 'desktop' | 'mobile' }) {
    const mobile = device === 'mobile';
    const accent = HEX_RE.test(item.accent_color ?? '') ? (item.accent_color as string) : DEFAULT_ACCENT;
    const title = item.title?.trim() || 'Your book title here';
    const description = sanitizeHtml(toEditorHtml(item.description ?? ''));
    const author = item.book_detail?.author_name?.trim();
    const pages = item.book_detail?.pages;
    const format = item.book_detail?.format ?? 'pdf';
    const price = Number(item.price) || 0;
    const discounted = item.pricing_type === 'fixed' && item.has_discount && Number(item.discounted_price) > 0 && Number(item.discounted_price) < price;
    const shownPrice = item.pricing_type === 'free' ? 'Free' : formatCurrency(discounted ? Number(item.discounted_price) : price);
    const cta = item.button_text?.trim() || 'Buy & Download';
    const covers = item.cover_images ?? [];
    const videoUrl = item.cover_video_url?.trim();
    const subtitle = item.book_detail?.subtitle?.trim();
    const points = item.book_detail?.whats_inside ?? [];
    const faqs = item.book_detail?.faqs ?? [];
    const payWhatYouWant = item.pricing_type === 'customer_decides';
    // email/phone upar hamesha dikhte hain; GSTIN/State book checkout pe nahi aate; baaki sirf tab jab creator ne on rakha ho
    const questions = (item.checkout_questions ?? []).filter(
        (q) => q.is_enabled && !['email', 'phone'].includes(q.field_type) && !/gstin/i.test(q.label) && !(q.field_type === 'dropdown' && /state/i.test(q.label)),
    );
    const [activeCover, setActiveCover] = useState(0);
    const coverTrack = useRef<HTMLDivElement>(null);

    function showCover(index: number) {
        setActiveCover(index);
        coverTrack.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    const label = (text: string) => (
        <h3 className="mb-3 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {text}
        </h3>
    );

    const main = (
        <div className="flex min-w-0 flex-col gap-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight break-words text-[#14141B]">{title}</h1>
                {subtitle && <p className="mt-2 text-lg leading-snug text-[#4B4B57]">{subtitle}</p>}
                {author && <p className="mt-2 text-[15px] text-[#6B6B78]">by {author}</p>}
            </div>

            {/* video trailer cover ke upar dikhta hai (editor hint jaisa) */}
            {videoUrl && (
                <div className="flex aspect-video items-center justify-center gap-2 overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2] text-sm text-[#6B6B78]">
                    <Play className="size-5" style={{ color: accent }} /> <span className="max-w-[70%] truncate">{videoUrl}</span>
                </div>
            )}

            {covers.length > 0 && (
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2]">
                        <div
                            ref={coverTrack}
                            onScroll={(event) => setActiveCover(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
                            className="flex aspect-video snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {covers.map((cover) => (
                                <img key={cover.id} src={assetUrl(cover.image_path)} alt="" className="size-full shrink-0 snap-center object-cover" />
                            ))}
                        </div>
                        {covers.length > 1 && (
                            <div className="absolute right-0 bottom-3 left-0 z-10 flex items-center justify-center gap-1.5">
                                {covers.map((cover, index) => (
                                    <button
                                        key={cover.id}
                                        type="button"
                                        aria-label={`Show image ${index + 1}`}
                                        aria-pressed={activeCover === index}
                                        onClick={() => showCover(index)}
                                        className={cn('size-2 rounded-full border border-white/80 shadow-sm transition', activeCover === index ? 'bg-white' : 'bg-white/45 hover:bg-white/75')}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <PreviewPill label="Format" value={FORMAT_LABEL[format]} />
                <PreviewPill label="Pages" value={pages ? String(pages) : '—'} />
            </div>

            <div>
                {label('About this book')}
                {description ? (
                    <div className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: description }} />
                ) : (
                    <p className="text-[15px] leading-relaxed text-[#6B6B78]">What's this book about? Who is it for?</p>
                )}
            </div>

            {points.length > 0 && (
                <div>
                    {label("What's inside")}
                    <ul className="flex flex-col gap-2.5">
                        {points.map((point, i) => (
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

    const fakeInput = (text: string, prefix?: string) => (
        <div className="flex h-11 items-center gap-2 rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#8A8A96]">
            {prefix && <span className="border-r border-[#E4E2DA] pr-2">{prefix}</span>}
            <span className="truncate">{text}</span>
        </div>
    );

    const side = (
        <aside className="flex flex-col gap-3 rounded-2xl border border-[#E4E2DA] bg-white p-5 text-[#14141B] shadow-sm">
            <div className="flex items-center gap-2.5 text-sm text-[#6B6B78]">
                <FileText className="size-4" /> {FORMAT_LABEL[format]}
                {pages ? ` · ${pages} pages` : ''}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-[#6B6B78]">
                <Download className="size-4" /> Instant download after payment
            </div>
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
                            <span className="truncate">
                                {host}/b/{item.slug || 'your-book'}
                            </span>
                        </span>
                    </div>
                )}
                <div className="h-1 shrink-0" style={{ background: accent }} />
                <div
                    className={cn(
                        'min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
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

function PreviewPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">{label}</p>
            <p className="mt-1 truncate text-[14px] font-semibold text-[#14141B]">{value}</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function BooksEdit({ item, publicUrl }: BooksEditProps) {
    const initial = useMemo(
        () => ({
            title: item.title ?? '',
            // server description ko sanitized HTML me save karta hai — purana plain text bhi paragraphs ban jaata hai
            description: toEditorHtml(item.description ?? ''),
            cover_video_url: item.cover_video_url ?? '',
            author_name: item.book_detail?.author_name ?? '',
            subtitle: item.book_detail?.subtitle ?? '',
            pages: (item.book_detail?.pages ?? '') as number | '',
            format: (item.book_detail?.format ?? 'pdf') as BookFormat,
            whats_inside: item.book_detail?.whats_inside ?? [],
            faqs: item.book_detail?.faqs ?? [],
            pricing_type: item.pricing_type,
            price: Number(item.price ?? 0),
            has_discount: item.has_discount ?? false,
            discounted_price: (item.discounted_price === null ? '' : Number(item.discounted_price)) as number | '',
            button_text: item.button_text ?? 'Buy & Download',
            slug: item.slug ?? '',
        }),
        [item],
    );

    const [form, setForm] = useState(initial);
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [coupons, setCoupons] = useState<Coupon[]>(item.coupons ?? []);
    const [coverImages, setCoverImages] = useState<CoverImage[]>(item.cover_images ?? []);
    const [coverBusy, setCoverBusy] = useState(false);
    const [coverError, setCoverError] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponPercent, setCouponPercent] = useState('10');
    const [addingCoupon, setAddingCoupon] = useState(false);
    const [removingCouponId, setRemovingCouponId] = useState<number | null>(null);

    const [bookDetail, setBookDetail] = useState<BookDetail | null>(item.book_detail);
    const [fileBusy, setFileBusy] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [linkInput, setLinkInput] = useState(item.book_detail?.external_link ?? '');

    const { status: saveStatus, errors: saveErrors, queue: queueSave, flush: flushSave } = useAutoSave(`/dashboard/books/${item.uuid}`);

    useEffect(() => setCoverImages(item.cover_images ?? []), [item.cover_images]);
    useEffect(() => {
        setBookDetail(item.book_detail);
        setLinkInput(item.book_detail?.external_link ?? '');
        // file upload server pe format khud set karta hai (extension se) — select ko usi se sync rakho, bina save ke
        const format = item.book_detail?.format;
        if (format) setForm((f) => (f.format === format ? f : { ...f, format }));
    }, [item.book_detail]);

    async function uploadCovers(files: File[]) {
        const remaining = 8 - coverImages.length;
        if (files.length > remaining) return setCoverError(`You can upload up to 8 cover images (${remaining} remaining).`);
        if (files.some((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024)) return setCoverError('Each cover image must be an image up to 10 MB.');

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

    // ----- book file / link (own endpoint — auto-clears the other) --

    function uploadBookFile(files: File[]) {
        const file = files[0];
        if (!file) return;
        const allowed = ['pdf', 'epub', 'mobi', 'zip'];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!allowed.includes(ext)) return setFileError('Upload a PDF, EPUB, MOBI or ZIP file.');
        if (file.size > 100 * 1024 * 1024) return setFileError('File must be under 100 MB — paste a Google Drive link for bigger files.');

        setFileBusy(true);
        setFileError(null);
        router.post(
            `/dashboard/books/${item.uuid}/file`,
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => router.reload({ only: ['item'] }),
                onError: (errors) => setFileError(firstError(errors as Record<string, string>, 'Upload failed. Please try again.')),
                onFinish: () => setFileBusy(false),
            },
        );
    }

    function saveExternalLink() {
        const link = linkInput.trim();
        // blur + Enter dono yahan aate hain — khali ya adhoora link server tak mat bhejo
        if (!link || fileBusy) return;
        if (!/^https?:\/\/\S+\.\S+/i.test(link)) return setFileError('Enter a full link starting with https://');
        setFileBusy(true);
        setFileError(null);
        router.post(
            `/dashboard/books/${item.uuid}/file`,
            { external_link: link },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => router.reload({ only: ['item'] }),
                onError: (errors) => setFileError(firstError(errors as Record<string, string>, 'Could not save the link. Please try again.')),
                onFinish: () => setFileBusy(false),
            },
        );
    }

    function removeBookFile() {
        if (fileBusy) return;
        setFileBusy(true);
        setFileError(null);
        router.post(
            `/dashboard/books/${item.uuid}/file`,
            { remove_file: true },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setLinkInput('');
                    router.reload({ only: ['item'] });
                },
                onError: (errors) => setFileError(firstError(errors as Record<string, string>, 'Could not remove the file. Please try again.')),
                onFinish: () => setFileBusy(false),
            },
        );
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
            slug: f.slug,
            author_name: f.author_name || null,
            subtitle: f.subtitle || null,
            pages: f.pages === '' ? null : f.pages,
            format: f.format,
            whats_inside: f.whats_inside,
            faqs: f.faqs,
        };
    }

    /** `faqs.0.question` jaise nested errors ko bhi parent field ke neeche dikhao */
    function errorFor(field: string) {
        return saveErrors[field] ?? Object.entries(saveErrors).find(([key]) => key.startsWith(`${field}.`))?.[1];
    }

    // ----- publish / unpublish -------------------------------------

    function publish() {
        // ensure latest form is saved before validating
        flushSave();
        setPublishError(null);
        setPublishing(true);
        router.post(
            `/dashboard/books/${item.uuid}/publish`,
            { status: 'published' },
            {
                preserveScroll: true,
                onSuccess: () => setPublishing(false),
                onError: (errors) => {
                    const msgs = Object.values(errors as Record<string, string>).filter(Boolean);
                    setPublishError((msgs[0] as string) || 'Please fill the highlighted fields and try again.');
                    setPublishing(false);
                },
                onFinish: () => setPublishing(false),
            },
        );
    }

    function saveDraft() {
        flushSave();
    }

    function addCoupon() {
        const code = couponCode.trim().toUpperCase();
        const discount = Number(couponPercent);
        if (!code || discount < 1 || discount > 100 || addingCoupon) return;
        setAddingCoupon(true);
        router.post(
            `/dashboard/products/${item.id}/coupons`,
            { code, discount_percent: discount, is_active: true },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setCouponCode('');
                    router.reload({
                        only: ['item'],
                        onSuccess: (page) => setCoupons((page.props as unknown as { item: BookItem }).item.coupons ?? []),
                    });
                },
                onFinish: () => setAddingCoupon(false),
            },
        );
    }

    function removeCoupon(couponId: number) {
        if (removingCouponId !== null) return;
        setRemovingCouponId(couponId);
        router.delete(`/dashboard/coupons/${couponId}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setCoupons((current) => current.filter((coupon) => coupon.id !== couponId)),
            onFinish: () => setRemovingCouponId(null),
        });
    }

    // ----- preview item (same shape, but live) ----------------------

    const previewItem: BookItem = useMemo(
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
            slug: form.slug,
            book_detail: {
                product_id: item.id,
                author_name: form.author_name || null,
                subtitle: form.subtitle || null,
                pages: form.pages === '' ? null : Number(form.pages),
                format: form.format,
                whats_inside: form.whats_inside.filter((p) => p.trim()),
                faqs: form.faqs.filter((f) => f.question.trim()),
                file_path: bookDetail?.file_path ?? null,
                external_link: bookDetail?.external_link ?? null,
            },
        }),
        [item, form, coverImages, bookDetail],
    );
    const previewHost = publicUrl.replace(/^https?:\/\//, '').split('/')[0];

    // ----- helpers -------------------------------------------------

    const titleCount = form.title.length;
    const titleOk = titleCount > 0 && titleCount <= 75;
    const descCount = form.description?.length ?? 0;
    const statusMeta = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft;
    const hasFile = Boolean(bookDetail?.file_path);
    const hasLink = Boolean(bookDetail?.external_link);
    const fileName = bookDetail?.file_path ? bookDetail.file_path.split('/').pop() : null;

    return (
        <div className="h-screen overflow-hidden bg-white">
            <Head title={`${item.title || 'Untitled book'} · Edit book`} />

            {/* full-bleed split — left is the form, right is the dark preview */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
                {/* LEFT — editor */}
                <section className="flex min-h-0 w-full flex-col overflow-hidden border-r border-[#E4E2DA] bg-white lg:w-[520px] lg:shrink-0">
                    {/* top bar */}
                    <div className="flex items-center justify-between border-b border-[#E4E2DA] px-4 py-3 md:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.visit('/dashboard/books')}
                                aria-label="Back to books"
                                className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F6F5F2] hover:text-[#14141B]"
                            >
                                <X className="size-5" />
                            </button>
                            <h2 className="truncate text-[13px] font-semibold tracking-wider text-[#14141B] uppercase">
                                {item.title || 'Your book title here'}
                            </h2>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase', statusMeta.cls)}>
                            {statusMeta.label}
                        </span>
                    </div>

                    {/* scrollable form body */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6 md:py-6">
                        <div className="mx-auto flex max-w-[440px] flex-col gap-5">
                            <h1 className="text-xl font-bold tracking-tight text-[#14141B]">Sell your book / e-book</h1>

                            {/* Book title */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="book_title" className={LABEL_CLASS}>
                                        Book title <span className="text-[#D93838]">*</span>
                                    </label>
                                    <span className={cn('text-[11px]', titleOk ? 'text-[#8A8A96]' : 'text-[#D93838]')}>{titleCount}/75</span>
                                </div>
                                <input
                                    id="book_title"
                                    maxLength={75}
                                    value={form.title}
                                    onChange={(e) => patch({ title: e.target.value })}
                                    placeholder="Your book title here"
                                    className={INPUT_CLASS}
                                />
                                <FieldError message={errorFor('title')} />
                            </div>

                            {/* Author */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="book_author" className={LABEL_CLASS}>
                                    Author
                                </label>
                                <input
                                    id="book_author"
                                    maxLength={150}
                                    value={form.author_name}
                                    onChange={(e) => patch({ author_name: e.target.value })}
                                    placeholder="Your name"
                                    className={INPUT_CLASS}
                                />
                                <FieldError message={errorFor('author_name')} />
                            </div>

                            {/* Subtitle */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="book_subtitle" className={LABEL_CLASS}>
                                    Subtitle
                                </label>
                                <input
                                    id="book_subtitle"
                                    maxLength={150}
                                    value={form.subtitle}
                                    onChange={(e) => patch({ subtitle: e.target.value })}
                                    className={INPUT_CLASS}
                                />
                                <p className={HINT_CLASS}>One short line under the title (optional)</p>
                                <FieldError message={errorFor('subtitle')} />
                            </div>

                            {/* Cover images */}
                            <div className="flex flex-col gap-1.5">
                                <label className={LABEL_CLASS}>Cover image</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {coverImages.map((image, index) => (
                                        <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg bg-[#F6F5F2]">
                                            <img src={assetUrl(image.image_path)} alt={`Cover ${index + 1}`} className="size-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeCover(image.id)}
                                                disabled={coverBusy}
                                                aria-label={`Remove cover image ${index + 1}`}
                                                className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-[#D93838] shadow hover:bg-white disabled:opacity-50"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {coverImages.length < 8 && (
                                        <PickButton
                                            accept="image/*"
                                            multiple
                                            onPick={uploadCovers}
                                            disabled={coverBusy}
                                            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#E4E2DA] bg-white text-[12px] font-medium text-[#4B4B57] transition hover:border-[#4F46E5] hover:text-[#4F46E5]"
                                        >
                                            {coverBusy ? <Loader2 className="size-4 animate-spin" /> : '+ Upload'}
                                        </PickButton>
                                    )}
                                </div>
                                <p className={HINT_CLASS}>1280 × 720 recommended · up to 10 MB each</p>
                                {coverError && <FieldError message={coverError} />}
                            </div>

                            {/* Video link */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="book_video" className={LABEL_CLASS}>
                                    Or add a video link
                                </label>
                                <input
                                    id="book_video"
                                    type="url"
                                    value={form.cover_video_url}
                                    onChange={(e) => patch({ cover_video_url: e.target.value })}
                                    placeholder="https://youtu.be/…"
                                    className={INPUT_CLASS}
                                />
                                <p className={HINT_CLASS}>A trailer / flip-through — shown above the cover</p>
                                <FieldError message={errorFor('cover_video_url')} />
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="book_desc" className={LABEL_CLASS}>
                                        Description <span className="text-[#D93838]">*</span>
                                    </label>
                                    <span className="text-[11px] text-[#8A8A96]">{descCount}/20000</span>
                                </div>
                                <RichText
                                    id="book_desc"
                                    value={form.description}
                                    onChange={(html) => patch({ description: html })}
                                    placeholder="What's this book about? Who is it for?"
                                    error={Boolean(saveErrors.description)}
                                />
                                <FieldError message={errorFor('description')} />
                            </div>

                            {/* What's inside */}
                            <div className="flex flex-col gap-1.5">
                                <label className={LABEL_CLASS}>What's inside</label>
                                {form.whats_inside.map((point, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            value={point}
                                            maxLength={150}
                                            autoFocus={point === '' && index === form.whats_inside.length - 1}
                                            onChange={(e) => patch({ whats_inside: form.whats_inside.map((p, i) => (i === index ? e.target.value : p)) })}
                                            placeholder={`Point ${index + 1} — e.g. 12 chapters on …`}
                                            className={INPUT_CLASS}
                                        />
                                        <RemoveButton label={`Remove point ${index + 1}`} onClick={() => patch({ whats_inside: form.whats_inside.filter((_, i) => i !== index) })} />
                                    </div>
                                ))}
                                {form.whats_inside.length < 20 && (
                                    <button type="button" onClick={() => patch({ whats_inside: [...form.whats_inside, ''] })} className={ADD_BUTTON_CLASS}>
                                        + Add point
                                    </button>
                                )}
                                <p className={HINT_CLASS}>Chapters, bonuses, templates — shown as a checklist</p>
                                <FieldError message={errorFor('whats_inside')} />
                            </div>

                            {/* Pages + format */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="book_pages" className={LABEL_CLASS}>
                                        Pages
                                    </label>
                                    <input
                                        id="book_pages"
                                        type="number"
                                        min="1"
                                        max="20000"
                                        value={form.pages}
                                        onChange={(e) => patch({ pages: e.target.value === '' ? '' : Number(e.target.value) })}
                                        placeholder="e.g. 120"
                                        className={INPUT_CLASS}
                                    />
                                    <FieldError message={errorFor('pages')} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="book_format" className={LABEL_CLASS}>
                                        Format
                                    </label>
                                    <select id="book_format" value={form.format} onChange={(e) => patch({ format: e.target.value as BookFormat })} className={INPUT_CLASS}>
                                        <option value="pdf">PDF</option>
                                        <option value="epub">EPUB</option>
                                        <option value="mobi">MOBI</option>
                                        <option value="zip">ZIP</option>
                                    </select>
                                </div>
                            </div>

                            {/* Book file / external link — required to publish */}
                            <div className="flex flex-col gap-2">
                                <label className={LABEL_CLASS}>
                                    Book file <span className="text-[#D93838]">*</span>
                                </label>

                                {hasFile ? (
                                    <div className="flex items-center gap-3 rounded-lg border border-[#E4E2DA] bg-[#F8F7F4] px-3 py-2.5">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FFEDE8] text-[#C2410C]">
                                            <FileText className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-[#14141B]">{fileName ?? 'Book file uploaded'}</p>
                                            <p className="text-[11px] text-[#8A8A96]">{FORMAT_LABEL[bookDetail?.format ?? 'pdf'] ?? 'PDF'} · ready to sell</p>
                                        </div>
                                        <RemoveButton label="Remove book file" onClick={removeBookFile} busy={fileBusy} />
                                    </div>
                                ) : hasLink ? (
                                    <div className="flex items-center gap-3 rounded-lg border border-[#E4E2DA] bg-[#F8F7F4] px-3 py-2.5">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E6F2FF] text-[#0284C7]">
                                            <Link2 className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-[#14141B]">{bookDetail?.external_link}</p>
                                            <p className="text-[11px] text-[#8A8A96]">External link · ready to sell</p>
                                        </div>
                                        <RemoveButton label="Remove book link" onClick={removeBookFile} busy={fileBusy} />
                                    </div>
                                ) : (
                                    <>
                                        <PickButton accept=".pdf,.epub,.mobi,.zip" onPick={uploadBookFile} disabled={fileBusy} className={cn(ADD_BUTTON_CLASS, 'inline-flex items-center gap-2')}>
                                            {fileBusy ? (
                                                <>
                                                    <Loader2 className="size-4 animate-spin" /> Uploading…
                                                </>
                                            ) : (
                                                '+ Upload file'
                                            )}
                                        </PickButton>
                                        <div className="flex items-center gap-3 text-[10px] font-semibold tracking-widest text-[#8A8A96] uppercase">
                                            <span className="h-px flex-1 bg-[#E4E2DA]" /> or <span className="h-px flex-1 bg-[#E4E2DA]" />
                                        </div>
                                        <input
                                            type="url"
                                            value={linkInput}
                                            disabled={fileBusy}
                                            onChange={(e) => setLinkInput(e.target.value)}
                                            onBlur={saveExternalLink}
                                            onKeyDown={(e) => e.key === 'Enter' && saveExternalLink()}
                                            placeholder="Paste a Google Drive / download link (https://…)"
                                            className={INPUT_CLASS}
                                        />
                                        <p className={HINT_CLASS}>For Google Drive, set sharing to “Anyone with the link”. Use a link for files over 100 MB.</p>
                                    </>
                                )}
                                <p className={HINT_CLASS}>Buyers download this after paying · upload up to 100 MB, or paste a link</p>
                                {fileError && <FieldError message={fileError} />}
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'fixed' as const, label: 'Fixed price' },
                                    { value: 'customer_decides' as const, label: 'Customer decides' },
                                ].map((option) => {
                                    const active = form.pricing_type === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => patch({ pricing_type: option.value, ...(option.value === 'customer_decides' ? { has_discount: false } : {}) })}
                                            className={cn(
                                                'flex h-14 items-center justify-between rounded-xl border px-4 text-sm font-semibold transition',
                                                active ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#14141B]' : 'border-[#E4E2DA] bg-white text-[#14141B] hover:border-[#4F46E5]/45',
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
                                <label htmlFor="book_price" className={LABEL_CLASS}>
                                    {form.pricing_type === 'customer_decides' ? 'Minimum price (₹)' : 'Price (₹)'} <span className="text-[#D93838]">*</span>
                                </label>
                                <input
                                    id="book_price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    disabled={form.pricing_type === 'free'}
                                    value={form.pricing_type === 'free' ? 0 : form.price}
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
                                            <label htmlFor="book_discounted_price" className={LABEL_CLASS}>
                                                Discounted price (₹)
                                            </label>
                                            <input
                                                id="book_discounted_price"
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

                            {/* Coupons */}
                            <div className="flex flex-col gap-2">
                                <label className={LABEL_CLASS}>Discount coupons</label>
                                {coupons.map((coupon) => (
                                    <div key={coupon.id} className="flex items-center gap-2 rounded-lg border border-[#E4E2DA] bg-[#F8F7F4] px-3 py-2 text-[11px]">
                                        <span className="font-bold text-[#4F46E5]">{coupon.code}</span>
                                        <span className="font-semibold text-[#14141B]">{coupon.discount_percent}% off</span>
                                        <span className={cn('ml-auto', coupon.is_active ? 'text-[#059669]' : 'text-[#8A8A96]')}>{coupon.is_active ? 'Active' : 'Inactive'}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeCoupon(coupon.id)}
                                            disabled={removingCouponId === coupon.id}
                                            aria-label={`Remove ${coupon.code} coupon`}
                                            className="rounded p-0.5 text-[#D93838] transition hover:bg-[#FFEDE8] disabled:opacity-40"
                                        >
                                            {removingCouponId === coupon.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input
                                        value={couponCode}
                                        maxLength={30}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                                        placeholder="CODE"
                                        className={cn(INPUT_CLASS, 'min-w-0 flex-1')}
                                    />
                                    <div className="relative w-28 shrink-0">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={couponPercent}
                                            onChange={(e) => setCouponPercent(e.target.value)}
                                            className={cn(INPUT_CLASS, 'pr-7')}
                                        />
                                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[#8A8A96]">%</span>
                                    </div>
                                    <button type="button" onClick={addCoupon} disabled={addingCoupon || !couponCode.trim()} className={cn(ADD_BUTTON_CLASS, 'shrink-0 disabled:cursor-not-allowed disabled:opacity-40')}>
                                        {addingCoupon ? '…' : '+ Add'}
                                    </button>
                                </div>
                                <p className={HINT_CLASS}>Buyers enter these at checkout for a % off</p>
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
                                            <RemoveButton label={`Remove FAQ ${index + 1}`} onClick={() => patch({ faqs: form.faqs.filter((_, i) => i !== index) })} />
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={faq.answer}
                                            maxLength={1000}
                                            onChange={(e) => patch({ faqs: form.faqs.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)) })}
                                            placeholder="Answer"
                                            className="w-full resize-y rounded-lg border border-[#E4E2DA] bg-white px-3 py-2.5 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
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

                            {/* Button text */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="book_button_text" className={LABEL_CLASS}>
                                        Button text
                                    </label>
                                    <span className="text-[11px] text-[#8A8A96]">{form.button_text.length}/25</span>
                                </div>
                                <input
                                    id="book_button_text"
                                    maxLength={25}
                                    value={form.button_text}
                                    onChange={(e) => patch({ button_text: e.target.value })}
                                    placeholder="Buy & Download"
                                    className={INPUT_CLASS}
                                />
                                <FieldError message={errorFor('button_text')} />
                            </div>

                            {/* Page URL */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="book_slug" className={LABEL_CLASS}>
                                    Page URL <span className="text-[#D93838]">*</span>
                                </label>
                                <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-[#E4E2DA] bg-white text-sm shadow-sm focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                                    <span className="flex items-center border-r border-[#E4E2DA] bg-[#F6F5F2] px-3 text-[#8A8A96]">/b/</span>
                                    <input
                                        id="book_slug"
                                        value={form.slug}
                                        maxLength={150}
                                        onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        placeholder="your-book"
                                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]"
                                    />
                                </div>
                                <p className={HINT_CLASS}>Required before publishing</p>
                                <FieldError message={errorFor('slug')} />
                            </div>

                            {publishError && (
                                <div className="flex items-start gap-2 rounded-lg border border-[#FFEDE8] bg-[#FFF6F1] p-3 text-[12px] font-semibold text-[#C2410C]">
                                    <Info className="mt-px size-4 shrink-0" />
                                    {publishError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* bottom action bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E2DA] bg-white px-4 py-3 md:px-6">
                        <div className="flex items-center gap-2 text-[11px] text-[#8A8A96]">
                            <SaveStatusPill status={saveStatus} />
                            <span>All changes saved automatically</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={saveDraft} disabled={saveStatus === 'saving'} className="border-[#E4E2DA] text-[#4B4B57] hover:bg-[#F6F5F2]">
                                <Save className="size-4" /> Save draft
                            </Button>
                            <Button onClick={publish} disabled={publishing} className="bg-[#4F46E5] hover:bg-[#4338CA]">
                                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                                {publishing ? 'Publishing…' : 'Publish'} <ArrowRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                </section>

                {/* RIGHT — preview */}
                <section
                    className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#0A0A12]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                >
                    {/* preview header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 md:px-6">
                        <div>
                            <p className="text-[13px] font-semibold text-white">Preview</p>
                            <p className="text-[11px] text-white/50">This is exactly what your visitors see.</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <DeviceToggle device={device} onChange={setDevice} />
                            {item.status === 'published' && (
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                                >
                                    <ExternalLink className="size-3.5" /> Open live
                                </a>
                            )}
                        </div>
                    </div>

                    {/* scrollable preview area */}
                    <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden p-4 md:p-6 xl:p-8">
                        <PreviewPane item={previewItem} host={previewHost} device={device} />
                    </div>

                    {/* helper tip */}
                    <div className="border-t border-white/5 px-4 py-2.5 md:px-6">
                        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                            <Sparkles className="size-3 text-[#FF6B4A]" />
                            Tip — the download link is generated the moment a buyer's payment settles.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  SMALL PIECES                                                       */
/* ------------------------------------------------------------------ */

function DeviceToggle({ device, onChange }: { device: 'desktop' | 'mobile'; onChange: (d: 'desktop' | 'mobile') => void }) {
    return (
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
                type="button"
                onClick={() => onChange('desktop')}
                aria-pressed={device === 'desktop'}
                className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition', device === 'desktop' ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white')}
            >
                <Monitor className="size-3.5" /> Desktop
            </button>
            <button
                type="button"
                onClick={() => onChange('mobile')}
                aria-pressed={device === 'mobile'}
                className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition', device === 'mobile' ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white')}
            >
                <Smartphone className="size-3.5" /> Mobile
            </button>
        </div>
    );
}

function SaveStatusPill({ status }: { status: SaveStatus }) {
    if (status === 'saving')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                <Loader2 className="size-3 animate-spin" /> Saving
            </span>
        );
    if (status === 'saved')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F6EC] px-2 py-0.5 text-[10px] font-semibold text-[#059669]">
                <Check className="size-3" /> Saved
            </span>
        );
    if (status === 'error')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEDE8] px-2 py-0.5 text-[10px] font-semibold text-[#C2410C]">
                <Info className="size-3" /> Save failed
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/0 px-2 py-0.5 text-[10px] font-semibold text-[#8A8A96]">
            <Eye className="size-3" /> Live
        </span>
    );
}

