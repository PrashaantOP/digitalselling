import { ArrowRight, Video } from 'lucide-react';
import { Avatar, CoverArt, Price, SensitiveNote, sessionLength, Socials, typeLabel } from '../shared';
import { splitCatalog, type WebappData } from '../types';

/** Aurora (free) — gradient hero + stacked cards. Sabse simple, mobile-first. */
export function AuroraTheme({ data }: { data: WebappData }) {
    const { items, sessions } = splitCatalog(data.products);
    const brand = data.brandColor;

    return (
        <div className="min-h-full bg-[#F7F7FB] pb-16 text-[#14141B]">
            {/* hero */}
            <header
                className="relative overflow-hidden px-6 pt-12 pb-20 text-white sm:pt-16 sm:pb-24 lg:pt-24 lg:pb-32"
                style={{ background: `linear-gradient(160deg, ${brand} 0%, ${brand}CC 45%, #14141B 100%)` }}
            >
                <span className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/15 blur-3xl lg:size-96" />
                <div className="relative mx-auto flex max-w-xl flex-col items-center text-center lg:max-w-2xl">
                    <Avatar name={data.store.display_name} src={data.store.avatar} className="size-20 rounded-3xl border-2 border-white/30 text-white sm:size-24" />
                    <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl lg:text-[40px] lg:leading-[1.1]">
                        {data.store.heading || data.store.display_name}
                    </h1>
                    {data.store.welcome && <p className="mt-1.5 text-sm text-white/80 sm:text-base">{data.store.welcome}</p>}
                    {data.store.bio && <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px] lg:max-w-xl">{data.store.bio}</p>}
                    <Socials socials={data.socials} className="mt-5 justify-center" itemClassName="bg-white/15 text-white hover:bg-white/25" />
                    {data.store.sensitive && <SensitiveNote className="mt-4 text-white/70" />}
                </div>
            </header>

            <main className="mx-auto -mt-12 flex max-w-xl flex-col gap-8 px-4 sm:px-6 lg:-mt-16 lg:max-w-5xl lg:gap-12">
                {items.length > 0 && (
                    <section className="flex flex-col gap-3">
                        <h2 className="px-1 text-[11px] font-bold tracking-[0.18em] text-[#8A8A96] uppercase">Products</h2>
                        {/* bade screens pe cards do column me — chhote pe stacked hi rehte hain */}
                        <div className="grid gap-3 lg:grid-cols-2">
                        {items.map((product) => (
                            <a
                                key={product.id}
                                href={product.url}
                                className="group flex items-center gap-3.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <CoverArt product={product} className="size-16 shrink-0 rounded-xl text-[#14141B]" iconClass="size-6 opacity-40" />
                                <span className="min-w-0 flex-1">
                                    <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: brand }}>
                                        {typeLabel(product.type)}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[15px] font-bold">{product.title}</span>
                                    <Price product={product} className="text-[13px] font-semibold text-[#4B4B57]" />
                                </span>
                                <ArrowRight className="size-4 shrink-0 text-[#C9C6BC] transition group-hover:translate-x-0.5" style={{ color: brand }} />
                            </a>
                        ))}
                        </div>
                    </section>
                )}

                {sessions.length > 0 && (
                    <section className="flex flex-col gap-3">
                        <h2 className="px-1 text-[11px] font-bold tracking-[0.18em] text-[#8A8A96] uppercase">Book a session</h2>
                        <div className="grid gap-3 lg:grid-cols-2">
                        {sessions.map((session) => (
                            <a
                                key={session.id}
                                href={session.url}
                                className="flex items-center gap-3.5 rounded-2xl border border-dashed p-3.5 transition hover:bg-white"
                                style={{ borderColor: `${brand}55` }}
                            >
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-white" style={{ background: brand }}>
                                    <Video className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-bold">{session.title}</span>
                                    <span className="text-xs text-[#6B6B78]">{sessionLength(session)}</span>
                                </span>
                                <Price product={session} className="text-[13px] font-bold" />
                            </a>
                        ))}
                        </div>
                    </section>
                )}

                {data.store.bio && (
                    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                        <h2 className="text-[11px] font-bold tracking-[0.18em] text-[#8A8A96] uppercase">About</h2>
                        <p className="mt-2 text-sm leading-relaxed text-[#4B4B57]">{data.store.bio}</p>
                        <p className="mt-3 text-xs text-[#8A8A96]">@{data.creator.username}</p>
                    </section>
                )}

                {data.products.length === 0 && (
                    <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#8A8A96] shadow-sm">Nothing published yet — check back soon.</p>
                )}
            </main>
        </div>
    );
}
