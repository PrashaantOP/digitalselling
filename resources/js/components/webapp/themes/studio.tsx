import { Check, Globe, Instagram, Menu, MessageCircle, Monitor, Sparkles, Star, Users, Video, Youtube } from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { type WebappData } from '../types';

/*
 * Studio (free) — creator ka purana webapp design, jaisa ka taisa.
 * Apna CSS le kar chalta hai (dark/light toggle + 900/620/480px breakpoints). CSS .ws ke andar
 * scoped hai aur breakpoints container queries pe hain — isliye dashboard ke phone-frame preview me
 * bhi wahi mobile layout aata hai jo asli phone pe. Ye theme system ka free option hai.
 */

type SocialLink = { id?: number; platform: string; url: string; sort_order?: number };
type HeaderButton = { id?: number; label: string; url: string; icon?: string | null; sort_order?: number };
type ProductCard = {
    id: number;
    title: string;
    type: string;
    description: string | null;
    pricing_type: string;
    price: number | string;
    has_discount: boolean;
    discounted_price: number | string | null;
    button_text: string | null;
    cover: string | null;
    url: string;
};

type StorefrontProps = {
    creator: { name: string; username: string; avatar: string | null };
    store: {
        display_name: string | null;
        bio: string | null;
        avatar: string | null;
        welcome_message: string | null;
        header_heading: string | null;
        column_layout?: 'single' | 'double';
        meta_title?: string | null;
        meta_description?: string | null;
        sensitive_content_warning?: boolean;
    };
    appearance?: {
        theme?: 'classic' | 'ocean' | 'sunset' | 'forest' | 'mono' | 'paper';
        brand_color?: string | null;
        font_family?: string | null;
        custom_background_path?: string | null;
    } | null;
    socialLinks?: SocialLink[];
    headerButtons?: HeaderButton[];
    products?: ProductCard[];
    ownerPreview?: boolean;
};

const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);

const asset = (path: string | null) => (path ? `/assets/${path}` : '');

const featureCards = [
    { title: 'Structured learning path', description: 'A clear roadmap from fundamentals to mastery — no guesswork, no overwhelm.', icon: Sparkles },
    { title: 'Practice & assessments', description: 'Cement every topic with quizzes, tests and real exam-style questions.', icon: Monitor },
    { title: 'Expert-led lessons', description: 'Taught by people who do the work, distilled into lessons that actually land.', icon: Video },
    { title: 'Learn anywhere', description: 'Phone, tablet or desktop — progress syncs and picks up where you left off.', icon: Globe },
    { title: 'Notes & resources', description: 'Downloadable notes and material that make revision genuinely effortless.', icon: Check },
    { title: 'Proof of progress', description: 'Track completion and earn credentials that reflect real, tested skill.', icon: Users },
];

const processSteps = [
    { title: 'Join the platform', description: 'Create your free account in seconds and step into a focused space.', step: '1' },
    { title: 'Pick your path', description: 'Choose the course that maps to your goal and start with momentum.', step: '2' },
    { title: 'Immerse & learn', description: 'Dive into lessons crafted for depth, not just surface coverage.', step: '3' },
    { title: 'Prove your mastery', description: 'Finish, get certified, and carry credentials that mean something.', step: '4' },
];

const productTypeLabel = (type: string) => {
    switch (type) {
        case 'course':
            return 'Course';
        case 'event':
            return 'Event';
        case 'book':
            return 'Book';
        case 'locked_content':
            return 'Locked content';
        case 'booking':
            return 'Booking';
        default:
            return 'Product';
    }
};

const getPrice = (product: ProductCard) => {
    if (product.pricing_type === 'free') return 'Free';
    if (product.pricing_type === 'customer_decides') return 'Pay what you want';

    const selected = product.has_discount && product.discounted_price != null ? product.discounted_price : product.price;
    return formatCurrency(selected);
};

