import { firstError } from '@/components/course-editor/api';
import { EditorShell, publishProduct } from '@/components/product-editor/editor-shell';
import {
    checkoutExtraQuestions,
    PreviewCheckoutCard,
    PreviewFrame,
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
import {
    categoryLabel,
    LOCKED_CATEGORIES,
    LockedContentCard,
    lockedSummaryText,
    type LockedCategory,
    type LockedSummary,
} from '@/components/public/locked-content-card';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { FileText, Loader2, Lock, LockOpen } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Status = 'draft' | 'unpublished' | 'published';

interface HiddenImage {
    id: number;
    image_path: string;
    sort_order?: number;
}

interface HiddenFile {
    id: number;
    file_path: string;
    original_name: string | null;
}

interface LockedDetail {
    category: LockedCategory | null;
    public_teaser: string | null;
    hidden_message: string | null;
    hidden_video_url: string | null;
    images?: HiddenImage[];
    files?: HiddenFile[];
}

interface LockedItem {
    id: number;
    uuid: string;
    type: 'locked_content';
    title: string;
    slug: string;
    pricing_type: 'fixed' | 'customer_decides' | 'free';
    price: string | number;
    has_discount: boolean;
    discounted_price: string | number | null;
    button_text: string | null;
    accent_color: string | null;
    status: Status;
    locked_content_detail: LockedDetail | null;
    coupons?: Coupon[];
    checkout_questions?: PreviewQuestion[];
}

interface Props {
    item: LockedItem;
    publicUrl: string;
}

const MAX_IMAGES = 20;
const MAX_FILES = 20;
const BASE = '/dashboard/locked-content';

/** Hidden images private disk pe hain — editor thumbnails creator-only route se aate hain. */
const hiddenImageUrl = (id: number) => `/dashboard/locked-content-images/${id}`;

/* ------------------------------------------------------------------ */
/*  PREVIEW PANE                                                       */
/* ------------------------------------------------------------------ */

type PreviewData = {
    title: string;
    slug: string;
    category: string;
    teaser: string;
    summary: LockedSummary;
    pricing: { pricing_type: 'fixed'; price: number; has_discount: boolean; discounted_price: number | null };
    cta: string;
    accent_color: string | null;
    questions: PreviewQuestion[];
};

function PreviewPane({ data, host, device }: { data: PreviewData; host: string; device: Device }) {
    const accent = resolveAccent(data.accent_color);
    const summary = lockedSummaryText(data.summary);

    const main = (
        <div className="flex min-w-0 flex-col gap-6">
            <div>
                <span
                    className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase"
                    style={{ background: `${accent}1A`, color: accent }}
                >
                    {categoryLabel(data.category)}
                </span>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight break-words text-[#14141B]">
                    {data.title.trim() || 'Your locked content title'}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-[#4B4B57]">
                    {data.teaser.trim() || 'Unlock this content to view it.'}
                </p>
            </div>

            <LockedContentCard accent={accent} summary={data.summary} />
        </div>
    );

    const side = (
        <PreviewCheckoutCard
            accent={accent}
            pricing={data.pricing}
            questions={data.questions}
            cta={data.cta}
            rows={[
                { icon: Lock, text: summary || 'Hidden content' },
                { icon: LockOpen, text: 'Unlocks instantly after payment' },
            ]}
        />
    );

    return <PreviewFrame device={device} url={`${host}/l/${data.slug || 'your-content'}`} accent={accent} main={main} side={side} />;
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function LockedContentEdit({ item, publicUrl }: Props) {
    const detail = item.locked_content_detail;
    const initial = useMemo(
        () => ({
            title: item.title ?? '',
            category: (detail?.category ?? 'other') as LockedCategory,
            public_teaser: detail?.public_teaser ?? '',
            hidden_message: detail?.hidden_message ?? '',
            hidden_video_url: detail?.hidden_video_url ?? '',
            price: Number(item.price ?? 0),
            has_discount: item.has_discount ?? false,
            discounted_price: (item.discounted_price === null ? '' : Number(item.discounted_price)) as number | '',
            slug: item.slug ?? '',
        }),
        [item, detail],
    );

    const [form, setForm] = useState(initial);
    const [device, setDevice] = useState<Device>('desktop');
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);

    const [images, setImages] = useState<HiddenImage[]>(detail?.images ?? []);
    const [files, setFiles] = useState<HiddenFile[]>(detail?.files ?? []);
    const [imageBusy, setImageBusy] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [fileBusy, setFileBusy] = useState(false);
    const [removingFileId, setRemovingFileId] = useState<number | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const { status: saveStatus, errorFor, queue: queueSave, flush: flushSave } = useAutoSave(`${BASE}/${item.uuid}`);

    useEffect(() => {
        setImages(detail?.images ?? []);
        setFiles(detail?.files ?? []);
    }, [detail?.images, detail?.files]);

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
            category: f.category,
            public_teaser: f.public_teaser || null,
            hidden_message: f.hidden_message || null,
            hidden_video_url: f.hidden_video_url || null,
            // locked content hamesha fixed price pe bikta hai
            pricing_type: 'fixed',
            price: f.price,
            has_discount: f.has_discount,
            discounted_price: f.has_discount && f.discounted_price !== '' ? f.discounted_price : null,
            slug: f.slug,
        };
    }

    // ----- hidden images / files (apne endpoints) --------------------

    function uploadImages(picked: File[]) {
        const remaining = MAX_IMAGES - images.length;
        if (picked.length > remaining) return setImageError(`You can add up to ${MAX_IMAGES} hidden images (${remaining} remaining).`);
        if (picked.length > 10) return setImageError('Upload up to 10 images at a time.');
        if (picked.some((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024))
            return setImageError('Each image must be an image up to 10 MB.');

        setImageBusy(true);
        setImageError(null);
        router.post(
            `${BASE}/${item.uuid}/images`,
            { images: picked },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => router.reload({ only: ['item'] }),
                onError: (errors) => setImageError(firstError(errors as Record<string, string>, 'Upload failed. Please try again.')),
                onFinish: () => setImageBusy(false),
            },
        );
    }

    function removeImage(id: number) {
        setImageBusy(true);
        router.delete(`/dashboard/locked-content-images/${id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setImages((current) => current.filter((image) => image.id !== id)),
            onFinish: () => setImageBusy(false),
        });
    }

    function uploadFiles(picked: File[]) {
        const remaining = MAX_FILES - files.length;
        if (picked.length > remaining) return setFileError(`You can add up to ${MAX_FILES} hidden files (${remaining} remaining).`);
        if (picked.some((file) => file.size > 100 * 1024 * 1024)) return setFileError('Each file must be under 100 MB.');

        setFileBusy(true);
        setFileError(null);
        router.post(
            `${BASE}/${item.uuid}/files`,
            { files: picked },
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

    function removeFile(id: number) {
        if (removingFileId !== null) return;
        setRemovingFileId(id);
        router.delete(`/dashboard/locked-content-files/${id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setFiles((current) => current.filter((file) => file.id !== id)),
            onFinish: () => setRemovingFileId(null),
        });
    }

    function publish() {
        publishProduct(`${BASE}/${item.uuid}/publish`, flushSave, setPublishing, setPublishError);
    }

    // ----- preview data (live) ---------------------------------------

    const previewData: PreviewData = {
        title: form.title,
        slug: form.slug,
        category: form.category,
        teaser: form.public_teaser,
        summary: {
            has_message: form.hidden_message.trim() !== '',
            has_video: form.hidden_video_url.trim() !== '',
            image_count: images.length,
            file_count: files.length,
        },
        pricing: {
            pricing_type: 'fixed',
            price: form.price,
            has_discount: form.has_discount,
            discounted_price: form.has_discount && form.discounted_price !== '' ? Number(form.discounted_price) : null,
        },
        cta: item.button_text?.trim() || 'Unlock now',
        accent_color: item.accent_color,
        questions: checkoutExtraQuestions(item.checkout_questions),
    };
    const previewHost = publicUrl.replace(/^https?:\/\//, '').split('/')[0];

    const titleCount = form.title.length;
    const titleOk = titleCount > 0 && titleCount <= 75;

    return (
        <EditorShell
            headTitle={`${item.title || 'Untitled locked content'} · Edit locked content`}
            title={item.title || 'Untitled locked content'}
            status={item.status}
            backHref={BASE}
            backLabel="Back to locked content"
            heading="Write or upload content you'd like to sell"
            publishError={publishError}
            saveStatus={saveStatus}
            onSaveDraft={flushSave}
            onPublish={publish}
            publishing={publishing}
            device={device}
            onDeviceChange={setDevice}
            publicUrl={publicUrl}
            preview={<PreviewPane data={previewData} host={previewHost} device={device} />}
            tip="Tip — buyers unlock the hidden content the moment their payment settles."
        >
            {/* Title */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label htmlFor="locked_title" className={LABEL_CLASS}>
                        Title <span className="text-[#D93838]">*</span>
                    </label>
                    <span className={cn('text-[11px]', titleOk ? 'text-[#8A8A96]' : 'text-[#D93838]')}>{titleCount}/75</span>
                </div>
                <input
                    id="locked_title"
                    maxLength={75}
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Untitled locked content"
                    className={INPUT_CLASS}
                />
                <FieldError message={errorFor('title')} />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="locked_category" className={LABEL_CLASS}>
                    Category
                </label>
                <select
                    id="locked_category"
                    value={form.category}
                    onChange={(e) => patch({ category: e.target.value as LockedCategory })}
                    className={INPUT_CLASS}
                >
                    {LOCKED_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                            {c.label}
                        </option>
                    ))}
                </select>
                <FieldError message={errorFor('category')} />
            </div>

            {/* Public teaser */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="locked_teaser" className={LABEL_CLASS}>
                    Public teaser
                </label>
                <textarea
                    id="locked_teaser"
                    rows={3}
                    maxLength={255}
                    value={form.public_teaser}
                    onChange={(e) => patch({ public_teaser: e.target.value })}
                    placeholder="Unlock this content to view it."
                    className={TEXTAREA_CLASS}
                />
                <p className={HINT_CLASS}>Shown to everyone before they pay</p>
                <FieldError message={errorFor('public_teaser')} />
            </div>

            {/* Hidden message */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="locked_message" className={LABEL_CLASS}>
                    Hidden message
                </label>
                <textarea
                    id="locked_message"
                    rows={5}
                    maxLength={20000}
                    value={form.hidden_message}
                    onChange={(e) => patch({ hidden_message: e.target.value })}
                    placeholder="Type your hidden message here…"
                    className={TEXTAREA_CLASS}
                />
                <p className={HINT_CLASS}>Only visible after payment</p>
                <FieldError message={errorFor('hidden_message')} />
            </div>

            {/* Hidden images */}
            <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS}>Hidden images</label>
                <div className="grid grid-cols-4 gap-2">
                    {images.map((image, index) => (
                        <ThumbTile
                            key={image.id}
                            src={hiddenImageUrl(image.id)}
                            alt={`hidden image ${index + 1}`}
                            onRemove={() => removeImage(image.id)}
                            busy={imageBusy}
                        />
                    ))}
                    {images.length < MAX_IMAGES && (
                        <PickButton accept="image/*" multiple onPick={uploadImages} disabled={imageBusy} className={UPLOAD_TILE_CLASS}>
                            {imageBusy ? <Loader2 className="size-4 animate-spin" /> : '+ Upload'}
                        </PickButton>
                    )}
                </div>
                <p className={HINT_CLASS}>1280 × 720 recommended · up to 10 MB each</p>
                <FieldError message={imageError} />
            </div>

            {/* Hidden video link */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="locked_video" className={LABEL_CLASS}>
                    Hidden video link
                </label>
                <input
                    id="locked_video"
                    type="url"
                    value={form.hidden_video_url}
                    onChange={(e) => patch({ hidden_video_url: e.target.value })}
                    placeholder="https://youtu.be/…"
                    className={INPUT_CLASS}
                />
                <FieldError message={errorFor('hidden_video_url')} />
            </div>

            {/* Hidden files */}
            <div className="flex flex-col gap-2">
                <label className={LABEL_CLASS}>Hidden files</label>
                {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 rounded-lg border border-[#E4E2DA] bg-[#F8F7F4] px-3 py-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                            <FileText className="size-4" />
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#14141B]">
                            {file.original_name || file.file_path.split('/').pop()}
                        </p>
                        <RemoveButton
                            label={`Remove ${file.original_name ?? 'file'}`}
                            onClick={() => removeFile(file.id)}
                            busy={removingFileId === file.id}
                        />
                    </div>
                ))}
                {files.length < MAX_FILES && (
                    <PickButton multiple onPick={uploadFiles} disabled={fileBusy} className={cn(ADD_BUTTON_CLASS, 'inline-flex items-center gap-2')}>
                        {fileBusy ? (
                            <>
                                <Loader2 className="size-4 animate-spin" /> Uploading…
                            </>
                        ) : (
                            '+ Upload file'
                        )}
                    </PickButton>
                )}
                <p className={HINT_CLASS}>PDFs, zips, templates — anything</p>
                <FieldError message={fileError} />
            </div>

            {/* Unlock price */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="locked_price" className={LABEL_CLASS}>
                    Unlock price (₹) <span className="text-[#D93838]">*</span>
                </label>
                <input
                    id="locked_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => patch({ price: Number(e.target.value) || 0 })}
                    className={INPUT_CLASS}
                />
                <FieldError message={errorFor('price')} />
            </div>

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
                    <label htmlFor="locked_discounted_price" className={LABEL_CLASS}>
                        Discounted price (₹)
                    </label>
                    <input
                        id="locked_discounted_price"
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

            <CouponsField productId={item.id} initial={item.coupons ?? []} />

            <SlugField prefix="/l/" value={form.slug} onChange={(slug) => patch({ slug })} placeholder="your-content" error={errorFor('slug')} />
        </EditorShell>
    );
}
