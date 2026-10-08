import { priceLabel } from '@/components/store-page/types';
import { LayoutGrid, Menu } from 'lucide-react';
import { useState } from 'react';
import { FEATURES, SensitiveNote, sessionLength, siteCopy, Socials, STEPS, typeLabel, useColorMode, useThemeFonts } from '../shared';
import { initials, type WebappData } from '../types';

/*
 * Azure (plus) — saaf corporate full website: diagonal brand panel wala hero, numbered product list,
 * connected steps. Brand colour hi poora accent hai. CSS .wz me scoped, breakpoints container queries pe.
 */

const css = `
  .wz { --bg:#fff; --surface:#f4f7fe; --ink:#0b1430; --muted:#5b6477; --faint:#94a0b8; --line:#dfe6f7;
    --blue:var(--brand); --blue-dark:color-mix(in srgb, var(--brand) 62%, black); --blue-ink:var(--brand-ink);
    --sky:color-mix(in srgb, var(--brand) 9%, var(--bg)); --shadow:color-mix(in srgb, var(--brand) 22%, transparent);
    container: wz / inline-size; min-height:100%; background:var(--bg); color:var(--ink); -webkit-font-smoothing:antialiased; overflow-x:clip; }
  .wz[data-mode="dark"] { --bg:#0a0e1c; --surface:#111728; --ink:#eef2ff; --muted:#94a0c0; --faint:#525b78; --line:#202a46;
    --blue:color-mix(in srgb, var(--brand) 68%, white); --blue-dark:color-mix(in srgb, var(--brand) 45%, white); --blue-ink:#06102c;
    --sky:color-mix(in srgb, var(--brand) 16%, var(--bg)); --shadow:rgba(0,0,0,.4); }
  .wz * { box-sizing:border-box; }
  .wz a { color:inherit; text-decoration:none; }
  .wz h1, .wz h2, .wz h3, .wz h4, .wz .disp { font-family:"Manrope", sans-serif; font-weight:800; letter-spacing:-0.02em; margin:0; }
  .wz p { margin:0; }
  .wz .wrap { max-width:1160px; margin:0 auto; padding:0 28px; }
  .wz header.site { position:sticky; top:0; z-index:40; background:color-mix(in srgb, var(--bg) 90%, transparent); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .wz .nav { display:flex; align-items:center; justify-content:space-between; height:74px; gap:16px; }
  .wz .brand { display:flex; align-items:center; gap:11px; min-width:0; }
  .wz .mark { width:36px; height:36px; border-radius:10px; background:var(--blue); color:var(--blue-ink); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
  .wz .brand-name { font-size:15px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .wz .links { display:flex; gap:28px; font-size:14px; color:var(--muted); font-weight:600; }
  .wz .links a:hover { color:var(--blue); }
  .wz .nav-right { display:flex; align-items:center; gap:12px; }
  .wz .icon-btn, .wz .menu-btn { width:36px; height:36px; border:1px solid var(--line); background:var(--surface); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--ink); font-size:14px; flex-shrink:0; }
  .wz .icon-btn { border-radius:50%; }
  .wz .menu-btn { display:none; border-radius:8px; }
  .wz .mobile-menu { display:none; flex-direction:column; padding:4px 28px 18px; border-bottom:1px solid var(--line); background:var(--bg); }
  .wz .mobile-menu.open { display:flex; }
  .wz .mobile-menu a { padding:13px 2px; font-size:15px; color:var(--muted); border-top:1px solid var(--line); font-weight:600; }
  .wz .mobile-menu a:first-child { border-top:none; }
  .wz .btn { display:inline-flex; align-items:center; gap:8px; padding:12px 22px; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; border:1px solid transparent; white-space:nowrap; transition:background .15s ease, border-color .15s ease, color .15s ease; }
  .wz .btn-primary { background:var(--blue); color:var(--blue-ink); box-shadow:0 10px 24px -10px var(--shadow); }
  .wz .btn-primary:hover { background:var(--blue-dark); }
  .wz .btn-ghost { border-color:var(--line); color:var(--ink); background:var(--surface); }
  .wz .btn-ghost:hover { border-color:var(--blue); color:var(--blue); }
  .wz .pill { display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:700; color:var(--blue); background:var(--sky); border-radius:999px; padding:7px 15px; }
  .wz .pill .dot { width:6px; height:6px; border-radius:50%; background:var(--blue); flex-shrink:0; }

  .wz .hero { padding-top:58px; }
  .wz .hero-grid { display:grid; grid-template-columns:1.05fr 0.95fr; align-items:stretch; }
  .wz .hero-left { padding:20px 0 76px; }
  .wz .hero-title { font-size:clamp(34px, 4.6cqw, 54px); line-height:1.05; margin:18px 0 20px; text-wrap:balance; }
  .wz .hero-copy { color:var(--muted); font-size:16px; line-height:1.6; max-width:46ch; margin-bottom:28px; }
  .wz .cta-row { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:34px; }
  .wz .stat-row { display:flex; gap:32px; flex-wrap:wrap; row-gap:10px; }
  .wz .stat b { font-family:"Manrope", sans-serif; font-size:24px; font-weight:800; display:block; color:var(--blue); }
  .wz .stat span { font-size:12px; color:var(--muted); }
  .wz .hero-right { position:relative; min-height:420px; }
  .wz .hero-panel { position:absolute; inset:0; background:linear-gradient(155deg, var(--blue) 0%, var(--blue-dark) 100%); clip-path:polygon(14% 0, 100% 0, 100% 100%, 0% 100%); display:flex; align-items:center; justify-content:center; color:var(--blue-ink); text-align:center; padding:20px; }
  .wz .hp-glyph { font-size:90px; line-height:1; opacity:.95; }
  .wz .hp-sub { font-size:13px; opacity:.8; margin-top:10px; font-weight:600; }
  .wz .float-card { position:absolute; bottom:44px; left:-10px; background:var(--bg); border-radius:14px; padding:16px 20px; display:flex; gap:12px; align-items:center; box-shadow:0 20px 40px -14px var(--shadow); z-index:2; }
  .wz .fc-icon { width:38px; height:38px; border-radius:10px; background:var(--sky); color:var(--blue); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .wz .float-card b { font-family:"Manrope", sans-serif; font-size:17px; display:block; }
  .wz .float-card span { font-size:11.5px; color:var(--muted); }

  .wz section { padding:70px 0 62px; }
  .wz .section-head { margin-bottom:42px; }
  .wz .section-head-center { text-align:center; max-width:620px; margin:0 auto 46px; }
  .wz .eyebrow { display:inline-flex; font-size:11.5px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:var(--blue); background:var(--sky); border-radius:999px; padding:7px 16px; margin-bottom:16px; }
  .wz .section-title { font-size:clamp(25px, 3.2cqw, 32px); }
  .wz .section-sub { color:var(--muted); font-size:15px; max-width:44ch; margin-top:10px; line-height:1.55; }
  .wz .section-head-center .section-sub { margin-left:auto; margin-right:auto; }

  .wz .course-list { border-top:1px solid var(--line); }
  .wz .course-row { display:grid; grid-template-columns:72px 1fr auto; align-items:center; gap:24px; padding:26px 18px; border-bottom:1px solid var(--line); border-radius:12px; transition:background .15s ease; }
  .wz .course-row:hover { background:var(--surface); }
  .wz .c-num { width:48px; height:48px; border-radius:12px; background:var(--sky); color:var(--blue); display:flex; align-items:center; justify-content:center; font-size:16px; }
  .wz .c-main { min-width:0; }
  .wz .c-main h3 { font-size:19px; margin-bottom:7px; overflow-wrap:anywhere; }
  .wz .c-main p { margin-bottom:10px; color:var(--muted); font-size:13.5px; line-height:1.55; max-width:56ch; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .wz .c-tags { display:flex; gap:8px; flex-wrap:wrap; }
  .wz .c-tag { font-size:11px; font-weight:700; color:var(--blue); background:var(--sky); border-radius:6px; padding:4px 9px; }
  .wz .c-price-col { text-align:right; }
  .wz .c-price { font-size:20px; }
  .wz .c-price-old { font-size:12.5px; color:var(--faint); text-decoration:line-through; margin-right:6px; }
  .wz .c-cta { font-size:12.5px; color:var(--blue); font-weight:700; margin-top:6px; }
  .wz .empty { padding:36px 20px; text-align:center; color:var(--muted); font-size:14px; border-bottom:1px solid var(--line); }

  .wz .feature-list { display:grid; grid-template-columns:1fr 1fr; gap:0 48px; }
  .wz .feature-row { display:flex; gap:16px; padding:22px 0; border-top:1px solid var(--line); }
  .wz .feature-row:nth-child(1), .wz .feature-row:nth-child(2) { border-top:none; }
  .wz .f-icon { width:44px; height:44px; border-radius:12px; background:var(--sky); color:var(--blue); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .wz .feature-row h3 { font-size:16.5px; margin-bottom:6px; }
  .wz .feature-row p { font-size:13.5px; color:var(--muted); line-height:1.55; }

  .wz .steps-flow { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .wz .step-box { flex:1; text-align:center; position:relative; }
  .wz .step-circle { width:54px; height:54px; border-radius:50%; background:var(--blue); color:var(--blue-ink); display:flex; align-items:center; justify-content:center; font-size:18px; margin:0 auto 16px; position:relative; z-index:1; }
  .wz .step-connector { position:absolute; top:27px; left:50%; width:100%; height:2px; background:var(--line); z-index:0; }
  .wz .step-box:last-child .step-connector { display:none; }
  .wz .step-box h4 { font-size:15px; font-weight:700; margin-bottom:7px; }
  .wz .step-box p { margin:0 auto; max-width:20ch; color:var(--muted); font-size:12.5px; line-height:1.5; }

  .wz .cta-banner { border-radius:22px; padding:64px 32px; text-align:center; margin-top:60px; background:linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%); color:var(--blue-ink); }
  .wz .cta-eyebrow { display:inline-flex; font-size:11.5px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; background:color-mix(in srgb, currentColor 16%, transparent); border-radius:999px; padding:7px 16px; margin-bottom:20px; }
  .wz .cta-banner h2 { font-size:clamp(27px, 3.8cqw, 40px); max-width:18ch; margin:0 auto 14px; text-wrap:balance; }
  .wz .cta-banner .sub { opacity:.8; font-size:15px; margin:0 auto 30px; max-width:46ch; }
  .wz .cta-actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .wz .btn-cta-primary { background:var(--blue-ink); color:var(--blue-dark); }
  .wz[data-mode="dark"] .btn-cta-primary { color:#eef2ff; }
  .wz .btn-cta-ghost { border-color:color-mix(in srgb, currentColor 40%, transparent); background:transparent; }

  .wz footer.site { border-top:1px solid var(--line); padding:50px 0 32px; background:var(--surface); }
  .wz .footer-cols { display:grid; grid-template-columns:1.4fr 1fr 1.4fr; gap:36px; padding-bottom:36px; }
  .wz .footer-brand .brand-name { font-size:16px; white-space:normal; }
  .wz .footer-col h5 { font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--faint); margin:0 0 15px; font-weight:800; }
  .wz .footer-col ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:11px; }
  .wz .footer-col a { font-size:14px; color:var(--muted); font-weight:500; }
  .wz .footer-col a:hover { color:var(--blue); }
  .wz .footer-cta { border-radius:14px; background:var(--bg); border:1px solid var(--line); padding:20px; }
  .wz .footer-cta h5 { font-size:14.5px; margin:0 0 8px; font-weight:800; font-family:"Manrope", sans-serif; }
  .wz .footer-cta p { font-size:13px; color:var(--muted); margin-bottom:15px; line-height:1.5; }
  .wz .footer-bottom { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding-top:24px; border-top:1px solid var(--line); }
  .wz .foot-note { font-size:12.5px; color:var(--faint); margin-top:6px; line-height:1.5; }
  .wz .social { border:1px solid var(--line); background:var(--bg); color:var(--muted); }
  .wz .social:hover { color:var(--blue); border-color:var(--blue); }

  @container wz (max-width: 900px) {
    .wz .hero-grid { grid-template-columns:1fr; }
    .wz .hero-left { padding-bottom:20px; }
    .wz .hero-right { min-height:260px; margin:20px 0 40px; }
    .wz .hero-panel { clip-path:polygon(0 10%, 100% 0, 100% 100%, 0 100%); }
    .wz .float-card { left:16px; bottom:-26px; }
    .wz .footer-cols { grid-template-columns:1fr 1fr; }
  }
  @container wz (max-width: 780px) { .wz .links { display:none; } .wz .menu-btn { display:flex; } }
  @container wz (max-width: 760px) {
    .wz .steps-flow { flex-direction:column; align-items:stretch; gap:26px; }
    .wz .step-box { text-align:left; display:flex; gap:16px; align-items:flex-start; }
    .wz .step-circle { margin:0; flex-shrink:0; }
    .wz .step-connector { display:none; }
    .wz .step-box p { margin:0; max-width:none; }
    .wz .feature-list { grid-template-columns:1fr; }
    .wz .feature-row:nth-child(2) { border-top:1px solid var(--line); }
  }
  @container wz (max-width: 640px) {
    .wz .wrap { padding:0 20px; }
    .wz .mobile-menu { padding:4px 20px 16px; }
    .wz .hero { padding-top:34px; }
    .wz .hero-left { padding-top:0; }
    .wz .hero-title { font-size:clamp(27px, 7.5cqw, 36px); }
    .wz .cta-row { flex-direction:column; align-items:stretch; }
    .wz .cta-row .btn { justify-content:center; }
    .wz .stat-row { gap:20px; }
    .wz .stat b { font-size:19px; }
    .wz .hp-glyph { font-size:60px; }
    .wz .hero-right { min-height:200px; }
    .wz section { padding:44px 0 40px; }
    .wz .section-head-center { margin-bottom:30px; }
    .wz .course-row { grid-template-columns:1fr; gap:10px; padding:20px 14px; }
    .wz .c-price-col { text-align:left; }
    .wz .cta-banner { padding:42px 20px; margin-top:36px; border-radius:16px; }
    .wz .footer-cols { grid-template-columns:1fr; }
    .wz footer.site { padding:38px 0 24px; }
    .wz .nav-right .btn { display:none; }
  }
  @media (prefers-reduced-motion: reduce) { .wz * { transition:none !important; } }
`;

