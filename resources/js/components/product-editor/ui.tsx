import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Check, Eye, Info, Loader2, Monitor, Smartphone, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import type { SaveStatus } from './use-auto-save';

/* Book / Locked content editors ke shared form pieces — dono ka design ek jaisa rahe isliye yahin se aate hain. */

export const LABEL_CLASS = 'text-xs font-semibold tracking-wider text-[#14141B] uppercase';
export const HINT_CLASS = 'text-[11px] text-[#8A8A96]';
export const INPUT_CLASS =
    'h-11 w-full rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 disabled:cursor-not-allowed disabled:bg-[#F6F5F2] disabled:text-[#8A8A96]';
export const TEXTAREA_CLASS =
    'w-full resize-y rounded-lg border border-[#E4E2DA] bg-white px-3 py-2.5 text-sm text-[#14141B] shadow-sm outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';
export const ADD_BUTTON_CLASS =
    'h-11 w-fit rounded-lg border border-[#E4E2DA] bg-white px-4 text-[13px] font-semibold text-[#14141B] shadow-sm transition hover:bg-[#F6F5F2]';
export const UPLOAD_TILE_CLASS =
    'flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#E4E2DA] bg-white text-[12px] font-medium text-[#4B4B57] transition hover:border-[#4F46E5] hover:text-[#4F46E5]';

export type Device = 'desktop' | 'mobile';

export interface Coupon {
    id: number;
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
            className="shrink-0 rounded-lg p-1.5 text-[#D93838] transition hover:bg-[#FFEDE8] disabled:opacity-50"
        >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        </button>
    );
}

export function FieldError({ message }: { message?: string | null }) {
    return message ? <p className="text-[11px] font-medium text-[#D93838]">{message}</p> : null;
}

/** Image thumbnail + corner remove button (cover images / hidden images). */
export function ThumbTile({ src, alt, onRemove, busy }: { src: string; alt: string; onRemove: () => void; busy?: boolean }) {
    return (
        <div className="group relative aspect-square overflow-hidden rounded-lg bg-[#F6F5F2]">
            <img src={src} alt={alt} className="size-full object-cover" />
            <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                aria-label={`Remove ${alt}`}
                className="absolute top-1 right-1 rounded-full bg-white/90 p-1 text-[#D93838] shadow hover:bg-white disabled:opacity-50"
            >
                <X className="size-3.5" />
            </button>
        </div>
    );
}

/** Coupon list + add row. Coupon endpoints product id pe chalte hain (tenant-scoped XHR). */
export function CouponsField({ productId, initial }: { productId: number; initial: Coupon[] }) {
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
            `/dashboard/products/${productId}/coupons`,
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

    function remove(id: number) {
        if (removingId !== null) return;
        setRemovingId(id);
        router.delete(`/dashboard/coupons/${id}`, {
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
                <div key={coupon.id} className="flex items-center gap-2 rounded-lg border border-[#E4E2DA] bg-[#F8F7F4] px-3 py-2 text-[11px]">
                    <span className="font-bold text-[#4F46E5]">{coupon.code}</span>
                    <span className="font-semibold text-[#14141B]">{coupon.discount_percent}% off</span>
                    <span className={cn('ml-auto', coupon.is_active ? 'text-[#059669]' : 'text-[#8A8A96]')}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                        type="button"
                        onClick={() => remove(coupon.id)}
                        disabled={removingId === coupon.id}
                        aria-label={`Remove ${coupon.code} coupon`}
                        className="rounded p-0.5 text-[#D93838] transition hover:bg-[#FFEDE8] disabled:opacity-40"
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
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-[#8A8A96]">%</span>
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
                Page URL <span className="text-[#D93838]">*</span>
            </label>
            <div className="flex h-11 items-stretch overflow-hidden rounded-lg border border-[#E4E2DA] bg-white text-sm shadow-sm focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                <span className="flex items-center border-r border-[#E4E2DA] bg-[#F6F5F2] px-3 text-[#8A8A96]">{prefix}</span>
                <input
                    id="product_slug"
                    value={value}
                    maxLength={150}
                    onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#14141B] outline-none placeholder:text-[#8A8A96]"
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

export function SaveStatusPill({ status }: { status: SaveStatus }) {
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
