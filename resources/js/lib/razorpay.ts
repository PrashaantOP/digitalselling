/*
 * Razorpay Checkout.js — zaroorat padne par hi load hota hai (billing page, product checkout, paid session).
 * Server pehle order banata hai aur ye payload deta hai; payment ke baad `verifyUrl` signature check karke
 * access deta hai. Browser band ho jaye tab bhi webhook wahi kaam kar deta hai.
 */

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => {
            open: () => void;
            on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
        };
    }
}

/** Server ka jawab: ya to kaam ho gaya (free / poora credit), ya Razorpay kholne ka saaman. */
export interface PaymentPayload {
    paid: boolean;
    redirect?: string;
    message?: string;
    key?: string;
    order_id?: string;
    amount?: number;
    name?: string;
    description?: string;
    prefill?: { name?: string | null; email?: string | null; contact?: string | null };
}

export type PaymentResult = { ok: true; redirect?: string; message?: string } | { ok: false; error: string | null };

export const xsrf = () => decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1] ?? '');

export const postJson = (url: string, body: unknown) =>
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf() },
        body: JSON.stringify(body),
    });

/** Laravel ke 422 se pehla error message. */
export function firstError(data: { errors?: Record<string, string[] | string>; message?: string } | null, fallback: string): string {
    const first = data?.errors ? Object.values(data.errors)[0] : null;

    return (Array.isArray(first) ? first[0] : first) ?? data?.message ?? fallback;
}

export function loadRazorpay(): Promise<boolean> {
    if (window.Razorpay) return Promise.resolve(true);

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

/**
 * Payment poori karo. `error: null` = buyer ne khud window band ki (koi error dikhane ki zaroorat nahi).
 * Paisa kat gaya par verify fail hua ho to wahi message aata hai jo server ne diya.
 */
export async function completePayment(payload: PaymentPayload, verifyUrl: string, color = '#4F46E5'): Promise<PaymentResult> {
    if (payload.paid) {
        return { ok: true, redirect: payload.redirect, message: payload.message };
    }

    if (!(await loadRazorpay()) || !window.Razorpay) {
        return { ok: false, error: 'Could not load the payment window. Check your connection and try again.' };
    }

    return new Promise((resolve) => {
        const checkout = new window.Razorpay!({
            key: payload.key,
            order_id: payload.order_id,
            amount: payload.amount,
            currency: 'INR',
            name: payload.name,
            description: payload.description,
            prefill: payload.prefill,
            theme: { color },
            modal: { ondismiss: () => resolve({ ok: false, error: null }) },
            handler: async (response: Record<string, string>) => {
                try {
                    const res = await postJson(verifyUrl, response);
                    const data = await res.json().catch(() => null);

                    resolve(
                        res.ok
                            ? { ok: true, redirect: data?.redirect ?? payload.redirect, message: data?.message }
                            : { ok: false, error: firstError(data, 'We could not confirm the payment yet. If money was deducted, you will get access in a few minutes.') },
                    );
                } catch {
                    resolve({ ok: false, error: 'We could not confirm the payment yet. If money was deducted, you will get access in a few minutes.' });
                }
            },
        });

        checkout.on('payment.failed', (r) => resolve({ ok: false, error: r.error?.description ?? 'The payment did not go through. You were not charged.' }));
        checkout.open();
    });
}
