import type { RequestPayload } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Product editors (Book / Locked content) ka debounce wala auto-save — PUT {url} pe latest form bhejta hai. */
export function useAutoSave(url: string) {
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef<RequestPayload | null>(null);
    const inflight = useRef(false);

    const send = useCallback(
        (data: RequestPayload, opts?: { silent?: boolean }) => {
            if (inflight.current) {
                // queue latest and try again after current finishes
                latest.current = data;
                return;
            }
            inflight.current = true;
            setStatus('saving');
            router.put(url, data, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setErrors({});
                    if (!opts?.silent) setStatus('saved');
                    window.setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
                },
                onError: (validationErrors) => {
                    setErrors(validationErrors as Record<string, string>);
                    setStatus('error');
                },
                onFinish: () => {
                    inflight.current = false;
                    if (latest.current) {
                        const next = latest.current;
                        latest.current = null;
                        // small debounce so we don't ping the server in a tight loop
                        window.setTimeout(() => send(next), 50);
                    }
                },
            });
        },
        [url],
    );

    const queue = useCallback(
        (data: RequestPayload) => {
            latest.current = data;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => send(data), 700);
        },
        [send],
    );

    const flush = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        if (latest.current) send(latest.current);
    }, [send]);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    /** `faqs.0.question` jaise nested errors ko bhi parent field ke neeche dikhao */
    const errorFor = useCallback(
        (field: string) => errors[field] ?? Object.entries(errors).find(([key]) => key.startsWith(`${field}.`))?.[1],
        [errors],
    );

    return { status, errors, errorFor, queue, flush, send };
}
