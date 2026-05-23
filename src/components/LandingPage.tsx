type LandingPageProps = {
  onStart: () => void;
};

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <section className="screen landing-screen">
      <div className="noise" />
      <div className="landing-grid">
        <div className="hero-copy">
          <p className="eyebrow">AI-powered playable identity</p>
          <h1>Become the Main Character.</h1>
          <p className="subheadline">
            Record a short video. Instantly become the hero of your own AI-generated game.
          </p>
          <button className="primary-cta" type="button" onClick={onStart}>
            Record Yourself
          </button>
        </div>
        <div className="arcade-preview" aria-label="Dodge the Chaos game preview">
          <div className="preview-header">
            <span>Dodge the Chaos</span>
            <strong>30s run</strong>
          </div>
          <div className="preview-stage">
            <span className="falling-chip chip-one">BUG</span>
            <span className="falling-chip chip-two">PITCH</span>
            <span className="falling-chip chip-three">MERGE</span>
            <div className="avatar-orbit">
              <div className="preview-avatar">
                <span className="preview-hair" />
                <span className="preview-glasses" />
                <span className="preview-shirt" />
              </div>
              <span className="speech-bubble">watch this</span>
            </div>
          </div>
          <div className="preview-footer">
            <span>Score 420</span>
            <span>Power: Glitch Dash</span>
          </div>
        </div>
      </div>
    </section>
  );
}
