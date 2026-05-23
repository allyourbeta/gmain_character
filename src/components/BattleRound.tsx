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

type BattleRoundProps = {
  playerA: PlayerSlot;
  playerB: PlayerSlot;
  roundIndex: number;
  clashIndex: number;
  clashResult: string | null;
  winnerId: number | null;
};

export function BattleRound({ playerA, playerB, roundIndex, clashIndex, clashResult, winnerId }: BattleRoundProps) {
  // Stable random stats per round (not per render)
  const stats = useMemo(() => ({
    a: Math.floor(Math.random() * 35) + 60,
    b: Math.floor(Math.random() * 35) + 60,
  }), [roundIndex]);

  const aProfile = playerA.profile!;
  const bProfile = playerB.profile!;

  const aCatchphrase = aProfile.catchphrases[Math.min(clashIndex, aProfile.catchphrases.length - 1)] || "Let's go!";
  const bCatchphrase = bProfile.catchphrases[Math.min(clashIndex, bProfile.catchphrases.length - 1)] || "Bring it!";

  const winnerName = winnerId === playerA.id ? aProfile.name : winnerId === playerB.id ? bProfile.name : null;

  return (
    <div className="battle-round">
      {/* Player A — Left */}
      <div className="battle-player-side">
        <div className="battle-portrait">
          <img src={playerA.heroFrameUrl!} alt={aProfile.name} />
          <div className="battle-portrait-glow glow-cyan" />
        </div>
        <h2 className="battle-player-name">{aProfile.name}</h2>
        <p className="battle-player-power">{aProfile.specialPower}</p>
        <div className="stat-bar">
          <div className="stat-bar-fill fill-cyan" style={{ "--fill-height": `${stats.a}%` } as React.CSSProperties} />
        </div>
      </div>

      {/* Center — VS + Clashes */}
      <div className="battle-center">
        <div className="battle-vs">VS</div>

        {clashIndex >= 0 && !clashResult && (
          <>
            <div className="clash-text clash-from-left" key={`a-${clashIndex}`}>
              "{aCatchphrase}"
            </div>
            <div className="clash-text clash-from-right" key={`b-${clashIndex}`}>
              "{bCatchphrase}"
            </div>
          </>
        )}

        {clashResult && (
          <div className="clash-result" key={`r-${clashIndex}`}>
            {clashResult}
          </div>
        )}

        {winnerName && (
          <div className="winner-banner">
            {winnerName} WINS!
          </div>
        )}
      </div>

      {/* Player B — Right */}
      <div className="battle-player-side">
        <div className="battle-portrait">
          <img src={playerB.heroFrameUrl!} alt={bProfile.name} />
          <div className="battle-portrait-glow glow-pink" />
        </div>
        <h2 className="battle-player-name">{bProfile.name}</h2>
        <p className="battle-player-power">{bProfile.specialPower}</p>
        <div className="stat-bar">
          <div className="stat-bar-fill fill-pink" style={{ "--fill-height": `${stats.b}%` } as React.CSSProperties} />
        </div>
      </div>
    </div>
  );
}
