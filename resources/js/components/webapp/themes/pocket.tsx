import { cn } from '@/lib/utils';
import { Home, Info, Video } from 'lucide-react';
import { useState } from 'react';
import { Avatar, CoverArt, Price, SensitiveNote, sessionLength, Socials, typeLabel } from '../shared';
import { splitCatalog, type WebappData } from '../types';

type Tab = 'home' | 'sessions' | 'about';

/** Pocket (pro) — asli app jaisa: bottom tab bar, har tab ka apna screen. Install karne par sabse natural lagta hai. */
export function PocketTheme({ data }: { data: WebappData }) {
    const { items, sessions } = splitCatalog(data.products);
    const brand = data.brandColor;
    const [tab, setTab] = useState<Tab>('home');

    const tabs: { key: Tab; label: string; icon: typeof Home; show: boolean }[] = [
        { key: 'home', label: 'Home', icon: Home, show: true },
        { key: 'sessions', label: 'Sessions', icon: Video, show: sessions.length > 0 },
        { key: 'about', label: 'About', icon: Info, show: true },
    ];
    const visibleTabs = tabs.filter((t) => t.show);

    return (
        <div className="flex min-h-full flex-col bg-[#F4F5F7] text-[#14141B]">
            <header className="px-5 pt-8 pb-5" style={{ background: brand, color: '#fff' }}>
                <div className="mx-auto max-w-xl">
                <div className="flex items-center gap-3">
                    <Avatar name={data.store.display_name} src={data.store.avatar} className="size-12 rounded-2xl border border-white/30 text-white" />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-extrabold tracking-tight">{data.store.display_name}</p>
                        <p className="truncate text-xs text-white/70">@{data.creator.username}</p>
                    </div>
                </div>
                {tab === 'home' && data.store.welcome && <p className="mt-4 text-sm text-white/85">{data.store.welcome}</p>}
                </div>
            </header>

            {/* desktop pe bhi app jaisa hi lage — content ek centered column me */}
            <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-8">
                {tab === 'home' && (
                    <div className="flex flex-col gap-2.5">
                        {items.length === 0 && <EmptyNote />}
                        {items.map((product) => (
                            <a key={product.id} href={product.url} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm active:scale-[0.99]">
                                <CoverArt product={product} className="size-14 shrink-0 rounded-xl text-[#14141B]" iconClass="size-5 opacity-40" />
                                <span className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: brand }}>
                                        {typeLabel(product.type)}
                                    </span>
                                    <span className="block truncate text-sm font-bold">{product.title}</span>
                                    <Price product={product} className="text-xs font-semibold text-[#6B6B78]" />
                                </span>
                            </a>
                        ))}
                    </div>
                )}

                {tab === 'sessions' && (
                    <div className="flex flex-col gap-2.5">
                        {sessions.map((session) => (
                            <a key={session.id} href={session.url} className="rounded-2xl bg-white p-4 shadow-sm active:scale-[0.99]">
                                <span className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: brand }}>
                                        <Video className="size-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold">{session.title}</span>
                                        <span className="text-xs text-[#6B6B78]">{sessionLength(session)}</span>
                                    </span>
                                    <Price product={session} className="text-sm font-bold" />
                                </span>
                                {session.description && <span className="mt-2.5 block line-clamp-2 text-xs text-[#6B6B78]">{session.description}</span>}
                            </a>
                        ))}
                    </div>
                )}

                {tab === 'about' && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <h2 className="text-[11px] font-bold tracking-[0.18em] text-[#8A8A96] uppercase">About</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#4B4B57]">
                                {data.store.bio || `Everything by ${data.store.display_name}, in one place.`}
                            </p>
                            {data.store.sensitive && <SensitiveNote className="mt-3 text-[#8A8A96]" />}
                        </div>
                        {data.socials.length > 0 && (
                            <div className="rounded-2xl bg-white p-5 shadow-sm">
                                <h2 className="text-[11px] font-bold tracking-[0.18em] text-[#8A8A96] uppercase">Follow</h2>
                                <Socials socials={data.socials} className="mt-3" itemClassName="bg-[#F4F5F7] text-[#4B4B57] hover:bg-[#E9EAEE]" />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* bottom tab bar — sticky (fixed nahi) taaki dashboard ke preview frame ke andar bhi sahi rahe,
                aur safe-area padding se installed app me home indicator ke upar baithe */}
            <nav
                className="sticky bottom-0 z-10 mx-auto flex w-full max-w-xl items-stretch border-t border-black/5 bg-white/95 backdrop-blur"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                {visibleTabs.map((item) => {
                    const active = tab === item.key;

                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setTab(item.key)}
                            className={cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition', !active && 'text-[#8A8A96]')}
                            style={active ? { color: brand } : undefined}
                        >
                            <item.icon className="size-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

function EmptyNote() {
    return <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#8A8A96] shadow-sm">Nothing published yet — check back soon.</p>;
}
