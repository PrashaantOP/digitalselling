import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn, formatCurrency } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { type FormDataConvertible } from '@inertiajs/core';
import {
    AlertTriangle,
    BarChart3,
    Check,
    CheckCircle2,
    Copy,
    Eye,
    Facebook,
    Globe,
    Image as ImageIcon,
    Info,
    Instagram,
    Link2,
    Loader2,
    MessageCircle,
    Monitor,
    MousePointerClick,
    Palette,
    Plus,
    RefreshCw,
    Settings2,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Store as StoreIcon,
    Tablet,
    Trash2,
    TrendingUp,
    UploadCloud,
    Users,
    Youtube,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Store', href: '/dashboard/store' }];

type StoreTab = 'profile' | 'appearance' | 'settings' | 'analytics';
type SocialPlatform = 'instagram' | 'youtube' | 'x' | 'website' | 'whatsapp' | 'telegram';
type SaveStatus = 'idle' | 'saving' | 'saved';

interface SocialLink {
    id?: number;
    platform: SocialPlatform;
    url: string;
    sort_order?: number;
}

interface HeaderButton {
    id: number;
    label: string;
    url: string;
    icon: string | null;
    sort_order: number;
}

interface StoreAppearance {
    theme: 'classic' | 'ocean' | 'sunset' | 'forest' | 'mono' | 'paper';
    brand_color: string | null;
    font_family: string | null;
    custom_background_path: string | null;
}

interface Store {
    id: number;
    user_id: number;
    username: string | null;
    display_name: string;
    bio: string | null;
    avatar: string | null;
    welcome_message: string | null;
    header_heading: string | null;
    is_live: boolean;
    column_layout: 'single' | 'double';
    sensitive_content_warning: boolean;
    meta_title: string | null;
    meta_description: string | null;
    fb_pixel_id: string | null;
    ga_tracking_id: string | null;
    appearance?: StoreAppearance | null;
    social_links?: SocialLink[];
    header_buttons?: HeaderButton[];
}

interface AnalyticsData {
    days: number;
    totals: { page_views: number; unique_visitors: number; sales: number; revenue: number };
    daily: { day: string; views: number; visitors: number }[];
    top_pages: { page_path: string; views: number }[];
    top_referrers: { referrer: string; views: number }[];
    top_clicks: { element_label: string | null; clicks: number }[];
    devices: { device: string | null; total: number }[];
}

interface StoreEditProps {
    store: Store;
    tab?: StoreTab;
    analytics?: AnalyticsData;
}

const TABS: { key: StoreTab; label: string; href: string }[] = [
    { key: 'profile', label: 'Store', href: '/dashboard/store' },
    { key: 'analytics', label: 'Analytics', href: '/dashboard/store/analytics' },
    { key: 'appearance', label: 'Appearance', href: '/dashboard/store/appearance' },
    { key: 'settings', label: 'Settings', href: '/dashboard/store/settings' },
];

const THEMES: { value: StoreAppearance['theme']; label: string; subtitle: string; swatch: string; preview: string }[] = [
    { value: 'classic', label: 'Classic', subtitle: 'Dark Velvet', swatch: 'bg-[#3D0814]', preview: 'from-[#3D0814] via-[#22040B] to-[#0A0103]' },
    { value: 'ocean', label: 'Ocean', subtitle: 'Deep Navy', swatch: 'bg-[#0F3057]', preview: 'from-[#0A192F] via-[#0F3057] to-[#1E40AF]' },
    { value: 'sunset', label: 'Sunset', subtitle: 'Warm Dusk', swatch: 'bg-[#831843]', preview: 'from-[#311042] via-[#831843] to-[#F97316]' },
    { value: 'forest', label: 'Forest', subtitle: 'Deep Emerald', swatch: 'bg-[#064E3B]', preview: 'from-[#062C1E] via-[#064E3B] to-[#047857]' },
    { value: 'mono', label: 'Mono', subtitle: 'Slate Black', swatch: 'bg-[#1A1A22]', preview: 'from-[#121217] via-[#1A1A22] to-[#252530]' },
    { value: 'paper', label: 'Paper', subtitle: 'Editorial Off-White', swatch: 'bg-[#EFECE4]', preview: 'from-[#FDFCF9] via-[#F6F4EE] to-[#EFECE4]' },
];

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; placeholder: string }[] = [
    { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
    { value: 'youtube', label: 'YouTube Channel', placeholder: 'https://youtube.com/@yourchannel' },
    { value: 'x', label: 'X (Formerly Twitter)', placeholder: 'https://x.com/yourhandle' },
    { value: 'website', label: 'Portfolio / Blog', placeholder: 'https://yourwebsite.com' },
    { value: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/91XXXXXXXXXX' },
    { value: 'telegram', label: 'Telegram', placeholder: 'https://t.me/yourchannel' },
];

const PRESET_COLORS = ['#2E6EF7', '#4F46E5', '#FF6B4A', '#059669', '#D97706', '#7C3AED', '#EC4899', '#111827'];

const FONT_OPTIONS = [
    'Inter (Modern Sans — Recommended)',
    'Plus Jakarta Sans (Crisp Editorial)',
    'DM Sans (Clean & Balanced)',
    'Poppins (Geometric & Friendly)',
    'Space Grotesk (Tech Neo-Brutalist)',
    'Playfair Display (Warm Luxury Serif)',
];

function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '').slice(0, 30) || 'yourstore';
}

/** Brand color ko safe hex me normalize karta hai (leading # + fallback ke saath). */
function brandHex(value?: string | null) {
    const v = (value ?? '').trim();
    if (!v) return '#4F46E5';
    return v.startsWith('#') ? v : `#${v}`;
}

/* ------------------------------------------------------------------ */
/*  AUTO-SAVE HOOK                                                     */
/* ------------------------------------------------------------------ */

function useAutoSave(action: string) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef<Record<string, FormDataConvertible> | null>(null);

    const send = useCallback(
        (data: Record<string, FormDataConvertible>) => {
            setStatus('saving');
            router.put(action, data, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
                onFinish: () => setStatus((s) => (s === 'saving' ? 'saved' : s)),
            });
        },
        [action],
    );

    /** Debounced auto-save: har change ke 700ms baad server par persist. */
    const save = useCallback(
        (data: Record<string, FormDataConvertible>) => {
            latest.current = data;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => send(data), 700);
        },
        [send],
    );

    /** Fixed bar ka "Save now" — turant latest data flush karta hai. */
    const flushNow = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        if (latest.current) send(latest.current);
    }, [send]);

    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    return { status, save, flushNow };
}

