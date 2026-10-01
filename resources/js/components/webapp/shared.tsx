import { assetUrl, brandHex, typeLabels, type StoreProduct } from '@/components/store-page/types';
import { cn } from '@/lib/utils';
import {
    Award,
    BookOpen,
    CalendarDays,
    Clock,
    CreditCard,
    FileText,
    GraduationCap,
    Globe,
    Instagram,
    Lock,
    MessageCircle,
    MonitorSmartphone,
    Route,
    Send,
    Video,
    Youtube,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { splitCatalog, type WebappData } from './types';

/* Chhote building blocks jinhe themes apne-apne tarike se jodte hain. */

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

/* ---- "Full website" themes (Bold / Azure / Notebook) ke common hisse ---- */

export const FEATURES: { title: string; description: string; icon: LucideIcon }[] = [
    { title: 'Structured learning path', description: 'A clear roadmap from fundamentals to mastery — no guesswork, no overwhelm.', icon: Route },
    { title: 'Practice & assessments', description: 'Cement every topic with quizzes, tests and real exam-style questions.', icon: Zap },
    { title: 'Learn anywhere', description: 'Phone, tablet or desktop — progress syncs and picks up where you left off.', icon: MonitorSmartphone },
    { title: 'Expert-led lessons', description: 'Taught by people who do the work, distilled into lessons that actually land.', icon: Clock },
    { title: 'Notes & resources', description: 'Downloadable notes and material that make revision genuinely effortless.', icon: FileText },
    { title: 'Proof of progress', description: 'Track completion and earn credentials that reflect real, tested skill.', icon: Award },
];

export const STEPS: { title: string; description: string }[] = [
    { title: 'Join the platform', description: 'Create your free account in seconds and step into a focused space.' },
    { title: 'Pick your path', description: 'Choose the course that maps to your goal and start with momentum.' },
    { title: 'Immerse & learn', description: 'Dive into lessons crafted for depth, not just surface coverage.' },
    { title: 'Prove your mastery', description: 'Finish, get certified, and carry credentials that mean something.' },
];

/** Brand colour ke upar padhne layak text — halka brand ho to dark ink, warna white. */
export function inkOn(hex: string) {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    const light = 0.299 * r + 0.587 * g + 0.114 * b;

    return light > 160 ? '#14141B' : '#FFFFFF';
}

/** Theme ka apna light/dark toggle — sirf theme ke root pe lagta hai, <html> ko nahi chhedta (dashboard preview safe rahe). */
export function useColorMode(key: string) {
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        let saved: string | null = null;
        try {
            saved = localStorage.getItem(key);
        } catch {
            /* private mode — system preference pe chalo */
        }
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setMode(saved === 'dark' || saved === 'light' ? saved : system);
    }, [key]);

    const toggle = () => {
        const next = mode === 'dark' ? 'light' : 'dark';
        setMode(next);
        try {
            localStorage.setItem(key, next);
        } catch {
            /* ignore */
        }
    };

    return [mode, toggle] as const;
}

/** Theme ke display fonts (Bunny se — CSP me wahi allowed hai). families: "manrope:700,800|inter:400,600" */
export function useThemeFonts(id: string, families: string) {
    useEffect(() => {
        if (document.getElementById(id)) return;

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.bunny.net/css?family=${families}`;
        document.head.appendChild(link);
    }, [id, families]);
}

/** Store ke data se nikla copy — koi banawati number nahi, stats asli catalogue se bante hain. */
export function siteCopy(data: WebappData) {
    const { items, sessions } = splitCatalog(data.products);
    const name = data.store.display_name;
    const brand = brandHex(data.brandColor);
    const storeUrl = `/${data.creator.username}`;
    const free = data.products.filter((p) => p.pricing_type === 'free').length;

    return {
        items,
        sessions,
        name,
        storeUrl,
        heading: data.store.heading || name,
        lede: data.store.bio || `Everything by ${name}, in one place.`,
        cta: data.headerButtons[0] ?? { label: 'Visit store', url: storeUrl },
        stats: [
            { value: items.length, label: items.length === 1 ? 'Product' : 'Products' },
            { value: sessions.length, label: sessions.length === 1 ? '1:1 session' : '1:1 sessions' },
            { value: free, label: 'Free to start' },
        ].filter((stat) => stat.value > 0),
        brandVars: { ['--brand' as string]: brand, ['--brand-ink' as string]: inkOn(brand) } as CSSProperties,
    };
}
