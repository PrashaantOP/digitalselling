import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Check, KeyRound, LoaderCircle, Palette, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';

/*
 | Account settings (Profile / Password / Security / Appearance) — dashboard ke theme me.
 | Desktop: left me nav card. Phone: upar side-scroll tabs. Neeche chhote reusable pieces (card, field, input, button).
 */

const NAV: { title: string; description: string; href: string; icon: LucideIcon }[] = [
    { title: 'Profile', description: 'Name and email', href: '/settings/profile', icon: UserRound },
    { title: 'Password', description: 'Change your password', href: '/settings/password', icon: KeyRound },
    { title: 'Security', description: 'Two-step & devices', href: '/settings/security', icon: ShieldCheck },
    { title: 'Appearance', description: 'Light or dark', href: '/settings/appearance', icon: Palette },
];

/** /dashboard/settings/profile bhi isi Profile page pe aata hai — dono ko "Profile" maano */
function isActive(path: string, href: string) {
    return path === href || (href === '/settings/profile' && path === '/dashboard/settings/profile');
}

export default function SettingsLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="flex flex-1 flex-col bg-cp-canvas">
            <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                <div className="flex flex-col gap-1 pt-1">
                    <h1 className="text-2xl font-bold tracking-tight text-cp-ink">Account settings</h1>
                    <p className="text-sm text-cp-muted">Your profile, password and how you sign in.</p>
                </div>

                {/* phone: tabs */}
                <nav data-scroll-x aria-label="Settings" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
                    {NAV.map((item) => {
                        const active = isActive(currentPath, item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition',
                                    active ? 'bg-cp-solid text-white' : 'bg-cp-surface text-cp-body shadow-sm ring-1 ring-cp-surface-3',
                                )}
                            >
                                <item.icon className="size-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    {/* desktop: nav card */}
                    <nav aria-label="Settings" className="sticky top-6 hidden flex-col gap-1 rounded-2xl bg-cp-surface p-2 shadow-sm ring-1 ring-cp-surface-3 lg:flex">
                        {NAV.map((item) => {
                            const active = isActive(currentPath, item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch
                                    aria-current={active ? 'page' : undefined}
                                    className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition', active ? 'bg-cp-brand-soft' : 'hover:bg-cp-canvas')}
                                >
                                    {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-cp-brand" />}
                                    <span
                                        className={cn(
                                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                            active ? 'bg-cp-surface text-cp-brand-ink shadow-sm' : 'bg-cp-canvas text-cp-subtle',
                                        )}
                                    >
                                        <item.icon className="size-[18px]" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className={cn('block text-sm font-semibold', active ? 'text-cp-brand-ink' : 'text-cp-ink')}>{item.title}</span>
                                        <span className="block truncate text-xs text-cp-muted">{item.description}</span>
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex min-w-0 flex-col gap-5">{children}</div>
                </div>
            </div>
        </div>
    );
}

/* ---------------------------------------------------------------- building blocks */

export function SettingsCard({
    icon: Icon,
    title,
    description,
    tone = 'bg-cp-brand-soft text-cp-brand-ink',
    action,
    children,
    className,
}: {
    icon: LucideIcon;
    title: string;
    description?: ReactNode;
    tone?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl bg-cp-surface shadow-sm ring-1 ring-cp-surface-3', className)}>
            <header className="flex items-start justify-between gap-3 border-b border-cp-surface-3 p-5">
                <div className="flex min-w-0 items-start gap-3">
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tone)}>
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-cp-ink">{title}</h2>
                        {description && <p className="mt-0.5 text-sm text-cp-muted">{description}</p>}
                    </div>
                </div>
                {action}
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={id} className="text-sm font-semibold text-cp-ink">
                {label}
            </label>
            {children}
            {error ? <p className="text-xs font-medium text-cp-danger-ink">{error}</p> : hint ? <p className="text-xs text-cp-muted">{hint}</p> : null}
        </div>
    );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function TextInput({ className, invalid, ...props }, ref) {
    return (
        <input
            ref={ref}
            {...props}
            aria-invalid={invalid || undefined}
            className={cn(
                'h-11 w-full rounded-xl border bg-cp-surface px-3.5 text-sm text-cp-ink outline-none transition placeholder:text-cp-faint focus:ring-2 disabled:bg-cp-canvas disabled:text-cp-muted',
                invalid ? 'border-cp-danger-line focus:border-cp-danger focus:ring-cp-danger/15' : 'border-cp-line focus:border-cp-brand focus:ring-cp-brand/15',
                className,
            )}
        />
    );
});

export function SaveButton({ processing, children, tone = 'primary', disabled, type = 'submit', onClick }: { processing?: boolean; children: ReactNode; tone?: 'primary' | 'danger' | 'outline'; disabled?: boolean; type?: 'submit' | 'button'; onClick?: () => void }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={processing || disabled}
            className={cn(
                'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                tone === 'primary' && 'bg-cp-brand text-white shadow-sm hover:bg-cp-brand-hover',
                tone === 'danger' && 'bg-cp-danger text-white shadow-sm hover:bg-cp-danger-hover',
                tone === 'outline' && 'border border-cp-line bg-cp-surface text-cp-ink hover:border-cp-line-stronger',
            )}
        >
            {processing && <LoaderCircle className="size-4 animate-spin" />}
            {children}
        </button>
    );
}

/** "Saved" — save ke baad thodi der dikhta hai */
export function SavedNote({ show, children = 'Saved' }: { show: boolean; children?: ReactNode }) {
    return (
        <span
            role="status"
            className={cn('inline-flex items-center gap-1.5 text-sm font-semibold text-cp-success-ink transition-opacity duration-300', show ? 'opacity-100' : 'opacity-0')}
        >
            <Check className="size-4" /> {children}
        </span>
    );
}
