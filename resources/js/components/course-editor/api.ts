import { router } from '@inertiajs/react';

export type Result = { ok: boolean; errors: Record<string, string> };

/** Public images live on the `assets` disk → served from /assets/... */
export const assetUrl = (path: string | null | undefined) => (path ? `/assets/${path}` : '');

/**
 * Promise wrapper around an Inertia visit so editor code can `await` a save.
 * - state + scroll are preserved (the controller redirects back and sends a fresh `item`)
 * - `files: true` → multipart; PUT+files is sent as POST + `_method=PUT` (PHP can't parse multipart PUT)
 */
export function send(method: 'post' | 'put' | 'delete', url: string, data: Record<string, unknown> = {}, files = false): Promise<Result> {
    return new Promise((resolve) => {
        let settled = false;
        const done = (r: Result) => {
            if (settled) return;
            settled = true;
            resolve(r);
        };
        const options = {
            preserveScroll: true,
            preserveState: true,
            forceFormData: files,
            onSuccess: () => done({ ok: true, errors: {} }),
            onError: (errors: Record<string, string>) => done({ ok: false, errors }),
            // non-validation failures (500, network) never call onSuccess/onError — settle anyway
            onFinish: () => done({ ok: false, errors: {} }),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = data as any;
        if (method === 'delete') router.delete(url, options);
        else if (method === 'put' && files) router.post(url, { _method: 'put', ...payload }, options);
        else if (method === 'put') router.put(url, payload, options);
        else router.post(url, payload, options);
    });
}

export const firstError = (errors: Record<string, string>, fallback = 'Something went wrong. Please try again.') => Object.values(errors).filter(Boolean)[0] ?? fallback;
