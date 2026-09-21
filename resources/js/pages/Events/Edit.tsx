import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import type { RequestPayload } from '@inertiajs/core';
import { Head, router } from '@inertiajs/react';
import { assetUrl, firstError } from '@/components/course-editor/api';
import {
    ArrowRight,
    Check,
    ExternalLink,
    Eye,
    Info,
    Loader2,
    Lock,
    MapPin,
    Monitor,
    Rocket,
    Save,
    Smartphone,
    Sparkles,
    UploadCloud,
    Video,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type EventMode = 'online' | 'in_person';
type PricingType = 'fixed' | 'customer_decides' | 'free';
type Status = 'draft' | 'unpublished' | 'published';

interface CoverImage {
    id: number;
    image_path: string;
    sort_order?: number;
}

interface EventDetail {
    product_id: number;
    mode: EventMode | null;
    starts_at: string | null;
    ends_at: string | null;
    join_link: string | null;
    venue_address: string | null;
}

interface EventItem {
    id: number;
    uuid: string;
    creator_id: number;
    type: 'event';
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
    status: Status;
    published_at: string | null;
    created_at: string;
    event_detail: EventDetail | null;
    cover_images?: CoverImage[];
    coupons?: Coupon[];
}

interface Coupon {
    id: number;
    code: string;
    discount_percent: string | number;
    usage_limit: number | null;
    is_active: boolean;
}

interface EventsEditProps {
    item: EventItem;
    publicUrl: string;
}

const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-[#FFF4DB] text-[#B46E00]' },
    published: { label: 'Published', cls: 'bg-[#E6F6EC] text-[#059669]' },
    unpublished: { label: 'Unpublished', cls: 'bg-[#F0EFEA] text-[#6B6B78]' },
};

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDateShort(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * `<input type="datetime-local">` ke liye local-time string (YYYY-MM-DDTHH:mm).
 * ISO ko local mein convert karta hai taaki user ko wo waqt dikhe jo usne set kiya.
 */
function isoToLocalInput(iso: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `<input type="datetime-local">` se nikla string → ISO (timezone-safe). */
function localInputToIso(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

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
/*  UPLOAD THUMBNAIL                                                    */
/* ------------------------------------------------------------------ */

function UploadTile({
    label,
    hint,
    onPick,
    multiple,
}: {
    label: string;
    hint?: string;
    onPick: (files: File[]) => void;
    multiple?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'group flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-[13px] font-medium transition',
                    'border-[#E4E2DA] bg-white text-[#8A8A96] hover:border-[#4F46E5] hover:bg-[#F6F5F2] hover:text-[#4F46E5]',
                )}
            >
                <span className="flex size-9 items-center justify-center rounded-lg bg-[#F6F5F2] text-[#8A8A96] transition group-hover:bg-white group-hover:text-[#4F46E5]">
                    <UploadCloud className="size-4" />
                </span>
                {label}
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple={multiple}
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) onPick(files);
                    e.target.value = '';
                }}
            />
            {hint && <p className="mt-1.5 text-[11px] text-[#8A8A96]">{hint}</p>}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PREVIEW PANE                                                       */
/* ------------------------------------------------------------------ */

function PreviewPane({ item, publicUrl, device }: { item: EventItem; publicUrl: string; device: 'desktop' | 'mobile' }) {
    const title = item.title?.trim() || 'Your event title here';
    const description =
        item.description?.trim() ||
        'Describe your event — purpose, key activities, notable speakers. Make it engaging.';
    const starts = formatDateTime(item.event_detail?.starts_at ?? null);
    const ends = formatDateTime(item.event_detail?.ends_at ?? null);
    const when = starts ? (ends ? `${starts} → ${ends}` : starts) : 'TBA';
    const where = item.event_detail?.mode === 'in_person'
        ? item.event_detail?.venue_address?.trim() || 'Venue TBA'
        : 'Online';
    const price = item.pricing_type === 'free'
        ? 'Free'
        : formatCurrency(Number(item.discounted_price && item.has_discount ? item.discounted_price : item.price));
    const covers = item.cover_images ?? [];
    const isMobile = device === 'mobile';
    const [activeCover, setActiveCover] = useState(0);
    const coverTrack = useRef<HTMLDivElement>(null);

    function showCover(index: number) {
        setActiveCover(index);
        coverTrack.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    return (
        <div
            className={cn(
                'relative mx-auto flex h-[min(720px,calc(100vh-150px))] w-full items-start justify-center transition-all duration-300',
                isMobile ? 'max-w-[380px]' : 'max-w-[860px]',
            )}
        >
            {/* mock browser frame */}
            <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/40">
                {/* traffic lights + url */}
                <div className="flex items-center gap-2 border-b border-[#E4E2DA] bg-[#F6F5F2] px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <span className="size-3 rounded-full bg-[#FF5F57]" />
                        <span className="size-3 rounded-full bg-[#FEBC2E]" />
                        <span className="size-3 rounded-full bg-[#28C840]" />
                    </span>
                    <div className="mx-auto flex max-w-[420px] flex-1 items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] text-[#8A8A96]">
                        <Lock className="size-3" />
                        <span className="truncate">{publicUrl}</span>
                    </div>
                    <span className="size-6" />
                </div>

                {/* blue accent strip — matches the screenshot */}
                <div className="h-1 w-full bg-[#2E6EF7]" />

                {/* page content */}
                <div className={cn('min-h-0 flex-1 overflow-y-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', isMobile ? 'px-8 py-8' : 'px-12 py-10')}>
                    {/* cover image gallery */}
                    {covers.length > 0 && (
                        <div className="relative mx-auto mb-7 aspect-video overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#F6F5F2]">
                            <div ref={coverTrack} onScroll={(event) => setActiveCover(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))} className="flex aspect-video snap-x snap-mandatory overflow-x-auto bg-[#F6F5F2] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {covers.map((cover) => <img key={cover.id} src={assetUrl(cover.image_path)} alt="" className="size-full shrink-0 snap-center object-cover" />)}
                            </div>
                            {covers.length > 1 && <div className="absolute right-0 bottom-3 left-0 z-10 flex items-center justify-center gap-1.5">{covers.map((cover, index) => <button key={cover.id} type="button" aria-label={`Show image ${index + 1}`} aria-pressed={activeCover === index} onClick={() => showCover(index)} className={cn('size-2 rounded-full border border-white/80 shadow-sm transition', activeCover === index ? 'bg-white' : 'bg-white/45 hover:bg-white/75')} />)}</div>}
                        </div>
                    )}

                    <h1
                        className={cn(
                            'font-extrabold tracking-tight text-[#14141B]',
                            isMobile ? 'text-left text-[34px] leading-[1.08]' : 'text-center text-[40px] leading-[1.1]',
                        )}
                    >
                        {title}
                    </h1>

                    <div
                        className={cn(
                            'mx-auto mt-7 grid gap-3',
                            isMobile ? 'mt-5 grid-cols-3' : 'max-w-[720px] grid-cols-3',
                        )}
                    >
                        <PreviewPill label="WHEN" value={when} />
                        <PreviewPill label="WHERE" value={where} />
                        <PreviewPill label="PRICE" value={price} />
                    </div>

                    <div className="mx-auto mt-8 max-w-[640px]">
                        <p className="text-[11px] font-bold tracking-widest text-[#4F46E5] uppercase">About the event</p>
                        <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-[#14141B]">{description}</p>

                        <button
                            type="button"
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2E6EF7] py-4 text-[15px] font-semibold text-white shadow-md transition hover:bg-[#1F58DD]"
                        >
                            {item.button_text?.trim() || 'Register now'}
                            <ArrowRight className="size-4" />
                        </button>

                        <p className="mt-8 text-center text-[11px] text-[#8A8A96]">
                            Built with{' '}
                            <span className="font-semibold text-[#4F46E5]">SuperCreators</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PreviewPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-[#F6F5F2] px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-[#8A8A96] uppercase">{label}</p>
            <p className="mt-1 truncate text-[14px] font-semibold text-[#14141B]">{value}</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function EventsEdit({ item, publicUrl }: EventsEditProps) {
    const initial = useMemo(
        () => ({
            title: item.title ?? '',
            description: item.description ?? '',
            cover_video_url: item.cover_video_url ?? '',
            mode: (item.event_detail?.mode ?? 'online') as EventMode,
            starts_at: item.event_detail?.starts_at ?? null,
            ends_at: item.event_detail?.ends_at ?? null,
            join_link: item.event_detail?.join_link ?? '',
            venue_address: item.event_detail?.venue_address ?? '',
            pricing_type: item.pricing_type,
            price: Number(item.price ?? 0),
            has_discount: item.has_discount ?? false,
            discounted_price: item.discounted_price === null ? '' : Number(item.discounted_price),
            button_text: item.button_text ?? 'Register now',
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

    const { status: saveStatus, errors: saveErrors, queue: queueSave, flush: flushSave } = useAutoSave(`/dashboard/events/${item.uuid}`);

    useEffect(() => setCoverImages(item.cover_images ?? []), [item.cover_images]);

    async function uploadCovers(files: File[]) {
        const remaining = 8 - coverImages.length;
        if (files.length > remaining) return setCoverError(`You can upload up to 8 cover images (${remaining} remaining).`);
        if (files.some((file) => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) return setCoverError('Each cover image must be an image up to 5 MB.');

        setCoverBusy(true);
        setCoverError(null);
        router.post(`/dashboard/products/${item.id}/cover-images`, { images: files }, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => router.reload({ only: ['item'] }),
            onError: (errors) => setCoverError(firstError(errors as Record<string, string>, 'Upload failed. Please try again.')),
            onFinish: () => setCoverBusy(false),
        });
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
            slug: f.slug,
            mode: f.mode,
            starts_at: f.starts_at,
            ends_at: f.ends_at || null,
            join_link: f.mode === 'online' ? f.join_link || null : null,
            venue_address: f.mode === 'in_person' ? f.venue_address || null : null,
        };
    }

    // ----- publish / unpublish -------------------------------------

    function publish() {
        // ensure latest form is saved before validating
        flushSave();
        setPublishError(null);
        setPublishing(true);
        router.post(
            `/dashboard/events/${item.uuid}/publish`,
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
                        onSuccess: (page) => setCoupons(((page.props as unknown as { item: EventItem }).item.coupons ?? [])),
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

    const previewItem: EventItem = useMemo(
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
            event_detail: {
                product_id: item.id,
                mode: form.mode,
                starts_at: form.starts_at,
                ends_at: form.ends_at || null,
                join_link: form.mode === 'online' ? form.join_link || null : null,
                venue_address: form.mode === 'in_person' ? form.venue_address || null : null,
            },
        }),
        [item, form, coverImages],
    );
    const previewPublicUrl = `${publicUrl.slice(0, publicUrl.lastIndexOf('/') + 1)}${form.slug || 'your-event'}`;

    // ----- helpers -------------------------------------------------

    const titleCount = form.title.length;
    const titleOk = titleCount > 0 && titleCount <= 75;
    const descCount = form.description?.length ?? 0;
    const startLabel = formatDateShort(form.starts_at);
    const timeLabel = formatTime(form.starts_at);
    const endLabel = formatDateShort(form.ends_at);
    const statusMeta = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft;

    return (
        <div className="h-screen overflow-hidden bg-white">
            <Head title={`${item.title || 'Untitled event'} · Edit event`} />

            {/* full-bleed split — left is the form, right is the dark preview */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
                {/* LEFT — editor */}
                <section className="flex min-h-0 w-full flex-col overflow-hidden border-r border-[#E4E2DA] bg-white lg:w-[520px] lg:shrink-0">
                    {/* top bar */}
                    <div className="flex items-center justify-between border-b border-[#E4E2DA] px-4 py-3 md:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.visit('/dashboard/events')}
                                aria-label="Back to events"
                                className="rounded-lg p-1 text-[#8A8A96] transition hover:bg-[#F6F5F2] hover:text-[#14141B]"
                            >
                                <X className="size-5" />
                            </button>
                            <h2 className="truncate text-[13px] font-semibold tracking-wider text-[#14141B] uppercase">
                                {item.title || 'Your event title here'}
                            </h2>
                        </div>
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                statusMeta.cls,
                            )}
                        >
                            {statusMeta.label}
                        </span>
                    </div>

                    {/* scrollable form body */}
                    <div className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6 md:py-6">
                        <div className="mx-auto flex max-w-[440px] flex-col gap-5">
                            <h1 className="text-xl font-bold tracking-tight text-[#14141B]">Tell us about your event</h1>

                            {/* Event title */}
                            <div className="order-1 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="event_title" className={LABEL_CLASS}>
                                        Event title <span className="text-[#D93838]">*</span>
                                    </label>
                                    <span className={cn('text-[11px]', titleOk ? 'text-[#8A8A96]' : 'text-[#D93838]')}>
                                        {titleCount}/75
                                    </span>
                                </div>
                                <input
                                    id="event_title"
                                    maxLength={75}
                                    value={form.title}
                                    onChange={(e) => patch({ title: e.target.value })}
                                    placeholder="Your event title here"
                                    className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                />
                            </div>

                            {/* Ticket settings */}
                            <div className="order-8 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'fixed' as const, label: 'Paid' },
                                        { value: 'free' as const, label: 'Free' },
                                    ].map((option) => {
                                        const active = form.pricing_type === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => patch({ pricing_type: option.value })}
                                                className={cn(
                                                    'flex h-12 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition',
                                                    active
                                                        ? 'border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5]'
                                                        : 'border-[#E4E2DA] bg-white text-[#14141B] hover:border-[#4F46E5]/45',
                                                )}
                                            >
                                                {option.label}
                                                <span className={cn('flex size-4 items-center justify-center rounded-full border', active ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#D9D7CE]')}>
                                                    {active && <Check className="size-2.5" />}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event_price" className={LABEL_CLASS}>Ticket price <span className="text-[#D93838]">*</span></label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-[#8A8A96]">₹</span>
                                        <input
                                            id="event_price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            disabled={form.pricing_type === 'free'}
                                            value={form.pricing_type === 'free' ? 0 : form.price}
                                            onChange={(e) => patch({ price: Number(e.target.value) || 0 })}
                                            className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white py-0 pr-3 pl-7 text-sm text-[#14141B] shadow-sm outline-none transition disabled:cursor-not-allowed disabled:bg-[#F6F5F2] disabled:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="order-13 flex flex-col gap-1.5">
                                <label htmlFor="event_button_text" className={LABEL_CLASS}>Registration button text</label>
                                <input
                                    id="event_button_text"
                                    maxLength={30}
                                    value={form.button_text}
                                    onChange={(e) => patch({ button_text: e.target.value })}
                                    placeholder="Register now"
                                    className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                />
                            </div>

                            <label className="order-9 flex cursor-pointer items-center gap-2.5 text-[12px] font-semibold text-[#14141B]">
                                <input
                                    type="checkbox"
                                    checked={form.has_discount}
                                    onChange={(e) => patch({ has_discount: e.target.checked })}
                                    className="size-3.5 rounded border-[#D9D7CE] text-[#4F46E5] focus:ring-[#4F46E5]"
                                />
                                Offer discounted price
                            </label>

                            {form.has_discount && (
                                <div className="order-10 flex flex-col gap-1.5">
                                    <label htmlFor="event_discounted_price" className={LABEL_CLASS}>Discounted ticket price</label>
                                    <div className="relative">
                                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-[#8A8A96]">₹</span>
                                        <input
                                            id="event_discounted_price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            max={form.price || undefined}
                                            value={form.discounted_price}
                                            onChange={(e) => patch({ discounted_price: e.target.value === '' ? '' : Number(e.target.value) })}
                                            placeholder="0"
                                            className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white py-0 pr-3 pl-7 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="order-11 flex flex-col gap-2">
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
                                        className="h-10 min-w-0 flex-1 rounded-lg border border-[#E4E2DA] bg-white px-3 text-xs font-semibold text-[#14141B] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                    />
                                    <div className="relative w-24">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={couponPercent}
                                            onChange={(e) => setCouponPercent(e.target.value)}
                                            className="h-10 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 pr-7 text-xs text-[#14141B] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                        />
                                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-[#8A8A96]">%</span>
                                    </div>
                                    <button type="button" onClick={addCoupon} disabled={addingCoupon || !couponCode.trim()} className="h-10 rounded-lg bg-[#14141B] px-3 text-xs font-semibold text-white transition hover:bg-[#2B2B34] disabled:cursor-not-allowed disabled:opacity-40">
                                        {addingCoupon ? '…' : '+ Add'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-[#8A8A96]">Buyers enter this code at checkout for a discount.</p>
                            </div>

                            <div className="order-14 flex flex-col gap-1.5">
                                <label htmlFor="event_slug" className={LABEL_CLASS}>Page URL <span className="text-[#D93838]">*</span></label>
                                <div className="flex h-11 items-center rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm shadow-sm focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                                    <span className="mr-1 text-[#8A8A96]">/e/</span>
                                    <input
                                        id="event_slug"
                                        value={form.slug}
                                        maxLength={150}
                                        onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        placeholder="your-event"
                                        className="min-w-0 flex-1 bg-transparent text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]"
                                    />
                                </div>
                                <p className="text-[10px] text-[#8A8A96]">Required before publishing.</p>
                                {saveErrors.slug && <p className="text-[11px] font-medium text-[#D93838]">{saveErrors.slug}</p>}
                            </div>

                            {/* Cover images */}
                            <div className="order-2 flex flex-col gap-1.5">
                                <label className={LABEL_CLASS}>Cover images</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {coverImages.map((image, index) => (
                                        <div key={image.id} className="group relative aspect-video overflow-hidden rounded-lg bg-[#F6F5F2]">
                                            <img src={assetUrl(image.image_path)} alt={`Cover ${index + 1}`} className="size-full object-cover" />
                                            <button type="button" onClick={() => removeCover(image.id)} disabled={coverBusy} aria-label={`Remove cover image ${index + 1}`} className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-[#D93838] shadow hover:bg-white disabled:opacity-50">
                                                <X className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {coverImages.length < 8 && (
                                    <UploadTile
                                        label={coverBusy ? 'Uploading…' : '+ Upload images'}
                                        hint="Up to 8 images · 5 MB each · 1280 × 720 recommended"
                                        onPick={uploadCovers}
                                        multiple
                                    />
                                )}
                                {coverError && <p className="text-[11px] font-medium text-[#D93838]">{coverError}</p>}
                            </div>

                            {/* Video link */}
                            <div className="order-3 flex flex-col gap-1.5">
                                <label htmlFor="event_video" className={LABEL_CLASS}>
                                    Or a video link
                                </label>
                                <input
                                    id="event_video"
                                    type="url"
                                    value={form.cover_video_url}
                                    onChange={(e) => patch({ cover_video_url: e.target.value })}
                                    placeholder="https://youtu.be/…"
                                    className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                />
                            </div>

                            {/* Description */}
                            <div className="order-4 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="event_desc" className={LABEL_CLASS}>
                                        Description <span className="text-[#D93838]">*</span>
                                    </label>
                                    <span className="text-[11px] text-[#8A8A96]">{descCount}/20000</span>
                                </div>
                                <textarea
                                    id="event_desc"
                                    rows={5}
                                    value={form.description}
                                    onChange={(e) => patch({ description: e.target.value })}
                                    placeholder="Describe your event — purpose, key activities, notable speakers. Make it engaging."
                                    className="w-full rounded-lg border border-[#E4E2DA] bg-white px-3 py-2.5 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                />
                            </div>

                            {/* Date / time */}
                            <div className="order-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event_start" className={LABEL_CLASS}>
                                        Starts at <span className="text-[#D93838]">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="event_start"
                                            type="datetime-local"
                                            value={isoToLocalInput(form.starts_at)}
                                            onChange={(e) => patch({ starts_at: localInputToIso(e.target.value) })}
                                            className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                        />
                                    </div>
                                    {startLabel && (
                                        <span className="text-[11px] text-[#8A8A96]">
                                            {startLabel}
                                            {timeLabel && ` · ${timeLabel}`}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="event_end" className={LABEL_CLASS}>
                                        Ends at
                                    </label>
                                    <input
                                        id="event_end"
                                        type="datetime-local"
                                        value={isoToLocalInput(form.ends_at)}
                                        onChange={(e) => patch({ ends_at: localInputToIso(e.target.value) })}
                                        className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                    />
                                    {endLabel && <span className="text-[11px] text-[#8A8A96]">{endLabel}</span>}
                                </div>
                            </div>

                            {/* Mode toggle (Online / In person) */}
                            <div className="order-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <ModeCard
                                    active={form.mode === 'online'}
                                    icon={<Video className="size-5" />}
                                    label="Online"
                                    hint="Join link shared after registration"
                                    onClick={() => patch({ mode: 'online' })}
                                />
                                <ModeCard
                                    active={form.mode === 'in_person'}
                                    icon={<MapPin className="size-5" />}
                                    label="In person"
                                    hint="Venue shown on the page"
                                    onClick={() => patch({ mode: 'in_person' })}
                                />
                            </div>

                            {/* Mode-specific field */}
                            {form.mode === 'online' ? (
                                <div className="order-7 flex flex-col gap-1.5">
                                    <label htmlFor="event_join" className={LABEL_CLASS}>
                                        Join link <span className="font-normal text-[#8A8A96] normal-case">(shared with attendees)</span>
                                    </label>
                                    <input
                                        id="event_join"
                                        type="url"
                                        value={form.join_link}
                                        onChange={(e) => patch({ join_link: e.target.value })}
                                        placeholder="https://zoom.us/j/…"
                                        className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                    />
                                    <p className="text-[11px] text-[#8A8A96]">
                                        Leave blank to share it from the registration panel after each ticket is paid.
                                    </p>
                                </div>
                            ) : (
                                <div className="order-7 flex flex-col gap-1.5">
                                    <label htmlFor="event_venue" className={LABEL_CLASS}>
                                        Venue address
                                    </label>
                                    <input
                                        id="event_venue"
                                        value={form.venue_address}
                                        onChange={(e) => patch({ venue_address: e.target.value })}
                                        placeholder="91 Springboard, HSR Layout, Bengaluru"
                                        className="h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                                    />
                                    <p className="text-[11px] text-[#8A8A96]">
                                        Buyers see this on the page once they register.
                                    </p>
                                </div>
                            )}

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
                            <Button
                                variant="outline"
                                onClick={saveDraft}
                                disabled={saveStatus === 'saving'}
                                className="border-[#E4E2DA] text-[#4B4B57] hover:bg-[#F6F5F2]"
                            >
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
                    <div className="flex flex-1 items-start justify-center overflow-hidden p-4 md:p-6 xl:p-8">
                        <PreviewPane item={previewItem} publicUrl={previewPublicUrl} device={device} />
                    </div>

                    {/* helper tip */}
                    <div className="border-t border-white/5 px-4 py-2.5 md:px-6">
                        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                            <Sparkles className="size-3 text-[#FF6B4A]" />
                            Tip — the join link is hidden until a buyer registers.
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

function ModeCard({
    active,
    icon,
    label,
    hint,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    hint: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'group relative flex min-h-[76px] items-start rounded-lg border p-3 text-left transition',
                active
                    ? 'border-[#4F46E5] bg-[#EEF2FF]'
                    : 'border-[#E4E2DA] bg-white hover:border-[#4F46E5]/40 hover:bg-[#F6F5F2]',
            )}
        >
            <span
                className={cn(
                    'hidden',
                    active ? 'bg-[#4F46E5] text-white' : 'bg-[#F6F5F2] text-[#8A8A96] group-hover:text-[#4F46E5]',
                )}
            >
                {icon}
            </span>
            <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold text-[#14141B]">{label}</span>
                <span className={cn('mt-1 text-[10px] leading-snug', active ? 'text-[#4F46E5]/80' : 'text-[#8A8A96]')}>{hint}</span>
            </span>
            <span
                className={cn(
                    'absolute top-3 right-3 flex size-4 items-center justify-center rounded-full border transition',
                    active ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[#E4E2DA] bg-white',
                )}
            >
                {active && <Check className="size-2.5" />}
            </span>
        </button>
    );
}

function DeviceToggle({ device, onChange }: { device: 'desktop' | 'mobile'; onChange: (d: 'desktop' | 'mobile') => void }) {
    return (
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
                type="button"
                onClick={() => onChange('desktop')}
                aria-pressed={device === 'desktop'}
                className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                    device === 'desktop' ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white',
                )}
            >
                <Monitor className="size-3.5" /> Desktop
            </button>
            <button
                type="button"
                onClick={() => onChange('mobile')}
                aria-pressed={device === 'mobile'}
                className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                    device === 'mobile' ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white',
                )}
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
