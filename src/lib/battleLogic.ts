import type { CharacterProfile } from "../types/character";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

type RoundResult = { winnerId: number; loserId: number };

export function generateRounds(players: PlayerSlot[]) {
  const rounds = [];
  if (players.length === 2) {
    rounds.push({ playerA: players[0], playerB: players[1] });
    rounds.push({ playerA: players[1], playerB: players[0] });
    rounds.push({ playerA: players[0], playerB: players[1] });
  } else if (players.length >= 3) {
    rounds.push({ playerA: players[0], playerB: players[1] });
    rounds.push({ playerA: players[1], playerB: players[2] });
    rounds.push({ playerA: players[0], playerB: players[2] });
  }
  return rounds;
}

export function battleRound(a: CharacterProfile, b: CharacterProfile): "a" | "b" {
  const aEnergy = a.catchphrases.join("").length + a.obstacles.length * 10 + a.powerups.length * 5;
  const bEnergy = b.catchphrases.join("").length + b.obstacles.length * 10 + b.powerups.length * 5;
  const aRoll = aEnergy + Math.random() * 120;
  const bRoll = bEnergy + Math.random() * 120;
  return aRoll >= bRoll ? "a" : "b";
}

export function randomClashResult(): string {
  const results = ["CRITICAL HIT!", "BLOCKED!", "SUPER EFFECTIVE!", "DODGED!", "COMBO BREAKER!", "ULTIMATE CLASH!"];
  return results[Math.floor(Math.random() * results.length)];
}

export function calculateFinalScores(players: PlayerSlot[], results: RoundResult[], specialActivated: boolean) {
  const scores = players.map(player => ({
    player,
    score: results.filter(r => r.winnerId === player.id).length + (specialActivated ? 1 : 0)
  }));
  return scores;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}