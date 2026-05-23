import type { CharacterProfile } from "../types/character";

type Fighter = {
  x: number;
  hp: number;
  maxHp: number;
  punching: number;
  hit: number;
  punchCooldown: number;
  facing: 1 | -1;
  profile: CharacterProfile;
  heroFrameUrl: string | null;
  heroImage: HTMLImageElement | null;
  avatarUrl: string | null;
  avatarImage: HTMLImageElement | null;
};

const GROUND_Y_OFFSET = 45; // feet touch ground

export function drawCharacter(ctx: CanvasRenderingContext2D, f: Fighter, groundY: number, label: string) {
  const cx = f.x;
  const flashAlpha = f.hit > 0 ? (f.hit % 2 === 0 ? 0.3 : 1) : 1;

  ctx.save();
  ctx.globalAlpha = flashAlpha;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, groundY + GROUND_Y_OFFSET, 50, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const hasAvatar = f.avatarImage && f.avatarImage.complete && f.avatarImage.naturalWidth > 0;

  if (hasAvatar) {
    // Draw the AI-generated avatar image — large, centered on the fighter position
    const img = f.avatarImage!;
    const drawH = 220;
    const aspect = img.naturalWidth / img.naturalHeight;
    const drawW = drawH * aspect;

    // Flip image if facing left
    ctx.save();
    if (f.facing === -1) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }

    // Punch animation: shift character forward slightly
    const punchShift = f.punching > 0 ? f.facing * 20 : 0;

    ctx.drawImage(
      img,
      cx - drawW / 2 + punchShift,
      groundY + GROUND_Y_OFFSET - drawH,
      drawW,
      drawH
    );
    ctx.restore();

    // Punch effect
    if (f.punching > 0 && f.punching > 6) {
      const fistX = cx + f.facing * 80;
      const fistY = groundY - 80;
      ctx.fillStyle = "rgba(255,204,51,0.7)";
      ctx.beginPath();
      ctx.arc(fistX, fistY, 20 + (f.punching * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("💥", fistX, fistY + 8);
    }
  } else {
    // Fallback: draw simple character from profile data
    drawFallbackCharacter(ctx, f, cx, groundY);
  }

  // Name label
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px Arial Black, Arial";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 6;
  ctx.fillText(f.profile.name, cx, groundY + 65);
  ctx.shadowBlur = 0;

  // Controls
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "13px Arial";
  ctx.fillText(label, cx, groundY + 82);

  ctx.restore();
}

function drawFallbackCharacter(ctx: CanvasRenderingContext2D, f: Fighter, cx: number, groundY: number) {
  const face = f.profile.face;
  const skinTone = face.skinTone || "#c68642";
  const shirtColor = f.profile.appearance.shirtColor || "#333";
  const hairColor = face.hairColor || "#222";
  const hatColor = face.hatColor || "#111";
  const glassesColor = face.glassesColor || "#39ff88";
  const BODY_W = 70, BODY_H = 90, HEAD_R = 42;
  const cy = groundY;

  // Legs
  ctx.fillStyle = "#222";
  ctx.fillRect(cx - 20, cy, 14, 40);
  ctx.fillRect(cx + 6, cy, 14, 40);

  // Body
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(cx - BODY_W / 2, cy - BODY_H, BODY_W, BODY_H, 8);
  ctx.fill();

  // Arms
  const armY = cy - BODY_H + 25;
  const punchExtend = f.punching > 0 ? 40 : 0;
  ctx.fillStyle = skinTone;
  ctx.fillRect(cx - BODY_W / 2 - 18, armY, 18, 50);
  const armX = f.facing === 1 ? cx + BODY_W / 2 : cx - BODY_W / 2 - 18;
  const armExtendX = armX + f.facing * punchExtend;
  ctx.fillRect(Math.min(armX, armExtendX), armY - (punchExtend > 0 ? 10 : 0), 18 + punchExtend, punchExtend > 0 ? 22 : 50);

  if (punchExtend > 0) {
    ctx.fillStyle = "#ffcc33";
    ctx.beginPath();
    ctx.arc(armExtendX + f.facing * 12, armY - 2, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck
  ctx.fillStyle = skinTone;
  ctx.fillRect(cx - 10, cy - BODY_H - 15, 20, 20);

  // Head (photo or drawn)
  const headY = cy - BODY_H - HEAD_R - 15;
  let drewPhoto = false;
  if (f.heroImage && f.heroImage.complete && f.heroImage.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, headY, HEAD_R, 0, Math.PI * 2);
    ctx.clip();
    try { ctx.drawImage(f.heroImage, cx - HEAD_R, headY - HEAD_R, HEAD_R * 2, HEAD_R * 2); drewPhoto = true; } catch {}
    ctx.restore();
    if (drewPhoto) {
      ctx.strokeStyle = f.facing === 1 ? "#18f2b2" : "#ff4f81";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, headY, HEAD_R + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (!drewPhoto) {
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.ellipse(cx, headY, HEAD_R - 4, HEAD_R + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(cx - 14, headY - 4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 14, headY - 4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(cx - 14 + f.facing * 3, headY - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 14 + f.facing * 3, headY - 4, 4, 0, Math.PI * 2); ctx.fill();
    if (face.hairStyle !== "bald") {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.ellipse(cx, headY - HEAD_R + 8, HEAD_R - 2, 18, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  if (face.glasses) {
    ctx.strokeStyle = glassesColor;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx - 14, headY - 4, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 14, headY - 4, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 3, headY - 4); ctx.lineTo(cx + 3, headY - 4); ctx.stroke();
  }

  if (face.hat) {
    ctx.fillStyle = hatColor;
    ctx.beginPath();
    ctx.ellipse(cx, headY - HEAD_R + 4, HEAD_R + 4, 20, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - HEAD_R - 10 + (f.facing === 1 ? 10 : 0), headY - HEAD_R + 2, HEAD_R + 20, 8);
  }
}

export type { Fighter };
