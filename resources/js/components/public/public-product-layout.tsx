import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

/* Public product pages (Book / Locked content) ka common frame: accent strip, creator header, 2-column body, footer. */

export type PublicCreator = { name: string; username: string; avatar: string | null };

export const assetPath = (path: string | null) => (path ? `/assets/${path}` : '');

export const resolvePublicAccent = (color: string | null | undefined) => (/^#[0-9A-Fa-f]{6}$/.test(color ?? '') ? (color as string) : '#4F46E5');

export function SectionLabel({ accent, children }: { accent: string; children: ReactNode }) {
    return (
        <h3 className="mb-3 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {children}
        </h3>
    );
}

/** Terms / refund / privacy — sirf jo creator ne bhare hon. */
export function PoliciesSection({
    accent,
    product,
}: {
    accent: string;
    product: { terms_and_conditions: string | null; refund_policy: string | null; privacy_policy: string | null };
}) {
    const policies = (
        [
            ['Terms & conditions', product.terms_and_conditions],
            ['Refund policy', product.refund_policy],
            ['Privacy policy', product.privacy_policy],
        ] as const
    ).filter(([, body]) => body?.trim());

    if (policies.length === 0) return null;

    return (
        <div>
            <SectionLabel accent={accent}>Policies</SectionLabel>
            <div className="flex flex-col gap-2">
                {policies.map(([title, body]) => (
                    <details key={title} className="group rounded-xl border border-[#E4E2DA] bg-white px-4 py-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#14141B]">
                            {title}
                            <ChevronDown className="size-4 shrink-0 text-[#6B6B78] transition group-open:rotate-180" />
                        </summary>
                        <p className="mt-1.5 text-sm whitespace-pre-line text-[#6B6B78]">{body}</p>
                    </details>
                ))}
            </div>
        </div>
    );
}

export function PublicProductLayout({
    title,
    accent,
    creator,
    children,
    aside,
}: {
    title: string;
    accent: string;
    creator: PublicCreator;
    children: ReactNode;
    aside: ReactNode;
}) {
    const appName = usePage<SharedData>().props.name;

    return (
        <>
            <Head title={title} />
            <main className="flex min-h-screen flex-col bg-[#FAF9F5] text-[#14141B]">
                <div className="h-1" style={{ backgroundColor: accent }} />
                <header>
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
                        <Link href={`/${creator.username}`} className="flex min-w-0 items-center gap-2.5 transition hover:opacity-70">
                            {creator.avatar ? (
                                <img src={assetPath(creator.avatar)} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                            ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E4E2DA] text-xs font-bold text-[#4B4B57]">
                                    {(creator.name || creator.username || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                            <span className="truncate text-sm font-bold">{creator.name || creator.username}</span>
                        </Link>
                        <span className="shrink-0 text-xs text-[#6B6B78]">
                            Built with <span aria-hidden="true">♥</span> on <span className="font-semibold text-[#14141B]">{appName}</span>
                        </span>
                    </div>
                </header>

                <section className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
                    <div className="flex min-w-0 flex-col gap-8">{children}</div>
                    {aside}
                </section>

                <footer className="py-5 text-center text-xs text-[#6B6B78]">
                    Built with <span className="font-semibold text-[#14141B]">{appName}</span>
                </footer>
            </main>
        </>
    );
}
