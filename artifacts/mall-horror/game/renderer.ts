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

  drawRoomba(ctx, state.playerX, state.playerY, state.playerAngle, state.isDashing);

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

// ─── FLOOR HELPERS ───────────────────────────────────────────────────────────

function tileHash(tx: number, ty: number): number {
  let h = ((tx * 2654435761) ^ (ty * 2246822519)) >>> 0;
  h ^= h >>> 16;
  h = (h * 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  return h / 0xffffffff;
}

function drawBrokenGlass(ctx: CanvasRenderingContext2D, wx: number, wy: number, tile: number, seed: number) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  // Glass shards — deterministic cracks from seed
  const cx = wx + tile * ((seed * 7.3) % 1 * 0.4 + 0.3);
  const cy = wy + tile * ((seed * 3.7) % 1 * 0.4 + 0.3);
  const shards = 5 + Math.floor((seed * 13) % 4);
  ctx.strokeStyle = "rgba(180,220,255,0.7)";
  ctx.lineWidth = 1;
  for (let i = 0; i < shards; i++) {
    const a = (seed * (i + 1) * 2.39996) % (Math.PI * 2);
    const len = 8 + (seed * (i * 3 + 1) * 5.7) % 16;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
  // Glass glint fill
  ctx.fillStyle = "rgba(200,230,255,0.15)";
  ctx.beginPath();
  ctx.arc(cx, cy, 5 + (seed * 4.1) % 8, 0, Math.PI * 2);
  ctx.fill();
  // Bright specular
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

      // Broken glass — deterministic per tile
      const h = tileHash(tx, ty);
      if (h > 0.91) {
        drawBrokenGlass(ctx, wx, wy, TILE, h);
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
  const storeCount = Math.floor(mw / (storeW + 30));
  const gapX = (mw - storeCount * storeW) / (storeCount + 1);
  for (let i = 0; i < storeCount; i++) {
    const sx = gapX + i * (storeW + gapX);
    const col = storeColors[i % storeColors.length];
    // Top store
    ctx.fillStyle = col;
    ctx.fillRect(sx, 10, storeW, storeH);
    ctx.fillStyle = "rgba(120,200,255,0.18)";
    ctx.fillRect(sx + 10, 10 + storeH - 30, storeW - 20, 25);
    ctx.fillStyle = "rgba(180,230,255,0.35)";
    ctx.fillRect(sx + storeW / 2 - 18, 10 + storeH - 30, 36, 25);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 20, 25, storeW - 40, 22);
    ctx.globalAlpha = 1;
    // Bottom store
    const col2 = storeColors[(i + 2) % storeColors.length];
    ctx.fillStyle = col2;
    ctx.fillRect(sx, mh - storeH - 10, storeW, storeH);
    ctx.fillStyle = "rgba(120,200,255,0.18)";
    ctx.fillRect(sx + 10, mh - storeH - 10, storeW - 20, 25);
    ctx.fillStyle = "rgba(180,230,255,0.35)";
    ctx.fillRect(sx + storeW / 2 - 18, mh - storeH - 10, 36, 25);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.7;
    ctx.fillRect(sx + 20, mh - storeH + 10, storeW - 40, 22);
    ctx.globalAlpha = 1;
  }

  // ── Pillars ──
  const pillarR = 18;
  for (let px = 350; px < mw; px += 350) {
    for (let py = 300; py < mh; py += 300) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(px + 6, py + 6, pillarR, pillarR, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a09080";
      ctx.fillRect(px - pillarR, py - pillarR, pillarR * 2, pillarR * 2);
      ctx.fillStyle = "#c8b8a8";
      ctx.fillRect(px - pillarR + 3, py - pillarR + 3, pillarR - 3, pillarR - 3);
      ctx.strokeStyle = "#706050";
      ctx.lineWidth = 2;
      ctx.strokeRect(px - pillarR, py - pillarR, pillarR * 2, pillarR * 2);
    }
  }

  // ── Benches ──
  ctx.fillStyle = "#5a4030";
  [[0.25, 0.5], [0.75, 0.5], [0.5, 0.3], [0.5, 0.7]].forEach(([fx, fy]) => {
    ctx.fillRect(mw * fx - 40, mh * fy - 8, 80, 16);
    ctx.fillStyle = "#3a2820";
    ctx.fillRect(mw * fx - 38, mh * fy - 6, 76, 6);
    ctx.fillStyle = "#5a4030";
  });

  // ── DRY FOUNTAIN (center of mall) ──────────────────────────────────────────
  drawDryFountain(ctx, mw / 2, mh / 2);

  // ── ELECTRIC ESCALATORS ────────────────────────────────────────────────────
  // Left side escalator
  drawEscalator(ctx, 80, mh / 2 - 180, 100, 360, false);
  // Right side escalator
  drawEscalator(ctx, mw - 180, mh / 2 - 180, 100, 360, true);
}

function drawDryFountain(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const PI = Math.PI;

  // Outer basin shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx + 8, cy + 8, 115, 115, 0, 0, PI * 2);
  ctx.fill();

  // Outer basin — weathered stone
  const basinGrd = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, 115);
  basinGrd.addColorStop(0, "#b8a890");
  basinGrd.addColorStop(0.6, "#9a8878");
  basinGrd.addColorStop(1, "#786858");
  ctx.fillStyle = basinGrd;
  ctx.beginPath();
  ctx.arc(cx, cy, 115, 0, PI * 2);
  ctx.fill();

  // Basin rim
  ctx.strokeStyle = "#706050";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 115, 0, PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#c8b8a0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, PI * 2);
  ctx.stroke();

  // Dry cracked basin floor
  const floorGrd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 100);
  floorGrd.addColorStop(0, "#c4b090");
  floorGrd.addColorStop(1, "#a89070");
  ctx.fillStyle = floorGrd;
  ctx.beginPath();
  ctx.arc(cx, cy, 100, 0, PI * 2);
  ctx.fill();

  // Crack lines (dry basin)
  ctx.strokeStyle = "rgba(80,55,30,0.6)";
  ctx.lineWidth = 1.5;
  [
    [0, -70, 30, -20], [-50, 10, 10, 60], [40, 30, -30, 80],
    [-20, -40, -60, 30], [60, -50, 20, 20],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(cx + x1, cy + y1);
    ctx.quadraticCurveTo(cx + (x1 + x2) / 2 + 15, cy + (y1 + y2) / 2 - 10, cx + x2, cy + y2);
    ctx.stroke();
  });

  // Inner raised column base
  ctx.fillStyle = "#8a7860";
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#706050";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, PI * 2);
  ctx.stroke();

  // Column shaft
  ctx.fillStyle = "#a09080";
  ctx.fillRect(cx - 12, cy - 70, 24, 34);
  ctx.fillStyle = "#c0b0a0";
  ctx.fillRect(cx - 10, cy - 68, 10, 30);
  ctx.strokeStyle = "#706050";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 12, cy - 70, 24, 34);

  // Broken top bowl (tilted, no water)
  ctx.save();
  ctx.translate(cx, cy - 70);
  ctx.rotate(0.3);
  ctx.fillStyle = "#9a8878";
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 10, 0, 0, PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#706050";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 10, 0, 0, PI * 2);
  ctx.stroke();
  // Cracked piece fallen off
  ctx.restore();
  ctx.fillStyle = "#9a8878";
  ctx.save();
  ctx.translate(cx + 45, cy - 30);
  ctx.rotate(1.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 7, 0, 0, PI * 2);
  ctx.fill();
  ctx.restore();

  // Debris / old leaves in basin
  ctx.fillStyle = "rgba(60,40,10,0.5)";
  [[-30, 40], [50, -20], [-60, -30], [20, 70], [-70, 10]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy + dy, 8 + Math.abs(dx % 5), 4, (dx * 0.1) % PI, 0, PI * 2);
    ctx.fill();
  });

  // Label plaque (knocked over)
  ctx.save();
  ctx.translate(cx - 30, cy + 85);
  ctx.rotate(-0.2);
  ctx.fillStyle = "#6a5040";
  ctx.fillRect(-25, -8, 50, 16);
  ctx.restore();
}

