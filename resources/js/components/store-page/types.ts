export type StoreTheme = 'classic' | 'ocean' | 'sunset' | 'forest' | 'mono' | 'paper';

export interface StoreSocial {
    id?: number;
    platform: string;
    url: string;
}

export interface StoreButton {
    id?: number;
    label: string;
    url: string;
}

// StorefrontCatalog (app/Support/StorefrontCatalog.php) ka shape
export interface StoreProduct {
    id: number;
    type: string;
    title: string;
    slug: string;
    description: string | null;
    pricing_type: string;
    price: number | string;
    has_discount: boolean;
    discounted_price: number | string | null;
    button_text: string | null;
    cover: string | null;
    duration_minutes: number | null;
    url: string;
}

export interface StorePageData {
    displayName: string;
    username: string;
    bio: string;
    avatarUrl: string | null;
    isLive: boolean;
    theme: StoreTheme;
    brandColor: string;
    fontFamily: string | null;
    backgroundUrl: string | null;
    columnLayout: 'single' | 'double';
    sensitive: boolean;
    socials: StoreSocial[];
    buttons: StoreButton[];
    products: StoreProduct[];
}

// editor ke theme picker aur store page dono isi list se chalte hain
export const THEMES: { value: StoreTheme; label: string; subtitle: string; swatch: string; preview: string; light?: boolean }[] = [
    { value: 'classic', label: 'Classic', subtitle: 'Dark Velvet', swatch: 'bg-[#3D0814]', preview: 'from-[#3D0814] via-[#22040B] to-[#0A0103]' },
    { value: 'ocean', label: 'Ocean', subtitle: 'Deep Navy', swatch: 'bg-[#0F3057]', preview: 'from-[#0A192F] via-[#0F3057] to-[#1E40AF]' },
    { value: 'sunset', label: 'Sunset', subtitle: 'Warm Dusk', swatch: 'bg-[#831843]', preview: 'from-[#311042] via-[#831843] to-[#F97316]' },
    { value: 'forest', label: 'Forest', subtitle: 'Deep Emerald', swatch: 'bg-[#064E3B]', preview: 'from-[#062C1E] via-[#064E3B] to-[#047857]' },
    { value: 'mono', label: 'Mono', subtitle: 'Slate Black', swatch: 'bg-[#1A1A22]', preview: 'from-[#121217] via-[#1A1A22] to-[#252530]' },
    {
        value: 'paper',
        label: 'Paper',
        subtitle: 'Editorial Off-White',
        swatch: 'bg-[#EFECE4]',
        preview: 'from-[#FDFCF9] via-[#F6F4EE] to-[#EFECE4]',
        light: true,
    },
];

export const assetUrl = (path: string | null | undefined) => (path ? `/assets/${path}` : null);

export function brandHex(value?: string | null) {
    if (!value) return '#4F46E5';
    return value.startsWith('#') ? value : `#${value}`;
}

// "Inter (Modern Sans — Recommended)" => "Inter"
export function fontName(value?: string | null) {
    return value ? value.split(' (')[0].trim() : null;
}

const inr = (value: number | string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);

export function priceLabel(p: StoreProduct) {
    if (p.pricing_type === 'free') return { now: 'Free', was: null };
    if (p.pricing_type === 'customer_decides') return { now: 'Pay what you want', was: null };
    const discounted = p.has_discount && p.discounted_price != null && Number(p.discounted_price) < Number(p.price);
    return { now: inr(discounted ? p.discounted_price! : p.price), was: discounted ? inr(p.price) : null };
}

export const typeLabels: Record<string, string> = {
    course: 'Course',
    event: 'Event',
    book: 'E-book',
    locked_content: 'Exclusive',
    payment_page: 'Payment',
    booking: '1:1 Session',
};
