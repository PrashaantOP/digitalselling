import { usePage } from '@inertiajs/react';

type AuthShare = { auth?: { isOwner?: boolean; permissions?: string[]; storeOwner?: string | null } };

/**
 * UI me kya dikhana hai — owner ke liye sab ('*'), sub-admin ke liye uske role ki permissions.
 * Sirf dikhane/chhupane ke liye: asli rok server pe middleware (CheckPermission / owner) karta hai.
 */
export function useCan() {
    const auth = usePage<AuthShare>().props.auth;
    const permissions = auth?.permissions ?? [];
    const isOwner = Boolean(auth?.isOwner);

    const can = (permission: string) => isOwner || permissions.includes('*') || permissions.includes(permission);

    return { can, isOwner, storeOwner: auth?.storeOwner ?? null };
}
