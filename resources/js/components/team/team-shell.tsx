import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

export type TeamTab = 'members' | 'roles' | 'activity';

const TABS: { key: TeamTab; label: string; href: string }[] = [
    { key: 'members', label: 'Members', href: '/dashboard/sub-admins' },
    { key: 'roles', label: 'Roles', href: '/dashboard/roles' },
    { key: 'activity', label: 'Activity', href: '/dashboard/sub-admins/activity' },
];

/** Team ke teeno pages ka frame — sticky tabs + title (Payments / Bookings pages jaisa). */
export function TeamShell({ active, title, description, action, children }: { active: TeamTab; title: string; description: string; action?: ReactNode; children: ReactNode }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'Team', href: '/dashboard/sub-admins' }]}>
            <Head title={`Team · ${title}`} />
            <div className="flex flex-1 flex-col bg-cp-canvas">
                <div className="sticky top-14 z-30 border-b border-cp-line bg-cp-canvas/95 backdrop-blur-md lg:top-0">
                    <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 md:px-6">
                        {TABS.map((t) => (
                            <Link
                                key={t.key}
                                href={t.href}
                                className={cn(
                                    '-mb-px border-b-2 py-3 text-sm font-medium transition-colors',
                                    active === t.key ? 'border-cp-brand text-cp-brand-ink' : 'border-transparent text-cp-muted hover:text-cp-ink',
                                )}
                            >
                                {t.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 pb-10 md:px-6">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-cp-ink">{title}</h1>
                            <p className="mt-1 text-sm text-cp-muted">{description}</p>
                        </div>
                        {action}
                    </div>
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}

export const INPUT =
    'h-10 w-full rounded-lg border border-cp-line bg-cp-surface px-3 text-sm text-cp-ink shadow-sm outline-none placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';
export const LABEL = 'text-xs font-semibold tracking-wider text-cp-ink uppercase';
export const BTN_PRIMARY = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-cp-brand px-4 text-sm font-semibold text-white transition hover:bg-cp-brand-hover disabled:opacity-50';
export const BTN_DANGER = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-cp-coral-dark px-4 text-sm font-semibold text-white transition hover:bg-cp-coral-strong disabled:opacity-50';
export const BTN_GHOST = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-cp-line bg-cp-surface px-4 text-sm font-semibold text-cp-ink transition hover:bg-cp-canvas disabled:opacity-50';

/**
 * Team access badalne wale har kaam (invite, role change, remove) se pehle password dobara —
 * server `current_password` rule se check karta hai. `fields` me extra inputs (email, role) aa sakte hain.
 */
export function PasswordAction({
    open,
    onClose,
    title,
    body,
    url,
    method,
    data = {},
    fields,
    ready = true,
    confirmLabel,
    tone = 'primary',
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    body?: ReactNode;
    url: string;
    method: 'post' | 'put' | 'delete';
    data?: Record<string, unknown>;
    fields?: (errors: Record<string, string>) => ReactNode;
    ready?: boolean;
    confirmLabel: string;
    tone?: 'primary' | 'danger';
}) {
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setPassword('');
            setErrors({});
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    function submit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        router.visit(url, {
            method,
            data: { ...data, current_password: password },
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs) => setErrors(errs as Record<string, string>),
            onFinish: () => {
                setBusy(false);
                setPassword('');
            },
        });
    }

    const otherErrors = Object.entries(errors).filter(([k]) => !['current_password', 'email', 'role', 'name'].includes(k));

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-cp-surface p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-cp-ink">{title}</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-cp-muted hover:bg-cp-surface-3 hover:text-cp-ink">
                        <X className="size-5" />
                    </button>
                </div>
                {body && <div className="mt-2 text-sm text-cp-subtle">{body}</div>}
                <div className="mt-5 flex flex-col gap-4">
                    {fields?.(errors)}
                    <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Your password</span>
                        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm it's you" className={INPUT} />
                        {errors.current_password && <span className="text-xs text-cp-red-ink">{errors.current_password}</span>}
                    </label>
                    {otherErrors.map(([k, v]) => (
                        <p key={k} className="rounded-lg bg-cp-coral-soft px-3 py-2 text-xs font-medium text-cp-coral-dark-ink">
                            {v}
                        </p>
                    ))}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={BTN_GHOST}>
                        Cancel
                    </button>
                    <button type="submit" disabled={busy || !password || !ready} className={tone === 'danger' ? BTN_DANGER : BTN_PRIMARY}>
                        {busy && <Loader2 className="size-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}

/** "in 6 days" — invite kab tak valid hai */
export function expiresIn(iso: string | null) {
    if (!iso) return '—';
    const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
    if (hours <= 0) return 'expired';
    if (hours < 24) return 'in ' + hours + ' hr';
    const days = Math.round(hours / 24);
    return 'in ' + days + ' day' + (days === 1 ? '' : 's');
}

export function relativeTime(iso: string | null) {
    if (!iso) return '—';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