const getPalette = (appearance?: StorefrontProps['appearance'] | null, isLight = false) => {
    const brand = appearance?.brand_color || '#ff5c48';

    if (isLight) {
        return {
            background: '#f6f6fb',
            raised: '#ffffff',
            raised2: '#ececf6',
            border: '#e1e2ed',
            borderSoft: '#ebebf3',
            text: '#12141c',
            muted: '#5c5f70',
            faint: '#a2a5b5',
            accent: brand,
            accentInk: '#fff5f3',
            accent2: '#5a5fe0',
            accent2Ink: '#f2f2ff',
            shadow: 'rgba(20,20,40,.08)',
        };
    }

    const themes: Record<string, { background: string; raised: string; raised2: string; text: string; muted: string; border: string; borderSoft: string; accent2: string }> = {
        classic: { background: '#0c0e14', raised: '#12151e', raised2: '#171b26', text: '#edeef3', muted: '#8b90a3', border: '#262b38', borderSoft: '#1d2129', accent2: '#7b84ff' },
        ocean: { background: '#071521', raised: '#0d1e2d', raised2: '#10283a', text: '#edf8ff', muted: '#8caec7', border: '#21445d', borderSoft: '#17334b', accent2: '#38bdf8' },
        sunset: { background: '#140c1b', raised: '#1d1228', raised2: '#2a1b35', text: '#fdf3f8', muted: '#d5bfd3', border: '#43304d', borderSoft: '#2f1f3a', accent2: '#f59e0b' },
        forest: { background: '#081810', raised: '#0f1f1b', raised2: '#122b25', text: '#edf9f3', muted: '#9fc2b5', border: '#23473d', borderSoft: '#19392f', accent2: '#34d399' },
        mono: { background: '#0f0f12', raised: '#17181d', raised2: '#1f212a', text: '#f5f7fb', muted: '#b5b8c4', border: '#303540', borderSoft: '#242933', accent2: '#9aa3ff' },
        paper: { background: '#f5f3ee', raised: '#fffdf9', raised2: '#f1efe9', text: '#12141c', muted: '#5c5f70', border: '#dcd7cf', borderSoft: '#e7e2d8', accent2: '#6f7dfd' },
    };

    const current = themes[appearance?.theme || 'classic'];

    return {
        background: current.background,
        raised: current.raised,
        raised2: current.raised2,
        border: current.border,
        borderSoft: current.borderSoft,
        text: current.text,
        muted: current.muted,
        faint: '#565b6c',
        accent: brand,
        accentInk: '#1a0704',
        accent2: current.accent2,
        accent2Ink: '#0a0b1f',
        shadow: 'rgba(0,0,0,.4)',
    };
};

const socialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <Instagram className="h-4 w-4" />;
    if (p.includes('youtube')) return <Youtube className="h-4 w-4" />;
    if (p.includes('x') || p.includes('twitter')) return <MessageCircle className="h-4 w-4" />;
    if (p.includes('wa') || p.includes('whatsapp')) return <MessageCircle className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
};

