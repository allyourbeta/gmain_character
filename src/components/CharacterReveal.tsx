import type { CharacterProfile } from "../types/character";

type GenerationStatus =
  | "Recording"
  | "Extracting Frames"
  | "Sending to Gemini"
  | "Analyzing"
  | "Generating Character"
  | "Ready";

export function MainCharacterReveal({
  profile,
  heroFrameUrl,
  onEnter
}: {
  profile: CharacterProfile;
  heroFrameUrl: string | null;
  onEnter: () => void;
}) {
  const catchphrase = profile.catchphrases[0] ?? "watch this";
  const details = [
    profile.appearance.hatDetails,
    profile.appearance.logosOrPatches?.join(", "),
    profile.appearance.clothingDetails
  ].filter(Boolean);

  return (
    <section className="screen reveal-screen">
      <div className="reveal-gridlines" />
      <div className="reveal-shell">
        <div className="reveal-portrait-wrap">
          <div className="reveal-burst" />
          <div className="reveal-portrait">
            {heroFrameUrl ? <img src={heroFrameUrl} alt="" /> : <div className="portrait-fallback">{profile.name}</div>}
          </div>
          <div className="reveal-badge">PLAYER 1</div>
        </div>
        <div className="reveal-copy">
          <p className="eyebrow">Gemini profile locked</p>
          <h1>MAIN CHARACTER DETECTED</h1>
          <h2>{profile.name}</h2>
          <div className="reveal-stats">
            <p>Vibe: {profile.vibe}</p>
            <p>Special Move: {profile.specialPower}</p>
            <p>World: {profile.theme}</p>
            {details.length > 0 && <p>Details: {details.slice(0, 2).join(" / ")}</p>}
          </div>
          <blockquote>{catchphrase}</blockquote>
          <button className="primary-cta reveal-button" type="button" onClick={onEnter}>
            Return to Lobby
          </button>
        </div>
      </div>
    </section>
  );
}

export function AnalysisErrorView({
  videoUrl,
  error,
  status,
  onTryAgain,
  onRecordAgain
}: {
  videoUrl: string | null;
  error: { message: string; reason: string };
  status: GenerationStatus;
  onTryAgain: () => void;
  onRecordAgain: () => void;
}) {
  return (
    <section className="screen studio-screen">
      <div className="studio-shell generating-shell">
        <div className="scan-panel">
          {videoUrl ? <video src={videoUrl} controls playsInline /> : <div />}
        </div>
        <div className="generating-copy">
          <p className="eyebrow">Analysis stopped</p>
          <h1>{error.message}</h1>
          <p className="warning-text">Reason: {error.reason}</p>
          <div className="recorder-actions">
            <button className="primary-cta compact" type="button" onClick={onTryAgain}>
              Try Again
            </button>
            <button className="secondary-button" type="button" onClick={onRecordAgain}>
              Record Again
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}