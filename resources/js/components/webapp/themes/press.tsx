import { ArrowUpRight } from 'lucide-react';
import { Avatar, CoverArt, Price, SensitiveNote, sessionLength, Socials, typeLabel } from '../shared';
import { splitCatalog, type WebappData } from '../types';

/** Press (pro) — editorial: off-white paper, badi serif typography, numbered rows. */
export function PressTheme({ data }: { data: WebappData }) {
    const { items, sessions } = splitCatalog(data.products);
    const brand = data.brandColor;
    const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

    return (
        <div className="min-h-full bg-[#FBFAF6] pb-16 text-[#171514]">
            <header className="border-b border-[#171514]/10">
                <div className="mx-auto max-w-2xl px-6 py-10 lg:max-w-3xl lg:py-16">
                    <div className="flex items-center gap-3">
                        <Avatar name={data.store.display_name} src={data.store.avatar} className="size-11 rounded-full text-[#171514]" />
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold tracking-[0.2em] text-[#171514]/50 uppercase">{data.store.display_name}</p>
                            <p className="truncate text-[11px] text-[#171514]/40">@{data.creator.username}</p>
                        </div>
                    </div>

                    <h1 className="mt-7 text-[34px] leading-[1.1] font-normal tracking-tight text-balance sm:text-[42px] lg:text-[56px]" style={serif}>
                        {data.store.heading || data.store.display_name}
                    </h1>
                    {data.store.welcome && <p className="mt-3 text-[15px] text-[#171514]/60 italic">{data.store.welcome}</p>}
                    <span className="mt-6 block h-px w-16" style={{ background: brand }} />
                    {data.store.bio && <p className="mt-6 text-[15px] leading-relaxed text-[#171514]/75">{data.store.bio}</p>}
                    <Socials socials={data.socials} className="mt-6" itemClassName="border border-[#171514]/15 text-[#171514]/70 hover:bg-[#171514] hover:text-white" />
                    {data.store.sensitive && <SensitiveNote className="mt-5 text-[#171514]/50" />}
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-6 lg:max-w-3xl">
                {items.length > 0 && (
                    <section className="py-10">
                        <h2 className="text-[11px] font-bold tracking-[0.2em] text-[#171514]/40 uppercase">The Catalogue</h2>
                        <div className="mt-6 divide-y divide-[#171514]/10 border-y border-[#171514]/10">
                            {items.map((product, index) => (
                                <a key={product.id} href={product.url} className="group flex items-start gap-5 py-5 transition hover:opacity-70">
                                    <span className="w-6 shrink-0 pt-1 text-[13px] tabular-nums text-[#171514]/30" style={serif}>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: brand }}>
                                            {typeLabel(product.type)}
                                        </span>
                                        <span className="mt-1 block text-[20px] leading-snug" style={serif}>
                                            {product.title}
                                        </span>
                                        {product.description && <span className="mt-1.5 block line-clamp-2 text-[13px] text-[#171514]/55">{product.description}</span>}
                                        <Price product={product} className="mt-2 block text-[13px] font-semibold" />
                                    </span>
                                    <CoverArt product={product} className="size-20 shrink-0 rounded-sm text-[#171514]" iconClass="size-6 opacity-25" />
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {sessions.length > 0 && (
                    <section className="pb-10">
                        <h2 className="text-[11px] font-bold tracking-[0.2em] text-[#171514]/40 uppercase">Work With Me</h2>
                        <div className="mt-5 grid gap-3 lg:grid-cols-2">
                            {sessions.map((session) => (
                                <a
                                    key={session.id}
                                    href={session.url}
                                    className="flex items-center justify-between gap-4 border border-[#171514]/12 px-5 py-4 transition hover:border-[#171514]/35"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-[17px]" style={serif}>
                                            {session.title}
                                        </span>
                                        <span className="text-xs tracking-wide text-[#171514]/50 uppercase">{sessionLength(session)}</span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2 text-[13px] font-semibold">
                                        <Price product={session} />
                                        <ArrowUpRight className="size-4" style={{ color: brand }} />
                                    </span>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                <section className="border-t border-[#171514]/10 py-10">
                    <h2 className="text-[11px] font-bold tracking-[0.2em] text-[#171514]/40 uppercase">Colophon</h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#171514]/70" style={serif}>
                        {data.store.bio || `Everything by ${data.store.display_name}, gathered in one place.`}
                    </p>
                </section>

                {data.products.length === 0 && <p className="py-12 text-center text-sm text-[#171514]/40">Nothing published yet — check back soon.</p>}
            </main>
        </div>
    );
}
