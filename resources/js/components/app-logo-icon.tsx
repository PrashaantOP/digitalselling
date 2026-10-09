import { BrandIcon } from '@/components/brand';

/**
 * Starter kit ke purane layouts (auth-card / simple / split, app-header) isi naam se icon maangte hain —
 * ab CreatorPro ka asli icon (components/brand.tsx). Wo `fill-current text-…` jaise class dete hain, jo image pe
 * kuch nahi karte; sirf size wali class kaam ki hai.
 */
export default function AppLogoIcon({ className }: { className?: string }) {
    return <BrandIcon className={className} />;
}
