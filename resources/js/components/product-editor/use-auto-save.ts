import { xsrf } from '@/lib/razorpay';
import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Product editors (Event / Book / Locked content / Payment page) ka debounce wala auto-save —
 * PUT {url} pe latest form bhejta hai.
 *
 * Auto-save ek Inertia visit hai, aur Inertia ek waqt me ek hi visit chalata hai: naya visit purane ko
 * cancel kar deta hai. Isliye editor band karte waqt ya publish karte waqt seedha `router.visit/post` mat
 * chalao — `afterSave()` / `leave()` use karo, jo pehle bacha hua save poora hone dete hain. Warna save aur
 * navigation ek doosre ko kaat dete hain (editor band nahi hota / list purani dikhti hai).
 */
export function useAutoSave(url: string) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // jo data abhi tak server ko nahi gaya (bhejte hi khaali ho jaata hai)
    const pending = useRef<RequestPayload | null>(null);
    const inflight = useRef(false);
    const alive = useRef(true);
    // save khatam hone par chalne wale kaam (publish, editor band karna)
    const waiting = useRef<(() => void)[]>([]);

    const send = useCallback(
        (data: RequestPayload, opts?: { silent?: boolean }) => {
            if (!alive.current) return;
            if (inflight.current) {
                // abhi ek save chal raha hai — ye uske baad jayega
                pending.current = data;
                return;
            }
            pending.current = null;
            inflight.current = true;
            setStatus('saving');
            router.put(url, data, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (!alive.current) return;
                    setErrors({});
                    if (!opts?.silent) setStatus('saved');
                    window.setTimeout(() => alive.current && setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
                },
                onError: (validationErrors) => {
                    if (!alive.current) return;
                    setErrors(validationErrors as Record<string, string>);
                    setStatus('error');
                },
                onFinish: () => {
                    inflight.current = false;
                    // editor chhod chuke hain to ab koi naya visit nahi — wo agle page ka load kaat deta
                    if (!alive.current) return;

                    if (pending.current) {
                        send(pending.current);
                        return;
                    }

                    waiting.current.splice(0).forEach((run) => run());
                },
            });
        },
        [url],
    );

    const queue = useCallback(
        (data: RequestPayload) => {
            pending.current = data;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => pending.current && send(pending.current), 700);
        },
        [send],
    );

    const flush = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        if (pending.current) send(pending.current);
    }, [send]);

    /** Bacha hua save (agar hai) poora karke `run` chalao. Kuch bacha na ho to turant. */
    const afterSave = useCallback(
        (run: () => void) => {
            flush();
            if (inflight.current) waiting.current.push(run);
            else run();
        },
        [flush],
    );

    /** Editor band karo: pehle save, phir list pe jao. */
    const leave = useCallback((to: string) => afterSave(() => router.visit(to)), [afterSave]);

    useEffect(() => {
        alive.current = true;

        return () => {
            alive.current = false;
            if (timer.current) clearTimeout(timer.current);

            // Browser ke back button se nikle aur aakhri badlav abhi gaya nahi — use Inertia ke bahar bhej do
            // (keepalive), taaki na badlav khoye, na agle page ka load ruke.
            const unsent = pending.current;
            pending.current = null;
            if (unsent && !(unsent instanceof FormData)) {
                void fetch(url, {
                    method: 'PUT',
                    keepalive: true,
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrf() },
                    body: JSON.stringify(unsent),
                })
                    // jis list pe laute hain wo is save se pehle load ho chuki ho sakti hai — use taaza kar do
                    // (async: kisi chalte hue navigation ko nahi kaat-ta)
                    .then(() => router.reload({ async: true }))
                    .catch(() => {});
            }
        };
    }, [url]);

    /** `faqs.0.question` jaise nested errors ko bhi parent field ke neeche dikhao */
    const errorFor = useCallback(
        (field: string) => errors[field] ?? Object.entries(errors).find(([key]) => key.startsWith(`${field}.`))?.[1],
        [errors],
    );

    return { status, errors, errorFor, queue, flush, afterSave, leave, send };
}
