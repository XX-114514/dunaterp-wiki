import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./landing.css";

// Edit these three scenes to introduce the project without changing the animation.
const INTRO_SCENES = [
  { label: "01 / THE CHALLENGE", title: "A world that needs colour.", body: "Natural pigments, flavours and nutrients connect biology with everyday life. How can we make them more sustainably?" },
  { label: "02 / THE CHASSIS", title: "An idea born in salt.", body: "Meet Dunaliella salina: a salt-adapted microalga with a native β-carotene hub and the potential to become a versatile production platform." },
  { label: "03 / THE EXPEDITION", title: "One cell. New possibilities.", body: "Explore the DunaTerp project, from chassis engineering and computational models to products and people." },
];

export function LandingPortal({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [scene, setScene] = useState(0);
  const [imageState, setImageState] = useState<"loading" | "ready" | "failed">("loading");
  const heroSrc = `${import.meta.env.BASE_URL}landing/dunaterp-salt-lake.png`;

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onComplete,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [leaving, onComplete]);

  const story = INTRO_SCENES[scene];
  return (
    <section className={`landing-portal${leaving ? " is-leaving" : ""}`} aria-label="DunaTerp introduction" inert={leaving}>
      <header className="landing-header">
        <div className="landing-mini-brand"><span>DT</span><p>DUNATERP<small>SCU–CHINA · iGEM 2026</small></p></div>
        <button className="landing-skip" type="button" onClick={() => setLeaving(true)}>Skip intro →</button>
      </header>
      <div className={`landing-visual is-${imageState}`} aria-label="Pixel salt lake landscape" role="img">
        <div className="landing-scenery" aria-hidden="true"><i className="landing-sun" /><i className="landing-mountains" /><i className="landing-lake" /><i className="landing-boardwalk" /></div>
        {imageState !== "failed" && <img src={heroSrc} alt="" width="1983" height="793" fetchPriority="high" decoding="async" onLoad={() => setImageState("ready")} onError={() => setImageState("failed")} />}
        <span className="landing-scene-caption">SALT FLAT 01 · THE EXPEDITION BEGINS</span>
      </div>
      <div className="landing-content">
        <div className="landing-title"><p className="landing-kicker">A SALT-GROWN SPECTRUM</p><h1>Duna<em>Terp</em></h1><p>Small cell. A colourful future.</p></div>
        <div className="landing-story">
          <div className="landing-story-copy" key={scene} aria-live="polite"><p className="landing-kicker">{story.label}</p><h2>{story.title}</h2><p>{story.body}</p></div>
          <div className="landing-story-controls">
            <div className="landing-scene-dots" aria-label="Introduction scenes">{INTRO_SCENES.map((item, index) => <button type="button" key={item.label} aria-label={item.label} aria-pressed={scene === index} onClick={() => setScene(index)}>{String(index + 1).padStart(2, "0")}</button>)}</div>
            <button className="landing-next" type="button" onClick={() => scene < INTRO_SCENES.length - 1 ? setScene(scene + 1) : setLeaving(true)}>{scene < INTRO_SCENES.length - 1 ? "Next scene →" : "Begin expedition →"}</button>
          </div>
        </div>
      </div>
      <footer className="landing-actions">
        <button type="button" className="landing-action-card" onClick={() => setLeaving(true)}><span>01 / EXPLORE</span><strong>Enter the salt lake <b aria-hidden="true">→</b></strong><small>A compact pixel expedition</small></button>
        <button type="button" className="landing-action-card landing-action-card--archive" onClick={() => navigate("/wiki-map")}><span>02 / READ</span><strong>Open the field archive <b aria-hidden="true">→</b></strong><small>Go straight to the project chapters</small></button>
      </footer>
    </section>
  );
}

export default LandingPortal;
