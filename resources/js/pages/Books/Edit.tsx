import { assetUrl, firstError } from '@/components/course-editor/api';
import { RichText, sanitizeHtml, toEditorHtml } from '@/components/course-editor/ui';
import { EditorShell, publishProduct } from '@/components/product-editor/editor-shell';
import {
    checkoutExtraQuestions,
    PreviewCheckoutCard,
    PreviewFrame,
    PreviewLabel,
    PreviewPill,
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
import { Check, ChevronDown, Download, FileText, Link2, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
    checkout_questions?: PreviewQuestion[];
}

interface BooksEditProps {
    item: BookItem;
    publicUrl: string;
}

const FORMAT_LABEL: Record<BookFormat, string> = { pdf: 'PDF', epub: 'EPUB', mobi: 'MOBI', zip: 'ZIP' };

/* ------------------------------------------------------------------ */
/*  PREVIEW PANE                                                       */
/* ------------------------------------------------------------------ */

function PreviewPane({ item, host, device }: { item: BookItem; host: string; device: Device }) {
    const accent = resolveAccent(item.accent_color);
    const title = item.title?.trim() || 'Your book title here';
    const description = sanitizeHtml(toEditorHtml(item.description ?? ''));
    const author = item.book_detail?.author_name?.trim();
    const pages = item.book_detail?.pages;
    const format = item.book_detail?.format ?? 'pdf';
    const cta = item.button_text?.trim() || 'Buy & Download';
    const covers = item.cover_images ?? [];
    const videoUrl = item.cover_video_url?.trim();
    const subtitle = item.book_detail?.subtitle?.trim();
    const points = item.book_detail?.whats_inside ?? [];
    const faqs = item.book_detail?.faqs ?? [];
    const questions = checkoutExtraQuestions(item.checkout_questions);
    const [activeCover, setActiveCover] = useState(0);
    const coverTrack = useRef<HTMLDivElement>(null);

    function showCover(index: number) {
        setActiveCover(index);
        coverTrack.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    const label = (text: string) => <PreviewLabel accent={accent}>{text}</PreviewLabel>;

    const main = (
        <div className="flex min-w-0 flex-col gap-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight break-words text-[#14141B]">{title}</h1>
                {subtitle && <p className="mt-2 text-lg leading-snug text-[#4B4B57]">{subtitle}</p>}
                {author && <p className="mt-2 text-[15px] text-[#6B6B78]">by {author}</p>}
            </div>

            {/* video trailer cover ke upar — public page jaisa hi thumbnail + play */}
            <VideoEmbed url={videoUrl} accent={accent} />

            {covers.length > 0 && (
                <div className="relative aspect-video overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2]">
                    <div
                        ref={coverTrack}
                        onScroll={(event) => setActiveCover(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
                        className="flex aspect-video snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
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
                                    className={cn(
                                        'size-2 rounded-full border border-white/80 shadow-sm transition',
                                        activeCover === index ? 'bg-white' : 'bg-white/45 hover:bg-white/75',
                                    )}
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
                    <div
                        className="text-[15px] leading-relaxed text-[#14141B] [&_li]:ml-4 [&_p]:mb-2 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: description }}
                    />
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
            questions={questions}
            cta={cta}
            rows={[
                { icon: FileText, text: `${FORMAT_LABEL[format] ?? 'PDF'}${pages ? ` · ${pages} pages` : ''}` },
                { icon: Download, text: 'Instant download after payment' },
            ]}
        />
    );

    return <PreviewFrame device={device} url={`${host}/b/${item.slug || 'your-book'}`} accent={accent} main={main} side={side} />;
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
    const [device, setDevice] = useState<Device>('desktop');
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [coverImages, setCoverImages] = useState<CoverImage[]>(item.cover_images ?? []);
    const [coverBusy, setCoverBusy] = useState(false);
    const [coverError, setCoverError] = useState<string | null>(null);

    const [bookDetail, setBookDetail] = useState<BookDetail | null>(item.book_detail);
    const [fileBusy, setFileBusy] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [linkInput, setLinkInput] = useState(item.book_detail?.external_link ?? '');

    const { status: saveStatus, errors: saveErrors, errorFor, queue: queueSave, flush: flushSave } = useAutoSave(`/dashboard/books/${item.uuid}`);

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

    // ----- publish / unpublish -------------------------------------

    function publish() {
        publishProduct(`/dashboard/books/${item.uuid}/publish`, flushSave, setPublishing, setPublishError);
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
    const hasFile = Boolean(bookDetail?.file_path);
    const hasLink = Boolean(bookDetail?.external_link);
    const fileName = bookDetail?.file_path ? bookDetail.file_path.split('/').pop() : null;

    return (
        <EditorShell
            headTitle={`${item.title || 'Untitled book'} · Edit book`}
            title={item.title || 'Your book title here'}
            status={item.status}
            backHref="/dashboard/books"
            backLabel="Back to books"
            heading="Sell your book / e-book"
            publishError={publishError}
            saveStatus={saveStatus}
            onSaveDraft={flushSave}
            onPublish={publish}
            publishing={publishing}
            device={device}
            onDeviceChange={setDevice}
            publicUrl={publicUrl}
            preview={<PreviewPane item={previewItem} host={previewHost} device={device} />}
            tip="Tip — the download link is generated the moment a buyer's payment settles."
        >
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
                        <RemoveButton
                            label={`Remove point ${index + 1}`}
                            onClick={() => patch({ whats_inside: form.whats_inside.filter((_, i) => i !== index) })}
                        />
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
                    <select
                        id="book_format"
                        value={form.format}
                        onChange={(e) => patch({ format: e.target.value as BookFormat })}
                        className={INPUT_CLASS}
                    >
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
                        <PickButton
                            accept=".pdf,.epub,.mobi,.zip"
                            onPick={uploadBookFile}
                            disabled={fileBusy}
                            className={cn(ADD_BUTTON_CLASS, 'inline-flex items-center gap-2')}
                        >
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

            <CouponsField productId={item.id} initial={item.coupons ?? []} />

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

            <SlugField prefix="/b/" value={form.slug} onChange={(slug) => patch({ slug })} placeholder="your-book" error={errorFor('slug')} />
        </EditorShell>
    );
}
