import { useState, useEffect } from "react";
import type { CharacterProfile } from "../types/character";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

export function BattleOpening({ players }: { players: PlayerSlot[] }) {
  const [revealIndex, setRevealIndex] = useState(-1);

  useEffect(() => {
    // Stagger reveals: -1 → 0 → 1 → 2
    if (revealIndex < players.length - 1) {
      const t = setTimeout(() => setRevealIndex(prev => prev + 1), revealIndex < 0 ? 800 : 700);
      return () => clearTimeout(t);
    }
  }, [revealIndex, players.length]);

  return (
    <section className="screen battle-screen">
      <div className="battle-opening">
        <h1 className="showdown-title">MAIN CHARACTER SHOWDOWN</h1>
        <div className="opening-players">
          {players.map((player, i) => (
            <div key={player.id} className={`opening-player ${i <= revealIndex ? "revealed" : ""}`}>
              <div className="opening-portrait">
                <img src={player.heroFrameUrl!} alt={player.profile!.name} />
                <div className="opening-burst" />
              </div>
              <h2>{player.profile!.name}</h2>
              <p className="opening-vibe">{player.profile!.vibe}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
