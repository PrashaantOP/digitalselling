import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

/** Default light — dark sirf jab creator khud chune */
const DEFAULT_APPEARANCE: Appearance = 'light';

const prefersDark = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Dark sirf creator dashboard (/dashboard…, /settings…) pe. Public store, checkout, customer portal,
 * admin, landing, auth hamesha light (app.blade.php + HandleAppearance me bhi yahi check).
 */
const inDarkScope = (pathname = typeof window === 'undefined' ? '' : window.location.pathname) => /^\/(dashboard|settings)(\/|$)/.test(pathname);

const savedAppearance = (): Appearance => {
    const saved = localStorage.getItem('appearance');

    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : DEFAULT_APPEARANCE;
};

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (appearance: Appearance, pathname?: string) => {
    const isDark = inDarkScope(pathname) && (appearance === 'dark' || (appearance === 'system' && prefersDark()));

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = () => applyTheme(savedAppearance());

export function initializeTheme() {
    applyTheme(savedAppearance());

    // Add the event listener for system theme changes...
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);

    // Dashboard ↔ public page (jaise "View store") ke beech Inertia navigation pe dobara jaanch
    router.on('navigate', (event) => applyTheme(savedAppearance(), new URL(event.detail.page.url, window.location.origin).pathname));
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

    const updateAppearance = useCallback((mode: Appearance) => {
        setAppearance(mode);

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);
    }, []);

    useEffect(() => {
        updateAppearance(savedAppearance());

        return () => mediaQuery()?.removeEventListener('change', handleSystemThemeChange);
    }, [updateAppearance]);

    return { appearance, updateAppearance } as const;
}
