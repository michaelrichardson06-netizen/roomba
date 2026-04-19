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

  // Save and translate for world space
  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Draw tiled floor
  drawFloor(ctx, cameraX, cameraY, canvasW, canvasH, state.mapWidth, state.mapHeight);

  // Draw lamps (floor markers)
  for (const lamp of state.lamps) {
    drawLamp(ctx, lamp.x, lamp.y, lamp.color);
  }

  // Draw buff drops
  for (const bd of state.buffDrops) {
    drawBuffDrop(ctx, bd);
  }

  // Draw particles
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

  // Draw explosions
  for (const ex of state.explosions) {
    ctx.save();
    ctx.globalAlpha = ex.alpha * 0.6;
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

  // Draw enemies
  for (const enemy of state.enemies) {
    drawEnemy(ctx, enemy);
  }

  // Draw bullets (with trail)
  for (const bullet of state.bullets) {
    drawBullet(ctx, bullet);
  }

  // Draw player
  drawPlayer(ctx, state.playerX, state.playerY, state.playerAngle, state.isDashing);

  ctx.restore(); // back to screen space

  // --- Lighting overlay (screen space) ---
  drawLightingOverlay(ctx, state, cameraX, cameraY, canvasW, canvasH);

  // Muzzle flash (screen space, centered)
  if (state.muzzleFlash) {
    const flashAlpha = 1 - state.muzzleFlash.age / state.muzzleFlash.maxAge;
    const fx = state.muzzleFlash.x - cameraX;
    const fy = state.muzzleFlash.y - cameraY;
    const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, 80);
    grd.addColorStop(0, `rgba(255,255,200,${flashAlpha * 0.9})`);
    grd.addColorStop(0.4, `rgba(255,200,100,${flashAlpha * 0.4})`);
    grd.addColorStop(1, "rgba(255,150,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  // White flash (full screen)
  if (state.whiteFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.9, state.whiteFlash);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  mw: number,
  mh: number
) {
  const TILE = 64;
  const startX = Math.max(0, Math.floor(cx / TILE));
  const startY = Math.max(0, Math.floor(cy / TILE));
  const endX = Math.min(Math.ceil(mw / TILE), Math.ceil((cx + cw) / TILE));
  const endY = Math.min(Math.ceil(mh / TILE), Math.ceil((cy + ch) / TILE));

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      const isAlt = (tx + ty) % 2 === 0;
      ctx.fillStyle = isAlt ? "#0e0c0a" : "#100e0b";
      ctx.fillRect(x, y, TILE, TILE);

      // Tile border
      ctx.strokeStyle = "#1a1612";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, TILE, TILE);
    }
  }

  // Map boundary
  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, mw, mh);

  // Decorative cracks / debris
  // (static, drawn once conceptually — here simplified)
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  dashing: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (dashing) {
    ctx.shadowColor = "#4488ff";
    ctx.shadowBlur = 20;
  }

  // Body
  ctx.fillStyle = "#c8b090";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shirt
  ctx.fillStyle = "#3a5a3a";
  ctx.fillRect(-8, -2, 16, 10);

  // Head
  ctx.fillStyle = "#c8b090";
  ctx.beginPath();
  ctx.arc(0, -12, 8, 0, Math.PI * 2);
  ctx.fill();

  // Flashlight / gun direction indicator
  ctx.fillStyle = "#888";
  ctx.fillRect(-2, -18, 4, -10);
  ctx.fillStyle = "#555";
  ctx.fillRect(-3, -28, 6, 4);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: { x: number; y: number; radius: number; type: string; hp: number; maxHp: number; hitFlash: number; angle: number; legPhase: number }) {
  const colors = ENEMY_COLORS[enemy.type as keyof typeof ENEMY_COLORS] || ENEMY_COLORS.standard;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);

  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = 0.5 + enemy.hitFlash * 0.5;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 20;
  } else {
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
  }

  const r = enemy.radius;

  if (enemy.type === "boss") {
    // Boss: large spider-like
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : colors.body;
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = "#3a0000";
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.35, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.12, -r * 0.35, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    // Legs (8 of them)
    drawLegs(ctx, r, 8, enemy.legPhase, "#5c0000");
  } else if (enemy.type === "elite") {
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a002a";
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff44ff";
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 0.25, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 0.25, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    drawLegs(ctx, r, 6, enemy.legPhase, "#5c1a5c");
  } else {
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : colors.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#001a00";
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2aff2a";
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.18, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.08, -r * 0.18, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
    drawLegs(ctx, r, 6, enemy.legPhase, "#1a5c1a");
  }

  // HP bar (only show if damaged)
  if (enemy.hp < enemy.maxHp) {
    const barW = r * 2;
    const barH = 4;
    const barX = -r;
    const barY = r + 4;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#330000";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#ff3300";
    ctx.fillRect(barX, barY, barW * (enemy.hp / enemy.maxHp), barH);
  }

  ctx.restore();
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  r: number,
  count: number,
  phase: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const legLength = r * 1.2;
    const bendOffset = Math.sin(phase + i) * 0.3;
    const x1 = Math.cos(angle) * r * 0.5;
    const y1 = Math.sin(angle) * r * 0.4;
    const x2 = Math.cos(angle + bendOffset) * legLength;
    const y2 = Math.sin(angle + bendOffset) * legLength;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawBullet(ctx: CanvasRenderingContext2D, bullet: { x: number; y: number; radius: number; isBazooka: boolean; vx: number; vy: number; trail: Array<{ x: number; y: number }> }) {
  ctx.save();

  if (bullet.isBazooka) {
    // Bazooka projectile
    ctx.shadowColor = "#ff6d00";
    ctx.shadowBlur = 20;

    // Trail
    for (let i = 0; i < bullet.trail.length; i++) {
      const t = bullet.trail[i];
      const alpha = (i / bullet.trail.length) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ff4400";
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
    ctx.arc(bullet.x, bullet.y, bullet.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Normal bullet - bright yellow streak
    ctx.shadowColor = "#ffff00";
    ctx.shadowBlur = 8;

    // Trail
    for (let i = 0; i < bullet.trail.length; i++) {
      const t = bullet.trail[i];
      const alpha = (i / bullet.trail.length) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(t.x, t.y, bullet.radius * 0.5, 0, Math.PI * 2);
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

function drawBuffDrop(ctx: CanvasRenderingContext2D, bd: { x: number; y: number; type: string; pulse: number }) {
  const color = BUFF_COLORS[bd.type] || "#ffffff";
  const scale = 1 + Math.sin(bd.pulse) * 0.15;
  const r = 14 * scale;

  ctx.save();
  ctx.translate(bd.x, bd.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  // Outer glow
  const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.5);
  grd.addColorStop(0, color + "cc");
  grd.addColorStop(1, color + "00");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Icon hint
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.ceil(r * 0.6)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const icons: Record<string, string> = {
    tripleShot: "3",
    quadShot: "4",
    rapidFire: "R",
    bazookaMode: "B",
  };
  ctx.fillText(icons[bd.type] || "?", 0, 1);

  ctx.restore();
}

function drawLightingOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cameraX: number,
  cameraY: number,
  canvasW: number,
  canvasH: number
) {
  // Create dark overlay using offscreen canvas
  let offscreen: HTMLCanvasElement;
  try {
    offscreen = document.createElement("canvas");
  } catch {
    // If document is not available (native), skip lighting
    return;
  }
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const oc = offscreen.getContext("2d")!;
  if (!oc) return;

  // Fill with darkness
  oc.fillStyle = "rgba(0,0,0,0.93)";
  oc.fillRect(0, 0, canvasW, canvasH);

  // Use destination-out to "cut" light holes
  oc.globalCompositeOperation = "destination-out";

  // Player flashlight cone
  const px = state.playerX - cameraX;
  const py = state.playerY - cameraY;
  const flashAngle = state.playerAngle + Math.PI / 2;
  const flashLen = 260;
  const flashWidth = Math.PI / 3;

  // Muzzle flash bonus light
  const mfBonus = state.muzzleFlash ? (1 - state.muzzleFlash.age / state.muzzleFlash.maxAge) * 60 : 0;

  const flashGrd = oc.createRadialGradient(px, py, 0, px, py, flashLen + mfBonus);
  flashGrd.addColorStop(0, "rgba(255,220,160,0.95)");
  flashGrd.addColorStop(0.6, "rgba(255,200,120,0.6)");
  flashGrd.addColorStop(1, "rgba(255,180,100,0)");
  oc.fillStyle = flashGrd;
  oc.beginPath();
  oc.moveTo(px, py);
  oc.arc(px, py, flashLen + mfBonus, flashAngle - flashWidth / 2, flashAngle + flashWidth / 2);
  oc.closePath();
  oc.fill();

  // Small ambient around player
  const ambGrd = oc.createRadialGradient(px, py, 0, px, py, 70);
  ambGrd.addColorStop(0, "rgba(200,150,100,0.5)");
  ambGrd.addColorStop(1, "rgba(200,150,100,0)");
  oc.fillStyle = ambGrd;
  oc.beginPath();
  oc.arc(px, py, 70, 0, Math.PI * 2);
  oc.fill();

  // Lamps (static lights)
  for (const lamp of state.lamps) {
    const lx = lamp.x - cameraX;
    const ly = lamp.y - cameraY;
    if (lx < -lamp.radius || lx > canvasW + lamp.radius) continue;
    if (ly < -lamp.radius || ly > canvasH + lamp.radius) continue;

    const effR = lamp.radius * lamp.flicker;
    const lgrd = oc.createRadialGradient(lx, ly, 0, lx, ly, effR);
    lgrd.addColorStop(0, `rgba(255,255,255,${0.7 * lamp.flicker})`);
    lgrd.addColorStop(0.5, `rgba(200,180,120,${0.4 * lamp.flicker})`);
    lgrd.addColorStop(1, "rgba(200,150,50,0)");
    oc.fillStyle = lgrd;
    oc.beginPath();
    oc.arc(lx, ly, effR, 0, Math.PI * 2);
    oc.fill();
  }

  // Buff drops emit light
  for (const bd of state.buffDrops) {
    const bx = bd.x - cameraX;
    const by = bd.y - cameraY;
    if (bx < -80 || bx > canvasW + 80 || by < -80 || by > canvasH + 80) continue;
    const buffGrd = oc.createRadialGradient(bx, by, 0, bx, by, 60);
    buffGrd.addColorStop(0, "rgba(255,255,255,0.5)");
    buffGrd.addColorStop(1, "rgba(255,255,255,0)");
    oc.fillStyle = buffGrd;
    oc.beginPath();
    oc.arc(bx, by, 60, 0, Math.PI * 2);
    oc.fill();
  }

  // Draw the overlay on top
  oc.globalCompositeOperation = "source-over";
  ctx.drawImage(offscreen, 0, 0);
}
