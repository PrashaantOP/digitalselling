import { cn } from '@/lib/utils';
import {
    ArrowUpRight,
    BadgeCheck,
    CalendarClock,
    Check,
    Globe,
    Instagram,
    Link2,
    MessageCircle,
    Send,
    Share2,
    ShieldAlert,
    ShoppingBag,
    Twitter,
    Youtube,
} from 'lucide-react';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { assetUrl, fontName, priceLabel, THEMES, typeLabels, type StorePageData, type StoreProduct } from './types';

interface Props {
    data: StorePageData;
    // preview = dashboard ka phone frame (links band, click track nahi); live = asli /username page
    mode: 'live' | 'preview';
}

const cookie = (key: string) => decodeURIComponent(document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`))?.[1] ?? '');

// Store Analytics ke "Most clicked" ke liye — page chhod ke jaate waqt bhi request pahunche isliye keepalive
function trackClick(username: string, label: string) {
    try {
        void fetch('/track/click', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') },
            body: JSON.stringify({ username, label: label.slice(0, 150) }),
        });
    } catch {
        // tracking fail ho to bhi link khulna chahiye
    }
}

function useGoogleFont(family: string | null) {
    useEffect(() => {
        if (!family || family === 'Inter') return;
        const id = `store-font-${family.replace(/\s+/g, '-')}`;
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
        document.head.appendChild(link);
    }, [family]);
}

function socialIcon(platform: string) {
    const cls = 'size-4';
    switch (platform) {
        case 'instagram':
            return <Instagram className={cls} />;
        case 'youtube':
            return <Youtube className={cls} />;
        case 'x':
            return <Twitter className={cls} />;
        case 'whatsapp':
            return <MessageCircle className={cls} />;
        case 'telegram':
            return <Send className={cls} />;
        default:
            return <Globe className={cls} />;
    }
}

export function StorePageView({ data, mode }: Props) {
    const live = mode === 'live';
    const theme = THEMES.find((t) => t.value === data.theme) ?? THEMES[0];
    const light = !!theme.light && !data.backgroundUrl;
    const family = fontName(data.fontFamily);
    const [confirmed, setConfirmed] = useState(!data.sensitive);
    const [copied, setCopied] = useState(false);
    useGoogleFont(family);

    const products = data.products.filter((p) => p.type !== 'booking');
    const sessions = data.products.filter((p) => p.type === 'booking');
    const initials = (data.displayName || 'U').trim().charAt(0).toUpperCase();
    const socials = data.socials.filter((s) => s.url);

    const tone = {
        text: light ? 'text-[#14141B]' : 'text-white',
        muted: light ? 'text-[#14141B]/60' : 'text-white/65',
        faint: light ? 'text-[#14141B]/40' : 'text-white/40',
        glass: light ? 'border-black/10 bg-white/80 shadow-sm' : 'border-white/15 bg-white/10',
        chip: light ? 'bg-black/5' : 'bg-white/15',
        divider: light ? 'border-black/10' : 'border-white/10',
    };

    // preview me link nahi khulna chahiye; live me click record karke khulne do
    const onLink = (label: string) => (e: MouseEvent) => {
        if (!live) {
            e.preventDefault();
            return;
        }
        trackClick(data.username, label);
    };

    async function share() {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: data.displayName, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // user ne share cancel kiya
        }
    }

    return (
        <div
            className={cn('relative bg-gradient-to-b', theme.preview, tone.text, live ? 'min-h-svh' : 'min-h-full')}
            style={{
                fontFamily: family ? `'${family}', ui-sans-serif, system-ui, sans-serif` : undefined,
                ...(data.backgroundUrl
                    ? {
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.65)), url(${data.backgroundUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundAttachment: live ? 'fixed' : undefined,
                      }
                    : {}),
            }}
        >
            {/* halka glow brand color ka — page flat na lage */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-40 blur-3xl"
                style={{ background: `radial-gradient(60% 60% at 50% 0%, ${data.brandColor}, transparent 70%)` }}
            />

            <div className={cn('relative mx-auto w-full', live ? 'max-w-[480px] px-5 pt-10 pb-8' : 'px-4 pt-3 pb-4')}>
                {live && (
                    <div className="mb-2 flex justify-end">
                        <button
                            type="button"
                            onClick={share}
                            aria-label="Share store"
                            className={cn(
                                'flex size-9 items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-105',
                                tone.glass,
                            )}
                        >
                            {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
                        </button>
                    </div>
                )}

                {/* Profile */}
                <header className="flex flex-col items-center text-center">
                    <div className="relative mb-3">
                        {data.avatarUrl ? (
                            <img
                                src={data.avatarUrl}
                                alt={data.displayName}
                                className={cn('rounded-full border-2 border-white/70 object-cover shadow-lg', live ? 'size-24' : 'size-16')}
                            />
                        ) : (
                            <div
                                className={cn(
                                    'flex items-center justify-center rounded-full border-2 border-white/70 font-bold text-white shadow-lg',
                                    live ? 'size-24 text-4xl' : 'size-16 text-2xl',
                                )}
                                style={{ backgroundColor: data.brandColor }}
                            >
                                {initials}
                            </div>
                        )}
                        {data.isLive && (
                            <span
                                className={cn(
                                    'absolute right-0.5 bottom-0.5 rounded-full border-2 border-black/30 bg-emerald-500',
                                    live ? 'size-5' : 'size-4',
                                )}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <h1 className={cn('font-bold tracking-tight', live ? 'text-2xl' : 'text-[15px]')}>{data.displayName || 'Your Name'}</h1>
                        <BadgeCheck className={cn('text-sky-400', live ? 'size-5' : 'size-3.5')} />
                    </div>
                    <p className={cn(tone.muted, live ? 'text-sm' : 'text-[11px]')}>@{data.username || 'username'}</p>
                    <p
                        className={cn(
                            'mt-2 whitespace-pre-line',
                            tone.muted,
                            live ? 'max-w-sm text-[15px] leading-relaxed' : 'max-w-[230px] text-[11px] leading-snug',
                        )}
                    >
                        {data.bio || 'Welcome to my store 🚀'}
                    </p>

                    {socials.length > 0 && (
                        <div className={cn('flex flex-wrap items-center justify-center gap-2', live ? 'mt-5' : 'mt-3')}>
                            {socials.map((s) => (
                                <a
                                    key={`${s.platform}-${s.url}`}
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={onLink(`Social: ${s.platform}`)}
                                    aria-label={s.platform}
                                    className={cn(
                                        'flex items-center justify-center rounded-full border backdrop-blur-md transition hover:scale-110',
                                        tone.glass,
                                        live ? 'size-10' : 'size-7',
                                    )}
                                >
                                    {socialIcon(s.platform)}
                                </a>
                            ))}
                        </div>
                    )}
                </header>

                {/* Header buttons */}
                {data.buttons.length > 0 && (
                    <div className={cn('flex flex-col', live ? 'mt-7 gap-3' : 'mt-4 gap-1.5')}>
                        {data.buttons.map((b, i) => (
                            <a
                                key={b.id ?? i}
                                href={b.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={onLink(b.label)}
                                className={cn(
                                    'flex w-full items-center justify-between rounded-full font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg',
                                    live ? 'px-5 py-3.5 text-sm' : 'px-3 py-2 text-[11px]',
                                )}
                                style={{ backgroundColor: data.brandColor }}
                            >
                                <span className="truncate">{b.label}</span>
                                <Link2 className={live ? 'size-4' : 'size-3.5'} />
                            </a>
                        ))}
                    </div>
                )}

                {products.length > 0 && (
                    <Section title="Products" live={live} tone={tone}>
                        <div className={cn(data.columnLayout === 'double' ? 'grid grid-cols-2' : 'flex flex-col', live ? 'gap-3' : 'gap-2')}>
                            {products.map((p) => (
                                <ProductCard key={p.id} product={p} data={data} live={live} tone={tone} onClick={onLink(p.title)} />
                            ))}
                        </div>
                    </Section>
                )}

                {sessions.length > 0 && (
                    <Section title="1:1 Sessions" live={live} tone={tone}>
                        <div className={cn('flex flex-col', live ? 'gap-3' : 'gap-2')}>
                            {sessions.map((p) => (
                                <SessionCard key={p.id} product={p} data={data} live={live} tone={tone} onClick={onLink(p.title)} />
                            ))}
                        </div>
                    </Section>
                )}

                {data.products.length === 0 && (
                    <div
                        className={cn(
                            'flex flex-col items-center rounded-2xl border border-dashed text-center',
                            tone.divider,
                            live ? 'mt-10 px-6 py-12' : 'mt-5 px-4 py-6',
                        )}
                    >
                        <ShoppingBag className={cn(tone.faint, live ? 'size-8' : 'size-5')} />
                        <p className={cn('mt-2 font-semibold', live ? 'text-sm' : 'text-[11px]')}>Products coming soon</p>
                        <p className={cn('mt-0.5', tone.muted, live ? 'text-xs' : 'text-[10px]')}>Check back shortly for new drops.</p>
                    </div>
                )}

                <footer
                    className={cn('flex flex-col items-center gap-2 border-t', tone.divider, live ? 'mt-12 pt-6 text-xs' : 'mt-5 pt-3 text-[10px]')}
                >
                    <a
                        href={`/w/${data.username}`}
                        onClick={onLink('Visit website')}
                        className={cn('inline-flex items-center gap-1 font-semibold transition hover:opacity-80', tone.muted)}
                    >
                        Visit website <ArrowUpRight className="size-3" />
                    </a>
                    <span className={tone.faint}>
                        Powered by <span className="font-bold">Kiln Studio</span>
                    </span>
                </footer>
            </div>

            {live && !confirmed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-[#14141B] shadow-2xl">
                        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <ShieldAlert className="size-6" />
                        </span>
                        <h2 className="mt-4 text-lg font-bold">Sensitive content</h2>
                        <p className="mt-1 text-sm text-[#5c5f70]">This store may contain content meant for adults (18+). Do you want to continue?</p>
                        <button
                            type="button"
                            onClick={() => setConfirmed(true)}
                            className="mt-5 h-11 w-full rounded-xl text-sm font-semibold text-white"
                            style={{ backgroundColor: data.brandColor }}
                        >
                            I&apos;m 18+, continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

type Tone = Record<'text' | 'muted' | 'faint' | 'glass' | 'chip' | 'divider', string>;

function Section({ title, live, tone, children }: { title: string; live: boolean; tone: Tone; children: ReactNode }) {
    return (
        <section className={live ? 'mt-9' : 'mt-5'}>
            <h2 className={cn('mb-3 px-0.5 font-semibold tracking-wider uppercase', tone.faint, live ? 'text-xs' : 'text-[9px]')}>{title}</h2>
            {children}
        </section>
    );
}

interface CardProps {
    product: StoreProduct;
    data: StorePageData;
    live: boolean;
    tone: Tone;
    onClick: (e: MouseEvent) => void;
}

function Cover({ product, className, iconClass }: { product: StoreProduct; className: string; iconClass: string }) {
    const src = assetUrl(product.cover);
    return src ? (
        <img src={src} alt="" loading="lazy" className={cn('object-cover', className)} />
    ) : (
        <span className={cn('flex items-center justify-center bg-white/15', className)}>
            <ShoppingBag className={iconClass} />
        </span>
    );
}

function ProductCard({ product, data, live, tone, onClick }: CardProps) {
    const price = priceLabel(product);
    const cta = product.button_text || 'Buy';

    // 2-column layout: upar cover, neeche details
    if (data.columnLayout === 'double') {
        return (
            <a
                href={product.url}
                onClick={onClick}
                className={cn(
                    'group flex flex-col overflow-hidden rounded-2xl border backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-xl',
                    tone.glass,
                )}
            >
                <Cover product={product} className="aspect-[4/3] w-full" iconClass={live ? 'size-7' : 'size-4'} />
                <div className={cn('flex flex-1 flex-col', live ? 'p-3' : 'p-2')}>
                    <span className={cn('w-fit rounded-full px-1.5 py-0.5 font-semibold', tone.chip, live ? 'text-[10px]' : 'text-[8px]')}>
                        {typeLabels[product.type] ?? 'Product'}
                    </span>
                    <h3 className={cn('mt-1.5 line-clamp-2 font-semibold', live ? 'text-sm' : 'text-[11px] leading-tight')}>{product.title}</h3>
                    <div className="mt-auto pt-2">
                        {price.was && <span className={cn('mr-1 line-through', tone.faint, live ? 'text-xs' : 'text-[9px]')}>{price.was}</span>}
                        <span className={cn('font-bold', live ? 'text-sm' : 'text-[11px]')}>{price.now}</span>
                    </div>
                    <span
                        className={cn(
                            'mt-2 flex items-center justify-center rounded-lg font-semibold text-white',
                            live ? 'h-9 text-xs' : 'h-6 text-[10px]',
                        )}
                        style={{ backgroundColor: data.brandColor }}
                    >
                        {cta}
                    </span>
                </div>
            </a>
        );
    }

    return (
        <a
            href={product.url}
            onClick={onClick}
            className={cn(
                'group flex items-center gap-3 rounded-2xl border backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-xl',
                tone.glass,
                live ? 'p-3' : 'gap-2 p-2',
            )}
        >
            <Cover
                product={product}
                className={cn('shrink-0 rounded-xl', live ? 'size-16' : 'size-10 rounded-lg')}
                iconClass={live ? 'size-6' : 'size-4'}
            />
            <div className="min-w-0 flex-1">
                <span className={cn('rounded-full px-1.5 py-0.5 font-semibold', tone.chip, live ? 'text-[10px]' : 'text-[8px]')}>
                    {typeLabels[product.type] ?? 'Product'}
                </span>
                <h3 className={cn('mt-1 truncate font-semibold', live ? 'text-[15px]' : 'text-[11px]')}>{product.title}</h3>
                <div className={live ? 'text-sm' : 'text-[11px]'}>
                    {price.was && <span className={cn('mr-1.5 line-through', tone.faint)}>{price.was}</span>}
                    <span className="font-bold">{price.now}</span>
                </div>
            </div>
            <span
                className={cn(
                    'shrink-0 rounded-lg font-semibold text-white shadow-sm transition group-hover:brightness-110',
                    live ? 'px-3.5 py-2 text-xs' : 'px-2 py-1 text-[10px]',
                )}
                style={{ backgroundColor: data.brandColor }}
            >
                {cta} →
            </span>
        </a>
    );
}

function SessionCard({ product, data, live, tone, onClick }: CardProps) {
    const price = priceLabel(product);
    return (
        <a
            href={product.url}
            onClick={onClick}
            className={cn(
                'group flex items-center gap-3 rounded-2xl border backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-xl',
                tone.glass,
                live ? 'p-3' : 'gap-2 p-2',
            )}
        >
            <span
                className={cn('flex shrink-0 items-center justify-center rounded-xl text-white', live ? 'size-16' : 'size-10 rounded-lg')}
                style={{ background: `linear-gradient(135deg, ${data.brandColor}, ${data.brandColor}99)` }}
            >
                <CalendarClock className={live ? 'size-7' : 'size-4'} />
            </span>
            <div className="min-w-0 flex-1">
                <h3 className={cn('truncate font-semibold', live ? 'text-[15px]' : 'text-[11px]')}>{product.title}</h3>
                <p className={cn(tone.muted, live ? 'text-xs' : 'text-[9px]')}>
                    {product.duration_minutes ? `${product.duration_minutes} min · Video call` : 'Video call'}
                </p>
                <div className={live ? 'text-sm' : 'text-[11px]'}>
                    {price.was && <span className={cn('mr-1.5 line-through', tone.faint)}>{price.was}</span>}
                    <span className="font-bold">{price.now}</span>
                </div>
            </div>
            <span
                className={cn(
                    'shrink-0 rounded-lg font-semibold text-white shadow-sm transition group-hover:brightness-110',
                    live ? 'px-3.5 py-2 text-xs' : 'px-2 py-1 text-[10px]',
                )}
                style={{ backgroundColor: data.brandColor }}
            >
                {product.button_text || 'Book'} →
            </span>
        </a>
    );
}
