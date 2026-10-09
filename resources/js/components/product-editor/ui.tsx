import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';
import { Check, Eye, Info, Loader2, Monitor, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SaveStatus } from './use-auto-save';

/* Book / Locked content editors ke shared form pieces — dono ka design ek jaisa rahe isliye yahin se aate hain. */

export const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-cp-ink uppercase';
export const HINT_CLASS = 'text-[11px] text-cp-muted';
export const INPUT_CLASS =
    'h-11 w-full rounded-lg border border-cp-line bg-cp-surface px-3 text-sm text-cp-ink shadow-sm outline-none transition placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15 disabled:cursor-not-allowed disabled:bg-cp-canvas disabled:text-cp-muted';
export const TEXTAREA_CLASS =
    'w-full resize-y rounded-lg border border-cp-line bg-cp-surface px-3 py-2.5 text-sm text-cp-ink shadow-sm outline-none transition placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';
export const ADD_BUTTON_CLASS =
    'h-11 w-fit rounded-lg border border-cp-line bg-cp-surface px-4 text-[13px] font-semibold text-cp-ink shadow-sm transition hover:bg-cp-canvas';
export const UPLOAD_TILE_CLASS =
    'flex aspect-square items-center justify-center rounded-lg border border-dashed border-cp-line bg-cp-surface text-[12px] font-medium text-cp-body transition hover:border-cp-brand hover:text-cp-brand-ink';

export type Device = 'desktop' | 'mobile';

export interface Coupon {
    id: number;
    uuid: string;
    code: string;
    discount_percent: string | number;
    usage_limit: number | null;
    is_active: boolean;
}

