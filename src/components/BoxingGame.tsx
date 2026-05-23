import { useEffect, useRef, useCallback } from "react";
import type { CharacterProfile } from "../types/character";
import { drawCharacter } from "../lib/drawCharacter";
import type { Fighter } from "../lib/drawCharacter";

type PlayerSlot = {
  id: number;
  profile: CharacterProfile | null;
  heroFrameUrl: string | null;
  avatarUrl: string | null;
  videoUrl: string | null;
  videoBlob: Blob | null;
};

const W = 960, H = 560, GROUND_Y = 420;
const SPEED = 5, PUNCH_REACH = 90, PUNCH_FRAMES = 12, HIT_FRAMES = 10, COOLDOWN = 18;

type GameState = { fighters: Fighter[]; keys: Set<string>; winner: string | null; gameOver: boolean };

export function BoxingGame({ players, onRestart }: { players: PlayerSlot[]; onRestart: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>({ fighters: [], keys: new Set(), winner: null, gameOver: false });

  const buildFighters = useCallback((): Fighter[] => {
    return players.filter(p => p.profile).slice(0, 2).map((p, i) => {
      const heroImg = new Image();
      if (p.heroFrameUrl) heroImg.src = p.heroFrameUrl;
      const avatarImg = new Image();
      if (p.avatarUrl) avatarImg.src = p.avatarUrl;
      return {
        x: i === 0 ? 250 : 710, hp: 100, maxHp: 100,
        punching: 0, hit: 0, punchCooldown: 0,
        facing: (i === 0 ? 1 : -1) as 1 | -1,
        profile: p.profile!, heroFrameUrl: p.heroFrameUrl,
        heroImage: p.heroFrameUrl ? heroImg : null,
        avatarUrl: p.avatarUrl,
        avatarImage: p.avatarUrl ? avatarImg : null,
      };
    });
  }, [players]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const gs = stateRef.current;
    gs.fighters = buildFighters();
    gs.winner = null;
    gs.gameOver = false;

    const prevent = new Set(["KeyA","KeyD","KeyS","KeyJ","KeyK","KeyL","Space"]);
    const onDown = (e: KeyboardEvent) => { gs.keys.add(e.code); if (prevent.has(e.code)) e.preventDefault(); };
    const onUp = (e: KeyboardEvent) => { gs.keys.delete(e.code); };
    const onRematch = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && gs.gameOver) {
        gs.fighters = buildFighters(); gs.winner = null; gs.gameOver = false;
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("keydown", onRematch);

    let animId = 0;

    function update() {
      const [f1, f2] = gs.fighters;
      if (!f1 || !f2 || gs.gameOver) return;

      if (gs.keys.has("KeyA")) f1.x = Math.max(40, f1.x - SPEED);
      if (gs.keys.has("KeyD")) f1.x = Math.min(W - 40, f1.x + SPEED);
      if (gs.keys.has("KeyJ")) f2.x = Math.max(40, f2.x - SPEED);
      if (gs.keys.has("KeyL")) f2.x = Math.min(W - 40, f2.x + SPEED);

      f1.facing = f1.x < f2.x ? 1 : -1;
      f2.facing = f2.x < f1.x ? 1 : -1;

      if (gs.keys.has("KeyS") && f1.punchCooldown <= 0 && f1.punching <= 0) {
        f1.punching = PUNCH_FRAMES; f1.punchCooldown = COOLDOWN;
      }
      if (gs.keys.has("KeyK") && f2.punchCooldown <= 0 && f2.punching <= 0) {
        f2.punching = PUNCH_FRAMES; f2.punchCooldown = COOLDOWN;
      }

      for (const [atk, def] of [[f1,f2],[f2,f1]] as [Fighter,Fighter][]) {
        if (atk.punching === PUNCH_FRAMES - 3 && Math.abs(atk.x - def.x) < PUNCH_REACH + 30) {
          def.hp = Math.max(0, def.hp - (8 + Math.floor(Math.random() * 7)));
          def.hit = HIT_FRAMES;
          def.x += atk.facing * 15;
        }
      }

      for (const f of [f1, f2]) {
        if (f.punching > 0) f.punching--;
        if (f.hit > 0) f.hit--;
        if (f.punchCooldown > 0) f.punchCooldown--;
      }

      if (f1.hp <= 0) { gs.winner = f2.profile.name; gs.gameOver = true; }
      if (f2.hp <= 0) { gs.winner = f1.profile.name; gs.gameOver = true; }
    }

    function drawArena() {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0b0e2a"); grad.addColorStop(0.7, "#131a3e"); grad.addColorStop(1, "#1a1028");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#1a2040"; ctx.fillRect(0, GROUND_Y + 50, W, H - GROUND_Y - 50);

      ctx.strokeStyle = "rgba(24,242,178,0.12)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 50); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = GROUND_Y + 50; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      ctx.strokeStyle = "rgba(255,79,129,0.25)"; ctx.lineWidth = 3;
      for (const ry of [GROUND_Y - 130, GROUND_Y - 60]) {
        ctx.beginPath(); ctx.moveTo(40, ry); ctx.lineTo(W - 40, ry); ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,204,51,0.35)";
      for (const px of [50, W - 50]) ctx.fillRect(px - 4, GROUND_Y - 150, 8, 200);

      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.font = "bold 52px Arial Black, Arial"; ctx.textAlign = "center";
      ctx.fillText("MAIN CHARACTER BOXING", W / 2, GROUND_Y - 160);
    }

    function drawHpBar(f: Fighter, bx: number, color: string) {
      const bw = 300, bh = 24, pct = f.hp / f.maxHp;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.roundRect(bx, 28, bw, bh, 6); ctx.fill();
      ctx.fillStyle = pct > 0.3 ? color : "#ff3333";
      ctx.beginPath(); ctx.roundRect(bx, 28, bw * pct, bh, 6); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial Black, Arial";
      ctx.textAlign = "left"; ctx.fillText(f.profile.name, bx + 8, 46);
      ctx.textAlign = "right"; ctx.fillText(`${f.hp} HP`, bx + bw - 8, 46);
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      drawArena();
      const [f1, f2] = gs.fighters;
      if (!f1 || !f2) return;
      drawCharacter(ctx, f1, GROUND_Y, "A/D move · S punch");
      drawCharacter(ctx, f2, GROUND_Y, "J/L move · K punch");
      drawHpBar(f1, 30, "#18f2b2");
      drawHpBar(f2, W - 330, "#ff4f81");

      if (gs.gameOver && gs.winner) {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffcc33"; ctx.font = "bold 64px Arial Black, Arial";
        ctx.textAlign = "center"; ctx.shadowColor = "rgba(255,204,51,0.6)"; ctx.shadowBlur = 20;
        ctx.fillText("K.O.!", W / 2, H / 2 - 40);
        ctx.fillStyle = "#fff"; ctx.font = "bold 36px Arial Black, Arial";
        ctx.shadowColor = "rgba(24,242,178,0.5)";
        ctx.fillText(`${gs.winner} WINS!`, W / 2, H / 2 + 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "18px Arial";
        ctx.fillText("Press R for rematch", W / 2, H / 2 + 60);
      }
    }

    function loop() { update(); render(); animId = requestAnimationFrame(loop); }
    animId = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(animId); window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); window.removeEventListener("keydown", onRematch); };
  }, [buildFighters]);

  return (
    <section className="screen battle-screen">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 20 }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ borderRadius: 12, border: "2px solid rgba(24,242,178,0.3)", maxWidth: "100%", background: "#070814" }} />
        <button className="secondary-button" onClick={onRestart} style={{ marginTop: 8 }}>Back to Lobby</button>
      </div>
    </section>
  );
}
