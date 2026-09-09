import { lazy, Suspense, useEffect, useRef } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { navigation, pageOrder, pages, type WikiPage } from "./site-data";

const PixelWorld = lazy(() => import("./PixelWorld").then((module) => ({ default: module.PixelWorld })));

function normalizePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

/**
 * Resolve both local public assets and the absolute/data URLs used by the
 * published Wiki and the single-file review build. The preview inliner may
 * leave a leading slash in front of a data URI ("/data:image/…"), so strip
 * root slashes before handling data/blob URLs.
 */
function resolveFigureSrc(src: string) {
  const raw = src.trim();
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw)) return raw;
  const relative = raw.replace(/^\/+/, "");
  if (/^(?:data|blob):/i.test(relative)) return relative;
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}${relative}`;
}

function Header({ light = false }: { light?: boolean }) {
  const header = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const currentPath = normalizePath(pathname);
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    const close = () => node.querySelectorAll("details[open]").forEach((item) => item.removeAttribute("open"));
    const outside = (event: PointerEvent) => { if (!node.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const active = document.activeElement?.closest("details[open]");
      close();
      active?.querySelector("summary")?.focus();
    };
    close();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [pathname]);
  return <header ref={header} className={`site-header${light ? " site-header--light" : ""}`}>
    <Link className="brand" to="/" aria-label="DunaTerp home"><span className="brand-mark" aria-hidden="true">D</span><span>DunaTerp<small>SCU–CHINA · 2026</small></span></Link>
    <nav className="desktop-nav" aria-label="Primary navigation">
      {navigation.map((group) => <details key={group.label} name="desktop-navigation">
        <summary className={group.items.some(([, href]) => href === currentPath) ? "is-current" : undefined}>{group.label}<span aria-hidden="true">⌄</span></summary>
        <div className="nav-popover"><p>{group.label}</p>{group.items.map(([label, href]) => <Link key={href} to={href} aria-current={currentPath === href ? "page" : undefined}>{label}<span aria-hidden="true">↗</span></Link>)}</div>
      </details>)}
      <Link className="nav-index" to="/wiki-map" aria-current={currentPath === "/wiki-map" ? "page" : undefined}>Explore Wiki <span aria-hidden="true">↗</span></Link>
    </nav>
    <details className="mobile-menu"><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation">
      {navigation.map((group) => <div className="mobile-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([label, href]) => <Link key={href} to={href} aria-current={currentPath === href ? "page" : undefined}>{label}</Link>)}</div>)}
      <Link className="mobile-map-link" to="/wiki-map">Explore all pages ↗</Link>
    </nav></details>
  </header>;
}

function Footer() {
  return <footer className="site-footer"><div><p className="footer-brand">DunaTerp<span aria-hidden="true">.</span></p><p>A modular carotenoid-derivative platform in <i>Dunaliella salina</i>.</p><small>SCU–CHINA / iGEM 2026</small></div><div className="footer-links"><a href="https://gitlab.igem.org/2026/scu-china">Team GitLab ↗</a><a href="https://creativecommons.org/licenses/by/4.0/">Content: CC BY 4.0 ↗</a><Link to="/attributions">Attributions</Link><Link to="/responsible-ai">Responsible AI</Link></div></footer>;
}

function Status({ status }: { status: WikiPage["status"] }) {
  const labels = { "team-draft": "Team-review draft", "structure-only": "Team input required", "review-ready": "Reviewed" };
  return <span className={`status status--${status}`}>{labels[status]}</span>;
}

const groupDescriptions = [
  "From the biological idea to experiments and evidence.",
  "Understand the system, its constraints and its possibilities.",
  "Connect project decisions with people and the environment.",
  "Meet the team and discover the work behind the project.",
];

function WikiMap() {
  return <><Header /><main id="main-content" tabIndex={-1} className="map-page">
    <header className="map-heading"><div><p className="page-eyebrow">DUNATERP / PROJECT INDEX</p><h1>Explore the<br /><em>whole spectrum.</em></h1></div><p className="map-intro">Follow the science, explore the evidence, and meet the people behind DunaTerp. Every chapter starts here.</p></header>
    <div className="map-grid">{navigation.map((group, index) => <section key={group.label} className={`map-group map-group--${index}`}><header><span className="map-number">0{index + 1}</span><span>{String(group.items.length).padStart(2, "0")} PAGES</span></header><h2>{group.label}</h2><p className="map-description">{groupDescriptions[index]}</p><div className="map-links">{group.items.map(([label, href]) => <Link key={href} to={href}><span>{label}</span><b aria-hidden="true">↗</b></Link>)}</div></section>)}</div>
    <div className="map-return"><span>Start with the story.</span><Link to="/">Return to the salt route <span aria-hidden="true">↗</span></Link></div>
  </main><Footer /></>;
}

function Article({ slug }: { slug: string }) {
  const page = pages[slug];
  if (!page) return <Navigate to="/wiki-map" replace />;
  const index = pageOrder.indexOf(slug);
  const nextSlug = pageOrder[(index + 1) % pageOrder.length];
  const next = pages[nextSlug];
  const group = navigation.find((item) => item.items.some(([, href]) => href === `/${slug}`));
  const figureSrc = page.figure ? resolveFigureSrc(page.figure.src) : "";
  return <><Header /><main id="main-content" tabIndex={-1} className="article-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/wiki-map">Wiki</Link><span aria-hidden="true">/</span><span>{group?.label}</span><span aria-hidden="true">/</span><span aria-current="page">{group?.items.find(([, href]) => href === `/${slug}`)?.[0]}</span></nav>
    <header className="article-hero"><div><p className="page-eyebrow">{page.eyebrow}</p><h1>{page.title}</h1></div><div className="article-intro"><Status status={page.status} /><p>{page.intro}</p></div></header>
    <div className="article-layout"><aside className="article-toc"><p>ON THIS PAGE</p><nav aria-label="On this page">{page.sections.map((section, i) => <Link key={section.title} to={{ pathname: `/${slug}`, hash: `#section-${i + 1}` }}><span>{String(i + 1).padStart(2, "0")}</span>{section.title}</Link>)}</nav><Link className="toc-map" to="/wiki-map">All chapters ↗</Link></aside>
      <div className="article-body">{page.figure && <figure className="feature-figure"><img src={figureSrc} alt={page.figure.alt} loading="lazy" decoding="async" /><figcaption>{page.figure.caption}</figcaption></figure>}
        <div className="article-sections">{page.sections.map((section, i) => <section id={`section-${i + 1}`} tabIndex={-1} key={section.title}><div className="section-number">{String(i + 1).padStart(2, "0")}</div><div>{section.eyebrow && <p className="section-eyebrow">{section.eyebrow}</p>}<h2>{section.title}</h2><p>{section.body}</p>{section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}{section.note && <aside>{section.note}</aside>}</div></section>)}</div>
        <aside className="review-banner"><span>Team review</span><p>Before Wiki Freeze, a named team reviewer must verify claims, citations, figures, licences, alt text and correspondence with the official judging form.</p></aside>
        <Link className="next-page" to={`/${nextSlug}`}><span>CONTINUE EXPLORING</span><strong>{next.title}</strong><b aria-hidden="true">↗</b></Link>
      </div>
    </div>
  </main><Footer /></>;
}

