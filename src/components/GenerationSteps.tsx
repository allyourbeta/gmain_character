type GenerationStatus =
  | "Recording"
  | "Extracting Frames"
  | "Sending to Gemini"
  | "Analyzing"
  | "Generating Character"
  | "Ready";

export function Generating({ videoUrl, status }: { videoUrl: string | null; status: GenerationStatus }) {
  return (
    <section className="screen studio-screen">
      <div className="studio-shell generating-shell">
        <div className="scan-panel">
          {videoUrl ? <video src={videoUrl} autoPlay muted loop playsInline /> : <div />}
          <span className="scan-line" />
        </div>
        <div className="generating-copy">
          <p className="eyebrow">Gemini analysis</p>
          <h1>Gemini is analyzing key frames from your video...</h1>
          <p>
            Extracting a few lightweight frames, sending them securely to the backend, and building a structured
            character profile.
          </p>
          <p className="pipeline-copy">{pipelineCopy[status]}</p>
          <StatusIndicator active={status} />
        </div>
      </div>
    </section>
  );
}

function StatusIndicator({ active }: { active: GenerationStatus }) {
  const statuses: GenerationStatus[] = [
    "Recording",
    "Extracting Frames",
    "Sending to Gemini",
    "Analyzing",
    "Generating Character",
    "Ready"
  ];

  return (
    <ol className="status-indicator" aria-label="Generation status">
      {statuses.map((status) => (
        <li key={status} className={status === active ? "active" : ""}>
          {status}
        </li>
      ))}
    </ol>
  );
}

const pipelineCopy: Record<GenerationStatus, string> = {
  Recording: "Recording",
  "Extracting Frames": "Extracting key frames...",
  "Sending to Gemini": "Gemini analyzing your look...",
  Analyzing: "Building character profile...",
  "Generating Character": "Generating game universe...",
  Ready: "Main character ready."
};