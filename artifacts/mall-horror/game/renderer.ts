import type { GameState } from "./types";
import { ENEMY_COLORS, BUFF_COLORS } from "./constants";

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number,
  canvasH: number
) {
  const cameraX = state.playerX - canvasW / 2 + state.screenShake.x;
  const cameraY = state.playerY - canvasH / 2 + state.screenShake.y;

  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  drawFloor(ctx, cameraX, cameraY, canvasW, canvasH, state.mapWidth, state.mapHeight);
  drawMallFeatures(ctx, state.mapWidth, state.mapHeight);

  for (const lamp of state.lamps) {
    drawLamp(ctx, lamp.x, lamp.y, lamp.color);
  }

  for (const bd of state.buffDrops) {
    drawBuffDrop(ctx, bd);
  }

  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const ex of state.explosions) {
    ctx.save();
    ctx.globalAlpha = ex.alpha * 0.7;
    const grd = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.radius);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.3, "#ffaa00");
    grd.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const enemy of state.enemies) {
    drawEnemy(ctx, enemy);
  }

  for (const bullet of state.bullets) {
    drawBullet(ctx, bullet);
  }

  drawDog(ctx, state.playerX, state.playerY, state.playerAngle, state.isDashing);

  ctx.restore();

  drawLightingOverlay(ctx, state, cameraX, cameraY, canvasW, canvasH);

  if (state.muzzleFlash) {
    const flashAlpha = 1 - state.muzzleFlash.age / state.muzzleFlash.maxAge;
    const fx = state.muzzleFlash.x - cameraX;
    const fy = state.muzzleFlash.y - cameraY;
    const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, 100);
    grd.addColorStop(0, `rgba(255,255,200,${flashAlpha * 0.9})`);
    grd.addColorStop(0.4, `rgba(255,200,100,${flashAlpha * 0.4})`);
    grd.addColorStop(1, "rgba(255,150,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, 100, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.whiteFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.9, state.whiteFlash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }
}

// ─── MALL FLOOR ──────────────────────────────────────────────────────────────

function drawFloor(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  cw: number, ch: number,
  mw: number, mh: number
) {
  const TILE = 64;
  const startX = Math.max(0, Math.floor(cx / TILE));
  const startY = Math.max(0, Math.floor(cy / TILE));
  const endX = Math.min(Math.ceil(mw / TILE), Math.ceil((cx + cw) / TILE) + 1);
  const endY = Math.min(Math.ceil(mh / TILE), Math.ceil((cy + ch) / TILE) + 1);

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      const wx = tx * TILE;
      const wy = ty * TILE;
      const isAlt = (tx + ty) % 2 === 0;

      // Mall marble tiles — light cream/beige
      ctx.fillStyle = isAlt ? "#d8ccb8" : "#cec1aa";
      ctx.fillRect(wx, wy, TILE, TILE);

      // Grout lines
      ctx.strokeStyle = "#b8ac98";
      ctx.lineWidth = 1;
      ctx.strokeRect(wx + 0.5, wy + 0.5, TILE - 1, TILE - 1);

      // Subtle sheen / highlight
      if (isAlt) {
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(wx + 2, wy + 2, TILE * 0.4, TILE * 0.3);
      }
    }
  }

  // Map boundary walls
  ctx.strokeStyle = "#4a3020";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, mw, mh);
  // Wall fill
  ctx.fillStyle = "#2a1a0e";
  ctx.fillRect(-10, -10, mw + 20, 10);
  ctx.fillRect(-10, mh, mw + 20, 10);
  ctx.fillRect(-10, -10, 10, mh + 20);
  ctx.fillRect(mw, -10, 10, mh + 20);
}