function ScrollAndTitle() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const slug = normalizePath(pathname).replace(/^\//, "");
    document.title = slug && pages[slug] ? `${pages[slug].title} · DunaTerp` : slug === "wiki-map" ? "Explore the Wiki · DunaTerp" : "DunaTerp · SCU-China 2026";
    const frame = requestAnimationFrame(() => {
      if (hash) {
        let id = hash.slice(1);
        try { id = decodeURIComponent(id); } catch { /* Keep the raw id when a malformed URL hash is supplied. */ }
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView();
          target.focus({ preventScroll: true });
        }
      } else {
        window.scrollTo(0, 0);
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const { pathname, search } = useLocation();
  return <><Link className="skip-link" to={{ pathname, search, hash: "#main-content" }}>Skip to content</Link><ScrollAndTitle /><Routes>
    <Route path="/" element={<Suspense fallback={<><Header /><main id="main-content" tabIndex={-1} className="world-loading"><p className="page-eyebrow">SCU–CHINA / iGEM 2026</p><h1>DunaTerp.</h1><p role="status">Surveying the salt flats…</p><Link to="/wiki-map">Explore the Wiki ↗</Link></main></>}><PixelWorld Header={Header} /></Suspense>} />
    <Route path="/wiki-map" element={<WikiMap />} />
    {pageOrder.map((slug) => <Route key={slug} path={`/${slug}`} element={<Article slug={slug} />} />)}
    <Route path="*" element={<Navigate to="/wiki-map" replace />} />
  </Routes></>;
}
