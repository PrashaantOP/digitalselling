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
            className="h-12 w-full rounded-xl border border-[#DAD8D0] bg-white text-center font-mono text-2xl tracking-[0.5em] text-[#14141B] outline-none transition placeholder:text-[#C9C6BC] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
        />
    );
}

export const FIELD =
    'h-11 w-full rounded-lg border border-[#DAD8D0] bg-white px-3 text-sm text-[#14141B] outline-none transition placeholder:text-[#8A8A96] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15';

export const PRIMARY =
    'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-50';

export const GHOST =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-white px-3.5 text-sm font-medium text-[#4B4B57] transition hover:bg-[#F6F5F2] disabled:opacity-50';