function drawMallFeatures(ctx: CanvasRenderingContext2D, mw: number, mh: number) {
  // ── Store fronts along top wall ──
  const storeW = 280;
  const storeH = 140;
  const storeColors = ["#1e3a5f", "#3a1e1e", "#1e3a1e", "#3a2a0e", "#2a1e3a"];
  let storeCount = Math.floor(mw / (storeW + 30));
  const gapX = (mw - storeCount * storeW) / (storeCount + 1);
  for (let i = 0; i < storeCount; i++) {
    const sx = gapX + i * (storeW + gapX);
    const sy = 10;
    const col = storeColors[i % storeColors.length];
    // Store back wall
    ctx.fillStyle = col;
    ctx.fillRect(sx, sy, storeW, storeH);
    // Glass storefront
    ctx.fillStyle = "rgba(120,200,255,0.18)";
    ctx.fillRect(sx + 10, sy + storeH - 30, storeW - 20, 25);
    // Door
    ctx.fillStyle = "rgba(180,230,255,0.35)";
    ctx.fillRect(sx + storeW / 2 - 18, sy + storeH - 30, 36, 25);
    // Store sign
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 20, sy + 15, storeW - 40, 22);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = col;
    ctx.fillRect(sx + 24, sy + 18, storeW - 48, 16);
    ctx.globalAlpha = 1;
  }

  // ── Store fronts along bottom wall ──
  for (let i = 0; i < storeCount; i++) {
    const sx = gapX + i * (storeW + gapX);
    const sy = mh - storeH - 10;
    const col = storeColors[(i + 2) % storeColors.length];
    ctx.fillStyle = col;
    ctx.fillRect(sx, sy, storeW, storeH);
    ctx.fillStyle = "rgba(120,200,255,0.18)";
    ctx.fillRect(sx + 10, sy, storeW - 20, 25);
    ctx.fillStyle = "rgba(180,230,255,0.35)";
    ctx.fillRect(sx + storeW / 2 - 18, sy, 36, 25);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 20, sy + storeH - 35, storeW - 40, 22);
    ctx.globalAlpha = 1;
  }

  // ── Central atrium / walkway stripe ──
  const midY = mh / 2;
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(0, midY - 8, mw, 16);

  // ── Pillars (structural columns) ──
  const pillarR = 18;
  const pillarSpacingX = 350;
  const pillarSpacingY = 300;
  for (let px = pillarSpacingX; px < mw; px += pillarSpacingX) {
    for (let py = pillarSpacingY; py < mh; py += pillarSpacingY) {
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(px + 6, py + 6, pillarR, pillarR, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pillar base
      ctx.fillStyle = "#a09080";
      ctx.beginPath();
      ctx.rect(px - pillarR, py - pillarR, pillarR * 2, pillarR * 2);
      ctx.fill();
      // Pillar top lighter
      ctx.fillStyle = "#c8b8a8";
      ctx.fillRect(px - pillarR + 3, py - pillarR + 3, pillarR - 3, pillarR - 3);
      // Pillar dark edge
      ctx.strokeStyle = "#706050";
      ctx.lineWidth = 2;
      ctx.strokeRect(px - pillarR, py - pillarR, pillarR * 2, pillarR * 2);
    }
  }

  // ── Abandoned mall details: overturned benches, debris ──
  // Bench 1
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(mw * 0.25 - 40, mh * 0.5 - 8, 80, 16);
  ctx.fillRect(mw * 0.75 - 40, mh * 0.5 - 8, 80, 16);
  ctx.fillRect(mw * 0.5 - 40, mh * 0.3 - 8, 80, 16);
  ctx.fillStyle = "#3a2820";
  ctx.fillRect(mw * 0.25 - 38, mh * 0.5 - 6, 76, 6);
  ctx.fillRect(mw * 0.75 - 38, mh * 0.5 - 6, 76, 6);
}

// ─── LAMP ─────────────────────────────────────────────────────────────────────

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // Ceiling lamp fixture on floor
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── DOG (K-9) PLAYER ────────────────────────────────────────────────────────

function drawDog(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  dashing: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (dashing) {
    ctx.shadowColor = "#60aaff";
    ctx.shadowBlur = 24;
    // Dash trail ghost
    ctx.globalAlpha = 0.3;
    _drawDogBody(ctx, false);
    ctx.globalAlpha = 1;
    ctx.translate(0, 6);
  }

  _drawDogBody(ctx, dashing);
  ctx.restore();
}

