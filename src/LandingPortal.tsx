import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

type LandingPortalProps = {
  onComplete: () => void;
};

export function LandingPortal({ onComplete }: LandingPortalProps) {
  const [leaving, setLeaving] = useState(false);
  const heroSrc = `${import.meta.env.BASE_URL}landing/dunaterp-salt-lake.png`;

  useEffect(() => {
    if (!leaving) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      onComplete();
      return;
    }
    const timer = window.setTimeout(onComplete, 1050);
    return () => window.clearTimeout(timer);
  }, [leaving, onComplete]);

  return (
    <section
      className={`landing-portal${leaving ? " is-leaving" : ""}`}
      aria-label="DunaTerp introduction"
      inert={leaving}
    >
      <div className="landing-visual" aria-hidden="true">
        <img src={heroSrc} alt="" fetchPriority="high" />
      </div>
      <div className="landing-shade" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-mini-brand">
          <span>DT</span>
          <p>DUNATERP<small>SCU–CHINA · iGEM 2026</small></p>
        </div>
        <p className="landing-coordinate">30.67° N · SALT FLAT 01</p>
      </header>

      <div className="landing-content">
        <p className="landing-kicker"><span /> A SALT-GROWN SPECTRUM</p>
        <h1>
          <span>DUNA</span>
          <em>TERP</em>
        </h1>
        <p className="landing-dek">
          Follow a salt-adapted cell from its native β-carotene hub to a modular platform for colourful, high-value terpenoids.
        </p>
        <div className="landing-actions">
          <button type="button" onClick={() => setLeaving(true)} disabled={leaving}>
            <span className="landing-action-icon" aria-hidden="true">▶</span>
            <span><strong>Enter the salt lake</strong><small>Launch pixel expedition</small></span>
          </button>
          <Link to="/wiki-map">
            <strong>Open the field archive</strong>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>

      <footer className="landing-footer">
        <p><span>01</span> Halophilic chassis</p>
        <p><span>02</span> Shared β-carotene hub</p>
        <p><span>03</span> Four product routes</p>
        <small>ORIGINAL PIXEL EXPEDITION</small>
      </footer>

      <div className="landing-transition-mark" aria-hidden="true">
        <span />
        ENTERING FIELD MAP
      </div>
    </section>
  );
}

export default LandingPortal;