const css = `
  .ws { container: ws / inline-size; min-height: 100%; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; overflow-x: clip; }
  .ws * { box-sizing: border-box; }
  .ws a { color: inherit; text-decoration: none; }
  .ws .wrap { max-width: 1140px; margin: 0 auto; padding: 0 28px; }
  .ws h1, .ws h2, .ws h3, .ws .serif { font-family: "Newsreader", Georgia, serif; font-style: italic; font-weight: 500; letter-spacing: -0.01em; margin: 0; }
  .ws ::selection { background: var(--accent); color: var(--accent-ink); }
  .ws header.site { position: sticky; top: env(safe-area-inset-top,0px); z-index: 40; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-soft); }
  .ws .nav { display: flex; align-items: center; justify-content: space-between; height: 76px; gap: 16px; }
  .ws .brand { display: flex; align-items: center; gap: 12px; }
  .ws .mark { width: 36px; height: 36px; border-radius: 10px; background: var(--accent); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; font-family: "Newsreader", serif; font-style: italic; font-size: 17px; flex-shrink: 0; }
  .ws .brand-name { font-size: 15px; font-weight: 600; }
  .ws .brand-tag { display: block; font-size: 11.5px; color: var(--muted); font-weight: 400; margin-top: 1px; }
  .ws nav.links { display: flex; gap: 30px; font-size: 14px; color: var(--muted); }
  .ws .nav-right { display: flex; align-items: center; gap: 14px; }
  .ws .menu-btn { display: none; width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--raised); align-items: center; justify-content: center; cursor: pointer; color: var(--text); }
  .ws .icon-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--raised); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text); font-size: 15px; }
  .ws .btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; white-space: nowrap; }
  .ws .btn-primary { background: var(--accent); color: var(--accent-ink); }
  .ws .btn-primary:hover { filter: brightness(1.08); }
  .ws .btn-ghost { border-color: var(--border); color: var(--text); background: transparent; }
  .ws .btn-ghost:hover { border-color: var(--faint); }
  .ws .btn-block { width: 100%; justify-content: center; padding: 15px 20px; font-size: 15px; }
  .ws .pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--accent2); background: color-mix(in srgb, var(--accent2) 14%, transparent); border-radius: 999px; padding: 6px 13px; margin-bottom: 20px; }
  .ws .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); flex-shrink: 0; }
  .ws .store-hero { padding-block: 70px 84px; }
  .ws .hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 58px; align-items: center; }
  .ws .hero-title { font-size: clamp(36px, 5cqw, 54px); line-height: 1.12; }
  .ws .hero-copy { margin: 22px 0 30px; color: var(--muted); font-size: 16.5px; line-height: 1.65; max-width: 46ch; }
  .ws .cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 40px; }
  .ws .stat-row { display: flex; gap: 34px; }
  .ws .stat b { font-family: "Newsreader", serif; font-style: italic; font-size: 25px; font-weight: 600; display: block; }
  .ws .stat span { font-size: 12.5px; color: var(--muted); }
  .ws .video-mock { border-radius: 16px; border: 1px solid var(--border); background: var(--raised); overflow: hidden; box-shadow: 0 30px 60px -30px var(--shadow); }
  .ws .video-chrome { display: flex; align-items: center; gap: 7px; padding: 12px 16px; border-bottom: 1px solid var(--border-soft); }
  .ws .video-chrome span { width: 9px; height: 9px; border-radius: 50%; background: var(--border); }
  .ws .video-body { position: relative; aspect-ratio: 16/10.5; background: radial-gradient(circle at 25% 25%, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 55%), radial-gradient(circle at 80% 80%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%), var(--raised2); display: flex; align-items: center; justify-content: center; }
  .ws .play-btn { width: 62px; height: 62px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px -8px var(--accent); }
  .ws .float-badge { position: absolute; bottom: -18px; left: 26px; background: var(--raised); border: 1px solid var(--border); border-radius: 12px; padding: 12px 18px; display: flex; gap: 12px; align-items: center; box-shadow: 0 14px 30px -14px var(--shadow); }
  .ws .float-badge b { font-family: "Newsreader", serif; font-style: italic; font-size: 19px; }
  .ws .float-badge span { font-size: 11.5px; color: var(--muted); display: block; }
  .ws .video-wrap-outer { position: relative; margin-bottom: 26px; }
  .ws section { padding: 78px 0 70px; border-top: 1px solid var(--border-soft); }
  .ws .section-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 44px; flex-wrap: wrap; }
  .ws .section-title { font-size: clamp(26px, 3.4cqw, 34px); }
  .ws .section-sub { color: var(--muted); font-size: 15px; max-width: 44ch; margin-top: 10px; line-height: 1.55; }
  .ws .course-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: stretch; }
  .ws .ccard { border: 1px solid var(--border); border-radius: 16px; background: var(--raised); padding: 26px; display: flex; flex-direction: column; cursor: pointer; transition: border-color .18s ease; }
  .ws .ccard:hover { border-color: var(--faint); }
  .ws .ccard-thumb { aspect-ratio: 16/9; border-radius: 12px; margin-bottom: 18px; display: flex; align-items: center; justify-content: center; color: var(--text); border: 1px solid var(--border-soft); }
  .ws .thumb-1 { background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent2) 30%, transparent), transparent 60%), radial-gradient(circle at 80% 85%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), var(--raised2); }
  .ws .thumb-2 { background: radial-gradient(circle at 75% 25%, color-mix(in srgb, var(--accent2) 26%, transparent), transparent 60%), var(--raised2); }
  .ws .thumb-3 { background: radial-gradient(circle at 25% 75%, color-mix(in srgb, var(--accent) 24%, transparent), transparent 60%), var(--raised2); }
  .ws .ctag { align-self: flex-start; font-size: 11.5px; font-weight: 600; color: var(--accent2); background: color-mix(in srgb, var(--accent2) 15%, transparent); border-radius: 999px; padding: 5px 11px; margin-bottom: 18px; }
  .ws .ccard h3 { font-size: 21px; margin-bottom: 10px; }
  .ws .ccard p { margin: 0 0 20px; color: var(--muted); font-size: 14px; line-height: 1.55; flex: 1; }
  .ws .ccard-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 18px; border-top: 1px solid var(--border-soft); }
  .ws .cprice { font-family: "Newsreader", serif; font-style: italic; font-size: 20px; font-weight: 600; }
  .ws .cprice-old { font-size: 12.5px; color: var(--faint); text-decoration: line-through; margin-right: 6px; }
  .ws .carrow { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text); }
  .ws .section-head-center { text-align: center; max-width: 620px; margin: 0 auto 52px; }
  .ws .eyebrow { display: inline-flex; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent2); background: color-mix(in srgb, var(--accent2) 15%, transparent); border-radius: 999px; padding: 7px 16px; margin-bottom: 18px; }
  .ws .feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .ws .feature-card { border: 1px solid var(--border); border-radius: 16px; background: var(--raised); padding: 26px; }
  .ws .feature-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .ws .fi-a { background: var(--accent); color: var(--accent-ink); }
  .ws .fi-b { background: var(--accent2); color: var(--accent2-ink); }
  .ws .feature-card h3 { font-size: 18px; margin-bottom: 8px; }
  .ws .feature-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
  .ws .steps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 30px; }
  .ws .step-icon-wrap { position: relative; width: 56px; height: 56px; margin-bottom: 22px; }
  .ws .step-icon { width: 56px; height: 56px; border-radius: 14px; border: 1px solid var(--border); background: var(--raised); display: flex; align-items: center; justify-content: center; color: var(--accent2); }
  .ws .step-num { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; border-radius: 50%; background: var(--accent2); color: var(--accent2-ink); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .ws .step-item h4 { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
  .ws .step-item p { margin: 0; color: var(--muted); font-size: 13.5px; line-height: 1.55; }
  .ws .cta-banner { position: relative; overflow: hidden; border-radius: 24px; padding: 74px 32px; text-align: center; margin-top: 66px; background: radial-gradient(circle at 12% 15%, rgba(123,132,255,.55), transparent 55%), radial-gradient(circle at 88% 92%, rgba(255,92,72,.5), transparent 55%), #0b0c12; }
  .ws .cta-eyebrow { display: inline-flex; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #fff; background: rgba(255,255,255,.12); border-radius: 999px; padding: 7px 16px; margin-bottom: 22px; }
  .ws .cta-banner h2 { color: #fff; font-size: clamp(28px, 4cqw, 42px); max-width: 18ch; margin: 0 auto 16px; }
  .ws .cta-banner .sub { color: rgba(255,255,255,.72); font-size: 15.5px; margin: 0 auto 32px; max-width: 46ch; }
  .ws .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
  .ws .btn-cta-primary { background: #fff; color: #0b0c12; }
  .ws .btn-cta-primary:hover { background: #f0f0f0; }
  .ws .btn-cta-ghost { border: 1px solid rgba(255,255,255,.3); color: #fff; background: transparent; }
  .ws .btn-cta-ghost:hover { border-color: rgba(255,255,255,.55); }
  .ws footer.site { border-top: 1px solid var(--border-soft); padding: 56px 0 36px; }
  .ws .footer-cols { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1.4fr; gap: 40px; padding-bottom: 40px; }
  .ws .footer-brand .brand-name { font-size: 16px; }
  .ws .footer-col h5 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--faint); margin: 0 0 16px; font-weight: 700; }
  .ws .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
  .ws .footer-col a { font-size: 14px; color: var(--muted); }
  .ws .footer-cta { border: 1px solid var(--border); border-radius: 14px; background: var(--raised); padding: 22px; }
  .ws .footer-cta h5 { font-size: 15px; color: var(--text); margin: 0 0 8px; text-transform: none; letter-spacing: 0; font-weight: 700; }
  .ws .footer-cta p { font-size: 13.5px; color: var(--muted); margin: 0 0 16px; line-height: 1.5; }
  .ws .footer-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; padding-top: 26px; border-top: 1px solid var(--border-soft); }
  .ws .footer-links { display: flex; gap: 22px; font-size: 13.5px; color: var(--muted); flex-wrap: wrap; }
  .ws .foot-note { font-size: 13px; color: var(--faint); margin-top: 6px; }
  .ws .mobile-menu { display: none; flex-direction: column; padding: 6px 28px 18px; border-bottom: 1px solid var(--border-soft); background: var(--bg); }
  .ws .mobile-menu.open { display: flex; }
  .ws .mobile-menu a { padding: 13px 2px; font-size: 15px; color: var(--muted); border-top: 1px solid var(--border-soft); }
  .ws .mobile-menu a:first-child { border-top: none; }
  /* header + hero: lamba naam / lamba heading bhi chhoti screen se bahar na nikle */
  .ws .brand { min-width: 0; }
  .ws .brand > span:last-child { min-width: 0; }
  .ws .brand-name, .ws .brand-tag { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ws .nav-right { flex-shrink: 0; }
  .ws .hero-grid > * { min-width: 0; }
  .ws .hero-title { overflow-wrap: anywhere; text-wrap: balance; }
  .ws .pill { max-width: 100%; }
  .ws .stat-row { flex-wrap: wrap; row-gap: 14px; }
  @container ws (max-width: 780px) { .ws nav.links { display: none; } .ws .menu-btn { display: flex; } }
  @container ws (max-width: 860px) { .ws .footer-cols { grid-template-columns: 1fr 1fr; } }
  @container ws (max-width: 540px) { .ws .footer-cols { grid-template-columns: 1fr; } }
  @container ws (max-width: 900px) { .ws .course-grid { grid-template-columns: 1fr; } .ws .hero-grid { grid-template-columns: 1fr; gap: 40px; } .ws .store-hero { padding-block: 52px 72px; } .ws .feature-grid { grid-template-columns: 1fr 1fr; } .ws .steps-grid { grid-template-columns: 1fr 1fr; } }
  @container ws (max-width: 620px) { .ws .feature-grid { grid-template-columns: 1fr; } .ws .wrap { padding: 0 20px; } .ws .mobile-menu { padding: 6px 20px 16px; } .ws .store-hero { padding-block: 32px 56px; } .ws .hero-grid { gap: 32px; } .ws .pill { margin-bottom: 16px; } .ws .hero-title { font-size: clamp(28px, 8cqw, 38px); } .ws .hero-copy { font-size: 15px; margin: 16px 0 24px; } .ws .cta-row { margin-bottom: 28px; } .ws .cta-row { flex-direction: column; align-items: stretch; } .ws .cta-row .btn { width: 100%; justify-content: center; text-align: center; } .ws .stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .ws .stat b { font-size: 21px; } .ws .stat span { font-size: 11.5px; } .ws .video-wrap-outer { margin-bottom: 40px; } .ws .float-badge { left: 12px; right: 12px; bottom: -20px; padding: 10px 14px; } .ws .float-badge b { font-size: 16px; } .ws section { padding: 52px 0 48px; } .ws .cta-banner { padding: 46px 22px; margin-top: 40px; border-radius: 18px; } .ws .footer-cols { gap: 30px; } .ws footer.site { padding: 44px 0 28px; } }
  @container ws (max-width: 480px) { .ws .nav { height: 62px; gap: 8px; } .ws .brand { gap: 9px; } .ws .brand-tag { display: none; } .ws .brand-name { font-size: 14px; } .ws .mark { width: 30px; height: 30px; font-size: 14px; } .ws .nav-right { gap: 8px; } .ws .nav-right .btn { padding: 8px 14px; font-size: 13px; } .ws .icon-btn { width: 32px; height: 32px; font-size: 13px; } .ws .menu-btn { width: 32px; height: 32px; } }
  @container ws (max-width: 400px) { .ws .nav-right .btn { display: none; } }
`;