function drawEscalator(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  reversed: boolean
) {
  const PI = Math.PI;
  const now = Date.now() * 0.002;

  // Platform base
  ctx.fillStyle = "#2a2a30";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#3a3a45";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  // Escalator steps (animated diagonal treads)
  const stepH = 22;
  const stepCount = Math.ceil(h / stepH) + 1;
  const offset = (now * 20) % stepH;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 8, y + 8, w - 16, h - 16);
  ctx.clip();

  for (let i = -1; i < stepCount; i++) {
    const stepY = y + 8 + i * stepH + (reversed ? -offset : offset);
    ctx.fillStyle = i % 2 === 0 ? "#38383e" : "#30303a";
    ctx.fillRect(x + 8, stepY, w - 16, stepH - 2);
    // Step edge (yellow safety strip)
    ctx.fillStyle = "rgba(255,200,0,0.6)";
    ctx.fillRect(x + 8, stepY, w - 16, 3);
    // Tread grooves
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    for (let g = 0; g < 4; g++) {
      ctx.beginPath();
      ctx.moveTo(x + 12 + g * 18, stepY + 6);
      ctx.lineTo(x + 12 + g * 18, stepY + stepH - 5);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Electric arcs (sparking)
  const arcCount = 3;
  for (let i = 0; i < arcCount; i++) {
    const t = (now + i * 1.3) % 2;
    if (t > 1.2) continue; // not always visible
    const ax = x + 10 + (i / arcCount) * (w - 20);
    const ay = y + 10 + (Math.sin(now * 3 + i) * 0.5 + 0.5) * (h - 20);
    ctx.save();
    ctx.strokeStyle = `rgba(${100 + Math.floor(Math.sin(now * 5 + i) * 50)},150,255,${0.5 + Math.sin(now * 7 + i) * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#6688ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    for (let j = 0; j < 5; j++) {
      const jx = ax + (Math.random() - 0.5) * 30;
      const jy = ay + (Math.random() - 0.5) * 30;
      ctx.lineTo(jx, jy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Hazard tape border
  const tapeW = 10;
  ctx.save();
  const pat = ctx.createLinearGradient(x, y, x + tapeW, y + tapeW * 2);
  pat.addColorStop(0, "rgba(255,180,0,0.7)");
  pat.addColorStop(0.5, "rgba(0,0,0,0.7)");
  pat.addColorStop(1, "rgba(255,180,0,0.7)");
  ctx.strokeStyle = pat;
  ctx.lineWidth = tapeW;
  ctx.strokeRect(x + tapeW / 2, y + tapeW / 2, w - tapeW, h - tapeW);
  ctx.restore();

  // "ESCALATOR" sign at top
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x + 4, y - 22, w - 8, 20);
  ctx.fillStyle = "rgba(255,200,50,0.9)";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("⚡ ESCALATOR ⚡", x + w / 2, y - 7);
  ctx.restore();
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

// ─── ROOMBA ROBOT PLAYER ─────────────────────────────────────────────────────

function drawRoomba(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  dashing: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  // angle convention: -PI/2 = facing right. +PI flips so local-top = forward direction
  ctx.rotate(angle + Math.PI);

  if (dashing) {
    ctx.globalAlpha = 0.25;
    _drawRoombaBody(ctx, false, 0);
    ctx.globalAlpha = 1;
  }
  if (dashing) {
    ctx.shadowColor = "#60ccff";
    ctx.shadowBlur = 28;
  }
  _drawRoombaBody(ctx, dashing, Date.now() * 0.004);
  ctx.restore();
}

function _drawRoombaBody(ctx: CanvasRenderingContext2D, dashing: boolean, spinPhase: number) {
  const R = 16;
  const PI = Math.PI;

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(3, 5, R + 2, R * 0.55, 0, 0, PI * 2);
  ctx.fill();

  // Main body — metallic dark disc
  const bodyGrd = ctx.createRadialGradient(-5, -5, 2, 0, 0, R);
  bodyGrd.addColorStop(0, "#52525f");
  bodyGrd.addColorStop(0.4, "#28282f");
  bodyGrd.addColorStop(1, "#18181e");
  ctx.fillStyle = bodyGrd;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, PI * 2);
  ctx.fill();

  // Outer ring (chrome edge)
  ctx.strokeStyle = "#5a5a6e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, PI * 2);
  ctx.stroke();

  // Spinning brush disc (underneath, visible at edges)
  if (dashing) {
    ctx.strokeStyle = "rgba(80,170,255,0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = spinPhase + (i / 6) * PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      ctx.lineTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2));
      ctx.stroke();
    }
  } else {
    // Subtle spin lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = spinPhase * 0.3 + (i / 4) * PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3));
      ctx.stroke();
    }
  }

  // Front bumper strip — bright arc on forward half (local -y = forward after rotation)
  ctx.strokeStyle = "#8080a0";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, R - 1, -PI * 0.72, -PI * 0.28);
  ctx.stroke();

  // Rear exhaust slits
  ctx.strokeStyle = "#333340";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "butt";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 3.5, 10);
    ctx.lineTo(i * 3.5, 14);
    ctx.stroke();
  }

  // Side wheel bumps (3 and 9 o'clock)
  ctx.fillStyle = "#111118";
  ctx.beginPath(); ctx.ellipse(-R + 1, 0, 4.5, 7, 0, 0, PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(R - 1, 0, 4.5, 7, 0, 0, PI * 2); ctx.fill();
  ctx.strokeStyle = "#2a2a38";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-R + 1, 0, 4.5, 7, 0, 0, PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(R - 1, 0, 4.5, 7, 0, 0, PI * 2); ctx.stroke();

  // Top plate (center panel)
  const topGrd = ctx.createRadialGradient(0, 0, 2, 0, 0, 9);
  topGrd.addColorStop(0, "#38384a");
  topGrd.addColorStop(1, "#22222e");
  ctx.fillStyle = topGrd;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#48485a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, PI * 2);
  ctx.stroke();

  // Screw heads (4 corners)
  const screws = [[-6, -5], [6, -5], [6, 5], [-6, 5]] as [number, number][];
  screws.forEach(([sx, sy]) => {
    ctx.fillStyle = "#50506a";
    ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, PI * 2); ctx.fill();
    ctx.fillStyle = "#686878";
    ctx.beginPath(); ctx.arc(sx - 0.4, sy - 0.4, 0.7, 0, PI * 2); ctx.fill();
  });

  // Front sensor LED (glowing cyan — forward = local -y)
  ctx.shadowColor = "#00ddff";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#00ddff";
  ctx.beginPath();
  ctx.arc(0, -(R - 5), 3.5, 0, PI * 2);
  ctx.fill();
  // LED highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#99eeff";
  ctx.beginPath();
  ctx.arc(-0.6, -(R - 6.5), 1.2, 0, PI * 2);
  ctx.fill();

  // Side status LEDs (red, at the rear)
  ctx.shadowColor = "#ff4422";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ff3300";
  ctx.beginPath(); ctx.arc(-5, R - 5, 2.2, 0, PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, R - 5, 2.2, 0, PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Central power button
  ctx.fillStyle = dashing ? "#00ffcc" : "#00aa88";
  ctx.shadowColor = dashing ? "#00ffcc" : "transparent";
  ctx.shadowBlur = dashing ? 12 : 0;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Spin ring when dashing
  if (dashing) {
    ctx.strokeStyle = "rgba(0,200,255,0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, R + 5, 0, PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,200,255,0.2)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, R + 8, 0, PI * 2);
    ctx.stroke();
  }
}

// ─── ENEMY ───────────────────────────────────────────────────────────────────

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: {
  x: number; y: number; radius: number; type: string;
  hp: number; maxHp: number; hitFlash: number; angle: number; legPhase: number;
  isBurrowed?: boolean;
}) {
  // Burrowed moles: draw only a slight ground disturbance
  if (enemy.isBurrowed) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#6b3a12";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (enemy.type === "mole") {
    drawMole(ctx, enemy);
    return;
  }

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

function drawMole(ctx: CanvasRenderingContext2D, enemy: {
  x: number; y: number; radius: number;
  hp: number; maxHp: number; hitFlash: number; angle: number; legPhase: number;
}) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);

  if (enemy.hitFlash > 0) {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.5 + enemy.hitFlash * 0.5;
  } else {
    ctx.shadowColor = "#c87040";
    ctx.shadowBlur = 10;
  }

  const r = enemy.radius;
  // Body — earthy brown oval
  ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : "#7a4e28";
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fur texture (dark patches)
  ctx.fillStyle = "#5c3a1a";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.12, r * 0.5, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#6b3e1c";
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Snout / star-nose
  ctx.fillStyle = "#e07060";
  ctx.beginPath();
  ctx.arc(0, -r * 0.72, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Nose spikes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = "#ff8866";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.22, -r * 0.72 + Math.sin(a) * r * 0.22, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes (tiny, blind)
  ctx.fillStyle = "#1a0800";
  ctx.beginPath();
  ctx.arc(-r * 0.16, -r * 0.56, r * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.16, -r * 0.56, r * 0.065, 0, Math.PI * 2);
  ctx.fill();

  // Claws (4 big digging claws)
  ctx.strokeStyle = "#d4a060";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const clawAngles = [-1.4, -1.0, 1.0, 1.4];
  clawAngles.forEach((a) => {
    const cx = Math.cos(a + Math.PI * 0.5) * r * 0.7;
    const cy = Math.sin(a + Math.PI * 0.5) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(cx * 0.6, cy * 0.6);
    ctx.lineTo(cx * 1.2, cy * 1.2);
    ctx.stroke();
  });

  // HP bar
  if (enemy.hp < enemy.maxHp) {
    const barW = r * 2.2;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#1a0000";
    ctx.fillRect(-r * 1.1, r + 4, barW, 4);
    ctx.fillStyle = "#c87040";
    ctx.fillRect(-r * 1.1, r + 4, barW * (enemy.hp / enemy.maxHp), 4);
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
