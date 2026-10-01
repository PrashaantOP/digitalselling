import { Button } from '@/components/ui/button';
import { WebappView } from '@/components/webapp/webapp-view';
import { WEBAPP_THEMES, type WebappData, type WebappThemeSlug } from '@/components/webapp/types';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Check, ExternalLink, EyeOff, Loader2, Lock, Monitor, Smartphone, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Web App', href: '/dashboard/web-app' }];

interface ThemeRow {
    slug: WebappThemeSlug;
    name: string;
    tagline: string;
    pro: boolean;
    locked: boolean;
}

interface Props {
    themes: ThemeRow[];
    isPro: boolean;
    isLive: boolean;
    preview: WebappData;
}

// preview.theme hamesha "jo abhi live hai" hota hai (WebappThemes::resolve) — gallery bhi wahi highlight karti hai
export default function WebappIndex({ themes, isPro, isLive, preview }: Props) {
    // preview turant badle (server round-trip ka intezaar nahi), save background me hota hai
    const [active, setActive] = useState<WebappThemeSlug>(preview.theme);
    const [saving, setSaving] = useState<WebappThemeSlug | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

    useEffect(() => setActive(preview.theme), [preview.theme]);
    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(null), 5000);
        return () => window.clearTimeout(t);
    }, [notice]);

    function apply(theme: ThemeRow) {
        if (theme.locked || saving) return;

        setActive(theme.slug);
        setSaving(theme.slug);
        router.put(
            '/dashboard/web-app',
            { theme: theme.slug },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setNotice(`${theme.name} is now live on your web app.`),
                onError: () => setActive(preview.theme),
                onFinish: () => setSaving(null),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Web App" />
            <div className="flex flex-1 flex-col bg-[#F6F5F2]">
                <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    {/* Title */}
                    <div className="flex flex-col justify-between gap-3 pt-1 md:flex-row md:items-center">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-[#14141B]">Web App</h1>
                                <span className="rounded-full bg-[#EEF0FF] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#4F46E5] uppercase">
                                    Installable
                                </span>
                            </div>
                            <p className="text-sm text-[#8A8A96]">
                                Pick a design — your products, sessions and store details fill it in automatically.
                            </p>
                        </div>
                        <a
                            href={preview.webappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-white px-3.5 text-sm font-medium text-[#4B4B57] transition hover:bg-[#F6F5F2]"
                        >
                            <ExternalLink className="size-3.5" /> Open web app
                        </a>
                    </div>

                    {notice && (
                        <div role="status" className="flex items-center gap-2 rounded-xl bg-[#E6F6EC] p-3.5 text-[13px] font-semibold text-[#059669]">
                            <Check className="size-4" /> {notice}
                        </div>
                    )}

                    {!isLive && (
                        <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                            <div className="flex items-start gap-3.5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF4DB] text-[#B46E00]">
                                    <EyeOff className="size-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-[#14141B]">Your store is offline</p>
                                    <p className="mt-0.5 text-xs text-[#8A8A96]">Only you can see the web app — visitors get a 404 until your store is live.</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/store"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] px-4 text-sm font-medium text-white transition hover:bg-[#4338CA]"
                            >
                                Go live
                            </Link>
                        </div>
                    )}

                    {/* left = themes, right = live preview (preview ko zyada jagah di hai) */}
                    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
                        {/* Theme gallery */}
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                                {themes.map((theme) => {
                                    const meta = WEBAPP_THEMES[theme.slug];
                                    const isActive = active === theme.slug;
                                    const busy = saving === theme.slug;

                                    return (
                                        <div
                                            key={theme.slug}
                                            className={cn(
                                                'flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition',
                                                isActive ? 'ring-2 ring-[#4F46E5]' : 'ring-1 ring-black/5 hover:shadow-md',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => (theme.locked ? undefined : apply(theme))}
                                                disabled={theme.locked}
                                                className="relative block text-left disabled:cursor-not-allowed"
                                                aria-label={`Preview ${theme.name}`}
                                            >
                                                <span className={cn('flex h-28 items-end bg-gradient-to-br p-3', meta.swatch)}>
                                                    <span className="rounded-md bg-black/25 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                                                        {meta.name}
                                                    </span>
                                                </span>
                                                {theme.locked && (
                                                    <span className="absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
                                                        <span className="flex items-center gap-1.5 rounded-full bg-[#14141B] px-3 py-1 text-[11px] font-bold text-white">
                                                            <Lock className="size-3" /> PRO
                                                        </span>
                                                    </span>
                                                )}
                                            </button>

                                            <div className="flex flex-1 flex-col gap-3 p-4">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1.5 text-sm font-bold text-[#14141B]">
                                                            {theme.name}
                                                            {theme.pro && (
                                                                <span className="rounded bg-[#F1EAFE] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#7C3AED] uppercase">
                                                                    Pro
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-[#8A8A96]">{theme.tagline}</p>
                                                    </div>
                                                    {isActive && !theme.locked && (
                                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white">
                                                            <Check className="size-3" />
                                                        </span>
                                                    )}
                                                </div>

                                                {theme.locked ? (
                                                    <Link
                                                        href="/dashboard/settings/billing"
                                                        className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#FF6B4A] px-3 text-xs font-bold text-white transition hover:bg-[#E85D3D]"
                                                    >
                                                        <Zap className="size-3.5" /> Unlock with Pro
                                                    </Link>
                                                ) : (
                                                    <Button
                                                        onClick={() => apply(theme)}
                                                        disabled={busy || isActive}
                                                        variant={isActive ? 'outline' : 'default'}
                                                        className={cn('mt-auto w-full', isActive ? 'border-[#E4E2DA] text-[#4B4B57]' : 'bg-[#4F46E5] hover:bg-[#4338CA]')}
                                                    >
                                                        {busy ? <Loader2 className="size-4 animate-spin" /> : isActive ? 'Applied' : 'Apply theme'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {!isPro && (
                                <div className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                                    <div className="flex items-start gap-3.5">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F1EAFE] text-[#7C3AED]">
                                            <Sparkles className="size-5" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-[#14141B]">3 more designs with Pro</p>
                                            <p className="mt-0.5 text-xs text-[#8A8A96]">
                                                Premium themes unlock the moment you upgrade — and if Pro ends, your web app falls back to the free
                                                theme on its own.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/dashboard/settings/billing"
                                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#FF6B4A] px-4 text-sm font-bold text-white transition hover:bg-[#E85D3D]"
                                    >
                                        <Zap className="size-4" /> Upgrade to Pro
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Live preview */}
                        <div className="flex flex-col gap-3 rounded-xl bg-[#14141B] p-4 shadow-sm xl:sticky xl:top-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-semibold text-white">Live preview</p>
                                    <p className="text-[11px] text-white/50">Your real data — this is exactly what buyers see.</p>
                                </div>
                                <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5">
                                    {(['mobile', 'desktop'] as const).map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setDevice(key)}
                                            aria-pressed={device === key}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                                                device === key ? 'bg-white text-[#14141B]' : 'text-white/60 hover:text-white',
                                            )}
                                        >
                                            {key === 'mobile' ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
                                            {key === 'mobile' ? 'Phone' : 'Desktop'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <div
                                    className={cn(
                                        'overflow-hidden bg-white shadow-2xl transition-all duration-300',
                                        device === 'mobile'
                                            ? 'h-[680px] w-[340px] rounded-[2.2rem] border-[10px] border-[#2A2A35]'
                                            : 'h-[680px] w-full rounded-xl border border-white/10',
                                    )}
                                >
                                    {/* desktop preview ko asli chaudai dene ke liye scale-down iframe jaisa treatment */}
                                    <div className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                        <WebappView data={{ ...preview, theme: active }} />
                                    </div>
                                </div>
                            </div>

                            <p className="text-center text-[11px] text-white/40">{preview.webappUrl.replace(/^https?:\/\//, '')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