function _drawDogBody(ctx: CanvasRenderingContext2D, dashing: boolean) {
  const FUR = "#c8a060";
  const FUR_DARK = "#a07838";
  const FUR_SHADOW = "#7a5820";
  const NOSE = "#1a0c04";
  const EYE = "#2a1a00";
  const GUN = "#303030";
  const VEST = "#3a5a3a";

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(3, 3, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail (at bottom = behind player)
  ctx.strokeStyle = FUR_DARK;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.quadraticCurveTo(dashing ? -14 : 12, 22, dashing ? -6 : 18, 14);
  ctx.stroke();
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.quadraticCurveTo(dashing ? -14 : 12, 22, dashing ? -6 : 18, 14);
  ctx.stroke();

  // Body (torso)
  ctx.fillStyle = FUR_SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, 1, 9, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tactical vest
  ctx.fillStyle = VEST;
  ctx.fillRect(-6, -4, 12, 9);
  // Vest strap
  ctx.fillStyle = "#2a4a2a";
  ctx.fillRect(-7, -2, 2, 7);
  ctx.fillRect(5, -2, 2, 7);

  // Gun barrel (pointing up = forward)
  ctx.fillStyle = GUN;
  ctx.fillRect(-2, -30, 4, 14); // barrel
  ctx.fillRect(-3, -18, 6, 6);  // body/grip
  // Muzzle highlight
  ctx.fillStyle = "#505050";
  ctx.fillRect(-1, -32, 2, 4);

  // Head
  ctx.fillStyle = FUR_SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, -14, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, -15, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears (left + right, triangular + floppy)
  ctx.fillStyle = FUR_DARK;
  // Left ear
  ctx.beginPath();
  ctx.moveTo(-8, -16);
  ctx.lineTo(-14, -24);
  ctx.lineTo(-6, -21);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c87060";
  ctx.beginPath();
  ctx.moveTo(-8, -17);
  ctx.lineTo(-12, -22);
  ctx.lineTo(-7, -20);
  ctx.closePath();
  ctx.fill();
  // Right ear
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath();
  ctx.moveTo(8, -16);
  ctx.lineTo(14, -24);
  ctx.lineTo(6, -21);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c87060";
  ctx.beginPath();
  ctx.moveTo(8, -17);
  ctx.lineTo(12, -22);
  ctx.lineTo(7, -20);
  ctx.closePath();
  ctx.fill();

  // Snout
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath();
  ctx.ellipse(0, -14, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, -14, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = NOSE;
  ctx.beginPath();
  ctx.ellipse(0, -16, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.arc(-4, -18, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -18, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-3.2, -18.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4.8, -18.6, 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Collar — dog tag
  ctx.strokeStyle = "#cc9900";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -10, 7, -Math.PI * 0.1, Math.PI * 1.1);
  ctx.stroke();
  // Tag
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.font = "bold 3px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("K9", 0, -4);
}

// ─── ENEMY ───────────────────────────────────────────────────────────────────

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: {
  x: number; y: number; radius: number; type: string;
  hp: number; maxHp: number; hitFlash: number; angle: number; legPhase: number
}) {
  const colors = ENEMY_COLORS[enemy.type as keyof typeof ENEMY_COLORS] || ENEMY_COLORS.standard;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = 0.5 + enemy.hitFlash * 0.5;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 24;
  } else {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 14;
  }

  const r = enemy.radius;

  if (enemy.type === "boss") {
    // Boss: massive tarantula-like creature
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.75, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    // Abdomen
    ctx.fillStyle = "#2a0000";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.55, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    // Red abdomen pattern
    ctx.fillStyle = "#cc0000";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.25, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = "#3a0000";
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    // Multiple eyes
    const eyePositions = [[-r*0.14,-r*0.38],[r*0.14,-r*0.38],[-r*0.06,-r*0.48],[r*0.06,-r*0.48],[-r*0.24,-r*0.32],[r*0.24,-r*0.32]];
    eyePositions.forEach(([ex,ey]) => {
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    });
    // Fangs
    ctx.fillStyle = "#ffcc88";
    ctx.beginPath();
    ctx.moveTo(-r*0.08, -r*0.55);
    ctx.lineTo(-r*0.14, -r*0.7);
    ctx.lineTo(-r*0.02, -r*0.56);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r*0.08, -r*0.55);
    ctx.lineTo(r*0.14, -r*0.7);
    ctx.lineTo(r*0.02, -r*0.56);
    ctx.closePath();
    ctx.fill();
    drawLegs(ctx, r, 8, enemy.legPhase, "#5c0000", "#8a0000");
  } else if (enemy.type === "elite") {
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.62, r * 0.47, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a001a";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.22, r * 0.42, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cc00cc";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.23, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a002a";
    ctx.beginPath();
    ctx.arc(0, -r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff44ff";
    [[-r*0.1,-r*0.28],[r*0.1,-r*0.28],[0,-r*0.38]].forEach(([ex,ey]) => {
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.075, 0, Math.PI * 2); ctx.fill();
    });
    drawLegs(ctx, r, 6, enemy.legPhase, "#5c1a5c", "#aa44aa");
  } else {
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.57, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#001a00";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.16, r * 0.36, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#00aa00";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.17, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#001a00";
    ctx.beginPath();
    ctx.arc(0, -r * 0.18, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2aff2a";
    [[-r*0.08,-r*0.2],[r*0.08,-r*0.2]].forEach(([ex,ey]) => {
      ctx.beginPath(); ctx.arc(ex, ey, r * 0.065, 0, Math.PI * 2); ctx.fill();
    });
    drawLegs(ctx, r, 6, enemy.legPhase, "#1a5c1a", "#3aaa3a");
  }

  if (enemy.hp < enemy.maxHp) {
    const barW = r * 2.2;
    const barH = 5;
    const barX = -r * 1.1;
    const barY = r + 5;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1a0000";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#ff3300";
    ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
    ctx.strokeStyle = "#550000";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }
  ctx.restore();
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  r: number, count: number, phase: number,
  color: string, tipColor: string
) {
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const legLength = r * 1.3;
    const bendOffset = Math.sin(phase + i * 1.2) * 0.35;
    const x1 = Math.cos(angle) * r * 0.5;
    const y1 = Math.sin(angle) * r * 0.4;
    const midX = Math.cos(angle + bendOffset) * legLength * 0.5;
    const midY = Math.sin(angle + bendOffset) * legLength * 0.5;
    const x2 = Math.cos(angle + bendOffset * 0.7) * legLength;
    const y2 = Math.sin(angle + bendOffset * 0.7) * legLength;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();
    // Tip claw
    ctx.strokeStyle = tipColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 + Math.cos(angle + 0.5) * 4, y2 + Math.sin(angle + 0.5) * 4);
    ctx.stroke();
  }
}

