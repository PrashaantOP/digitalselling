import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

/**
 * Phone pe table ki jagah card list. Desktop table jaisa hai waisa (`hidden md:block`), aur usi page me
 * `<MobileCardList>` same rows + same action menu ke saath (`md:hidden`).
 *
 *  ┌──────────────────────────────────────┐
 *  │ [leading]  title             trailing│
 *  │            subtitle                  │
 *  │            meta · meta       [actions]│
 *  └──────────────────────────────────────┘
 *
 * `href` → poora card ek link (stretched), `onOpen` → poora card ek button (side panel waghaira).
 * Actions (⋯ menu, icon links) upar rehte hain, card ka tap unhe nahi chhoota.
 */
export function MobileCardList({ children, className }: { children: ReactNode; className?: string }) {
    return <ul className={cn('divide-y divide-cp-line/60 md:hidden', className)}>{children}</ul>;
}

interface MobileCardProps {
    title: ReactNode;
    leading?: ReactNode;
    subtitle?: ReactNode;
    /** right side — amount / price / status chip */
    trailing?: ReactNode;
    /** neeche ki chhoti details — `<MetaDot />` se alag karo */
    meta?: ReactNode;
    actions?: ReactNode;
    href?: string;
    onOpen?: () => void;
    className?: string;
}

export function MobileCard({ title, leading, subtitle, trailing, meta, actions, href, onOpen, className }: MobileCardProps) {
    const titleClass = 'line-clamp-2 text-left text-sm font-semibold text-cp-ink after:absolute after:inset-0 after:content-[""]';

    return (
        <li className={cn('relative flex gap-3 px-4 py-3.5 transition-colors has-[a:active,button:active]:bg-cp-surface-2', className)}>
            {leading && <div className="shrink-0">{leading}</div>}
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {href ? (
                            <Link href={href} className={titleClass}>
                                {title}
                            </Link>
                        ) : onOpen ? (
                            <button type="button" onClick={onOpen} className={titleClass}>
                                {title}
                            </button>
                        ) : (
                            <p className="line-clamp-2 text-sm font-semibold text-cp-ink">{title}</p>
                        )}
                        {subtitle && <div className="mt-0.5 truncate text-xs text-cp-muted">{subtitle}</div>}
                    </div>
                    {trailing && <div className="shrink-0 text-right">{trailing}</div>}
                </div>
                {(meta || actions) && (
                    <div className="mt-2 flex min-h-9 items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cp-muted">{meta}</div>
                        {/* z-10: stretched link ke upar, taaki ⋯ / icon apna kaam karein */}
                        {actions && <div className="relative z-10 -mr-1.5 flex shrink-0 items-center gap-0.5">{actions}</div>}
                    </div>
                )}
            </div>
        </li>
    );
}

/** meta ke beech ka chhota "·" */
export function MetaDot() {
    return (
        <span aria-hidden="true" className="text-cp-faint">
            ·
        </span>
    );
}

/** card ke andar icon-only link / button — phone pe 36px tap target */
export const MOBILE_ICON_ACTION = 'flex size-9 items-center justify-center rounded-lg text-cp-muted transition hover:bg-cp-surface-3 hover:text-cp-ink';
