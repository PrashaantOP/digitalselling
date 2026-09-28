import { assetUrl, priceLabel, typeLabels, type StoreProduct } from '@/components/store-page/types';
import { cn } from '@/lib/utils';
import { BookOpen, CalendarDays, CreditCard, GraduationCap, Globe, Instagram, Lock, MessageCircle, Send, Video, Youtube } from 'lucide-react';
import { useState } from 'react';
import { initials } from './types';

/* Chhote building blocks jinhe chaaron themes apne-apne tarike se jodte hain. */

const TYPE_ICON: Record<string, typeof BookOpen> = {
    course: GraduationCap,
    event: CalendarDays,
    book: BookOpen,
    locked_content: Lock,
    payment_page: CreditCard,
    booking: Video,
};

export function typeIcon(type: string) {
    return TYPE_ICON[type] ?? CreditCard;
}

export function typeLabel(type: string) {
    return typeLabels[type] ?? 'Product';
}

export function Avatar({ name, src, className }: { name: string; src: string | null; className?: string }) {
    const url = assetUrl(src);

    return url ? (
        <img src={url} alt="" className={cn('object-cover', className)} />
    ) : (
        <span className={cn('flex items-center justify-center bg-current/10 font-bold', className)}>{initials(name)}</span>
    );
}

/** Cover image, warna product type ka icon ek soft tile me. Image load na ho (file gayab) to bhi icon hi dikhta hai. */
export function CoverArt({ product, className, iconClass }: { product: StoreProduct; className?: string; iconClass?: string }) {
    const url = assetUrl(product.cover);
    const Icon = typeIcon(product.type);
    const [failed, setFailed] = useState(false);

    return url && ! failed ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className={cn('object-cover', className)} />
    ) : (
        <span className={cn('flex items-center justify-center bg-current/5', className)}>
            <Icon className={iconClass ?? 'size-6 opacity-40'} />
        </span>
    );
}

export function Price({ product, className, wasClassName }: { product: StoreProduct; className?: string; wasClassName?: string }) {
    const { now, was } = priceLabel(product);

    return (
        <span className={cn('inline-flex items-baseline gap-1.5', className)}>
            <span>{now}</span>
            {was && <span className={cn('text-[0.8em] line-through opacity-50', wasClassName)}>{was}</span>}
        </span>
    );
}

const SOCIAL_ICON: Record<string, typeof Globe> = {
    instagram: Instagram,
    youtube: Youtube,
    whatsapp: MessageCircle,
    telegram: Send,
    x: MessageCircle,
    website: Globe,
};

export function Socials({ socials, className, itemClassName }: { socials: { platform: string; url: string }[]; className?: string; itemClassName?: string }) {
    if (socials.length === 0) return null;

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {socials.map((social) => {
                const Icon = SOCIAL_ICON[social.platform.toLowerCase()] ?? Globe;

                return (
                    <a
                        key={social.platform + social.url}
                        href={social.url}
                        target="_blank"
                        rel="noreferrer nofollow"
                        aria-label={social.platform}
                        className={cn('flex size-9 items-center justify-center rounded-full transition', itemClassName)}
                    >
                        <Icon className="size-4" />
                    </a>
                );
            })}
        </div>
    );
}

/** Adult/sensitive content warning — store setting se. */
export function SensitiveNote({ className }: { className?: string }) {
    return <p className={cn('text-[11px] tracking-wide uppercase opacity-60', className)}>Contains sensitive content · 18+</p>;
}

export function sessionLength(product: StoreProduct) {
    return product.duration_minutes ? `${product.duration_minutes} min` : '1:1 session';
}