// ─── BULLET ──────────────────────────────────────────────────────────────────

function drawBullet(ctx: CanvasRenderingContext2D, bullet: {
  x: number; y: number; radius: number; isBazooka: boolean;
  vx: number; vy: number; trail: Array<{ x: number; y: number }>
}) {
  ctx.save();
  if (bullet.isBazooka) {
    ctx.shadowColor = "#ff6d00";
    ctx.shadowBlur = 25;
    for (let i = 0; i < bullet.trail.length; i++) {
      const t = bullet.trail[i];
      const alpha = (i / bullet.trail.length) * 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i < bullet.trail.length / 2 ? "#ff2200" : "#ff8800";
      ctx.beginPath();
      ctx.arc(t.x, t.y, bullet.radius * (i / bullet.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff6d00";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.shadowColor = "#ffffaa";
    ctx.shadowBlur = 10;
    for (let i = 0; i < bullet.trail.length; i++) {
      const t = bullet.trail[i];
      const alpha = (i / bullet.trail.length) * 0.55;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(t.x, t.y, bullet.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffff88";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── BUFF DROP ───────────────────────────────────────────────────────────────

function drawBuffDrop(ctx: CanvasRenderingContext2D, bd: {
  x: number; y: number; type: string; pulse: number
}) {
  const color = BUFF_COLORS[bd.type] || "#ffffff";
  const scale = 1 + Math.sin(bd.pulse) * 0.18;
  const r = 14 * scale;

  ctx.save();
  ctx.translate(bd.x, bd.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;

  const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6);
  grd.addColorStop(0, color + "cc");
  grd.addColorStop(1, color + "00");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.ceil(r * 0.65)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const icons: Record<string, string> = {
    tripleShot: "3x",
    quadShot: "4x",
    rapidFire: "RF",
    bazookaMode: "BZ",
  };
  ctx.fillText(icons[bd.type] || "?", 0, 1);
  ctx.restore();
}

// ─── LIGHTING ────────────────────────────────────────────────────────────────

function drawLightingOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cameraX: number,
  cameraY: number,
  canvasW: number,
  canvasH: number
) {
  let offscreen: HTMLCanvasElement;
  try {
    offscreen = document.createElement("canvas");
  } catch {
    return;
  }
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const oc = offscreen.getContext("2d")!;
  if (!oc) return;

  // Darkness — slightly lighter so mall tiles are more visible
  oc.fillStyle = "rgba(0,0,0,0.88)";
  oc.fillRect(0, 0, canvasW, canvasH);

  oc.globalCompositeOperation = "destination-out";

  const px = state.playerX - cameraX;
  const py = state.playerY - cameraY;
  // Flashlight points in the direction the player faces
  const flashAngle = state.playerAngle + Math.PI / 2;
  const flashLen = 520;          // was 260 — now much longer
  const flashWidth = Math.PI * 0.5; // 90° wide (was 60°)

  const mfBonus = state.muzzleFlash
    ? (1 - state.muzzleFlash.age / state.muzzleFlash.maxAge) * 80
    : 0;

  // Main flashlight cone (warm white)
  const flashGrd = oc.createRadialGradient(px, py, 0, px, py, flashLen + mfBonus);
  flashGrd.addColorStop(0, "rgba(255,230,180,1)");
  flashGrd.addColorStop(0.45, "rgba(255,215,150,0.8)");
  flashGrd.addColorStop(0.75, "rgba(255,200,120,0.4)");
  flashGrd.addColorStop(1, "rgba(255,180,80,0)");
  oc.fillStyle = flashGrd;
  oc.beginPath();
  oc.moveTo(px, py);
  oc.arc(px, py, flashLen + mfBonus, flashAngle - flashWidth / 2, flashAngle + flashWidth / 2);
  oc.closePath();
  oc.fill();

  // Wider softer secondary cone for peripheral vision
  const softLen = 280;
  const softWidth = Math.PI * 0.8;
  const softGrd = oc.createRadialGradient(px, py, 0, px, py, softLen);
  softGrd.addColorStop(0, "rgba(255,220,160,0.5)");
  softGrd.addColorStop(1, "rgba(255,200,120,0)");
  oc.fillStyle = softGrd;
  oc.beginPath();
  oc.moveTo(px, py);
  oc.arc(px, py, softLen, flashAngle - softWidth / 2, flashAngle + softWidth / 2);
  oc.closePath();
  oc.fill();

  // Ambient glow around player body
  const ambGrd = oc.createRadialGradient(px, py, 0, px, py, 180);
  ambGrd.addColorStop(0, "rgba(220,180,120,0.7)");
  ambGrd.addColorStop(0.4, "rgba(200,160,100,0.3)");
  ambGrd.addColorStop(1, "rgba(200,150,80,0)");
  oc.fillStyle = ambGrd;
  oc.beginPath();
  oc.arc(px, py, 180, 0, Math.PI * 2);
  oc.fill();

  // Lamps
  for (const lamp of state.lamps) {
    const lx = lamp.x - cameraX;
    const ly = lamp.y - cameraY;
    if (lx < -lamp.radius * 2 || lx > canvasW + lamp.radius * 2) continue;
    if (ly < -lamp.radius * 2 || ly > canvasH + lamp.radius * 2) continue;

    const effR = lamp.radius * lamp.flicker;
    const lgrd = oc.createRadialGradient(lx, ly, 0, lx, ly, effR);
    lgrd.addColorStop(0, `rgba(255,255,220,${0.85 * lamp.flicker})`);
    lgrd.addColorStop(0.4, `rgba(220,200,140,${0.5 * lamp.flicker})`);
    lgrd.addColorStop(1, "rgba(200,160,60,0)");
    oc.fillStyle = lgrd;
    oc.beginPath();
    oc.arc(lx, ly, effR, 0, Math.PI * 2);
    oc.fill();
  }

  // Buff drops emit colored light
  for (const bd of state.buffDrops) {
    const bx = bd.x - cameraX;
    const by = bd.y - cameraY;
    if (bx < -100 || bx > canvasW + 100 || by < -100 || by > canvasH + 100) continue;
    const buffGrd = oc.createRadialGradient(bx, by, 0, bx, by, 80);
    buffGrd.addColorStop(0, "rgba(255,255,255,0.6)");
    buffGrd.addColorStop(1, "rgba(255,255,255,0)");
    oc.fillStyle = buffGrd;
    oc.beginPath();
    oc.arc(bx, by, 80, 0, Math.PI * 2);
    oc.fill();
  }

  oc.globalCompositeOperation = "source-over";
  ctx.drawImage(offscreen, 0, 0);
}