/* ------------------------------------------------------------------ */
/*  SHARED UI                                                          */
/* ------------------------------------------------------------------ */

function TabNav({ active }: { active: StoreTab }) {
    return (
        <nav className="flex items-center gap-6 border-b border-[#E4E2DA]">
            {TABS.map((tab) => {
                const isActive = active === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => router.get(tab.href, {}, { preserveScroll: true })}
                        className={cn(
                            '-mb-px flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                            isActive ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-transparent text-[#8A8A96] hover:border-[#E4E2DA] hover:text-[#14141B]',
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
}

function SectionCard({
    icon,
    title,
    description,
    children,
    tone = 'bg-[#EEF2FF] text-[#4F46E5]',
    action,
}: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    children: React.ReactNode;
    tone?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-[#E4E2DA] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-[#E4E2DA]/70 pb-5">
                <div className="flex items-start gap-3.5">
                    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tone)}>{icon}</div>
                    <div>
                        <h2 className="text-base font-semibold text-[#14141B]">{title}</h2>
                        {description && <p className="mt-0.5 text-xs text-[#8A8A96]">{description}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="mt-6">{children}</div>
        </div>
    );
}

function AutoSaveIndicator({ status, compact = false }: { status: SaveStatus; compact?: boolean }) {
    if (status === 'saving') {
        return (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#8A8A96]">
                <Loader2 className="size-3.5 animate-spin" /> {compact ? 'Saving…' : 'Saving changes…'}
            </span>
        );
    }
    if (status === 'saved') {
        return (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#059669]">
                <CheckCircle2 className="size-3.5" /> {compact ? 'Saved' : 'All changes saved'}
            </span>
        );
    }
    return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#8A8A96]">
            <CheckCircle2 className="size-3.5 text-[#059669]" /> {compact ? 'Synced' : 'Changes sync live'}
        </span>
    );
}

/** Fixed bottom action bar shared by all 4 tabs.
 *  Left: "Save changes" button. Right: auto-save status + any extra action. */
function FixedSaveBar({ status, onSave, saving, right }: { status: SaveStatus; onSave?: () => void; saving?: boolean; right?: React.ReactNode }) {
    return (
        <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-[#E4E2DA] bg-white/95 backdrop-blur-md lg:left-[288px]">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 md:px-6">
                <div className="flex items-center gap-3">
                    {onSave && (
                        <Button type="button" onClick={onSave} disabled={saving} className="bg-[#4F46E5] hover:bg-[#4338CA]">
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                            {saving ? 'Saving…' : 'Save changes'}
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <AutoSaveIndicator status={status} />
                    {right}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  LIVE MOBILE PREVIEW                                                */
/* ------------------------------------------------------------------ */

function MobilePreview({
    displayName,
    bio,
    isLive = true,
    theme = 'classic',
    brandColor = '#4F46E5',
    backgroundUrl = null,
    columnLayout = 'single',
    avatar,
    socials = [],
    buttons = [],
}: {
    displayName: string;
    bio: string;
    isLive?: boolean;
    theme?: StoreAppearance['theme'];
    brandColor?: string;
    backgroundUrl?: string | null;
    columnLayout?: 'single' | 'double';
    avatar?: string | null;
    socials?: SocialLink[];
    buttons?: HeaderButton[];
}) {
    const initials = (displayName || 'U').trim().charAt(0).toUpperCase();
    const activeTheme = THEMES.find((t) => t.value === theme) ?? THEMES[0];
    const activeSocials = socials.filter((s) => s.url);

    return (
        <div className="sticky top-20 flex flex-col items-center xl:top-24">
            <div className="relative w-[330px] rounded-[44px] border-4 border-[#2A2A35] bg-[#14141B] p-3 shadow-2xl">
                <div
                    className={cn('relative flex h-[640px] flex-col overflow-hidden rounded-[34px] bg-gradient-to-b text-white', activeTheme.preview)}
                    style={backgroundUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                    <div className="flex items-center justify-between px-5 pt-3 text-[11px] font-semibold text-white/90">
                        <span>9:41</span>
                        <span className="h-4 w-20 rounded-full bg-black/80" />
                        <Smartphone className="size-3.5" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 pt-3">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-2">
                                {avatar ? (
                                    <img src={avatar} alt="" className="size-16 rounded-full border-2 border-white/70 object-cover" />
                                ) : (
                                    <div className="flex size-16 items-center justify-center rounded-full border-2 border-white/70 text-2xl font-bold" style={{ backgroundColor: brandColor }}>{initials}</div>
                                )}
                                {isLive && <span className="absolute right-0 bottom-0 size-4 rounded-full border-2 border-black/40 bg-[#059669]" />}
                            </div>
                            <div className="flex items-center gap-1">
                                <h3 className="text-[15px] font-bold tracking-tight">{displayName || 'Your Name'}</h3>
                                <CheckCircle2 className="size-3.5 text-sky-300" />
                            </div>
                            <p className="text-[11px] text-white/60">@{slugify(displayName || 'username')}</p>
                            <p className="mt-1.5 max-w-[230px] text-[11px] leading-snug text-white/80">{bio || 'Welcome to my store 🚀'}</p>

                            {activeSocials.length > 0 && (
                                <div className="my-3 flex items-center gap-1.5">
                                    {activeSocials.map((s) => (
                                        <span key={s.platform} className="flex size-6 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                                            {s.platform === 'instagram' ? <Instagram className="size-3" /> : s.platform === 'youtube' ? <Youtube className="size-3" /> : s.platform === 'whatsapp' ? <MessageCircle className="size-3" /> : <Globe className="size-3" />}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {buttons.length > 0 && (
                            <div className="mb-3 flex flex-col gap-1.5">
                                {buttons.map((b) => (
                                    <div key={b.id} className="flex w-full items-center justify-between rounded-full px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: brandColor }}>
                                        <span className="truncate">{b.label}</span>
                                        <Link2 className="size-3.5" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-left">
                            <span className="px-0.5 text-[9px] font-semibold tracking-wider text-white/50 uppercase">Featured Products</span>
                            <div className={cn('mt-2 gap-2', columnLayout === 'double' ? 'grid grid-cols-2' : 'flex flex-col')}>
                                {[{ t: 'Design System Masterclass 2024', p: '₹14,999' }, { t: 'Figma Tokens Guide', p: '₹799' }].map((p) => (
                                    <div key={p.t} className={cn('flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md', columnLayout === 'double' && 'flex-col items-start')}>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                                <ShoppingBag className="size-4" />
                                            </span>
                                            <div className="flex min-w-0 flex-col">
                                                <span className="truncate text-[11px] font-semibold">{p.t}</span>
                                                <span className="text-[11px] font-bold text-emerald-300">{p.p}</span>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-semibold" style={{ color: brandColor }}>Buy →</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-1 border-t border-white/10 pt-2 text-[10px] text-white/40">
                            <span>Powered by</span>
                            <span className="font-bold text-white/60">Kiln Studio</span>
                        </div>
                    </div>

                    <div className="flex justify-center pb-2">
                        <span className="h-1 w-24 rounded-full bg-white/40" />
                    </div>
                </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#8A8A96]">
                <span className="size-1.5 rounded-full bg-[#059669]" />
                Live preview · 375×812 Mobile · Updates in real time
            </p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  STORE (PROFILE) TAB                                                */
/* ------------------------------------------------------------------ */

function StoreTab({ store }: { store: Store }) {
    const { status, save, flushNow } = useAutoSave('/dashboard/store');
    const [form, setForm] = useState({
        username: store.username ?? slugify(store.display_name),
        display_name: store.display_name,
        bio: store.bio ?? '',
        header_heading: store.header_heading ?? '',
        welcome_message: store.welcome_message ?? '',
        is_live: store.is_live,
    });
    const avatarUrl = store.avatar ? `/assets/${store.avatar}` : null;
    const brandColor = brandHex(store.appearance?.brand_color);
    const backgroundUrl = store.appearance?.custom_background_path ? `/assets/${store.appearance.custom_background_path}` : null;

    function update<K extends keyof typeof form>(key: K, value: (typeof form)[K], immediate = false) {
        const next = { ...form, [key]: value };
        setForm(next);
        if (immediate) {
            // flush immediately for toggles
            router.put('/dashboard/store', next, { preserveScroll: true, preserveState: true });
        } else {
            save(next);
        }
    }

    function uploadAvatar(file: File) {
        const data = new FormData();
        data.append('_method', 'put');
        data.append('avatar', file);
        data.append('username', form.username);
        data.append('display_name', form.display_name);
        data.append('bio', form.bio);
        data.append('header_heading', form.header_heading);
        data.append('welcome_message', form.welcome_message);
        data.append('is_live', form.is_live ? '1' : '0');
        router.post('/dashboard/store', data, { preserveScroll: true, preserveState: true, forceFormData: true });
    }

    return (
        <div className="grid grid-cols-1 items-start gap-8 pb-24 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex w-full flex-col gap-5">
                {/* Live banner */}
                <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#C2E7D0] bg-[#E6F6EC] p-3.5 shadow-sm sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="relative flex size-2.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#059669] opacity-75" />
                            <span className="relative inline-flex size-2.5 rounded-full bg-[#059669]" />
                        </span>
                        <p className="truncate text-sm text-[#14141B]">
                            <span className="font-medium text-[#1B4D3E]">{form.is_live ? 'Your store is live:' : 'Your store is offline:'}</span>
                            <a className="ml-1 font-semibold text-[#4F46E5] hover:underline" href={`/${form.username}`} target="_blank" rel="noreferrer">
                                creatorapp.in/{form.username}
                            </a>
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                        <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/${form.username}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C2E7D0] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#1B4D3E] transition hover:bg-white">
                            <Copy className="size-3.5" /> Copy
                        </button>
                        <a className="inline-flex items-center gap-1.5 rounded-lg border border-[#C2E7D0] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#1B4D3E] transition hover:bg-white" href={`/${form.username}`} target="_blank" rel="noreferrer">
                            Open <Globe className="size-3.5" />
                        </a>
                    </div>
                </div>

                <SectionCard icon={<StoreIcon className="size-5" />} title="Store Header" description="Customize how your storefront and branding look to your audience." action={<AutoSaveIndicator status={status} compact />}>
                    <div className="flex flex-col gap-6">
                        {/* Username first */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="username" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">
                                    Username / official link <span className="text-[#D93838]">*</span>
                                </Label>
                                <span className="inline-flex items-center gap-1 rounded bg-[#E6F6EC] px-2 py-0.5 text-[11px] font-medium text-[#059669]">
                                    <CheckCircle2 className="size-3" /> Valid URL
                                </span>
                            </div>
                            <div className="flex items-stretch overflow-hidden rounded-lg border border-[#E4E2DA] bg-white transition focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/15">
                                <span className="flex items-center border-r border-[#E4E2DA] bg-[#F0EFEA] px-3.5 py-2.5 font-mono text-sm text-[#4B4B57] select-none">creatorapp.in/</span>
                                <input
                                    id="username"
                                    value={form.username}
                                    onChange={(e) => update('username', slugify(e.target.value))}
                                    placeholder="yourname"
                                    className="flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-[#14141B] outline-none"
                                />
                                <span className="flex items-center px-3 text-[#059669]">
                                    <CheckCircle2 className="size-4" />
                                </span>
                            </div>
                            <p className="text-xs text-[#8A8A96]">
                                Your store is at <code className="font-mono text-[11px] text-[#4B4B57]">creatorapp.in/{form.username}</code> and bookings at <code className="font-mono text-[11px] text-[#4B4B57]">/book/{form.username}</code>
                            </p>
                        </div>

                        {/* Display name */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="display_name" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">
                                Display name
                            </Label>
                            <Input id="display_name" value={form.display_name} onChange={(e) => update('display_name', e.target.value)} maxLength={150} className="h-10 border-[#E4E2DA] shadow-sm focus-visible:ring-[#4F46E5]/15" />
                        </div>

                        {/* Bio */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="bio" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">
                                    Bio / Tagline
                                </Label>
                                <span className="font-mono text-[11px] text-[#8A8A96]">{form.bio.length} / 500</span>
                            </div>
                            <textarea
                                id="bio"
                                value={form.bio}
                                onChange={(e) => update('bio', e.target.value)}
                                rows={4}
                                maxLength={500}
                                placeholder="Tell visitors what you create and why they should follow you."
                                className="w-full resize-none rounded-lg border border-[#E4E2DA] bg-white p-3.5 text-sm leading-relaxed text-[#14141B] shadow-sm transition outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
                            />
                            <span className="text-[11px] text-[#8A8A96]">Appears below your profile title across all device layouts.</span>
                        </div>

                        {/* Avatar — now after bio */}
                        <div className="flex flex-col gap-2 rounded-lg border border-[#E4E2DA]/80 bg-[#F6F5F2] p-4">
                            <span className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">Avatar Photo</span>
                            <div className="mt-1 flex items-center gap-4">
                                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#4F46E5] bg-[#EEF2FF] text-xl font-bold text-[#4F46E5]">
                                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (form.display_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                                        className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#14141B] file:shadow-sm"
                                    />
                                    <span className="text-[10px] leading-tight text-[#8A8A96]">JPG or PNG, 400×400+ (max 3 MB). Uploads instantly.</span>
                                </div>
                            </div>
                        </div>

                        {/* Header heading */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="header_heading" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">
                                Header heading
                            </Label>
                            <Input id="header_heading" value={form.header_heading} onChange={(e) => update('header_heading', e.target.value)} maxLength={150} placeholder="e.g. Join 10,000+ creators learning design" className="h-10 border-[#E4E2DA] shadow-sm focus-visible:ring-[#4F46E5]/15" />
                        </div>

                        {/* Welcome message */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="welcome_message" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">
                                Welcome message
                            </Label>
                            <Input id="welcome_message" value={form.welcome_message} onChange={(e) => update('welcome_message', e.target.value)} maxLength={500} placeholder="A short greeting shown on your storefront" className="h-10 border-[#E4E2DA] shadow-sm focus-visible:ring-[#4F46E5]/15" />
                        </div>

                        <label className="flex items-center gap-3">
                            <input type="checkbox" checked={form.is_live} onChange={(e) => update('is_live', e.target.checked, true)} className="size-4 accent-[#4F46E5]" />
                            <span className="text-sm font-medium text-[#14141B]">Store is live and visible to visitors</span>
                        </label>
                    </div>
                </SectionCard>

                <SocialLinksSection store={store} />
                <HeaderButtonsSection store={store} />
            </div>

            <MobilePreview displayName={form.display_name} bio={form.bio} isLive={form.is_live} theme={store.appearance?.theme ?? 'classic'} brandColor={brandColor} backgroundUrl={backgroundUrl} columnLayout={store.column_layout} avatar={avatarUrl} socials={store.social_links} buttons={store.header_buttons} />

            <FixedSaveBar status={status} onSave={flushNow} saving={status === 'saving'} />
        </div>
    );
}

function SocialLinksSection({ store }: { store: Store }) {
    const existing = store.social_links ?? [];
    const { status, save } = useAutoSave('/dashboard/store/social-links');
    const [links, setLinks] = useState<Record<SocialPlatform, string>>(() => {
        const base = {} as Record<SocialPlatform, string>;
        SOCIAL_PLATFORMS.forEach((p) => {
            base[p.value] = existing.find((l) => l.platform === p.value)?.url ?? '';
        });
        return base;
    });

    function update(platform: SocialPlatform, url: string) {
        const next = { ...links, [platform]: url };
        setLinks(next);
        save({ links: SOCIAL_PLATFORMS.map((p) => ({ platform: p.value, url: next[p.value] || null })) });
    }

    return (
        <SectionCard icon={<Link2 className="size-5" />} title="Social Profiles & Web Links" description="Add your social profiles so visitors can follow you." action={<AutoSaveIndicator status={status} compact />}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {SOCIAL_PLATFORMS.map((platform) => (
                    <div key={platform.value} className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-[#4B4B57]">{platform.label}</span>
                        <div className="flex items-center rounded-lg border border-[#E4E2DA] bg-white px-3 py-2 shadow-sm focus-within:border-[#4F46E5]">
                            <Globe className="mr-2 size-4 shrink-0 text-[#8A8A96]" />
                            <input type="url" value={links[platform.value]} onChange={(e) => update(platform.value, e.target.value)} placeholder={platform.placeholder} className="w-full bg-transparent text-xs font-medium text-[#14141B] outline-none" />
                            {links[platform.value] && <CheckCircle2 className="ml-1.5 size-4 shrink-0 text-[#059669]" />}
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}

function HeaderButtonsSection({ store }: { store: Store }) {
    const buttons = store.header_buttons ?? [];
    const [label, setLabel] = useState('');
    const [url, setUrl] = useState('');
    const [saving, setSaving] = useState(false);

    function addButton() {
        if (!label || !url) return;
        setSaving(true);
        router.post('/dashboard/store/header-buttons', { label, url, icon: null }, { preserveScroll: true, onSuccess: () => { setLabel(''); setUrl(''); }, onFinish: () => setSaving(false) });
    }

    function removeButton(id: number) {
        router.delete(`/dashboard/store/header-buttons/${id}`, { preserveScroll: true });
    }

    return (
        <SectionCard
            icon={<MousePointerClick className="size-5" />}
            tone="bg-[#FEF3C7] text-[#D97706]"
            title="Header Action Buttons"
            description="Add prominent quick-action buttons to the top of your store — a newsletter, WhatsApp community, or featured reel."
        >
            <div className="flex flex-col gap-2.5">
                {buttons.length === 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#CCC9BD] bg-[#FAF9F5] p-4">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAE8DE] text-[#8A8A96]">
                            <Link2 className="size-4" />
                        </div>
                        <p className="text-xs text-[#8A8A96]">No header buttons yet — add links to guide your visitors directly to WhatsApp, newsletter signups, or your latest work.</p>
                    </div>
                )}
                {buttons.map((button) => (
                    <div key={button.id} className="group flex items-center justify-between rounded-lg border border-[#E4E2DA] bg-[#F6F5F2] p-3 transition-all hover:bg-[#ECEBE6]">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#7C3AED]">
                                <Link2 className="size-4" />
                            </div>
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-xs font-semibold text-[#14141B]">{button.label}</span>
                                <span className="truncate font-mono text-[11px] text-[#8A8A96]">{button.url}</span>
                            </div>
                        </div>
                        <button type="button" onClick={() => removeButton(button.id)} className="p-1 text-[#8A8A96] transition hover:text-[#D93838]">
                            <Trash2 className="size-4" />
                        </button>
                    </div>
                ))}

                <div className="grid gap-3 border-t border-[#E4E2DA]/60 pt-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="button-label" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">Label</Label>
                        <Input id="button-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={50} placeholder="Join my WhatsApp" className="h-10 border-[#E4E2DA] shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="button-url" className="text-xs font-semibold tracking-wider text-[#14141B] uppercase">URL</Label>
                        <Input id="button-url" value={url} onChange={(e) => setUrl(e.target.value)} type="url" placeholder="https://…" className="h-10 border-[#E4E2DA] shadow-sm" />
                    </div>
                    <Button type="button" onClick={addButton} disabled={!label || !url || saving} className="bg-[#4F46E5] hover:bg-[#4338CA]">
                        {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add
                    </Button>
                </div>
            </div>
        </SectionCard>
    );
}

/* ------------------------------------------------------------------ */
/*  APPEARANCE TAB                                                     */
/* ------------------------------------------------------------------ */

function AppearanceTab({ store }: { store: Store }) {
    const appearance = store.appearance;
    const backgroundUrl = appearance?.custom_background_path ? `/assets/${appearance.custom_background_path}` : null;
    const { status, save, flushNow } = useAutoSave('/dashboard/store/appearance');
    const [theme, setTheme] = useState<StoreAppearance['theme']>(appearance?.theme ?? 'classic');
    const [brandColor, setBrandColor] = useState(() => {
        const stored = appearance?.brand_color ?? '#2E6EF7';
        return stored.startsWith('#') ? stored : `#${stored}`;
    });
    const fontRef = useRef(appearance?.font_family ?? FONT_OPTIONS[0]);
    const bgInputRef = useRef<HTMLInputElement>(null);

    function selectTheme(next: StoreAppearance['theme']) {
        setTheme(next);
        save({ theme: next, brand_color: brandColor.replace('#', ''), font_family: fontRef.current });
    }

    function changeColor(next: string) {
        setBrandColor(next);
        save({ theme, brand_color: next.replace('#', ''), font_family: fontRef.current });
    }

    function changeFont(next: string) {
        fontRef.current = next;
        save({ theme, brand_color: brandColor.replace('#', ''), font_family: next });
    }

    function uploadBackground(file: File) {
        const data = new FormData();
        data.append('_method', 'put');
        data.append('theme', theme);
        data.append('brand_color', brandColor.replace('#', ''));
        data.append('font_family', fontRef.current);
        data.append('custom_background', file);
        router.post('/dashboard/store/appearance', data, { preserveScroll: true, preserveState: true, forceFormData: true });
    }

    function removeBackground() {
        router.put('/dashboard/store/appearance', { theme, brand_color: brandColor.replace('#', ''), font_family: fontRef.current, remove_background: 1 }, { preserveScroll: true, preserveState: true });
    }

    return (
        <div className="grid grid-cols-1 items-start gap-8 pb-24 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
                <SectionCard icon={<Palette className="size-5" />} title="Store Theme" description="Choose a visual theme for your storefront. Your avatar and product components adapt instantly." action={<AutoSaveIndicator status={status} compact />}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {THEMES.map((item) => {
                            const selected = theme === item.value;
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => selectTheme(item.value)}
                                    className={cn('group flex flex-col overflow-hidden rounded-xl border-2 bg-white text-left transition-transform hover:-translate-y-0.5', selected ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/25' : 'border-[#E4E2DA]')}
                                >
                                    <div className={cn('relative flex aspect-[16/10] w-full flex-col justify-between bg-gradient-to-br p-3', item.preview)}>
                                        <div className="flex items-center justify-between">
                                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] tracking-wider', item.value === 'paper' ? 'bg-black/5 text-[#4B4B57]' : 'bg-black/40 text-white/80')}>{item.subtitle.toUpperCase()}</span>
                                            {selected && (
                                                <span className="flex size-5 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                                                    <Check className="size-3.5" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn('flex size-7 items-center justify-center rounded-full border text-[11px] font-bold', item.value === 'paper' ? 'border-black/10 bg-black/10 text-[#14141B]' : 'border-white/20 bg-white/20 text-white')}>
                                                {(store.display_name || 'U').charAt(0).toUpperCase()}
                                            </span>
                                            <div className="flex flex-col gap-1">
                                                <span className={cn('h-2 w-16 rounded-full', item.value === 'paper' ? 'bg-black/40' : 'bg-white/80')} />
                                                <span className={cn('h-1.5 w-10 rounded-full', item.value === 'paper' ? 'bg-black/20' : 'bg-white/40')} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-[#E4E2DA]/30 px-3 py-2">
                                        <span className="text-sm font-semibold text-[#14141B]">{item.label}</span>
                                        {selected && <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5]">Active</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-[#E4E2DA]/40 pt-3 text-xs text-[#8A8A96]">
                        <Info className="size-4 text-[#4F46E5]" />
                        <span><strong className="text-[#4B4B57]">Tip:</strong> Custom background images override theme gradient layers while preserving your button and typography styles.</span>
                    </div>
                </SectionCard>

                <SectionCard icon={<Settings2 className="size-5" />} title="Brand & Typography" description="Define the primary accent color and typographic personality of your storefront.">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#14141B]">Primary accent color</label>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">Used for primary CTA buttons, links, and highlighted badges.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#E4E2DA] shadow-inner" style={{ backgroundColor: brandColor }}>
                                    <span className="size-3 rounded-full bg-white/40" />
                                </div>
                                <div className="relative flex flex-1 items-center">
                                    <span className="absolute left-3 text-sm text-[#8A8A96]">#</span>
                                    <input
                                        value={brandColor.replace('#', '')}
                                        onChange={(e) => setBrandColor(`#${e.target.value.replace('#', '')}`)}
                                        onBlur={() => changeColor(brandColor)}
                                        maxLength={6}
                                        className="h-10 w-full rounded-lg border border-[#E4E2DA] bg-white pr-3 pl-7 font-semibold tracking-wider text-[#14141B] uppercase outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] tracking-wider text-[#8A8A96] uppercase">Suggested palettes</span>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {PRESET_COLORS.map((color) => (
                                        <button key={color} type="button" onClick={() => changeColor(color)} style={{ backgroundColor: color }} className={cn('size-7 rounded-lg transition-transform hover:scale-110', brandColor.toUpperCase() === color ? 'ring-2 ring-[#4F46E5] ring-offset-2' : 'border border-black/10')} title={color} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#14141B]">Storefront font family</label>
                                <p className="mt-0.5 text-xs text-[#8A8A96]">Applied to headers, price tags, and narrative copy.</p>
                            </div>
                            <select defaultValue={fontRef.current} onChange={(e) => changeFont(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-[#E4E2DA] bg-white px-3 text-sm text-[#14141B] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20">
                                {FONT_OPTIONS.map((font) => (
                                    <option key={font} value={font}>{font}</option>
                                ))}
                            </select>
                            <div className="flex flex-col gap-1.5 rounded-lg border border-[#E4E2DA]/40 bg-[#F6F5F2] p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] tracking-wider text-[#8A8A96] uppercase">Specimen preview</span>
                                    <span className="text-[11px] text-[#8A8A96]">400 · 600 · 700</span>
                                </div>
                                <p className="text-sm leading-snug text-[#14141B]">
                                    The quick brown fox jumps over the lazy dog · <span className="font-semibold" style={{ color: brandColor }}>₹14,999</span> · Design Masterclass
                                </p>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard icon={<ImageIcon className="size-5" />} title="Custom Store Background" description="Upload your personal wallpaper image or banner pattern to override presets.">
                    <div className="flex flex-col gap-4">
                        {backgroundUrl && (
                            <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#E4E2DA]/50 bg-white p-3 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <img src={backgroundUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg border object-cover" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-[#14141B]">Custom background active</span>
                                        <span className="text-[11px] text-[#8A8A96]">Visible behind your storefront header</span>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={removeBackground} className="text-[#D93838]">
                                    <Trash2 className="size-3.5" /> Remove
                                </Button>
                            </div>
                        )}
                        <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBackground(e.target.files[0])} />
                        <button type="button" onClick={() => bgInputRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E4E2DA] bg-[#F6F5F2]/50 p-8 text-center transition hover:border-[#4F46E5]/70">
                            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                                <UploadCloud className="size-6" />
                            </div>
                            <span className="text-sm font-semibold text-[#14141B]">Click to upload <span className="font-normal text-[#8A8A96]">or drag and drop</span></span>
                            <span className="mt-1 text-xs text-[#8A8A96]">JPG, PNG, WEBP (max 5 MB)</span>
                        </button>
                    </div>
                </SectionCard>
            </div>

            <MobilePreview displayName={store.display_name} bio={store.bio ?? ''} isLive={store.is_live} theme={theme} brandColor={brandColor} backgroundUrl={backgroundUrl} columnLayout={store.column_layout} avatar={store.avatar ? `/assets/${store.avatar}` : null} socials={store.social_links} buttons={store.header_buttons} />

            <FixedSaveBar status={status} onSave={flushNow} saving={status === 'saving'} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  SETTINGS TAB                                                       */
/* ------------------------------------------------------------------ */

function SettingsTab({ store }: { store: Store }) {
    const { status, save, flushNow } = useAutoSave('/dashboard/store/settings');
    const [form, setForm] = useState({
        username: store.username ?? slugify(store.display_name),
        meta_title: store.meta_title ?? '',
        meta_description: store.meta_description ?? '',
        column_layout: store.column_layout ?? 'single',
        sensitive_content_warning: store.sensitive_content_warning,
        fb_pixel_id: store.fb_pixel_id ?? '',
        ga_tracking_id: store.ga_tracking_id ?? '',
    });

    function update<K extends keyof typeof form>(key: K, value: (typeof form)[K], immediate = false) {
        const next = { ...form, [key]: value };
        setForm(next);
        if (immediate) {
            router.put('/dashboard/store/settings', next, { preserveScroll: true, preserveState: true });
        } else {
            save(next);
        }
    }

    return (
        <div className="grid grid-cols-1 items-start gap-8 pb-24 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
                <SectionCard icon={<StoreIcon className="size-5" />} title="Store details" description="Configure your public store link and search engine indexing." action={<AutoSaveIndicator status={status} compact />}>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="settings-username" className="flex items-center gap-1.5 text-sm font-semibold text-[#14141B]">
                            Your store's official link <Info className="size-3.5 text-[#8A8A96]" />
                        </Label>
                        <div className="flex items-center rounded-lg bg-[#F6F5F2] transition focus-within:ring-2 focus-within:ring-[#4F46E5]/20">
                            <span className="rounded-l-lg border-r border-[#E4E2DA]/40 bg-[#ECEBE6] px-3.5 py-2.5 font-mono text-sm text-[#4B4B57] select-none">creatorapp.in/</span>
                            <input id="settings-username" value={form.username} onChange={(e) => update('username', slugify(e.target.value))} className="flex-1 bg-transparent px-3 py-2.5 text-sm font-medium text-[#14141B] outline-none" />
                            <CheckCircle2 className="mr-2 size-4 text-[#0D9488]" />
                            <button type="button" onClick={() => navigator.clipboard?.writeText(`creatorapp.in/${form.username}`)} className="mr-1.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#14141B] shadow-sm transition hover:bg-[#F0EFEA]">
                                <Copy className="size-3.5" /> Copy link
                            </button>
                        </div>
                        <p className="text-xs text-[#8A8A96]">Your public storefront is accessible at this address across all devices.</p>
                    </div>
                </SectionCard>

                <SectionCard icon={<Globe className="size-5" />} tone="bg-[#E1F6F3] text-[#0D9488]" title="SEO & Custom Meta Tags" description="Customize how your storefront appears in Google search results and social previews.">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="meta_title" className="text-sm font-semibold text-[#14141B]">Meta title</Label>
                                <span className="font-mono text-xs text-[#8A8A96]">{form.meta_title.length} / 70</span>
                            </div>
                            <input id="meta_title" value={form.meta_title} onChange={(e) => update('meta_title', e.target.value)} maxLength={70} placeholder={store.display_name} className="w-full rounded-lg bg-[#F6F5F2] px-3.5 py-2.5 text-sm text-[#14141B] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="meta_description" className="text-sm font-semibold text-[#14141B]">Meta description</Label>
                                <span className="font-mono text-xs text-[#8A8A96]">{form.meta_description.length} / 200</span>
                            </div>
                            <textarea id="meta_description" value={form.meta_description} onChange={(e) => update('meta_description', e.target.value)} rows={3} maxLength={200} placeholder="Welcome to my store!" className="w-full resize-none rounded-lg bg-[#F6F5F2] px-3.5 py-2.5 text-sm leading-relaxed text-[#14141B] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-bold tracking-wider text-[#8A8A96] uppercase">Search engine preview (Google)</span>
                            <div className="flex flex-col gap-1.5 rounded-xl bg-[#F6F5F2] p-4">
                                <div className="flex items-center gap-1.5 text-xs text-[#202124]">
                                    <span className="flex size-4 items-center justify-center rounded-full bg-[#EEF2FF] text-[10px] font-bold text-[#4F46E5]">K</span>
                                    <span className="truncate font-medium">https://creatorapp.in › {form.username}</span>
                                </div>
                                <span className="cursor-pointer text-lg leading-snug text-[#1a0dab] hover:underline">{form.meta_title || `${store.display_name} — Creator Store`}</span>
                                <p className="text-xs leading-relaxed text-[#4d5156]">{form.meta_description || 'Welcome to my store! Explore courses, e-books and 1:1 mentorship sessions.'}</p>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                <SectionCard icon={<Monitor className="size-5" />} title="Desktop View & Store Layout" description="Choose how your storefront adapts when viewed on desktop browsers.">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[
                            { value: 'single', title: 'Single column (Centered)', desc: 'Clean, mobile-first feed centered on wide monitors. Best for personal creator stores.' },
                            { value: 'double', title: 'Two columns (Grid & Sidebar)', desc: 'Expansive catalog layout with persistent profile sidebar for high volume.' },
                        ].map((option) => {
                            const selected = form.column_layout === option.value;
                            return (
                                <button key={option.value} type="button" onClick={() => update('column_layout', option.value as 'single' | 'double', true)} className={cn('flex flex-col gap-3 rounded-xl p-4 text-left transition', selected ? 'bg-[#F6F5F2] ring-2 ring-[#4F46E5]' : 'bg-white ring-1 ring-[#E4E2DA] hover:bg-[#F6F5F2]')}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[#14141B]">{option.title}</span>
                                        <span className={cn('flex size-4 items-center justify-center rounded-full border', selected ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-[#CCC9BD]')}>{selected && <Check className="size-3 text-white" />}</span>
                                    </div>
                                    <p className="text-xs text-[#8A8A96]">{option.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </SectionCard>

                <SectionCard icon={<AlertTriangle className="size-5" />} tone="bg-[#FFEDE8] text-[#FF6B4A]" title="Sensitive content warning" description="Show an explicit gatekeeper warning before visitors browse your store.">
                    <label className="flex items-center gap-3">
                        <input type="checkbox" checked={form.sensitive_content_warning} onChange={(e) => update('sensitive_content_warning', e.target.checked, true)} className="size-4 accent-[#4F46E5]" />
                        <span className="text-sm font-medium text-[#14141B]">Require visitors to acknowledge restricted content before proceeding</span>
                    </label>
                </SectionCard>

                <SectionCard icon={<BarChart3 className="size-5" />} tone="bg-[#E1F6F3] text-[#0D9488]" title="Analytics & Conversion Tracking" description="Track visitor engagement and advertising return via server-side pixel pings.">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="fb_pixel_id" className="flex items-center gap-1.5 text-sm font-semibold text-[#14141B]">
                                Facebook Pixel ID <Info className="size-3.5 text-[#8A8A96]" />
                            </Label>
                            <div className="relative flex items-center">
                                <Facebook className="absolute left-3 size-4 text-[#8A8A96]" />
                                <input id="fb_pixel_id" value={form.fb_pixel_id} onChange={(e) => update('fb_pixel_id', e.target.value)} maxLength={50} placeholder="123456789012345" className="w-full rounded-lg bg-[#F6F5F2] py-2.5 pr-3.5 pl-9 font-mono text-sm text-[#14141B] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20" />
                            </div>
                            <p className="text-xs text-[#8A8A96]">Triggers ViewContent, InitiateCheckout, and Purchase events.</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="ga_tracking_id" className="flex items-center gap-1.5 text-sm font-semibold text-[#14141B]">
                                Google Analytics ID (GA4) <Info className="size-3.5 text-[#8A8A96]" />
                            </Label>
                            <div className="relative flex items-center">
                                <TrendingUp className="absolute left-3 size-4 text-[#8A8A96]" />
                                <input id="ga_tracking_id" value={form.ga_tracking_id} onChange={(e) => update('ga_tracking_id', e.target.value)} maxLength={50} placeholder="G-XXXXXXXXXX" className="w-full rounded-lg bg-[#F6F5F2] py-2.5 pr-3.5 pl-9 font-mono text-sm text-[#14141B] uppercase outline-none transition focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20" />
                            </div>
                            <p className="text-xs text-[#8A8A96]">Real-time engagement telemetry sent to your Google Data Streams.</p>
                        </div>
                    </div>
                </SectionCard>
            </div>

            <MobilePreview displayName={store.display_name} bio={store.bio ?? ''} isLive={store.is_live} theme={store.appearance?.theme ?? 'classic'} brandColor={brandHex(store.appearance?.brand_color)} backgroundUrl={store.appearance?.custom_background_path ? `/assets/${store.appearance.custom_background_path}` : null} columnLayout={form.column_layout} avatar={store.avatar ? `/assets/${store.avatar}` : null} socials={store.social_links} buttons={store.header_buttons} />

            <FixedSaveBar status={status} onSave={flushNow} saving={status === 'saving'} />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  ANALYTICS TAB                                                      */
/* ------------------------------------------------------------------ */

function KpiCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
    return (
        <div className="flex flex-col justify-between rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-[#8A8A96] uppercase">{label}</span>
                <span className={cn('flex size-6 items-center justify-center rounded-md', tone)}>{icon}</span>
            </div>
            <span className="mt-3 text-2xl font-semibold tracking-tight text-[#14141B]">{value}</span>
        </div>
    );
}

function SimpleListCard({ title, icon, items, valueLabel, emptyText }: { title: string; icon: React.ReactNode; items?: { label: string; value: number }[]; valueLabel: string; emptyText: string }) {
    const hasItems = (items?.length ?? 0) > 0;
    const max = Math.max(1, ...(items?.map((i) => i.value) ?? [1]));
    return (
        <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-[#8A8A96]">{icon}</span>
                <h3 className="text-base font-semibold text-[#14141B]">{title}</h3>
            </div>
            {!hasItems ? (
                <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E4E2DA] bg-[#FAF9F5] py-8 text-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#ECEBE6] text-[#8A8A96]">{icon}</span>
                    <p className="max-w-xs px-4 text-sm text-[#8A8A96]">{emptyText}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {items?.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm text-[#14141B]">{item.label}</span>
                                <span className="shrink-0 text-sm font-semibold text-[#14141B]">{item.value.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0EFEA]">
                                <div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${(item.value / max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                    <span className="text-[11px] text-[#8A8A96]">Measured in {valueLabel}</span>
                </div>
            )}
        </div>
    );
}

function AnalyticsTab({ analytics, store }: { analytics?: AnalyticsData; store: Store }) {
    const [days, setDays] = useState(analytics?.days ?? 7);
    const [refreshing, setRefreshing] = useState(false);
    const totals = analytics?.totals;
    const daily = analytics?.daily ?? [];
    const maxViews = Math.max(1, ...daily.map((d) => d.views));
    const totalClicks = analytics?.top_clicks.reduce((sum, c) => sum + c.clicks, 0) ?? 0;
    const ctr = totals && totals.page_views > 0 ? ((totalClicks / totals.page_views) * 100).toFixed(1) : '0';

    function changeDays(next: number) {
        setDays(next);
        setRefreshing(true);
        router.get('/dashboard/store/analytics', { days: next }, { preserveState: true, preserveScroll: true, onFinish: () => setRefreshing(false) });
    }

    function refresh() {
        setRefreshing(true);
        router.get('/dashboard/store/analytics', { days }, { preserveState: true, preserveScroll: true, onFinish: () => setRefreshing(false) });
    }

    return (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 pb-24">
            <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Store analytics</h1>
                        <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">Live Sync</span>
                    </div>
                    <p className="text-sm text-[#8A8A96]">Where your visitors come from, and what they do across {store.display_name}.</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
                    {[7, 30, 90].map((option) => (
                        <button key={option} type="button" onClick={() => changeDays(option)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', days === option ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#8A8A96] hover:text-[#14141B]')}>
                            Last {option} days
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <KpiCard label="Visits" value={(totals?.page_views ?? 0).toLocaleString('en-IN')} icon={<Eye className="size-3.5" />} tone="bg-[#EEF2FF] text-[#4F46E5]" />
                <KpiCard label="Unique" value={(totals?.unique_visitors ?? 0).toLocaleString('en-IN')} icon={<Users className="size-3.5" />} tone="bg-[#E1F6F3] text-[#0D9488]" />
                <KpiCard label="Clicks" value={totalClicks.toLocaleString('en-IN')} icon={<MousePointerClick className="size-3.5" />} tone="bg-[#FFEDE8] text-[#FF6B4A]" />
                <KpiCard label="CTR" value={`${ctr}%`} icon={<TrendingUp className="size-3.5" />} tone="bg-[#F1EAFE] text-[#7C3AED]" />
                <KpiCard label="Sales" value={(totals?.sales ?? 0).toLocaleString('en-IN')} icon={<ShoppingBag className="size-3.5" />} tone="bg-[#FFF4DB] text-[#B46E00]" />
                <KpiCard label="Revenue" value={formatCurrency(totals?.revenue ?? 0)} icon={<BarChart3 className="size-3.5" />} tone="bg-[#E6F6EC] text-[#059669]" />
            </div>

            <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-base font-semibold text-[#14141B]">Visits & clicks over time</h2>
                        <p className="text-xs text-[#8A8A96]">Daily breakdown of storefront traffic</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#4F46E5]" /> <span className="font-medium text-[#14141B]">Visits</span></span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#FF6B4A]" /> <span className="text-[#8A8A96]">Clicks</span></span>
                    </div>
                </div>
                <div className={cn('flex h-56 items-end gap-2 overflow-x-auto transition-opacity', refreshing && 'opacity-50')}>
                    {daily.length === 0 && <p className="w-full py-16 text-center text-sm text-[#8A8A96]">No traffic recorded in this period.</p>}
                    {daily.map((day) => (
                        <div key={day.day} className="flex min-w-[28px] flex-1 flex-col items-center gap-2">
                            <div className="flex w-full flex-1 items-end justify-center">
                                <div className="w-full rounded-t-md bg-gradient-to-t from-[#4F46E5]/70 to-[#4F46E5] transition-all" style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: '4px' }} title={`${day.views} views`} />
                            </div>
                            <span className="text-[10px] whitespace-nowrap text-[#8A8A96]">{new Date(day.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 border-t border-[#E4E2DA]/40 pt-3 text-xs text-[#8A8A96]">
                    <Sparkles className="size-3.5 text-[#4F46E5]" />
                    Looking quiet? Share your link on WhatsApp status or Instagram bio.
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SimpleListCard title="Top Referrers" icon={<Link2 className="size-4" />} items={analytics?.top_referrers.map((r) => ({ label: r.referrer || 'Direct / Unknown', value: r.views }))} valueLabel="visits" emptyText="No referrer data in this period." />
                <SimpleListCard title="Top Pages" icon={<Eye className="size-4" />} items={analytics?.top_pages.map((p) => ({ label: p.page_path, value: p.views }))} valueLabel="views" emptyText="No page views recorded yet." />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[#14141B]">Devices</h3>
                        <span className="text-xs text-[#8A8A96]">{(totals?.page_views ?? 0).toLocaleString('en-IN')} total</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        {(analytics?.devices.length ?? 0) === 0 && <p className="py-6 text-center text-sm text-[#8A8A96]">No device data yet.</p>}
                        {analytics?.devices.map((device) => {
                            const pct = totals?.page_views ? Math.round((device.total / totals.page_views) * 100) : 0;
                            const Icon = device.device === 'mobile' ? Smartphone : device.device === 'tablet' ? Tablet : Monitor;
                            return (
                                <div key={device.device ?? 'unknown'} className="flex items-center justify-between rounded-xl bg-[#F6F5F2] p-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[#4F46E5] shadow-sm">
                                            <Icon className="size-4" />
                                        </span>
                                        <span className="text-sm font-semibold text-[#14141B] capitalize">{device.device ?? 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-bold text-[#4F46E5]">{device.total}</span>
                                        <span className="text-xs text-[#8A8A96]">({pct}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <SimpleListCard title="Most Clicked" icon={<MousePointerClick className="size-4" />} items={analytics?.top_clicks.map((c) => ({ label: c.element_label ?? 'Unknown', value: c.clicks }))} valueLabel="clicks" emptyText="No outbound button or community link activity recorded in this timeframe." />
            </div>

            {/* Fixed bar for analytics (no phone preview here) */}
            <FixedSaveBar
                status={refreshing ? 'saving' : 'saved'}
                right={
                    <Button type="button" variant="outline" onClick={refresh} disabled={refreshing} className="border-[#E4E2DA]">
                        <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /> Refresh data
                    </Button>
                }
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  MAIN                                                               */
/* ------------------------------------------------------------------ */

export default function StoreEdit({ store, tab = 'profile', analytics }: StoreEditProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Store" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                {/* Sticky top header (tab navigation) */}
                <div className="sticky top-0 z-30 border-b border-[#E4E2DA] bg-[#F6F5F2]/95 backdrop-blur-md">
                    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6">
                        <TabNav active={tab} />
                    </div>
                </div>

                <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-6 md:px-6">
                    <div>
                        {tab === 'profile' && <StoreTab store={store} />}
                        {tab === 'appearance' && <AppearanceTab store={store} />}
                        {tab === 'settings' && <SettingsTab store={store} />}
                        {tab === 'analytics' && <AnalyticsTab analytics={analytics} store={store} />}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
