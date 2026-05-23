import { useMemo } from "react";
import type { CharacterProfile } from "../types/character";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

type ScoreEntry = { player: PlayerSlot; score: number };

export function VictoryScreen({ scores, onRestart }: { scores: ScoreEntry[]; onRestart: () => void }) {
  const sorted = useMemo(() => [...scores].sort((a, b) => b.score - a.score), [scores]);
  const winner = sorted[0];

  const confetti = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: ["#18f2b2", "#ff4f81", "#ffcc33", "#ffffff", "#a78bfa"][i % 5],
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 2.5,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      })),
    []
  );

  return (
    <section className="screen battle-screen">
      <div className="victory-container">
        <h1 className="victory-title">VICTORY</h1>

        <div className="champion-section">
          <div className="champion-portrait">
            <img src={winner.player.heroFrameUrl!} alt={winner.player.profile!.name} />
            <div className="champion-glow" />
            <div className="champion-crown">👑</div>
          </div>
          <h2 className="champion-name">{winner.player.profile!.name}</h2>
          <p className="champion-power">{winner.player.profile!.specialPower}</p>
          <blockquote className="champion-quote">
            "{winner.player.profile!.catchphrases[0] || "I am the main character!"}"
          </blockquote>
        </div>

        <div className="rankings">
          {sorted.map((entry, i) => (
            <div
              key={entry.player.id}
              className={`ranking-entry rank-${i + 1}`}
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <span className="rank-number">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
              <div className="rank-portrait">
                <img src={entry.player.heroFrameUrl!} alt={entry.player.profile!.name} />
              </div>
              <span className="rank-name">{entry.player.profile!.name}</span>
              <span className="rank-score">{entry.score} wins</span>
            </div>
          ))}
        </div>

        <div className="victory-actions">
          <button className="primary-cta" onClick={onRestart}>
            REMATCH
          </button>
        </div>

        <div className="confetti-container" aria-hidden>
          {confetti.map((p) => (
            <span
              key={p.id}
              className="confetti-piece"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                width: `${p.size}px`,
                height: `${p.size * 1.4}px`,
                transform: `rotate(${p.rotation}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
