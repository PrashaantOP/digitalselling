import { priceLabel } from '@/components/store-page/types';
import { ArrowRight, Menu, Moon, Video } from 'lucide-react';
import { useState } from 'react';
import { CoverArt, FEATURES, SensitiveNote, sessionLength, siteCopy, Socials, STEPS, typeLabel, useColorMode, useThemeFonts } from '../shared';
import { initials, type WebappData } from '../types';

/*
 * Notebook (plus) — "classes" wala design: graph-paper background, tilted featured card,
 * type filter tabs, bento features aur clickable steps. Brand colour accent hai, sun-yellow highlight.
 * CSS .wn me scoped, breakpoints container queries pe (dashboard ka phone preview bhi sahi dikhe).
 */

const css = `
  .wn { --bg:#F5F6F0; --surface:#fff; --surface-2:#ECEFE6; --ink:#15211B; --muted:#5B6860; --line:#DCE1D5;
    --accent:var(--brand); --accent-ink:var(--brand-ink); --accent-soft:color-mix(in srgb, var(--brand) 16%, var(--surface));
    --sun:#F0A23A; --sun-soft:#FCEBD0; --grid:color-mix(in srgb, var(--brand) 7%, transparent);
    --shadow:0 1px 0 var(--line), 0 12px 30px -18px rgba(21,33,27,.35);
    --f-display:"Unbounded", "Arial Black", system-ui, sans-serif; --f-mono:"JetBrains Mono", ui-monospace, Menlo, monospace;
    container: wn / inline-size; min-height:100%; color:var(--ink); font-size:16px; line-height:1.6; overflow-x:clip;
    background:var(--bg); background-image:linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px); background-size:28px 28px; }
  .wn[data-mode="dark"] { --bg:#0D1411; --surface:#141E19; --surface-2:#1B2721; --ink:#E8EFEA; --muted:#93A39A; --line:#26342D;
    --accent:color-mix(in srgb, var(--brand) 65%, white); --accent-ink:#06150F; --accent-soft:color-mix(in srgb, var(--brand) 26%, var(--surface));
    --sun:#F4B45A; --sun-soft:#3A2A12; --shadow:0 1px 0 var(--line), 0 14px 34px -18px rgba(0,0,0,.7); }
  .wn * { box-sizing:border-box; }
  .wn a { color:inherit; text-decoration:none; }
  .wn h1, .wn h2, .wn h3 { font-family:var(--f-display); text-wrap:balance; margin:0; letter-spacing:-.02em; }
  .wn p { margin:0; }
  .wn .wrap { max-width:1160px; margin:0 auto; padding-inline:20px; }
  .wn .btn { display:inline-flex; align-items:center; gap:8px; border:0; cursor:pointer; font-weight:600; font-size:15px; padding:13px 22px; border-radius:999px; transition:transform .15s; }
  .wn .btn:hover { transform:translateY(-2px); }
  .wn .btn-primary { background:var(--accent); color:var(--accent-ink); box-shadow:0 8px 20px -10px var(--accent); }
  .wn .btn-ghost { background:var(--surface); color:var(--ink); border:1px solid var(--line); }
  .wn .label { font:500 12px var(--f-mono); letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }

  .wn header.site { position:sticky; top:0; z-index:20; background:color-mix(in srgb, var(--bg) 85%, transparent); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .wn .nav { display:flex; align-items:center; justify-content:space-between; gap:16px; height:66px; position:relative; }
  .wn .brand { display:flex; align-items:center; gap:10px; font:700 15px var(--f-display); min-width:0; }
  .wn .brand > span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .wn .mark { width:34px; height:34px; border-radius:10px; background:var(--ink); color:var(--bg); display:grid; place-items:center; font-size:13px; position:relative; flex:none; }
  .wn .mark::after { content:""; position:absolute; right:-3px; bottom:-3px; width:11px; height:11px; border-radius:50%; background:var(--sun); border:2px solid var(--bg); }
  .wn .links { display:flex; gap:4px; }
  .wn .links a { font-weight:500; color:var(--muted); padding:8px 14px; border-radius:999px; font-size:15px; }
  .wn .links a:hover { color:var(--ink); background:var(--surface-2); }
  .wn .nav-r { display:flex; gap:10px; align-items:center; }
  .wn .icon-btn { width:40px; height:40px; border-radius:50%; border:1px solid var(--line); background:var(--surface); color:var(--ink); cursor:pointer; display:grid; place-items:center; flex:none; }
  .wn .menu-btn { display:none; }

  .wn .hero { display:grid; grid-template-columns:1.15fr .85fr; gap:48px; align-items:center; padding-block:72px 56px; }
  .wn .hero-l { min-width:0; }
  .wn .pill { display:inline-flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:6px 14px 6px 6px; font-size:14px; font-weight:500; }
  .wn .pill b { background:var(--sun-soft); color:var(--ink); font:500 11px var(--f-mono); padding:4px 9px; border-radius:999px; }
  .wn .hero h1 { font-size:clamp(34px, 5.2cqw, 62px); line-height:1.06; margin-block:22px 20px; font-weight:800; overflow-wrap:anywhere; }
  .wn .hl { position:relative; white-space:nowrap; color:var(--accent); }
  .wn .hl svg { position:absolute; left:0; bottom:-.18em; width:100%; height:.35em; }
  .wn .hl path { stroke:var(--sun); stroke-width:6; fill:none; stroke-linecap:round; stroke-dasharray:400; stroke-dashoffset:0; animation:wn-draw 1.2s .3s ease both; }
  @keyframes wn-draw { from { stroke-dashoffset:400; } }
  .wn .lede { font-size:19px; color:var(--muted); max-width:52ch; }
  .wn .cta-row { display:flex; flex-wrap:wrap; gap:12px; margin-top:30px; }

  .wn .lesson { display:block; background:var(--surface); border:1px solid var(--line); border-radius:22px; box-shadow:var(--shadow); padding:22px; position:relative; transform:rotate(1.2deg); }
  .wn .lesson-top { display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:13px; color:var(--muted); }
  .wn .chip { font:500 12px var(--f-mono); color:var(--accent); }
  .wn .board { margin-top:16px; border-radius:14px; background:var(--ink); color:var(--bg); overflow:hidden; }
  .wn .board-cover { aspect-ratio:16/9; color:var(--bg); }
  .wn .fill { width:100%; height:100%; }
  .wn .board-b { padding:18px 20px 20px; }
  .wn .board .q { font:500 12px var(--f-mono); opacity:.6; text-transform:uppercase; letter-spacing:.06em; }
  .wn .board .eq { font:700 21px/1.25 var(--f-display); margin-block:8px 14px; overflow-wrap:anywhere; }
  .wn .board .go { display:inline-flex; align-items:center; gap:8px; background:var(--accent); color:var(--accent-ink); border-radius:10px; padding:9px 14px; font-weight:600; font-size:14px; }
  .wn .sticker { position:absolute; left:-26px; bottom:34px; background:var(--sun); color:#1d1406; font-weight:700; font-size:14px; padding:10px 14px; border-radius:12px; transform:rotate(-6deg); box-shadow:var(--shadow); }
  .wn .sticker small { display:block; font:500 11px var(--f-mono); opacity:.75; }

  .wn .strip { border-block:1px solid var(--line); background:var(--surface); }
  .wn .strip .wrap { display:flex; gap:16px 48px; flex-wrap:wrap; padding-block:22px; }
  .wn .strip strong { display:block; font:700 26px/1.2 var(--f-display); font-variant-numeric:tabular-nums; }
  .wn .strip span { color:var(--muted); font-size:14px; }

  .wn section { padding-block:88px 0; }
  .wn .head { display:flex; justify-content:space-between; align-items:end; gap:24px; flex-wrap:wrap; margin-bottom:36px; }
  .wn .head h2 { font-size:clamp(26px, 3.6cqw, 40px); margin-top:10px; font-weight:700; max-width:18ch; line-height:1.15; }
  .wn .head p { color:var(--muted); max-width:42ch; }

  .wn .tabs { display:flex; gap:8px; flex-wrap:wrap; }
  .wn .tab { border:1px solid var(--line); background:var(--surface); color:var(--muted); font-weight:600; font-size:14px; padding:8px 16px; border-radius:999px; cursor:pointer; }
  .wn .tab[aria-pressed="true"] { background:var(--ink); color:var(--bg); border-color:var(--ink); }
  .wn .courses { display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; }
  .wn .course { background:var(--surface); border:1px solid var(--line); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; transition:transform .2s, box-shadow .2s; min-width:0; }
  .wn .course:hover { transform:translateY(-4px); box-shadow:var(--shadow); }
  .wn .cover { height:150px; position:relative; background:linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, black)); color:var(--accent-ink); }
  .wn .cover .tag { position:absolute; left:14px; bottom:14px; font:500 11px var(--f-mono); letter-spacing:.06em; text-transform:uppercase; background:rgba(0,0,0,.45); color:#fff; padding:5px 9px; border-radius:999px; }
  .wn .course-b { padding:18px; display:flex; flex-direction:column; gap:10px; flex:1; }
  .wn .course h3 { font-family:inherit; font-weight:700; font-size:18px; letter-spacing:0; line-height:1.3; overflow-wrap:anywhere; }
  .wn .meta { color:var(--muted); font-size:13.5px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .wn .course-f { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:auto; padding-top:14px; border-top:1px dashed var(--line); }
  .wn .price { font:700 19px var(--f-display); font-variant-numeric:tabular-nums; }
  .wn .price s { font-family:inherit; font-weight:400; font-size:13px; color:var(--muted); margin-left:6px; }
  .wn .enroll { background:var(--accent-soft); color:var(--accent); font-weight:600; font-size:14px; padding:9px 16px; border-radius:999px; white-space:nowrap; }
  .wn[data-mode="dark"] .enroll { color:var(--ink); }
  .wn .empty { border:1px dashed var(--line); border-radius:18px; background:var(--surface); padding:40px 20px; text-align:center; color:var(--muted); }

  .wn .sessions { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .wn .session { display:flex; align-items:center; gap:14px; background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:16px; min-width:0; }
  .wn .session:hover { box-shadow:var(--shadow); }
  .wn .session b { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .wn .session small { color:var(--muted); font-size:13px; }
  .wn .session > span:nth-child(2) { flex:1; min-width:0; }

  .wn .bento { display:grid; grid-template-columns:repeat(6, 1fr); gap:18px; }
  .wn .tile { background:var(--surface); border:1px solid var(--line); border-radius:20px; padding:26px; display:flex; flex-direction:column; gap:10px; min-width:0; grid-column:span 2; }
  .wn .tile h3 { font-family:inherit; font-weight:700; font-size:19px; letter-spacing:0; }
  .wn .tile p { color:var(--muted); font-size:15px; }
  .wn .ico { width:46px; height:46px; border-radius:13px; display:grid; place-items:center; margin-bottom:6px; background:var(--accent-soft); color:var(--accent); flex:none; }
  .wn[data-mode="dark"] .ico { color:var(--ink); }
  .wn .t1 { grid-column:span 4; background:var(--ink); color:var(--bg); border-color:var(--ink); }
  .wn .t1 p { color:color-mix(in srgb, var(--bg) 70%, transparent); }
  .wn .t1 .ico { background:var(--accent); color:var(--accent-ink); }
  .wn .road { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
  .wn .road span { font:500 12px var(--f-mono); padding:7px 12px; border-radius:999px; border:1px solid color-mix(in srgb, var(--bg) 25%, transparent); }
  .wn .t2 .ico { background:var(--sun-soft); color:var(--sun); }
  .wn .t6 { grid-column:span 6; flex-direction:row; align-items:center; justify-content:space-between; gap:24px; background:var(--sun-soft); border-color:transparent; flex-wrap:wrap; }
  .wn .cert { display:flex; gap:18px; align-items:center; min-width:0; flex:1 1 280px; }
  .wn .badge { width:64px; height:64px; border-radius:50%; background:var(--sun); display:grid; place-items:center; flex:none; color:#1d1406; }

  .wn .steps-wrap { display:grid; grid-template-columns:.9fr 1.1fr; gap:40px; align-items:start; }
  .wn .steps { display:flex; flex-direction:column; gap:6px; position:relative; }
  .wn .steps::before { content:""; position:absolute; left:39px; top:40px; bottom:40px; border-left:2px dashed var(--line); }
  .wn .step { display:grid; grid-template-columns:52px 1fr; gap:16px; align-items:start; text-align:left; background:none; border:0; color:var(--ink); padding:14px; border-radius:16px; cursor:pointer; font:inherit; position:relative; }
  .wn .step:hover, .wn .step[aria-selected="true"] { background:var(--surface); }
  .wn .step[aria-selected="true"] { box-shadow:var(--shadow); }
  .wn .num { width:52px; height:52px; border-radius:50%; border:2px dashed var(--line); display:grid; place-items:center; font:700 17px var(--f-display); background:var(--bg); position:relative; z-index:1; }
  .wn .step[aria-selected="true"] .num { border:2px solid var(--accent); background:var(--accent); color:var(--accent-ink); }
  .wn .step b { display:block; font-size:18px; margin-top:4px; }
  .wn .step small { display:block; color:var(--muted); font-size:15px; margin-top:2px; }
  .wn .stage { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:30px; min-height:300px; display:flex; flex-direction:column; gap:16px; }
  .wn .stage .big { font:800 88px/.9 var(--f-display); color:var(--accent-soft); }
  .wn .stage h3 { font-size:24px; }
  .wn .stage p { color:var(--muted); }
  .wn .stage .btn { margin-top:auto; align-self:flex-start; }

  .wn .cta { background:var(--accent); color:var(--accent-ink); border-radius:28px; padding:56px clamp(24px, 5cqw, 64px); display:grid; grid-template-columns:1.3fr 1fr; gap:36px; align-items:center; position:relative; overflow:hidden; }
  .wn .cta::before { content:""; position:absolute; inset:0; background-image:radial-gradient(color-mix(in srgb, var(--accent-ink) 18%, transparent) 1.5px, transparent 1.5px); background-size:22px 22px; -webkit-mask-image:linear-gradient(90deg, transparent 30%, #000); mask-image:linear-gradient(90deg, transparent 30%, #000); }
  .wn .cta > * { position:relative; }
  .wn .cta h2 { font-size:clamp(26px, 4cqw, 44px); font-weight:800; line-height:1.12; margin-top:12px; }
  .wn .cta p { opacity:.85; margin-top:14px; font-size:17px; }
  .wn .cta .label { color:inherit; opacity:.8; }
  .wn .signup { background:var(--surface); color:var(--ink); border-radius:18px; padding:22px; display:flex; flex-direction:column; gap:12px; }
  .wn .signup p { color:var(--muted); font-size:14px; margin:0; opacity:1; }
  .wn .signup .btn { justify-content:center; }

  .wn footer.site { border-top:1px solid var(--line); padding-block:30px; margin-top:88px; color:var(--muted); font-size:14px; background:var(--bg); }
  .wn footer .wrap { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
  .wn footer nav { display:flex; gap:18px; flex-wrap:wrap; }
  .wn footer a:hover { color:var(--ink); }
  .wn .social { border:1px solid var(--line); background:var(--surface); color:var(--muted); }

  @container wn (max-width: 900px) {
    .wn .hero { grid-template-columns:1fr; padding-block:44px; }
    .wn .lesson { transform:none; max-width:460px; }
    .wn .sticker { left:auto; right:12px; bottom:-18px; }
    .wn .courses, .wn .bento { grid-template-columns:1fr 1fr; }
    .wn .tile { grid-column:span 1; }
    .wn .t1, .wn .t6 { grid-column:span 2; }
    .wn .steps-wrap, .wn .cta { grid-template-columns:1fr; }
    .wn .stage { min-height:0; }
  }
  @container wn (max-width: 820px) {
    .wn .links, .wn .nav-r .btn { display:none; }
    .wn .menu-btn { display:grid; }
    .wn .links.open { display:flex; flex-direction:column; position:absolute; left:16px; right:16px; top:70px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:8px; box-shadow:var(--shadow); }
  }
  @container wn (max-width: 600px) {
    .wn .courses, .wn .bento, .wn .sessions { grid-template-columns:1fr; }
    .wn .t1, .wn .t6 { grid-column:span 1; }
    .wn .lede { font-size:17px; }
    .wn section { padding-top:60px; }
    .wn .cta { padding-block:40px; border-radius:22px; }
    .wn footer.site { margin-top:60px; }
    .wn .stage .big { font-size:64px; }
  }
  @media (prefers-reduced-motion: reduce) { .wn * { animation:none !important; transition:none !important; } }
`;

