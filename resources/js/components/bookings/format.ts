/*
 | Booking times DB me UTC hain — dashboard pe hamesha creator ke timezone (Availability tab) me dikhate hain,
 | chahe creator ka browser kisi aur timezone me ho.
 */

/** YYYY-MM-DD us timezone me — day grouping ke liye. */
export function dayKey(iso: string, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string) {
    return new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
}

export function formatTimeRange(iso: string, minutes: number, timeZone: string) {
    const end = new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
    return `${formatTime(iso, timeZone)} – ${formatTime(end, timeZone)}`;
}

export function formatDate(iso: string, timeZone: string, withYear = false) {
    return new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }).format(new Date(iso));
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mon, 30 Sept" */
export function dayLabel(iso: string, timeZone: string) {
    const key = dayKey(iso, timeZone);
    const now = Date.now();
    const shift = (days: number) => dayKey(new Date(now + days * 86_400_000).toISOString(), timeZone);
    if (key === shift(0)) return 'Today';
    if (key === shift(1)) return 'Tomorrow';
    if (key === shift(-1)) return 'Yesterday';
    const sameYear = key.slice(0, 4) === shift(0).slice(0, 4);
    return formatDate(iso, timeZone, !sameYear);
}

export function durationLabel(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function initials(name: string | null | undefined) {
    return (
        (name ?? '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join('')
            .toUpperCase() || 'G'
    );
}
