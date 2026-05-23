import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { CharacterProfile } from "../types/character";
import { BattleOpening } from "./BattleOpening";
import { BattleRound } from "./BattleRound";
import { VictoryScreen } from "./VictoryScreen";
import { generateRounds, calculateFinalScores, battleRound, randomClashResult } from "../lib/battleLogic";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

type RoundResult = { winnerId: number; loserId: number };

type BattleStep =
  | { kind: "opening" }
  | { kind: "round-intro"; roundIndex: number }
  | { kind: "clash"; roundIndex: number; clashIndex: number }
  | { kind: "clash-result"; roundIndex: number; clashIndex: number; result: string }
  | { kind: "round-result"; roundIndex: number; winnerId: number }
  | { kind: "victory" };

export function BattleArena({ players, onRestart }: { players: PlayerSlot[]; onRestart: () => void }) {
  const validPlayers = useMemo(() => players.filter(p => p.profile && p.heroFrameUrl), [players]);
  const rounds = useMemo(() => generateRounds(validPlayers), [validPlayers]);
  const [step, setStep] = useState<BattleStep>({ kind: "opening" });
  const [results, setResults] = useState<RoundResult[]>([]);
  const [shaking, setShaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const advance = useCallback((next: BattleStep, delayMs: number) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStep(next), delayMs);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // State machine: each step schedules the next
  useEffect(() => {
    const s = step;
    if (s.kind === "opening") {
      advance({ kind: "round-intro", roundIndex: 0 }, 3500);
    } else if (s.kind === "round-intro") {
      advance({ kind: "clash", roundIndex: s.roundIndex, clashIndex: 0 }, 2000);
    } else if (s.kind === "clash") {
      advance({ kind: "clash-result", roundIndex: s.roundIndex, clashIndex: s.clashIndex, result: randomClashResult() }, 1200);
    } else if (s.kind === "clash-result") {
      if (s.clashIndex < 2) {
        advance({ kind: "clash", roundIndex: s.roundIndex, clashIndex: s.clashIndex + 1 }, 1500);
      } else {
        // All clashes done — determine winner
        const round = rounds[s.roundIndex];
        if (round) {
          const w = battleRound(round.playerA.profile!, round.playerB.profile!);
          const winnerId = w === "a" ? round.playerA.id : round.playerB.id;
          const loserId = w === "a" ? round.playerB.id : round.playerA.id;
          setResults(prev => [...prev, { winnerId, loserId }]);
          advance({ kind: "round-result", roundIndex: s.roundIndex, winnerId }, 1200);
        }
      }
    } else if (s.kind === "round-result") {
      const nextRound = s.roundIndex + 1;
      if (nextRound < rounds.length) {
        advance({ kind: "round-intro", roundIndex: nextRound }, 2500);
      } else {
        advance({ kind: "victory" }, 2500);
      }
    }
  }, [step, rounds, advance]);

  // Screen shake on clash-result
  useEffect(() => {
    if (step.kind === "clash-result") {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 350);
      return () => clearTimeout(t);
    }
  }, [step]);

  // --- Render ---
  if (step.kind === "opening") {
    return <BattleOpening players={validPlayers} />;
  }

  if (step.kind === "victory") {
    const scores = calculateFinalScores(validPlayers, results, false);
    return <VictoryScreen scores={scores} onRestart={onRestart} />;
  }

  const roundIndex = step.roundIndex;
  const round = rounds[roundIndex];
  if (!round) return null;

  const clashIndex = (step.kind === "clash" || step.kind === "clash-result") ? step.clashIndex : -1;
  const clashResult = step.kind === "clash-result" ? step.result : null;
  const winnerId = step.kind === "round-result" ? step.winnerId : null;

  return (
    <section className="screen battle-screen">
      <div className={`battle-container ${shaking ? "shake" : ""}`}>
        {step.kind === "round-intro" && (
          <div className="round-announce" key={`round-${roundIndex}`}>
            ROUND {roundIndex + 1}
          </div>
        )}

        {step.kind !== "round-intro" && (
          <BattleRound
            key={`fight-${roundIndex}`}
            playerA={round.playerA}
            playerB={round.playerB}
            roundIndex={roundIndex}
            clashIndex={clashIndex}
            clashResult={clashResult}
            winnerId={winnerId}
          />
        )}
      </div>
    </section>
  );
}