export function NotebookTheme({ data }: { data: WebappData }) {
    const { items, sessions, name, heading, lede, cta, stats, storeUrl, brandVars } = siteCopy(data);
    const [mode, toggleMode] = useColorMode('webapp-mode-notebook');
    const [menuOpen, setMenuOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const [step, setStep] = useState(0);
    useThemeFonts('webapp-font-notebook', 'unbounded:500,700,800|figtree:400,500,600,700|jetbrains-mono:500');

    // heading ka aakhri shabd highlight hota hai (design ka squiggle underline)
    const words = heading.trim().split(/\s+/);
    const lastWord = words.pop() ?? '';

    const featured = items[0] ?? sessions[0];
    const types = [...new Set(items.map((p) => p.type))];
    const shown = filter === 'all' ? items : items.filter((p) => p.type === filter);
    const [lead, ...restFeatures] = FEATURES;
    const closing = restFeatures.pop()!;

    const links = [
        { label: 'Products', href: '#products' },
        { label: 'Why us', href: '#features' },
        { label: 'How it works', href: '#steps' },
        { label: 'Store', href: storeUrl },
    ];

    return (
        <>
            <style>{css}</style>
            {/* creator ne apna font chuna ho to wahi chale, warna design ka Figtree */}
            <div className="wn" data-mode={mode} style={{ ...brandVars, fontFamily: data.fontFamily ? undefined : '"Figtree", system-ui, sans-serif' }}>
                <header className="site">
                    <div className="wrap nav">
                        <a className="brand" href="#products">
                            <span className="mark">{initials(name)}</span>
                            <span>{name}</span>
                        </a>
                        <nav className={`links ${menuOpen ? 'open' : ''}`}>
                            {links.map((link) => (
                                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <div className="nav-r">
                            <button type="button" className="icon-btn" aria-label="Switch theme" onClick={toggleMode}>
                                <Moon className="size-4.5" />
                            </button>
                            <a className="btn btn-primary" href={cta.url} style={{ padding: '10px 18px' }}>
                                {cta.label}
                            </a>
                            <button type="button" className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
                                <Menu className="size-4.5" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="wrap hero">
                    <div className="hero-l">
                        {data.store.welcome && (
                            <span className="pill">
                                <b>NEW</b>
                                {data.store.welcome}
                            </span>
                        )}
                        <h1>
                            {words.join(' ')}{' '}
                            <span className="hl">
                                {lastWord}
                                <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
                                    <path d="M3 14 C 50 4, 120 4, 197 10" />
                                </svg>
                            </span>
                        </h1>
                        <p className="lede">{lede}</p>
                        <div className="cta-row">
                            <a className="btn btn-primary" href="#products">
                                Explore products <ArrowRight className="size-4" />
                            </a>
                            <a className="btn btn-ghost" href="#steps">
                                See how it works
                            </a>
                        </div>
                        {data.store.sensitive && <SensitiveNote className="mt-5" />}
                    </div>

                    {featured && (
                        <a className="lesson" href={featured.url} aria-label={`Featured: ${featured.title}`}>
                            <div className="lesson-top">
                                <span>Start here</span>
                                <span className="chip">FEATURED</span>
                            </div>
                            <div className="board">
                                <div className="board-cover">
                                    <CoverArt product={featured} className="fill" iconClass="size-9 opacity-40" />
                                </div>
                                <div className="board-b">
                                    <div className="q">{typeLabel(featured.type)}</div>
                                    <div className="eq">{featured.title}</div>
                                    <span className="go">
                                        {featured.button_text || 'View details'} <ArrowRight className="size-4" />
                                    </span>
                                </div>
                            </div>
                            <div className="sticker">
                                {priceLabel(featured).now}
                                <small>{featured.type === 'booking' ? sessionLength(featured) : 'instant access'}</small>
                            </div>
                        </a>
                    )}
                </div>

                {stats.length > 0 && (
                    <div className="strip">
                        <div className="wrap">
                            {stats.map((stat) => (
                                <div key={stat.label}>
                                    <strong>{stat.value}</strong>
                                    <span>{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <section id="products">
                    <div className="wrap">
                        <div className="head">
                            <div>
                                <span className="label">Catalogue</span>
                                <h2>Pick what fits your goal</h2>
                            </div>
                            {types.length > 1 && (
                                <div className="tabs" role="group" aria-label="Filter products">
                                    {['all', ...types].map((type) => (
                                        <button key={type} type="button" className="tab" aria-pressed={filter === type} onClick={() => setFilter(type)}>
                                            {type === 'all' ? 'All' : typeLabel(type)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {items.length === 0 ? (
                            <p className="empty">Nothing published yet — check back soon.</p>
                        ) : (
                            <div className="courses">
                                {shown.map((product) => {
                                    const { now, was } = priceLabel(product);

                                    return (
                                        <a key={product.id} className="course" href={product.url}>
                                            <div className="cover">
                                                <CoverArt product={product} className="fill" iconClass="size-9 opacity-50" />
                                                <span className="tag">{typeLabel(product.type)}</span>
                                            </div>
                                            <div className="course-b">
                                                <h3>{product.title}</h3>
                                                {product.description && <p className="meta">{product.description}</p>}
                                                <div className="course-f">
                                                    <span className="price">
                                                        {now}
                                                        {was && <s>{was}</s>}
                                                    </span>
                                                    <span className="enroll">{product.button_text || 'View'}</span>
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {sessions.length > 0 && (
                    <section id="sessions">
                        <div className="wrap">
                            <div className="head">
                                <div>
                                    <span className="label">1:1 sessions</span>
                                    <h2>Book time with {name}</h2>
                                </div>
                            </div>
                            <div className="sessions">
                                {sessions.map((session) => (
                                    <a key={session.id} className="session" href={session.url}>
                                        <span className="ico" style={{ marginBottom: 0 }}>
                                            <Video className="size-5" />
                                        </span>
                                        <span>
                                            <b>{session.title}</b>
                                            <small>{sessionLength(session)}</small>
                                        </span>
                                        <span className="price">{priceLabel(session).now}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section id="features">
                    <div className="wrap">
                        <div className="head">
                            <div>
                                <span className="label">Why learners choose us</span>
                                <h2>Everything you need, in one place</h2>
                            </div>
                            <p>Every tool here exists for one reason: to help you understand faster and remember longer.</p>
                        </div>
                        <div className="bento">
                            <div className="tile t1">
                                <div className="ico">
                                    <lead.icon className="size-5.5" />
                                </div>
                                <h3>{lead.title}</h3>
                                <p>{lead.description}</p>
                                <div className="road">
                                    {STEPS.map((s) => (
                                        <span key={s.title}>{s.title}</span>
                                    ))}
                                </div>
                            </div>
                            {restFeatures.map(({ title, description, icon: Icon }, index) => (
                                <div className={`tile ${index === 0 ? 't2' : ''}`} key={title}>
                                    <div className="ico">
                                        <Icon className="size-5.5" />
                                    </div>
                                    <h3>{title}</h3>
                                    <p>{description}</p>
                                </div>
                            ))}
                            <div className="tile t6">
                                <div className="cert">
                                    <div className="badge">
                                        <closing.icon className="size-7" />
                                    </div>
                                    <div>
                                        <h3>{closing.title}</h3>
                                        <p>{closing.description}</p>
                                    </div>
                                </div>
                                <a className="btn btn-ghost" href="#products">
                                    Start with your first one
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="steps">
                    <div className="wrap">
                        <div className="head">
                            <div>
                                <span className="label">How it works</span>
                                <h2>Four steps from sign-up to mastery</h2>
                            </div>
                            <p>Tap any step to see what happens there.</p>
                        </div>
                        <div className="steps-wrap">
                            <div className="steps" role="tablist">
                                {STEPS.map((s, index) => (
                                    <button key={s.title} type="button" className="step" role="tab" aria-selected={index === step} onClick={() => setStep(index)}>
                                        <span className="num">{index + 1}</span>
                                        <span>
                                            <b>{s.title}</b>
                                            <small>{s.description}</small>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="stage" role="tabpanel" aria-live="polite">
                                <span className="big">0{step + 1}</span>
                                <h3>{STEPS[step].title}</h3>
                                <p>{STEPS[step].description}</p>
                                {step < STEPS.length - 1 ? (
                                    <button type="button" className="btn btn-ghost" onClick={() => setStep(step + 1)}>
                                        Next step →
                                    </button>
                                ) : (
                                    <a className="btn btn-primary" href="#products">
                                        Start now
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="join">
                    <div className="wrap">
                        <div className="cta">
                            <div>
                                <span className="label">Get started</span>
                                <h2>Start learning with {name} today</h2>
                                <p>{lede}</p>
                            </div>
                            <div className="signup">
                                <p>Pick a product, check out in a minute, and start right away.</p>
                                <a className="btn btn-primary" href="#products">
                                    Browse the catalogue
                                </a>
                                <a className="btn btn-ghost" href={cta.url}>
                                    {cta.label}
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="site">
                    <div className="wrap">
                        <span>
                            © {new Date().getFullYear()} {name}
                        </span>
                        <Socials socials={data.socials} itemClassName="social" />
                        <nav>
                            {links.map((link) => (
                                <a key={link.label} href={link.href}>
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                </footer>
            </div>
        </>
    );
}
