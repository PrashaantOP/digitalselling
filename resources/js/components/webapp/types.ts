import { type StoreProduct, type StoreTheme } from '@/components/store-page/types';

/* WebappPayload (app/Support/WebappPayload.php) ka shape — live page aur dashboard preview dono yahi bhejte hain. */

export type WebappThemeSlug = 'studio' | 'aurora' | 'grid' | 'press' | 'pocket';

export interface WebappData {
    theme: WebappThemeSlug;
    creator: { name: string; username: string };
    store: {
        display_name: string;
        heading: string | null;
        welcome: string | null;
        bio: string | null;
        avatar: string | null;
        sensitive: boolean;
        meta_title: string | null;
        meta_description: string | null;
    };
    brandColor: string;
    fontFamily: string | null;
    /** storefront ki palette — Studio theme apne dark/light colours isi se banata hai */
    storeTheme: StoreTheme;
    socials: { platform: string; url: string }[];
    headerButtons: { label: string; url: string }[];
    products: StoreProduct[];
    webappUrl: string;
}

/** Sirf gallery ki copy ke liye — asli list aur locking server (WebappThemes.php) se aati hai. */
export const WEBAPP_THEMES: Record<WebappThemeSlug, { name: string; blurb: string; swatch: string }> = {
    studio: { name: 'Studio', blurb: 'Full website — hero, sections, footer', swatch: 'from-[#12151E] via-[#1D2129] to-[#FF5C48]' },
    aurora: { name: 'Aurora', blurb: 'Soft gradient hero with stacked cards', swatch: 'from-[#4F46E5] via-[#7C3AED] to-[#DB2777]' },
    grid: { name: 'Grid', blurb: 'Sticky header with a two-column catalogue', swatch: 'from-[#0F172A] via-[#1E293B] to-[#334155]' },
    press: { name: 'Press', blurb: 'Editorial look — big type, quiet layout', swatch: 'from-[#FDFCF9] via-[#F1EDE4] to-[#E4DDD0]' },
    pocket: { name: 'Pocket', blurb: 'App-style with a bottom tab bar', swatch: 'from-[#059669] via-[#0D9488] to-[#0284C7]' },
};

/** Booking type ke products hi "sessions" hain (StorefrontCatalog inhe bhi bhejta hai). */
export const splitCatalog = (products: StoreProduct[]) => ({
    items: products.filter((p) => p.type !== 'booking'),
    sessions: products.filter((p) => p.type === 'booking'),
});

export const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'K';