/** Kisi bhi button ko file picker bana deta hai (hidden input + click). */
export function PickButton({
    onPick,
    accept,
    multiple,
    disabled,
    className,
    children,
}: {
    onPick: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className={cn(className, 'disabled:cursor-wait disabled:opacity-60')}
            >
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

export function RemoveButton({ label, onClick, busy }: { label: string; onClick: () => void; busy?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            aria-label={label}
            className="shrink-0 rounded-lg p-1.5 text-cp-red-ink transition hover:bg-cp-coral-soft disabled:opacity-50"
        >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        </button>
    );
}

export function FieldError({ message }: { message?: string | null }) {
    return message ? <p className="text-[11px] font-medium text-cp-red-ink">{message}</p> : null;
}

/** Image thumbnail + corner remove button (cover images / hidden images). */
export function ThumbTile({ src, alt, onRemove, busy }: { src: string; alt: string; onRemove: () => void; busy?: boolean }) {
    return (
        <div className="group relative aspect-square overflow-hidden rounded-lg bg-cp-canvas">
            <img src={src} alt={alt} className="size-full object-cover" />
            <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                aria-label={`Remove ${alt}`}
                className="absolute top-1 right-1 rounded-full bg-cp-surface/90 p-1 text-cp-red-ink shadow hover:bg-cp-surface disabled:opacity-50"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}

/** Coupon list + add row. Coupon endpoints product ke uuid pe chalte hain (tenant-scoped XHR). */
export function CouponsField({ productUuid, initial }: { productUuid: string; initial: Coupon[] }) {
    const [coupons, setCoupons] = useState<Coupon[]>(initial);
    const [code, setCode] = useState('');
    const [percent, setPercent] = useState('10');
    const [adding, setAdding] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    function add() {
        const clean = code.trim().toUpperCase();
        const discount = Number(percent);
        if (!clean || discount < 1 || discount > 100 || adding) return;
        setAdding(true);
        router.post(
            `/dashboard/products/${productUuid}/coupons`,
            { code: clean, discount_percent: discount, is_active: true },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setCode('');
                    router.reload({
                        only: ['item'],
                        onSuccess: (page) => setCoupons((page.props as unknown as { item: { coupons?: Coupon[] } }).item.coupons ?? []),
                    });
                },
                onFinish: () => setAdding(false),
            },
        );
    }

    function remove(coupon: Coupon) {
        const id = coupon.id;
        if (removingId !== null) return;
        setRemovingId(id);
        router.delete(`/dashboard/coupons/${coupon.uuid}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setCoupons((current) => current.filter((c) => c.id !== id)),
            onFinish: () => setRemovingId(null),
        });
    }

    return (
        <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS}>Discount coupons</label>
            {coupons.map((coupon) => (
                <div key={coupon.id} className="flex items-center gap-2 rounded-lg border border-cp-line bg-cp-surface-2 px-3 py-2 text-[11px]">
                    <span className="font-bold text-cp-brand-ink">{coupon.code}</span>
                    <span className="font-semibold text-cp-ink">{coupon.discount_percent}% off</span>
                    <span className={cn('ml-auto', coupon.is_active ? 'text-cp-success-ink' : 'text-cp-muted')}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                        type="button"
                        onClick={() => remove(coupon)}
                        disabled={removingId === coupon.id}
                        aria-label={`Remove ${coupon.code} coupon`}
                        className="rounded p-0.5 text-cp-red-ink transition hover:bg-cp-coral-soft disabled:opacity-40"
                    >
                        {removingId === coupon.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                    </button>
                </div>
            ))}
            <div className="flex gap-2">
                <input
                    value={code}
                    maxLength={30}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="CODE"
                    className={cn(INPUT_CLASS, 'min-w-0 flex-1')}
                />
                <div className="relative w-28 shrink-0">
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={percent}
                        onChange={(e) => setPercent(e.target.value)}
                        className={cn(INPUT_CLASS, 'pr-7')}
                    />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-cp-muted">%</span>
                </div>
                <button
                    type="button"
                    onClick={add}
                    disabled={adding || !code.trim()}
                    className={cn(ADD_BUTTON_CLASS, 'shrink-0 disabled:cursor-not-allowed disabled:opacity-40')}
                >
                    {adding ? '…' : '+ Add'}
                </button>
            </div>
            <p className={HINT_CLASS}>Buyers enter these at checkout for a % off</p>
        </div>
    );
}

export interface Addon {
    uuid: string;
    /** creator ka offer price; null = product ka apna daam */
    price: number | null;
    effective_price: number;
    product: { uuid: string; title: string; type: string; status: string; unit_price: number } | null;
}

export interface AddonOption {
    uuid: string;
    title: string;
    type: string;
    unit_price: number;
}

const ADDON_TYPE_LABEL: Record<string, string> = { book: 'E-book', course: 'Course', locked_content: 'Locked content', event: 'Event' };
const MAX_ADDONS = 5;

const rupees = (value: number) =>
    value > 0 ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value) : 'Free';

async function addonRequest(method: 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? ''),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    const first = data?.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : null;

    return { ok: res.ok, data, error: res.ok ? null : (first ?? data?.message ?? 'Something went wrong. Please try again.') };
}

/**
 * "Add to your order" — is product ke saath checkout pe bikne wale creator ke doosre products.
 * Jude hue add-ons aur chunne layak products dono editor ke page props (`addons`, `addonOptions`) se aate hain
 * (BaseProductController::edit), isliye har editor me bas <AddonsField productUuid=… /> lagana kaafi hai.
 * Niyam (published, allowed type, max 5, offer price ≤ normal) server pe lagte hain.
 */
export function AddonsField({ productUuid }: { productUuid: string }) {
    const props = usePage<{ addons?: Addon[]; addonOptions?: AddonOption[] }>().props;
    const options = props.addonOptions ?? [];
    const [addons, setAddons] = useState<Addon[]>(props.addons ?? []);
    const [choice, setChoice] = useState('');
    const [offer, setOffer] = useState('');
    const [busy, setBusy] = useState<string | null>(null); // 'add' ya addon uuid
    const [error, setError] = useState<string | null>(null);

    useEffect(() => setAddons(props.addons ?? []), [props.addons]);

    const used = new Set(addons.map((a) => a.product?.uuid));
    const available = options.filter((o) => !used.has(o.uuid));
    const chosen = available.find((o) => o.uuid === choice);
    const full = addons.length >= MAX_ADDONS;

    async function add() {
        if (!chosen || busy) return;
        setBusy('add');
        setError(null);
        const res = await addonRequest('POST', `/dashboard/products/${productUuid}/addons`, { addon_product_uuid: chosen.uuid, price: offer.trim() === '' ? null : Number(offer) });
        setBusy(null);

        if (!res.ok) return setError(res.error);

        setAddons((list) => [...list, res.data.addon as Addon]);
        setChoice('');
        setOffer('');
    }

    async function savePrice(addon: Addon, value: string) {
        const price = value.trim() === '' ? null : Number(value);
        if (price === addon.price || busy) return;
        setBusy(addon.uuid);
        setError(null);
        const res = await addonRequest('PUT', `/dashboard/product-addons/${addon.uuid}`, { price });
        setBusy(null);

        if (!res.ok) return setError(res.error);

        setAddons((list) => list.map((a) => (a.uuid === addon.uuid ? (res.data.addon as Addon) : a)));
    }

    async function remove(addon: Addon) {
        if (busy) return;
        setBusy(addon.uuid);
        setError(null);
        const res = await addonRequest('DELETE', `/dashboard/product-addons/${addon.uuid}`);
        setBusy(null);

        if (!res.ok) return setError(res.error);

        setAddons((list) => list.filter((a) => a.uuid !== addon.uuid));
    }

    return (
        <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS}>Add-ons</label>

            {addons.map((addon) => {
                const product = addon.product;
                const hidden = product?.status !== 'published';
                const discounted = product && addon.price !== null && addon.price < product.unit_price;

                return (
                    <div key={addon.uuid} className="flex flex-col gap-2 rounded-lg border border-cp-line bg-cp-surface-2 p-3">
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-cp-ink">{product?.title ?? 'Deleted product'}</p>
                                <p className="text-[11px] text-cp-muted">
                                    {ADDON_TYPE_LABEL[product?.type ?? ''] ?? 'Product'} ·{' '}
                                    <span className="font-semibold text-cp-ink">{rupees(addon.effective_price)}</span>
                                    {discounted && <span className="ml-1 line-through">{rupees(product.unit_price)}</span>}
                                </p>
                                {hidden && <p className="mt-1 text-[11px] font-semibold text-cp-warning-ink">Not published — hidden at checkout</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => void remove(addon)}
                                disabled={busy === addon.uuid}
                                aria-label={`Remove ${product?.title ?? 'add-on'}`}
                                className="rounded p-1 text-cp-red-ink transition hover:bg-cp-coral-soft disabled:opacity-40"
                            >
                                {busy === addon.uuid ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                            </button>
                        </div>
                        {product && (
                            <label className="flex items-center gap-2 text-[11px] text-cp-subtle">
                                Offer price
                                <span className="relative w-32">
                                    <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-cp-muted">₹</span>
                                    <input
                                        key={`${addon.uuid}-${addon.price ?? 'none'}`}
                                        type="number"
                                        min="0"
                                        max={product.unit_price}
                                        step="0.01"
                                        defaultValue={addon.price ?? ''}
                                        placeholder={String(product.unit_price)}
                                        onBlur={(e) => void savePrice(addon, e.target.value)}
                                        aria-label={`Offer price for ${product.title}`}
                                        className="h-9 w-full rounded-lg border border-cp-line bg-cp-surface pr-2 pl-6 text-sm text-cp-ink outline-none focus:border-cp-brand"
                                    />
                                </span>
                                <span className="text-cp-muted">blank = regular price</span>
                            </label>
                        )}
                    </div>
                );
            })}

            {full ? (
                <p className={HINT_CLASS}>Up to {MAX_ADDONS} add-ons per product.</p>
            ) : available.length === 0 ? (
                <p className={HINT_CLASS}>
                    {options.length === 0
                        ? 'Publish another e-book, course, locked content or event to offer it here.'
                        : 'All your eligible products are already added.'}
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    <select value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Product to add" className={cn(INPUT_CLASS, 'min-w-0 flex-1 basis-48')}>
                        <option value="">Choose a product…</option>
                        {available.map((option) => (
                            <option key={option.uuid} value={option.uuid}>
                                {option.title} — {ADDON_TYPE_LABEL[option.type] ?? option.type} ({rupees(option.unit_price)})
                            </option>
                        ))}
                    </select>
                    <div className="relative w-32 shrink-0">
                        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-cp-muted">₹</span>
                        <input
                            type="number"
                            min="0"
                            max={chosen?.unit_price}
                            step="0.01"
                            value={offer}
                            onChange={(e) => setOffer(e.target.value)}
                            placeholder="Offer price"
                            aria-label="Offer price (optional)"
                            className={cn(INPUT_CLASS, 'pl-7')}
                        />
                    </div>
                    <button type="button" onClick={() => void add()} disabled={!chosen || busy === 'add'} className={cn(ADD_BUTTON_CLASS, 'shrink-0 disabled:cursor-not-allowed disabled:opacity-40')}>
                        {busy === 'add' ? '…' : '+ Add'}
                    </button>
                </div>
            )}

            <FieldError message={error} />
            <p className={HINT_CLASS}>Shown at checkout as "Add to your order". Leave the offer price blank to charge the product's regular price.</p>
        </div>
    );
}

/** Page URL field with a fixed public prefix (/b/, /l/ …). */
export function SlugField({
    prefix,
    value,
    onChange,
    placeholder,
    error,
}: {
    prefix: string;
    value: string;
    onChange: (slug: string) => void;
    placeholder: string;
    error?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor="product_slug" className={LABEL_CLASS}>
                Page URL <span className="text-cp-red-ink">*</span>
            </label>
            <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-cp-line bg-cp-surface text-sm shadow-sm focus-within:border-cp-brand focus-within:ring-2 focus-within:ring-cp-brand/15">
                <span className="flex items-center border-r border-cp-line bg-cp-canvas px-3 text-cp-muted">{prefix}</span>
                <input
                    id="product_slug"
                    value={value}
                    maxLength={150}
                    onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-cp-ink outline-none placeholder:text-cp-muted"
                />
            </div>
            <p className={HINT_CLASS}>Required before publishing</p>
            <FieldError message={error} />
        </div>
    );
}

export function DeviceToggle({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
    return (
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
                type="button"
                onClick={() => onChange('desktop')}
                aria-pressed={device === 'desktop'}
                className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-medium transition lg:py-1',
                    device === 'desktop' ? 'light-island bg-cp-surface text-cp-ink' : 'text-white/60 hover:text-white',
                )}
            >
                <Monitor className="size-3.5" /> Desktop
            </button>
            <button
                type="button"
                onClick={() => onChange('mobile')}
                aria-pressed={device === 'mobile'}
                className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-medium transition lg:py-1',
                    device === 'mobile' ? 'light-island bg-cp-surface text-cp-ink' : 'text-white/60 hover:text-white',
                )}
            >
                <Smartphone className="size-3.5" /> Mobile
            </button>
        </div>
    );
}

export function SaveStatusPill({ status }: { status: SaveStatus }) {
    if (status === 'saving')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-cp-brand-soft px-2 py-0.5 text-[10px] font-semibold text-cp-brand-ink">
                <Loader2 className="size-3 animate-spin" /> Saving
            </span>
        );
    if (status === 'saved')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-cp-success-soft px-2 py-0.5 text-[10px] font-semibold text-cp-success-ink">
                <Check className="size-3" /> Saved
            </span>
        );
    if (status === 'error')
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-cp-coral-soft px-2 py-0.5 text-[10px] font-semibold text-cp-coral-dark-ink">
                <Info className="size-3" /> Save failed
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/0 px-2 py-0.5 text-[10px] font-semibold text-cp-muted">
            <Eye className="size-3" /> Live
        </span>
    );
}
