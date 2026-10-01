import { type StoreProduct, type StoreTheme } from '@/components/store-page/types';

/* WebappPayload (app/Support/WebappPayload.php) ka shape — live page aur dashboard preview dono yahi bhejte hain. */

export type WebappThemeSlug = 'studio' | 'bold' | 'azure' | 'notebook';

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
    bold: { name: 'Bold', blurb: 'Neo-brutalist website — thick borders, hard shadows', swatch: 'from-[#F6F3EC] via-[#0E6E55] to-[#E8572C]' },
    azure: { name: 'Azure', blurb: 'Clean corporate website with a diagonal hero', swatch: 'from-[#EEF3FF] via-[#2454E8] to-[#15348F]' },
    notebook: { name: 'Notebook', blurb: 'Classroom feel — graph paper, filters, clickable steps', swatch: 'from-[#F5F6F0] via-[#0E7A5C] to-[#F0A23A]' },
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
