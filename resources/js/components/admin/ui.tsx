import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

export function money(value: number | string | null | undefined) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

export function dateTime(iso: string | null | undefined) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function dateOnly(iso: string | null | undefined) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

const BADGE_TONES: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    verified: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pro: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    processing: 'bg-sky-50 text-sky-700 ring-sky-200',
    unverified: 'bg-amber-50 text-amber-700 ring-amber-200',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-200',
    deleted: 'bg-rose-100 text-rose-800 ring-rose-300',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
    failed: 'bg-rose-50 text-rose-700 ring-rose-200',
    refunded: 'bg-slate-100 text-slate-600 ring-slate-200',
    free: 'bg-slate-100 text-slate-600 ring-slate-200',
    not_started: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function Badge({ value, label }: { value: string; label?: string }) {
    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset', BADGE_TONES[value] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>
            {label ?? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
        </span>
    );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn('rounded-xl border border-slate-200 bg-white', className)}>
            {(title || action) && (
                <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            {action}
        </div>
    );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-words text-slate-900">{children}</dd>
        </div>
    );
}

/** Status tabs — query string me `status` badalte hain */
export function FilterTabs({ base, tabs, active, params = {} }: { base: string; tabs: { key: string; label: string }[]; active: string; params?: Record<string, string | null | undefined> }) {
    return (
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {tabs.map((t) => (
                <Link
                    key={t.key}
                    href={base}
                    data={{ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), status: t.key }}
                    preserveState
                    className={cn(
                        'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                        active === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900',
                    )}
                >
                    {t.label}
                </Link>
            ))}
        </div>
    );
}

export function SearchBox({ base, value, params = {}, placeholder }: { base: string; value: string | null | undefined; params?: Record<string, string | null | undefined>; placeholder: string }) {
    const [q, setQ] = useState(value ?? '');

    function submit(e: FormEvent) {
        e.preventDefault();
        router.get(base, { ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), q: q.trim() || undefined }, { preserveState: true, replace: true });
    }

    return (
        <form onSubmit={submit} className="relative w-full sm:max-w-xs">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
        </form>
    );
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

export function Pagination({ page }: { page: Paginated<unknown> }) {
    if (page.last_page <= 1) return null;
    const btn = 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';
    return (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>
                Page {page.current_page} of {page.last_page} · {page.total} total
            </span>
            <div className="flex gap-2">
                {page.prev_page_url ? (
                    <Link href={page.prev_page_url} preserveState className={btn}>
                        Previous
                    </Link>
                ) : (
                    <span className={cn(btn, 'opacity-40')}>Previous</span>
                )}
                {page.next_page_url ? (
                    <Link href={page.next_page_url} preserveState className={btn}>
                        Next
                    </Link>
                ) : (
                    <span className={cn(btn, 'opacity-40')}>Next</span>
                )}
            </div>
        </div>
    );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-slate-500">
                {children}
            </td>
        </tr>
    );
}

export const TH = 'px-5 py-2.5 text-left text-[11px] font-semibold tracking-wider text-slate-500 uppercase';
export const TD = 'px-5 py-3 text-sm text-slate-700';

export const BUTTON = {
    primary: 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50',
    danger: 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50',
    ghost: 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50',
};

/* ------------------------------------------------------------------ */
/*  Confirm dialog — money / suspend / reject actions yahin se          */
/* ------------------------------------------------------------------ */

type ConfirmField = { name: string; label: string; placeholder?: string; required?: boolean; multiline?: boolean; type?: string };

export function ConfirmAction({
    open,
    onClose,
    title,
    body,
    url,
    method = 'post',
    fields = [],
    confirmLabel,
    tone = 'primary',
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    body?: ReactNode;
    url: string;
    method?: 'post' | 'put';
    fields?: ConfirmField[];
    confirmLabel: string;
    tone?: 'primary' | 'danger';
}) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setValues({});
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

    const ready = fields.every((f) => !f.required || (values[f.name] ?? '').trim());

    function submit(e: FormEvent) {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        router[method](url, values, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs) => setErrors(errs as Record<string, string>),
            onFinish: () => setBusy(false),
        });
    }

    const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X className="size-5" />
                    </button>
                </div>
                {body && <div className="mt-2 text-sm text-slate-600">{body}</div>}
                <div className="mt-4 flex flex-col gap-3">
                    {fields.map((f) => (
                        <label key={f.name} className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-700">
                                {f.label}
                                {f.required && <span className="text-rose-600"> *</span>}
                            </span>
                            {f.multiline ? (
                                <textarea rows={3} value={values[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} className={input} />
                            ) : (
                                <input type={f.type ?? 'text'} value={values[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} className={input} />
                            )}
                            {errors[f.name] && <span className="text-xs text-rose-600">{errors[f.name]}</span>}
                        </label>
                    ))}
                    {Object.entries(errors)
                        .filter(([k]) => !fields.some((f) => f.name === k))
                        .map(([k, v]) => (
                            <p key={k} className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {v}
                            </p>
                        ))}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={BUTTON.ghost}>
                        Cancel
                    </button>
                    <button type="submit" disabled={!ready || busy} className={tone === 'danger' ? BUTTON.danger : BUTTON.primary}>
                        {busy && <Loader2 className="size-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}
