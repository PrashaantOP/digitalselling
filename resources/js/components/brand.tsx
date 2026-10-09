import { cn } from '@/lib/utils';

/**
 * CreatorPro ka logo — ek hi jagah se, taaki har page / layout same file use kare.
 * Files public/images/brand/ me (transparent PNG, original: public/images/brand/source/).
 *
 *  BrandLogo  — icon + "CreatorPro" ek line me. variant:
 *                'color'      = light background (default)
 *                'white'      = dark / neutral background (#14141B jaisa) — icon rangeen, text safed
 *                'mono-white' = blue / indigo jaise rangeen background — poora safed (icon background me na ghule)
 *                'auto'       = dashboard shell: light me 'color', dark mode me 'white' (dono img, CSS se ek dikhta hai)
 *  BrandIcon  — sirf icon (cards + play)
 *
 * Size sirf height se do (jaise `h-8`) — width apne aap anupaat me.
 */
export const BRAND = {
    logo: { src: '/images/brand/creatorpro-logo.png', width: 686, height: 160 },
    logoWhite: { src: '/images/brand/creatorpro-logo-white.png', width: 697, height: 160 },
    logoMonoWhite: { src: '/images/brand/creatorpro-logo-mono-white.png', width: 655, height: 160 },
    icon: { src: '/images/brand/creatorpro-icon.png', width: 512, height: 512 },
} as const;

export function BrandLogo({ variant = 'color', className }: { variant?: 'color' | 'white' | 'mono-white' | 'auto'; className?: string }) {
    if (variant === 'auto') {
        return (
            <>
                <BrandLogo className={cn('dark:hidden', className)} />
                <BrandLogo variant="white" className={cn('hidden dark:block', className)} />
            </>
        );
    }

    const file = variant === 'white' ? BRAND.logoWhite : variant === 'mono-white' ? BRAND.logoMonoWhite : BRAND.logo;

    return <img src={file.src} width={file.width} height={file.height} alt="CreatorPro" draggable={false} className={cn('h-8 w-auto shrink-0 select-none', className)} />;
}

/** Sirf icon. Akela ho (bagal me naam na ho) to `label` do, warna screen reader ke liye chhupa rehta hai. */
export function BrandIcon({ className, label }: { className?: string; label?: string }) {
    return (
        <img
            src={BRAND.icon.src}
            width={BRAND.icon.width}
            height={BRAND.icon.height}
            alt={label ?? ''}
            aria-hidden={label ? undefined : true}
            draggable={false}
            className={cn('size-8 shrink-0 select-none object-contain', className)}
        />
    );
}
