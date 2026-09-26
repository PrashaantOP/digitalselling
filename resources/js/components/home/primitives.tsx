import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Element viewport me aate hi ek baar true — scroll pe fade-in ke liye. */
export function useInView<T extends Element>(threshold = 0.15) {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;
        // purane browser / SSR fallback: seedha dikha do
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    io.disconnect();
                }
            },
            { threshold, rootMargin: '0px 0px -40px 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [threshold, inView]);

    return { ref, inView };
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
    const { ref, inView } = useInView<HTMLDivElement>();

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn(
                'transition-all duration-700 ease-out motion-reduce:transition-none',
                inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function SectionHeading({
    eyebrow,
    title,
    description,
    align = 'center',
    tone = 'light',
}: {
    eyebrow: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'center' | 'left';
    tone?: 'light' | 'dark';
}) {
    return (
        <Reveal className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
            <span
                className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase ring-1',
                    tone === 'light' ? 'bg-blue-50 text-blue-700 ring-blue-100' : 'bg-white/10 text-blue-100 ring-white/15',
                )}
            >
                <span className={cn('size-1.5 rounded-full', tone === 'light' ? 'bg-blue-600' : 'bg-blue-300')} />
                {eyebrow}
            </span>
            <h2
                className={cn(
                    'mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]',
                    tone === 'light' ? 'text-slate-900' : 'text-white',
                )}
            >
                {title}
            </h2>
            {description && (
                <p className={cn('mt-4 text-base leading-relaxed text-pretty sm:text-lg', tone === 'light' ? 'text-slate-600' : 'text-blue-100/80')}>
                    {description}
                </p>
            )}
        </Reveal>
    );
}

export function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
    return (
        <span className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30">
                <svg
                    viewBox="0 0 24 24"
                    className="size-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4 7l8-4 8 4-8 4-8-4z" />
                    <path d="M4 12l8 4 8-4" />
                    <path d="M4 17l8 4 8-4" />
                </svg>
            </span>
            <span className={cn('text-lg font-semibold tracking-tight', tone === 'dark' ? 'text-slate-900' : 'text-white')}>
                Digital<span className={tone === 'dark' ? 'text-blue-600' : 'text-blue-300'}>Selling</span>
            </span>
        </span>
    );
}

export const primaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-700/30 focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:outline-none';

export const secondaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-300 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:outline-none';
