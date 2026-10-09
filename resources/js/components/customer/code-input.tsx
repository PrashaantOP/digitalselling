/** 6-digit OTP box — login, done page aur account page teeno me. */
export function CodeInput({ value, onChange, autoFocus = true }: { value: string; onChange: (value: string) => void; autoFocus?: boolean }) {
    return (
        <input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus={autoFocus}
            maxLength={6}
            aria-label="6-digit code"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="h-12 w-full rounded-xl border border-cp-line-strong bg-cp-surface text-center font-mono text-2xl tracking-[0.5em] text-cp-ink outline-none transition placeholder:text-cp-line-stronger focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15"
        />
    );
}

export const FIELD =
    'h-11 w-full rounded-lg border border-cp-line-strong bg-cp-surface px-3 text-sm text-cp-ink outline-none transition placeholder:text-cp-muted focus:border-cp-brand focus:ring-2 focus:ring-cp-brand/15';

export const PRIMARY =
    'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cp-brand px-4 text-sm font-semibold text-white transition hover:bg-cp-brand-hover disabled:cursor-not-allowed disabled:opacity-50';

export const GHOST =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-cp-line bg-cp-surface px-3.5 text-sm font-medium text-cp-body transition hover:bg-cp-canvas disabled:opacity-50';