export function StudioTheme({ data }: { data: WebappData }) {
    // WebappData → purane design ke props (shape same rehta hai, source ek hi payload)
    const creator = { name: data.creator.name, username: data.creator.username, avatar: data.store.avatar };
    const store = {
        display_name: data.store.display_name,
        bio: data.store.bio,
        avatar: data.store.avatar,
        welcome_message: data.store.welcome,
        header_heading: data.store.heading,
        meta_title: data.store.meta_title,
        meta_description: data.store.meta_description,
        sensitive_content_warning: data.store.sensitive,
    };
    const appearance = useMemo(
        () => ({ theme: data.storeTheme, brand_color: data.brandColor, font_family: data.fontFamily, custom_background_path: null }),
        [data.storeTheme, data.brandColor, data.fontFamily],
    );
    const socialLinks = data.socials;
    const headerButtons = data.headerButtons;
    const products = data.products;

    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [menuOpen, setMenuOpen] = useState(false);
    const [brokenCovers, setBrokenCovers] = useState<number[]>([]);

    // colours inline vars se aate hain, isliye <html> ko chhedne ki zaroorat nahi (dashboard preview safe rahe)
    useEffect(() => {
        const saved = localStorage.getItem('pk-theme-v2');
        const preferred = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        setTheme(preferred === 'light' ? 'light' : 'dark');
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('pk-theme-v2', next);
    };

    const palette = useMemo(() => getPalette(appearance, theme === 'light'), [appearance, theme]);
    const brandName = store.display_name || creator.name || creator.username;
    const subtitle = store.bio || 'Helping learners build confidence with practical, real-world skills.';
    const heading = store.header_heading || "Learn to build software the way it's built at work.";
    const greeting = store.welcome_message || 'Next cohort opens 6 October';
    const courseCount = products.length || 3;
    const heroProducts = products.slice(0, 3);

    const themeVars = {
        ['--bg' as string]: palette.background,
        ['--raised' as string]: palette.raised,
        ['--raised2' as string]: palette.raised2,
        ['--border' as string]: palette.border,
        ['--border-soft' as string]: palette.borderSoft,
        ['--text' as string]: palette.text,
        ['--muted' as string]: palette.muted,
        ['--faint' as string]: palette.faint,
        ['--accent' as string]: palette.accent,
        ['--accent-ink' as string]: palette.accentInk,
        ['--accent2' as string]: palette.accent2,
        ['--accent2-ink' as string]: palette.accent2Ink,
        ['--shadow' as string]: palette.shadow,
    } as CSSProperties;

    return (
        <>
            <style>{css}</style>
            <div
                className="ws"
                style={{ ...themeVars, colorScheme: theme, fontFamily: data.fontFamily ? undefined : '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
                <header className="site">
                    <div className="wrap nav">
                        <a href="#" className="brand">
                            <span className="mark">{brandName.charAt(0).toUpperCase()}</span>
                            <span><span className="brand-name">{brandName}</span><span className="brand-tag">Full-stack development, taught properly</span></span>
                        </a>
                        <nav className="links">
                            <a href="#">Home</a>
                            <a href="#courses">Courses</a>
                            <a href="#about">About</a>
                            <a href="#footer">Contact</a>
                            <a href={`/${creator.username}`}>Store</a>
                        </nav>
                        <div className="nav-right">
                            <button className="menu-btn" aria-label="Open menu" onClick={() => setMenuOpen((v) => !v)}>
                                <Menu className="h-4 w-4" />
                            </button>
                            <button className="icon-btn" aria-label="Toggle theme" title="Toggle light / dark" onClick={toggleTheme}>◐</button>
                            {headerButtons[0] ? (
                                <a className="btn btn-primary" href={headerButtons[0].url}>{headerButtons[0].label}</a>
                            ) : (
                                <a className="btn btn-primary" href="#">Log in</a>
                            )}
                        </div>
                    </div>
                    <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                        <a href="#" onClick={() => setMenuOpen(false)}>Home</a>
                        <a href="#courses" onClick={() => setMenuOpen(false)}>Courses</a>
                        <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
                        <a href={`/${creator.username}`}>Store</a>
                        <a href="#footer" onClick={() => setMenuOpen(false)}>Contact</a>
                        {/* chhoti screen pe header ka button chhup jaata hai — wahi link yahan milta hai */}
                        {headerButtons[0] ? (
                            <a href={headerButtons[0].url}>{headerButtons[0].label}</a>
                        ) : (
                            <a href="#" onClick={() => setMenuOpen(false)}>Log in</a>
                        )}
                    </div>
                </header>

                <div className="wrap store-hero">
                    <div className="hero-grid">
                        <div className="fade-in">
                            <div className="pill"><span className="dot"></span>{greeting}</div>
                            <h1 className="hero-title">{heading}</h1>
                            <p className="hero-copy">{subtitle}</p>
                            <div className="cta-row">
                                <a className="btn btn-primary" href="#courses">Browse courses</a>
                                <a className="btn btn-ghost" href="#about">Read the teaching philosophy</a>
                            </div>
                            <div className="stat-row">
                                <div className="stat"><b>{courseCount}</b><span>Live courses</span></div>
                                <div className="stat"><b>12,400+</b><span>Learners</span></div>
                                <div className="stat"><b>4.9 / 5</b><span>Average rating</span></div>
                            </div>
                        </div>

                        <div className="fade-in d1">
                            <div className="video-wrap-outer">
                                <div className="video-mock">
                                    <div className="video-chrome"><span></span><span></span><span></span></div>
                                    <div className="video-body">
                                        <div className="play-btn">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="float-badge"><b>12.4k</b><span>students learning right now</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <section id="courses">
                    <div className="wrap">
                        <div className="section-head">
                            <div>
                                <h2 className="section-title">The courses</h2>
                                <p className="section-sub">Each one is built around a real project you ship by the end, not a checklist of topics.</p>
                            </div>
                        </div>

                        <div className="course-grid">
                            {heroProducts.length ? heroProducts.map((product, index) => (
                                <a key={product.id} className="ccard" href={product.url}>
                                    <div className="ccard-thumb thumb-1">
                                        {/* cover file gayab ho to broken image ki jagah icon */}
                                        {product.cover && ! brokenCovers.includes(product.id) ? (
                                            <img
                                                src={asset(product.cover)}
                                                alt={product.title}
                                                onError={() => setBrokenCovers((ids) => [...ids, product.id])}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                                            />
                                        ) : (
                                            <Star size={28} />
                                        )}
                                    </div>
                                    <span className="ctag">{index === 0 ? 'Featured · Cohort' : `${productTypeLabel(product.type)} · Self-paced`}</span>
                                    <h3>{product.title}</h3>
                                    <p>{product.description || 'A practical, project-based course designed to move you from idea to deployable work.'}</p>
                                    <div className="ccard-foot">
                                        <div>
                                            {product.has_discount && product.discounted_price ? <span className="cprice-old">{formatCurrency(product.price)}</span> : null}
                                            <span className="cprice">{getPrice(product)}</span>
                                        </div>
                                        <div className="carrow">→</div>
                                    </div>
                                </a>
                            )) : (
                                <div className="ccard" style={{ gridColumn: '1 / -1' }}>
                                    <p>No published products yet. More courses will appear here soon.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section id="about">
                    <div className="wrap">
                        <div className="section-head-center">
                            <span className="eyebrow">Why choose us</span>
                            <h2 className="section-title">Built for how you actually learn</h2>
                            <p className="section-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Tools that make studying smarter, faster and more rewarding.</p>
                        </div>

                        <div className="feature-grid">
                            {featureCards.map(({ title, description, icon: Icon }) => (
                                <div className="feature-card" key={title}>
                                    <div className={`feature-icon ${title.includes('Practice') || title.includes('Notes') ? 'fi-b' : 'fi-a'}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3>{title}</h3>
                                    <p>{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section>
                    <div className="wrap">
                        <div className="section-head-center">
                            <span className="eyebrow">Simple process</span>
                            <h2 className="section-title">How it works</h2>
                            <p className="section-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Four steps to begin your learning journey.</p>
                        </div>

                        <div className="steps-grid">
                            {processSteps.map(({ title, description, step }) => (
                                <div className="step-item" key={step}>
                                    <div className="step-icon-wrap">
                                        <div className="step-icon"><Sparkles className="h-5 w-5" /></div>
                                        <span className="step-num">{step}</span>
                                    </div>
                                    <h4>{title}</h4>
                                    <p>{description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="cta-banner">
                            <span className="cta-eyebrow">Get started</span>
                            <h2>Start learning with {brandName} today</h2>
                            <p className="sub">Join thousands of learners and get instant access to expert-led content.</p>
                            <div className="cta-actions">
                                <a className="btn btn-cta-primary" href="#courses">Browse courses</a>
                                <a className="btn btn-cta-ghost" href="#">Login / Sign up</a>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="site" id="footer">
                    <div className="wrap">
                        <div className="footer-cols">
                            <div className="footer-brand">
                                <div className="brand-name">{brandName}</div>
                                <div className="foot-note">Teaching full-stack development since 2021.</div>
                            </div>
                            <div className="footer-col">
                                <h5>Explore</h5>
                                <ul>
                                    <li><a href="#courses">Courses</a></li>
                                    <li><a href="#about">Features</a></li>
                                    <li><a href="#">Community</a></li>
                                    <li><a href={`/${creator.username}`}>Store</a></li>
                                </ul>
                            </div>
                            <div className="footer-col">
                                <h5>Account</h5>
                                <ul>
                                    <li><a href="#">Login</a></li>
                                    <li><a href="#">Sign up</a></li>
                                </ul>
                            </div>
                            <div className="footer-cta">
                                <h5>Ready to start?</h5>
                                <p>Create your free account and start learning today.</p>
                                <a className="btn btn-primary" href="#">Get started</a>
                            </div>
                        </div>

                        <div className="footer-bottom">
                            <div className="foot-note">© 2026 {brandName}. All rights reserved.</div>
                            <div className="footer-links">
                                {socialLinks.length ? socialLinks.map((link) => (
                                    <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                                        {socialIcon(link.platform)}
                                    </a>
                                )) : (
                                    <>
                                        <a href="#">Twitter</a>
                                        <a href="#">YouTube</a>
                                        <a href="#">Instagram</a>
                                        <a href="#">Contact</a>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
