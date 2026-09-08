import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { PixelEngine, type Mode } from "./pixel/engine";
import { STATION_COPY } from "./pixel/station-copy";
import { navigation } from "./site-data";

type HeaderProps = { light?: boolean };

const GROUP_ACCENTS = ["#cdf558", "#7de2ff", "#e9c43a", "#c4a8ff"];

const GROUP_NOTES = [
  "Build the chassis, test the constructs, keep every decision on record.",
  "Connect light, regulation and pathway allocation with reproducible computation.",
  "Let stakeholders, safety and sustainability change what the team builds.",
  "Meet the team and see who contributed, supported and reviewed the work.",
];

function LoadingScreen({ ratio }: { ratio: number }) {
  const cells = 24;
  const filled = Math.round(ratio * cells);
  return (
    <div className="px-loading" role="status" aria-live="polite">
      <p className="px-loading-title">DUNATERP</p>
      <p className="px-loading-sub">Surveying the salt flats…</p>
      <div className="px-meter" aria-hidden="true">
        {Array.from({ length: cells }, (_, index) => (
          <i key={index} className={index < filled ? "is-on" : undefined} />
        ))}
      </div>
      <p className="px-loading-pct">{Math.round(ratio * 100)}%</p>
    </div>
  );
}

export function PixelWorld({ Header }: { Header: ComponentType<HeaderProps> }) {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);
  const scrollLock = useRef(0);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("guided");
  const [chapter, setChapter] = useState(-1);
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const [atArchive, setAtArchive] = useState(false);
  const [started, setStarted] = useState(false);

  const promptStation = useMemo(
    () => STATION_COPY.find((item) => item.key === promptKey) ?? null,
    [promptKey],
  );

  useEffect(() => {
    const host = stage.current;
    const surface = canvas.current;
    if (!host || !surface) return;

    let engine: PixelEngine | null = null;
    try {
      engine = new PixelEngine(surface, host, {
        onLoadProgress: setProgress,
        onReady: () => setReady(true),
        onMode: setMode,
        onChapter: setChapter,
        onPrompt: (station) => setPromptKey(station ? station.key : null),
        onEnter: (station) => navigate(station.route),
      });
    } catch (error) {
      console.error("DunaTerp world failed to start", error);
      return;
    }
    engineRef.current = engine;
    void engine.start();

    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, [navigate]);

  // Guided mode: page scroll drives the walk.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const update = () => {
      const engine = engineRef.current;
      if (!engine || engine.mode === "free") return;
      const top = node.getBoundingClientRect().top + window.scrollY;
      const travel = Math.max(1, node.offsetHeight - window.innerHeight);
      const value = (window.scrollY - top) / travel;
      engine.setScrollProgress(value);
      setStarted(value > 0.012);
      setAtArchive(value > 0.955);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Free mode pins the document so wandering never scrolls the page away from
  // the world, and hands the scroll position back at the point the hero left.
  useEffect(() => {
    if (mode !== "free") return;
    const node = root.current;
    const body = document.body;
    const y = window.scrollY;
    scrollLock.current = y;
    const nodeTop = node ? node.getBoundingClientRect().top + y : 0;
    const travel = node ? Math.max(1, node.offsetHeight - window.innerHeight) : 1;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `${-y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      const engine = engineRef.current;
      // Hand the page back at wherever the hero actually ended up, so leaving
      // free roam never loses the reader's place in the document.
      const restore = node && engine ? nodeTop + engine.journey * travel : scrollLock.current;
      window.scrollTo(0, restore);
    };
  }, [mode]);

  const toggleMode = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.mode === "free") engine.exitFree();
    else engine.enterFree();
  }, []);

  const beginJourney = useCallback(() => {
    const node = root.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: node.offsetTop + window.innerHeight * 0.9,
      behavior: reduce ? "instant" : "smooth",
    });
  }, []);

  const restart = useCallback(() => {
    const engine = engineRef.current;
    const wasFree = engine?.mode === "free";
    if (wasFree) engine?.exitFree();
    const scroll = () => {
      const node = root.current;
      if (!node) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: node.offsetTop, behavior: reduce ? "instant" : "smooth" });
    };
    // The body is still pinned on this tick when leaving free roam; wait for
    // React to run the unpin cleanup before scrolling.
    if (wasFree) requestAnimationFrame(() => requestAnimationFrame(scroll));
    else scroll();
  }, []);

  const activeChapter = chapter >= 0 ? STATION_COPY[chapter] : null;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      ref={root}
      className={`px-world${ready ? " is-ready" : ""}${started ? " is-started" : ""}${mode === "free" ? " is-free" : ""}${atArchive ? " is-archive" : ""}`}
    >
      <Header light />

      <div className="px-sticky">
        <div
          ref={stage}
          className="px-stage"
          aria-label="A pixel-art salt lake you can walk through"
        >
          <canvas ref={canvas} className="px-canvas" />
        </div>

        {!ready && <LoadingScreen ratio={progress} />}

        <section className="px-intro" inert={!ready || started || mode === "free"}>
          <p className="px-coord"><span /> SCU–CHINA · CHENGDU · iGEM 2026</p>
          <h1>Duna<i>Terp</i></h1>
          <p className="px-intro-line">
            One salt-adapted cell. One shared β-carotene hub. Four routes into colour.
          </p>
          <div className="px-intro-actions">
            <button type="button" className="px-button px-button--primary" onClick={beginJourney}>
              Walk the salt route <span aria-hidden="true">↓</span>
            </button>
            <button type="button" className="px-button" onClick={toggleMode}>
              Explore freely <span aria-hidden="true">✥</span>
            </button>
            <Link className="px-button px-button--ghost" to="/project-description">
              Read the project <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="px-hint">
            Scroll to walk · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to take over
          </p>
        </section>

        {activeChapter && (
          <aside className="px-hud" style={{ "--px-accent": activeChapter.color } as React.CSSProperties}>
            <span className="px-hud-index">{activeChapter.index}</span>
            <div>
              <p className="px-hud-kicker">{activeChapter.kicker}</p>
              <h2>{activeChapter.title}</h2>
              <p className="px-hud-body">{activeChapter.body}</p>
              <Link to={activeChapter.route}>Open this chapter <span aria-hidden="true">↗</span></Link>
            </div>
          </aside>
        )}

        {promptStation && (
          <div
            className="px-prompt"
            style={{ "--px-accent": promptStation.color } as React.CSSProperties}
          >
            <span className="px-prompt-key">{mode === "free" ? "E" : "↵"}</span>
            <div>
              <p>{promptStation.index} · {promptStation.kicker}</p>
              <button type="button" onClick={() => navigate(promptStation.route)}>
                Enter {promptStation.title} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-controls">
          <button
            type="button"
            className={`px-mode${mode === "free" ? " is-on" : ""}`}
            onClick={toggleMode}
            aria-pressed={mode === "free"}
          >
            {mode === "free" ? "Back to the route" : "Free roam"}
          </button>
          {mode === "free" && (
            <p className="px-mode-help">
              <kbd>WASD</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> enter · <kbd>Esc</kbd> return
            </p>
          )}
        </div>

        <button type="button" className="px-restart" onClick={restart} aria-label="Return to the trailhead">
          ↑
        </button>

        <div className="px-route" aria-hidden="true">
          {STATION_COPY.map((station) => (
            <i
              key={station.key}
              className={activeChapter?.key === station.key ? "is-on" : undefined}
              style={{ left: `${station.u * 100}%`, background: station.color }}
            />
          ))}
        </div>

        <section className="px-archive" inert={!atArchive} aria-label="DunaTerp wiki index">
          <header>
            <p>ARCHIVE · EVERY STANDARD ROUTE</p>
            <h2>You reached the end of the lake.</h2>
          </header>
          <div className="px-archive-grid">
            {navigation.map((group, index) => (
              <section key={group.label} style={{ "--px-accent": GROUP_ACCENTS[index] } as React.CSSProperties}>
                <p className="px-archive-index">{String(index + 1).padStart(2, "0")}</p>
                <h3>{group.label}</h3>
                <p className="px-archive-note">{GROUP_NOTES[index]}</p>
                <nav aria-label={group.label}>
                  {group.items.map(([label, href]) => (
                    <Link key={href} to={href}>{label}<b aria-hidden="true">↗</b></Link>
                  ))}
                </nav>
              </section>
            ))}
          </div>
          <footer>
            <Link className="px-button px-button--primary" to="/wiki-map">Open the full wiki map ↗</Link>
            <button type="button" className="px-button" onClick={restart}>Walk it again ↑</button>
          </footer>
        </section>
      </div>

      <div className="px-scroll-story">
        <div className="px-scroll-lead" aria-hidden="true" />
        {STATION_COPY.map((station, index) => (
          <section
            key={station.key}
            className={`px-scroll-chapter${index % 2 ? " is-right" : ""}`}
            style={{ "--px-accent": station.color } as React.CSSProperties}
            aria-labelledby={`px-chapter-${station.index}`}
          >
            <div>
              <p className="px-chapter-tag"><span>{station.index} / 06</span>{station.kicker}</p>
              <h2 id={`px-chapter-${station.index}`}>{station.title}</h2>
              <p>{station.body}</p>
              <Link to={station.route}>Explore this chapter <span aria-hidden="true">↗</span></Link>
            </div>
          </section>
        ))}
        <div className="px-archive-space" aria-hidden="true" />
      </div>
    </main>
  );
}

export default PixelWorld;
