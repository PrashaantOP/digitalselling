import { Video } from 'lucide-react';
import { Avatar, CoverArt, Price, SensitiveNote, sessionLength, Socials, typeLabel } from '../shared';
import { splitCatalog, type WebappData } from '../types';

/** Grid (pro) — dark sticky header + 2-column catalogue. Zyada products wale creators ke liye. */
export function GridTheme({ data }: { data: WebappData }) {
    const { items, sessions } = splitCatalog(data.products);
    const brand = data.brandColor;

    return (
        <div className="min-h-full bg-[#0B0B12] pb-16 text-white">
            <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B0B12]/90 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 lg:max-w-6xl lg:px-6">
                    <Avatar name={data.store.display_name} src={data.store.avatar} className="size-10 rounded-full text-white" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{data.store.display_name}</p>
                        <p className="truncate text-[11px] text-white/50">@{data.creator.username}</p>
                    </div>
                    <Socials socials={data.socials} itemClassName="bg-white/10 text-white hover:bg-white/20" />
                </div>
            </header>

            <div className="mx-auto max-w-3xl px-4 lg:max-w-6xl lg:px-6">
                <section className="border-b border-white/10 py-10">
                    <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl lg:text-5xl">{data.store.heading || data.store.display_name}</h1>
                    {data.store.welcome && (
                        <p className="mt-2 text-sm font-semibold" style={{ color: brand }}>
                            {data.store.welcome}
                        </p>
                    )}
                    {data.store.bio && <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">{data.store.bio}</p>}
                    {data.store.sensitive && <SensitiveNote className="mt-4 text-white/50" />}
                </section>

                {items.length > 0 && (
                    <section className="py-8">
                        <h2 className="mb-4 text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase">Catalogue</h2>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                            {items.map((product) => (
                                <a
                                    key={product.id}
                                    href={product.url}
                                    className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/25 hover:bg-white/10"
                                >
                                    <CoverArt product={product} className="aspect-[4/3] w-full text-white" iconClass="size-7 opacity-30" />
                                    <span className="block p-3">
                                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: brand }}>
                                            {typeLabel(product.type)}
                                        </span>
                                        <span className="mt-1 block line-clamp-2 text-[13px] leading-snug font-bold">{product.title}</span>
                                        <Price product={product} className="mt-1.5 text-[13px] font-semibold text-white/70" />
                                    </span>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {sessions.length > 0 && (
                    <section className="border-t border-white/10 py-8">
                        <h2 className="mb-4 text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase">Sessions</h2>
                        <div className="grid gap-2.5 lg:grid-cols-2">
                            {sessions.map((session) => (
                                <a
                                    key={session.id}
                                    href={session.url}
                                    className="flex items-center gap-3 rounded-xl border border-white/10 p-3.5 transition hover:bg-white/5"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${brand}33`, color: brand }}>
                                        <Video className="size-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold">{session.title}</span>
                                        <span className="text-xs text-white/50">{sessionLength(session)}</span>
                                    </span>
                                    <Price product={session} className="text-sm font-bold" />
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                <section className="border-t border-white/10 py-8">
                    <h2 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase">About this store</h2>
                    <p className="text-sm leading-relaxed text-white/60">{data.store.bio || `Everything by ${data.store.display_name}, in one place.`}</p>
                </section>

                {data.products.length === 0 && <p className="py-12 text-center text-sm text-white/40">Nothing published yet — check back soon.</p>}
            </div>
        </div>
    );
}