export function AzureTheme({ data }: { data: WebappData }) {
    const { sessions, name, heading, lede, cta, stats, storeUrl, brandVars } = siteCopy(data);
    const [mode, toggleMode] = useColorMode('webapp-mode-azure');
    const [menuOpen, setMenuOpen] = useState(false);
    useThemeFonts('webapp-font-azure', 'manrope:500,600,700,800');

    const links = [
        { label: 'Products', href: '#products' },
        { label: 'About', href: '#about' },
        { label: 'How it works', href: '#steps' },
        { label: 'Store', href: storeUrl },
    ];

    return (
        <>
            <style>{css}</style>
            <div className="wz" data-mode={mode} style={brandVars}>
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
                        <div className="hero-left">
                            {data.store.welcome && (
                                <span className="pill">
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
                            <div className="stat-row">
                                {stats.map((stat) => (
                                    <div className="stat" key={stat.label}>
                                        <b>{stat.value}</b>
                                        <span>{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                            {data.store.sensitive && <SensitiveNote className="mt-4" />}
                        </div>

                        <div className="hero-right">
                            <div className="hero-panel">
                                <div>
                                    <div className="hp-glyph disp">{initials(name)}</div>
                                    <div className="hp-sub">@{data.creator.username}</div>
                                </div>
                            </div>
                            {data.products.length > 0 && (
                                <div className="float-card">
                                    <div className="fc-icon">
                                        <LayoutGrid className="size-4.5" />
                                    </div>
                                    <div>
                                        <b>{data.products.length} to explore</b>
                                        <span>from {name}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <section id="products">
                    <div className="wrap">
                        <div className="section-head">
                            <h2 className="section-title">The catalogue</h2>
                            <p className="section-sub">Everything {name} has published — courses, resources and 1:1 time.</p>
                        </div>

                        <div className="course-list">
                            {data.products.length === 0 && <p className="empty">Nothing published yet — check back soon.</p>}
                            {/* products aur sessions ek hi numbered list me — session ki row pe duration tag aata hai */}
                            {data.products.map((product, index) => {
                                const { now, was } = priceLabel(product);

                                return (
                                    <a key={product.id} className="course-row" href={product.url}>
                                        <div className="c-num disp">{String(index + 1).padStart(2, '0')}</div>
                                        <div className="c-main">
                                            <h3>{product.title}</h3>
                                            {product.description && <p>{product.description}</p>}
                                            <div className="c-tags">
                                                <span className="c-tag">{typeLabel(product.type)}</span>
                                                {product.type === 'booking' && <span className="c-tag">{sessionLength(product)}</span>}
                                                {was && <span className="c-tag">On offer</span>}
                                            </div>
                                        </div>
                                        <div className="c-price-col">
                                            <div>
                                                {was && <span className="c-price-old">{was}</span>}
                                                <span className="c-price disp">{now}</span>
                                            </div>
                                            <div className="c-cta">{product.button_text || 'View'} →</div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="about">
                    <div className="wrap">
                        <div className="section-head-center">
                            <span className="eyebrow">Why choose us</span>
                            <h2 className="section-title">Built for how you actually learn</h2>
                            <p className="section-sub">Tools that make studying smarter, faster and more rewarding.</p>
                        </div>

                        <div className="feature-list">
                            {FEATURES.map(({ title, description, icon: Icon }) => (
                                <div className="feature-row" key={title}>
                                    <div className="f-icon">
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

                <section id="steps">
                    <div className="wrap">
                        <div className="section-head-center">
                            <span className="eyebrow">Simple process</span>
                            <h2 className="section-title">How it works</h2>
                            <p className="section-sub">Four steps to begin your learning journey.</p>
                        </div>

                        <div className="steps-flow">
                            {STEPS.map((step, index) => (
                                <div className="step-box" key={step.title}>
                                    <div className="step-circle disp">{index + 1}</div>
                                    <div className="step-connector" />
                                    <div>
                                        <h4>{step.title}</h4>
                                        <p>{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="cta-banner">
                            <span className="cta-eyebrow">Get started</span>
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
                        <div className="footer-cols">
                            <div className="footer-brand">
                                <div className="brand-name disp">{name}</div>
                                <div className="foot-note">{lede}</div>
                                <Socials socials={data.socials} className="mt-4" itemClassName="social" />
                            </div>
                            <div className="footer-col">
                                <h5>Explore</h5>
                                <ul>
                                    {links.map((link) => (
                                        <li key={link.label}>
                                            <a href={link.href}>{link.label}</a>
                                        </li>
                                    ))}
                                    {sessions.length > 0 && (
                                        <li>
                                            <a href={sessions[0].url}>Book a session</a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <div className="footer-cta">
                                <h5>Ready to start?</h5>
                                <p>Pick a product and start learning today.</p>
                                <a className="btn btn-primary" href="#products">
                                    Get started
                                </a>
                            </div>
                        </div>

                        <div className="footer-bottom">
                            <div className="foot-note">
                                © {new Date().getFullYear()} {name}. All rights reserved.
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
