import { priceLabel } from '@/components/store-page/types';
import { Menu, Video } from 'lucide-react';
import { useState } from 'react';
import { CoverArt, FEATURES, SensitiveNote, sessionLength, siteCopy, Socials, STEPS, typeLabel, useColorMode, useThemeFonts } from '../shared';
import { initials, type WebappData } from '../types';

/*
 * Bold (plus) — neo-brutalist full website: mote borders, hard shadows, bento features.
 * CSS .wb ke andar scoped hai aur breakpoints container queries se chalte hain,
 * isliye dashboard ke phone-frame preview me bhi wahi layout aata hai jo asli phone pe.
 */

const css = `
  .wb { --bg:#f6f3ec; --surface:#fff; --surface2:#ece7d8; --ink:#15140f; --muted:#5b5848; --faint:#9b9684;
    --accent:var(--brand); --accent-ink:var(--brand-ink); --accent2:#e8572c; --accent2-ink:#fff4ee; --bw:1.5px;
    container: wb / inline-size; min-height:100%; background:var(--bg); color:var(--ink); -webkit-font-smoothing:antialiased; }
  .wb[data-mode="dark"] { --bg:#121310; --surface:#1a1b16; --surface2:#212218; --ink:#f3f1e7; --muted:#b4af9c; --faint:#6e6b5c;
    --accent:color-mix(in srgb, var(--brand) 75%, white); --accent-ink:#06130d; --accent2:#ff7a4a; --accent2-ink:#1f0a02; }
  .wb * { box-sizing:border-box; }
  .wb a { color:inherit; text-decoration:none; }
  .wb h1, .wb h2, .wb h3, .wb h4, .wb .disp { font-family:"Space Grotesk", sans-serif; font-weight:700; letter-spacing:-0.02em; margin:0; }
  .wb p { margin:0; }
  .wb .wrap { max-width:1160px; margin:0 auto; padding:0 28px; }
  .wb header.site { position:sticky; top:0; z-index:40; background:var(--bg); border-bottom:var(--bw) solid var(--ink); }
  .wb .nav { display:flex; align-items:center; justify-content:space-between; height:74px; gap:16px; }
  .wb .brand { display:flex; align-items:center; gap:11px; min-width:0; }
  .wb .mark { width:36px; height:36px; border:var(--bw) solid var(--ink); border-radius:8px; background:var(--accent); color:var(--accent-ink); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
  .wb .brand-name { font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .wb .links { display:flex; gap:28px; font-size:14px; color:var(--muted); font-weight:500; }
  .wb .links a:hover { color:var(--ink); }
  .wb .nav-right { display:flex; align-items:center; gap:12px; }
  .wb .icon-btn, .wb .menu-btn { width:36px; height:36px; border:var(--bw) solid var(--ink); background:var(--surface); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--ink); font-size:14px; flex-shrink:0; }
  .wb .icon-btn { border-radius:50%; }
  .wb .menu-btn { display:none; border-radius:8px; }
  .wb .mobile-menu { display:none; flex-direction:column; padding:4px 28px 18px; border-bottom:var(--bw) solid var(--ink); background:var(--bg); }
  .wb .mobile-menu.open { display:flex; }
  .wb .mobile-menu a { padding:13px 2px; font-size:15px; color:var(--muted); border-top:1px solid var(--surface2); font-weight:500; }
  .wb .mobile-menu a:first-child { border-top:none; }
  .wb .btn { display:inline-flex; align-items:center; gap:8px; padding:12px 22px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; border:var(--bw) solid var(--ink); white-space:nowrap; }
  .wb .btn-primary { background:var(--accent); color:var(--accent-ink); box-shadow:3px 3px 0 var(--ink); transition:transform .15s ease, box-shadow .15s ease; }
  .wb .btn-primary:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
  .wb .btn-ghost { background:var(--surface); color:var(--ink); }
  .wb .btn-ghost:hover { background:var(--surface2); }
  .wb .btn:active { transform:translate(1px,1px); box-shadow:none; }
  .wb .tag { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:600; background:var(--surface); border:var(--bw) solid var(--ink); border-radius:999px; padding:6px 14px; }
  .wb .tag .dot { width:6px; height:6px; border-radius:50%; background:var(--accent2); }

  .wb .hero { padding:56px 0 70px; }
  .wb .hero-grid { display:grid; grid-template-columns:1.1fr 0.9fr; gap:50px; align-items:center; }
  .wb .hero-title { font-size:clamp(34px, 4.6cqw, 52px); line-height:1.04; margin-top:18px; text-wrap:balance; }
  .wb .hero-copy { margin:22px 0 28px; color:var(--muted); font-size:16px; line-height:1.6; max-width:46ch; }
  .wb .cta-row { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:36px; }
  .wb .stat-strip { display:flex; border:var(--bw) solid var(--ink); border-radius:10px; overflow:hidden; }
  .wb .stat-cell { flex:1; padding:16px 14px; border-left:var(--bw) solid var(--ink); background:var(--surface); }
  .wb .stat-cell:first-child { border-left:none; }
  .wb .stat-cell b { font-family:"Space Grotesk", sans-serif; font-size:22px; display:block; }
  .wb .stat-cell span { font-size:11.5px; color:var(--muted); }
  .wb .hv-card { border:var(--bw) solid var(--ink); border-radius:14px; background:var(--accent); color:var(--accent-ink); aspect-ratio:4/3.2; box-shadow:8px 8px 0 var(--ink); display:flex; flex-direction:column; justify-content:space-between; padding:26px; position:relative; }
  .wb .hv-glyph { font-size:72px; line-height:1; opacity:.92; }
  .wb .hv-foot { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; font-size:13px; }
  .wb .hv-foot b { font-family:"Space Grotesk", sans-serif; font-size:18px; display:block; text-align:right; }
  .wb .hv-badge { position:absolute; top:-16px; right:-14px; background:var(--surface); border:var(--bw) solid var(--ink); border-radius:50%; width:92px; height:92px; display:flex; flex-direction:column; align-items:center; justify-content:center; transform:rotate(8deg); text-align:center; color:var(--ink); box-shadow:4px 4px 0 var(--ink); }
  .wb .hv-badge b { font-family:"Space Grotesk", sans-serif; font-size:20px; display:block; }
  .wb .hv-badge span { font-size:9px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.04em; }

  .wb section { padding:66px 0 60px; border-top:var(--bw) solid var(--surface2); }
  .wb .section-head { margin-bottom:40px; }
  .wb .section-head-center { text-align:center; max-width:620px; margin:0 auto 46px; }
  .wb .eyebrow { display:inline-flex; font-size:11.5px; font-weight:700; background:var(--surface2); border:var(--bw) solid var(--ink); border-radius:999px; padding:6px 15px; margin-bottom:16px; }
  .wb .section-title { font-size:clamp(25px, 3.2cqw, 32px); }
  .wb .section-sub { color:var(--muted); font-size:15px; max-width:44ch; margin-top:10px; line-height:1.55; }
  .wb .section-head-center .section-sub { margin-left:auto; margin-right:auto; }

  .wb .course-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:26px 18px; }
  .wb .ccard { border:var(--bw) solid var(--ink); border-radius:12px; background:var(--surface); padding:22px; display:flex; flex-direction:column; box-shadow:4px 4px 0 var(--ink); transition:transform .15s ease, box-shadow .15s ease; position:relative; min-width:0; }
  .wb .ccard:hover { transform:translate(-2px,-2px); box-shadow:6px 6px 0 var(--ink); }
  .wb .ccard-num { position:absolute; top:-14px; left:18px; background:var(--accent2); color:var(--accent2-ink); border:var(--bw) solid var(--ink); border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:12px; }
  .wb .ccard-thumb { aspect-ratio:16/9; border-radius:8px; border:var(--bw) solid var(--ink); margin:14px 0 16px; overflow:hidden; background:var(--surface2); }
  .wb .fill { width:100%; height:100%; }
  .wb .ctag { align-self:flex-start; font-size:11px; font-weight:700; background:var(--surface2); border:1px solid var(--ink); border-radius:6px; padding:4px 9px; text-transform:uppercase; letter-spacing:.03em; }
  .wb .ccard h3 { font-size:19px; margin:0 0 8px; overflow-wrap:anywhere; }
  .wb .ccard p { margin:0 0 18px; color:var(--muted); font-size:13.5px; line-height:1.55; flex:1; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
  .wb .ccard-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; padding-top:16px; border-top:var(--bw) solid var(--ink); }
  .wb .cprice { font-size:19px; }
  .wb .cprice-old { font-size:12px; color:var(--faint); text-decoration:line-through; margin-right:6px; }
  .wb .carrow { width:30px; height:30px; border-radius:50%; border:var(--bw) solid var(--ink); display:flex; align-items:center; justify-content:center; background:var(--surface2); flex-shrink:0; }
  .wb .empty { border:var(--bw) dashed var(--ink); border-radius:12px; padding:36px 20px; text-align:center; color:var(--muted); font-size:14px; }

  .wb .session-list { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .wb .session { display:flex; align-items:center; gap:14px; border:var(--bw) solid var(--ink); border-radius:10px; background:var(--surface); padding:16px; min-width:0; }
  .wb .session:hover { background:var(--surface2); }
  .wb .session-ico { width:42px; height:42px; border-radius:9px; border:var(--bw) solid var(--ink); background:var(--accent); color:var(--accent-ink); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .wb .session-main { flex:1; min-width:0; }
  .wb .session-main b { display:block; font-family:"Space Grotesk", sans-serif; font-size:15.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .wb .session-main span { font-size:12.5px; color:var(--muted); }

  .wb .bento { display:grid; grid-template-columns:repeat(4, 1fr); grid-auto-rows:minmax(150px, auto); gap:16px; }
  .wb .bcard { border:var(--bw) solid var(--ink); border-radius:12px; padding:22px; display:flex; flex-direction:column; justify-content:flex-end; background:var(--surface); }
  .wb .bcard.alt { background:var(--surface2); }
  .wb .bcard.lead { grid-column:span 2; grid-row:span 2; background:var(--accent); color:var(--accent-ink); justify-content:space-between; }
  .wb .bcard.wide { grid-column:1 / -1; }
  .wb .b-icon { width:38px; height:38px; border-radius:9px; border:var(--bw) solid var(--ink); background:var(--surface); color:var(--ink); display:flex; align-items:center; justify-content:center; margin-bottom:14px; flex-shrink:0; }
  .wb .bcard h3 { font-size:16px; margin-bottom:6px; }
  .wb .bcard.lead h3 { font-size:22px; }
  .wb .bcard p { font-size:13px; line-height:1.5; color:var(--muted); }
  .wb .bcard.lead p { color:var(--accent-ink); opacity:.85; font-size:14px; max-width:32ch; }

  .wb .rail { position:relative; display:grid; grid-template-columns:repeat(4, 1fr); gap:28px; margin-top:10px; }
  .wb .rail::before { content:""; position:absolute; top:23px; left:5%; right:5%; height:var(--bw); background:var(--ink); z-index:0; }
  .wb .rail-item { position:relative; z-index:1; }
  .wb .rail-num { width:46px; height:46px; border-radius:50%; border:var(--bw) solid var(--ink); background:var(--surface); display:flex; align-items:center; justify-content:center; font-size:17px; margin-bottom:18px; }
  .wb .rail-item:nth-child(odd) .rail-num { background:var(--accent); color:var(--accent-ink); }
  .wb .rail-item h4 { font-size:15.5px; margin:0 0 7px; }
  .wb .rail-item p { color:var(--muted); font-size:13px; line-height:1.5; }

  .wb .cta-banner { position:relative; border:var(--bw) solid var(--ink); border-radius:18px; background:var(--ink); color:var(--bg); padding:64px 32px; text-align:center; margin-top:60px; }
  .wb .cta-corner { position:absolute; top:18px; right:18px; background:var(--accent2); color:var(--accent2-ink); border:var(--bw) solid var(--bg); border-radius:8px; padding:6px 13px; font-size:11.5px; font-weight:700; transform:rotate(4deg); }
  .wb .cta-banner h2 { font-size:clamp(27px, 3.8cqw, 40px); max-width:18ch; margin:0 auto 14px; text-wrap:balance; }
  .wb .cta-banner .sub { opacity:.68; font-size:15px; margin:0 auto 30px; max-width:46ch; }
  .wb .cta-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .wb .btn-cta-primary { background:var(--accent); color:var(--accent-ink); border-color:var(--bg); box-shadow:3px 3px 0 var(--bg); }
  .wb .btn-cta-ghost { border-color:var(--bg); color:var(--bg); background:transparent; }

  .wb footer.site { border-top:var(--bw) solid var(--ink); padding:44px 0 32px; }
  .wb .footer-top { display:flex; justify-content:space-between; align-items:flex-start; gap:28px; flex-wrap:wrap; padding-bottom:28px; }
  .wb .footer-brand { max-width:46ch; }
  .wb .footer-brand .brand-name { font-size:17px; white-space:normal; }
  .wb .foot-note { font-size:12.5px; color:var(--faint); margin-top:6px; line-height:1.5; }
  .wb .footer-links { display:flex; gap:20px; font-size:13.5px; color:var(--muted); flex-wrap:wrap; }
  .wb .footer-links a:hover { color:var(--ink); }
  .wb .footer-bottom { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding-top:24px; border-top:var(--bw) solid var(--surface2); }
  .wb .social { border:var(--bw) solid var(--ink); background:var(--surface); }
  .wb .social:hover { background:var(--surface2); }

  @container wb (max-width: 900px) {
    .wb .hero-grid, .wb .course-grid, .wb .session-list { grid-template-columns:1fr; }
    .wb .bento, .wb .rail { grid-template-columns:repeat(2, 1fr); }
    .wb .bcard.lead { grid-row:span 1; }
    .wb .rail { row-gap:36px; }
    .wb .rail::before { display:none; }
  }
  @container wb (max-width: 780px) { .wb .links { display:none; } .wb .menu-btn { display:flex; } }
  @container wb (max-width: 640px) {
    .wb .wrap { padding:0 20px; }
    .wb .mobile-menu { padding:4px 20px 16px; }
    .wb .hero { padding:34px 0 48px; }
    .wb .hero-title { font-size:clamp(27px, 7.5cqw, 36px); }
    .wb .cta-row { flex-direction:column; align-items:stretch; }
    .wb .cta-row .btn { justify-content:center; }
    .wb .stat-cell { padding:13px 10px; }
    .wb .stat-cell b { font-size:18px; }
    .wb .hv-card { aspect-ratio:16/10; padding:20px; margin-right:10px; }
    .wb .hv-glyph { font-size:52px; }
    .wb .hv-badge { width:78px; height:78px; right:-10px; }
    .wb section { padding:42px 0 40px; }
    .wb .section-head-center { margin-bottom:30px; }
    .wb .cta-banner { padding:54px 20px 42px; margin-top:36px; }
    .wb .nav-right .btn { display:none; }
  }
  @container wb (max-width: 560px) {
    .wb .bento, .wb .rail { grid-template-columns:1fr; }
    .wb .bcard.lead { grid-column:span 1; }
  }
  @media (prefers-reduced-motion: reduce) { .wb * { transition:none !important; } }
`;

export function BoldTheme({ data }: { data: WebappData }) {
    const { items, sessions, name, heading, lede, cta, stats, storeUrl, brandVars } = siteCopy(data);
    const [mode, toggleMode] = useColorMode('webapp-mode-bold');
    const [menuOpen, setMenuOpen] = useState(false);
    useThemeFonts('webapp-font-bold', 'space-grotesk:500,600,700');

    const links = [
        { label: 'Products', href: '#products' },
        ...(sessions.length > 0 ? [{ label: 'Sessions', href: '#sessions' }] : []),
        { label: 'About', href: '#about' },
        { label: 'Store', href: storeUrl },
    ];

    return (
        <>
            <style>{css}</style>
            <div className="wb" data-mode={mode} style={brandVars}>
                <header className="site">
                    <div className="wrap nav">
                        <a href="#products" className="brand">
                            <span className="mark disp">{initials(name)}</span>
                            <span className="brand-name disp">{name}</span>
                        </a>
                        <nav className="links">
                            {links.map((link) => (
                                <a key={link.label} href={link.href}>
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                        <div className="nav-right">
                            <button type="button" className="menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
                                <Menu className="size-4" />
                            </button>
                            <button type="button" className="icon-btn" aria-label="Toggle light / dark" onClick={toggleMode}>
                                ◐
                            </button>
                            <a className="btn btn-primary" href={cta.url}>
                                {cta.label}
                            </a>
                        </div>
                    </div>
                    <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                        {links.map((link) => (
                            <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
                                {link.label}
                            </a>
                        ))}
                        <a href={cta.url}>{cta.label}</a>
                    </div>
                </header>

                <div className="wrap hero">
                    <div className="hero-grid">
                        <div>
                            {data.store.welcome && (
                                <span className="tag">
                                    <span className="dot" />
                                    {data.store.welcome}
                                </span>
                            )}
                            <h1 className="hero-title">{heading}</h1>
                            <p className="hero-copy">{lede}</p>
                            <div className="cta-row">
                                <a className="btn btn-primary" href="#products">
                                    Browse products
                                </a>
                                <a className="btn btn-ghost" href="#about">
                                    Why learn here
                                </a>
                            </div>
                            {stats.length > 0 && (
                                <div className="stat-strip">
                                    {stats.map((stat) => (
                                        <div className="stat-cell" key={stat.label}>
                                            <b>{stat.value}</b>
                                            <span>{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {data.store.sensitive && <SensitiveNote className="mt-4" />}
                        </div>

                        <div className="hv-card">
                            {data.products.length > 0 && (
                                <div className="hv-badge">
                                    <b>{data.products.length}</b>
                                    <span>to explore</span>
                                </div>
                            )}
                            <div className="hv-glyph disp">{initials(name)}</div>
                            <div className="hv-foot">
                                <span>@{data.creator.username}</span>
                                <b>{name}</b>
                            </div>
                        </div>
                    </div>
                </div>

                <section id="products">
                    <div className="wrap">
                        <div className="section-head">
                            <h2 className="section-title">The catalogue</h2>
                            <p className="section-sub">Everything {name} has published — pick one and start today.</p>
                        </div>

                        {items.length === 0 ? (
                            <p className="empty">Nothing published yet — check back soon.</p>
                        ) : (
                            <div className="course-grid">
                                {items.map((product, index) => {
                                    const { now, was } = priceLabel(product);

                                    return (
                                        <a key={product.id} className="ccard" href={product.url}>
                                            <span className="ccard-num disp">{String(index + 1).padStart(2, '0')}</span>
                                            <span className="ctag">{typeLabel(product.type)}</span>
                                            <div className="ccard-thumb">
                                                <CoverArt product={product} className="fill" iconClass="size-7 opacity-40" />
                                            </div>
                                            <h3>{product.title}</h3>
                                            <p>{product.description}</p>
                                            <div className="ccard-foot">
                                                <div>
                                                    {was && <span className="cprice-old">{was}</span>}
                                                    <span className="cprice disp">{now}</span>
                                                </div>
                                                <div className="carrow">→</div>
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
                            <div className="section-head">
                                <h2 className="section-title">1:1 sessions</h2>
                                <p className="section-sub">Book time directly with {name}.</p>
                            </div>
                            <div className="session-list">
                                {sessions.map((session) => (
                                    <a key={session.id} className="session" href={session.url}>
                                        <span className="session-ico">
                                            <Video className="size-5" />
                                        </span>
                                        <span className="session-main">
                                            <b>{session.title}</b>
                                            <span>{sessionLength(session)}</span>
                                        </span>
                                        <span className="cprice disp">{priceLabel(session).now}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section id="about">
                    <div className="wrap">
                        <div className="section-head-center">
                            <span className="eyebrow">Why choose us</span>
                            <h2 className="section-title">Built for how you actually learn</h2>
                            <p className="section-sub">Tools that make studying smarter, faster and more rewarding.</p>
                        </div>

                        <div className="bento">
                            {FEATURES.map(({ title, description, icon: Icon }, index) => (
                                <div key={title} className={`bcard ${index === 0 ? 'lead' : index === FEATURES.length - 1 ? 'wide' : index % 2 ? 'alt' : ''}`}>
                                    <div className="b-icon">
                                        <Icon className="size-4.5" />
                                    </div>
                                    <div>
                                        <h3>{title}</h3>
                                        <p>{description}</p>
                                    </div>
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
                            <p className="section-sub">Four steps to begin your learning journey.</p>
                        </div>

                        <div className="rail">
                            {STEPS.map((step, index) => (
                                <div className="rail-item" key={step.title}>
                                    <div className="rail-num disp">{index + 1}</div>
                                    <h4>{step.title}</h4>
                                    <p>{step.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="cta-banner">
                            <span className="cta-corner">Get started</span>
                            <h2>Start learning with {name} today</h2>
                            <p className="sub">{lede}</p>
                            <div className="cta-actions">
                                <a className="btn btn-cta-primary" href="#products">
                                    Browse products
                                </a>
                                <a className="btn btn-cta-ghost" href={cta.url}>
                                    {cta.label}
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="site">
                    <div className="wrap">
                        <div className="footer-top">
                            <div className="footer-brand">
                                <div className="brand-name disp">{name}</div>
                                <div className="foot-note">{lede}</div>
                            </div>
                            <Socials socials={data.socials} itemClassName="social" />
                        </div>
                        <div className="footer-bottom">
                            <div className="foot-note">
                                © {new Date().getFullYear()} {name}. All rights reserved.
                            </div>
                            <div className="footer-links">
                                {links.map((link) => (
                                    <a key={link.label} href={link.href}>
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
