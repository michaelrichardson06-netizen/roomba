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
    // Frozen/slowed ice overlay
    if (enemy.frozenTimer > 0) {
      const isFull = (enemy.type === "standard");
      ctx.save();
      ctx.globalAlpha = isFull ? 0.55 : 0.35;
      const frozenGrd = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.radius * 1.2);
      frozenGrd.addColorStop(0, "rgba(160,240,255,0.8)");
      frozenGrd.addColorStop(0.5, "rgba(80,200,255,0.5)");
      frozenGrd.addColorStop(1, "rgba(0,160,255,0)");
      ctx.fillStyle = frozenGrd;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius * 1.2, 0, Math.PI * 2);
      ctx.fill();
      // Ice crystal spikes
      ctx.globalAlpha = isFull ? 0.8 : 0.5;
      ctx.strokeStyle = "#88eeff";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const len = enemy.radius * (0.7 + Math.sin(i * 2.1) * 0.3);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(a) * len, enemy.y + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── Boss webs ──────────────────────────────────────────────────────────────
  for (const web of state.bossWebs) {
    drawBossWeb(ctx, web);
  }

  for (const bullet of state.bullets) {
    drawBullet(ctx, bullet);
  }

  drawRoomba(ctx, state.playerX, state.playerY, state.playerAngle, state.isDashing);


  // ── Lightning: ambient static arcs between nearby enemies ─────────────────
  if (state.lightningStrike && state.enemies.length > 1) {
    const now = Date.now();
    for (let i = 0; i < state.enemies.length; i++) {
      const a = state.enemies[i];
      for (let j = i + 1; j < state.enemies.length; j++) {
        const b = state.enemies[j];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < 180) {
          // Flicker: randomize based on time + pair index
          const flicker = Math.sin(now * 0.01 + i * 7.3 + j * 3.7) > 0.1;
          if (!flicker) continue;
          const alpha = (0.15 + Math.random() * 0.25) * (1 - d / 180);
          drawJaggedLine(ctx, a.x, a.y, b.x, b.y, alpha, 1.2, "#88eeff");
        }
      }
    }
  }

  // ── Lightning: hit-chain arcs ─────────────────────────────────────────────
  for (const arc of state.lightningArcs) {
    const alpha = (arc.life / arc.maxLife) * 0.9;
    drawJaggedLine(ctx, arc.fromX, arc.fromY, arc.toX, arc.toY, alpha, 2.5, "#ffffff");
    drawJaggedLine(ctx, arc.fromX, arc.fromY, arc.toX, arc.toY, alpha * 0.5, 5, "#44ccff");
  }

  // ── Berserker AoE ring (world space) ──────────────────────────────────────
  if (state.berserkerTimer > 0) {
    const pulse = (Date.now() * 0.004) % 1;
    const aoeR = (state as any).berserkerAoeRadius ?? 120;
    ctx.save();
    ctx.globalAlpha = 0.25 + pulse * 0.2;
    const aoeGrd = ctx.createRadialGradient(state.playerX, state.playerY, aoeR * 0.6, state.playerX, state.playerY, aoeR);
    aoeGrd.addColorStop(0, "rgba(255,0,50,0)");
    aoeGrd.addColorStop(0.7, "rgba(255,0,50,0.35)");
    aoeGrd.addColorStop(1, "rgba(255,0,50,0)");
    ctx.fillStyle = aoeGrd;
    ctx.beginPath();
    ctx.arc(state.playerX, state.playerY, aoeR, 0, Math.PI * 2);
    ctx.fill();
    // Ring border
    ctx.globalAlpha = 0.5 + pulse * 0.4;
    ctx.strokeStyle = "#ff0044";
    ctx.lineWidth = 2 + pulse * 2;
    ctx.shadowColor = "#ff0044";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(state.playerX, state.playerY, aoeR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Ice wave rings ─────────────────────────────────────────────────────────
  for (const iw of state.iceWaves) {
    const prog = iw.age / iw.maxAge;
    const alpha = (1 - prog) * 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#00cfff";
    ctx.lineWidth = 4 + (1 - prog) * 4;
    ctx.shadowColor = "#00cfff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(iw.x, iw.y, iw.radius, 0, Math.PI * 2);
    ctx.stroke();
    // Inner ring fill
    ctx.globalAlpha = alpha * 0.15;
    const iceGrd = ctx.createRadialGradient(iw.x, iw.y, 0, iw.x, iw.y, iw.radius);
    iceGrd.addColorStop(0, "rgba(0,207,255,0)");
    iceGrd.addColorStop(0.7, "rgba(0,207,255,0.3)");
    iceGrd.addColorStop(1, "rgba(0,207,255,0)");
    ctx.fillStyle = iceGrd;
    ctx.beginPath();
    ctx.arc(iw.x, iw.y, iw.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Floating texts (damage numbers, IMMUNE! etc.) ─────────────────────────
  for (const ft of state.floatingTexts) {
    const prog = ft.age / ft.maxAge;
    const alpha = prog < 0.2 ? prog / 0.2 : 1 - ((prog - 0.2) / 0.8);
    // Damage numbers (start with "-") get a bigger, bolder treatment
    const isDmg = ft.text.startsWith("-");
    const baseSize = isDmg ? 22 : 14;
    const scale = isDmg ? (1 + prog * 0.5) : (1 + prog * 0.4);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(ft.x, ft.y);
    ctx.scale(scale, scale);
    ctx.font = `900 ${Math.round(baseSize / scale)}px monospace`;
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = isDmg ? 16 : 10;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Outline for readability against any background
    if (isDmg) {
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 4 / scale;
      ctx.strokeText(ft.text, 0, 0);
    }
    ctx.fillText(ft.text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();

  drawLightingOverlay(ctx, state, cameraX, cameraY, canvasW, canvasH);


  // ── Berserker screen vignette (screen space) ──────────────────────────────
  if (state.berserkerTimer > 0) {
    const pulse = 0.12 + Math.sin(Date.now() * 0.008) * 0.06;
    const vGrd = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasH * 0.3, canvasW / 2, canvasH / 2, canvasH * 0.85);
    vGrd.addColorStop(0, "rgba(255,0,44,0)");
    vGrd.addColorStop(1, `rgba(255,0,44,${pulse})`);
    ctx.fillStyle = vGrd;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Battery DEAD — HP draining warning ────────────────────────────────────
  if (state.battery !== undefined && state.battery <= 0) {
    const t = Date.now();
    const pulse = Math.sin(t * 0.006) * 0.5 + 0.5;
    // Orange vignette edge (distinct from the red HP-low vignette)
    const batGrd = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasH * 0.3, canvasW / 2, canvasH / 2, canvasH * 0.9);
    batGrd.addColorStop(0, "rgba(255,120,0,0)");
    batGrd.addColorStop(1, `rgba(255,100,0,${0.18 + pulse * 0.18})`);
    ctx.fillStyle = batGrd;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Pulsing warning text just below the HUD
    const batAlpha = 0.6 + pulse * 0.4;
    const batY = canvasH * 0.28;
    ctx.save();
    ctx.globalAlpha = batAlpha;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "rgba(0,0,0,0.95)";
    ctx.lineWidth = 4;
    ctx.strokeText("⚡ Roomba on back battery — find a battery!", canvasW / 2, batY);
    ctx.fillStyle = "#ffaa00";
    ctx.fillText("⚡ Roomba on back battery — find a battery!", canvasW / 2, batY);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Red damage flash — fires on every hit, unmissable ─────────────────────
  if (state.redFlash > 0) {
    const rf = Math.min(1, state.redFlash);
    // Full-screen red tint
    ctx.fillStyle = `rgba(220,0,0,${rf * 0.45})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Heavy vignette edge ring
    const rfGrd = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasH * 0.2, canvasW / 2, canvasH / 2, canvasH * 0.85);
    rfGrd.addColorStop(0, "rgba(200,0,0,0)");
    rfGrd.addColorStop(1, `rgba(220,0,0,${rf * 0.7})`);
    ctx.fillStyle = rfGrd;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Low HP pulsing red glow + critical text (≤ 50% HP) ───────────────────
  const hpRatio = state.hp / state.maxHp;
  if (hpRatio < 0.50 && state.redFlash < 0.5) {
    const pulse = (Math.sin(Date.now() * 0.004) * 0.5 + 0.5) * (0.50 - hpRatio) / 0.50;
    const lowGrd = ctx.createRadialGradient(canvasW / 2, canvasH / 2, canvasH * 0.35, canvasW / 2, canvasH / 2, canvasH * 0.9);
    lowGrd.addColorStop(0, "rgba(200,0,0,0)");
    lowGrd.addColorStop(1, `rgba(200,0,0,${pulse * 0.55})`);
    ctx.fillStyle = lowGrd;
    ctx.fillRect(0, 0, canvasW, canvasH);
    // Warning text — "DANGER" at 50%, "CRITICAL HP" at 30%
    const isCritical = hpRatio < 0.30;
    const critAlpha = isCritical ? (0.6 + pulse * 0.4) : (0.3 + pulse * 0.3);
    const critY = canvasH * 0.18;
    const critLabel = isCritical ? "⚠ CRITICAL HP" : "⚠ TAKING DAMAGE";
    const critSize = isCritical ? 20 : 15;
    ctx.save();
    ctx.globalAlpha = critAlpha;
    ctx.font = `bold ${critSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = isCritical ? 18 : 10;
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 4;
    ctx.strokeText(critLabel, canvasW / 2, critY);
    ctx.fillStyle = isCritical ? "#ff3333" : "#ff7744";
    ctx.fillText(critLabel, canvasW / 2, critY);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Enemy proximity danger arrows (screen-edge directional indicators) ────
  // Shows where nearby enemies are even through fog of war.
  // Urgent (≤120px): red solid. Warning (≤300px): orange semi-transparent.
  {
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const EDGE_PAD = 28; // px from screen edge where arrow tip sits
    ctx.save();
    for (const enemy of state.enemies) {
      const ex = enemy.x - state.playerX; // relative to player (world units ≈ screen px at 1:1)
      const ey = enemy.y - state.playerY;
      const worldDist = Math.hypot(ex, ey);
      if (worldDist > 300) continue; // only show within 300px
      const urgent = worldDist <= 120;
      const angle = Math.atan2(ey, ex); // 0 = right, π/2 = down
      // Project to actual screen-rectangle edge (not a circle) so arrows sit at the true border
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const sX = Math.abs(cosA) > 0.001 ? (cx - EDGE_PAD) / Math.abs(cosA) : Infinity;
      const sY = Math.abs(sinA) > 0.001 ? (cy - EDGE_PAD) / Math.abs(sinA) : Infinity;
      const sEdge = Math.min(sX, sY);
      const arrowX = cx + cosA * sEdge;
      const arrowY = cy + sinA * sEdge;
      const pulse = urgent ? 0.65 + Math.sin(Date.now() * 0.012) * 0.35 : 1;
      const alpha = (urgent ? 0.85 : 0.45 + (1 - worldDist / 300) * 0.3) * pulse;
      const color  = urgent ? "#ff2222" : enemy.type === "boss" ? "#ff44ff" : "#ff9900";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = 1.5;
      // Draw small filled triangle pointing toward the enemy
      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle + Math.PI / 2); // point toward enemy
      const sz = urgent ? 10 : 7;
      ctx.beginPath();
      ctx.moveTo(0, -sz);
      ctx.lineTo(sz * 0.6, sz * 0.5);
      ctx.lineTo(-sz * 0.6, sz * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

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

function drawFloorWire(ctx: CanvasRenderingContext2D, wx: number, wy: number, tile: number, seed: number) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  // Wire runs across the tile in a snaking path
  const startX = wx + (seed * 5.1) % 1 * tile;
  const startY = wy + (seed * 3.3) % 1 * tile;
  const endX = wx + ((seed * 7.7) % 1) * tile;
  const endY = wy + ((seed * 2.9) % 1) * tile;
  const midX = wx + ((seed * 11.3) % 1) * tile;
  const midY = wy + ((seed * 4.7) % 1) * tile;

  // Cable sheath (dark rubber)
  ctx.strokeStyle = seed > 0.97 ? "#ffcc00" : seed > 0.94 ? "#ff4400" : "#222222";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  // Inner wire gleam
  ctx.strokeStyle = seed > 0.97 ? "#ffee44" : seed > 0.94 ? "#ff6622" : "#444444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX + 1, startY);
  ctx.quadraticCurveTo(midX + 1, midY, endX + 1, endY);
  ctx.stroke();

  // Occasional spark at wire break
  if (seed > 0.96) {
    const sparks = (Date.now() * 0.003) % 1;
    if (sparks > 0.5) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#88aaff";
      ctx.shadowColor = "#4466ff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(midX, midY, 2 + sparks * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
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

      // Broken glass — deterministic per tile (roughly 15% of tiles)
      const h = tileHash(tx, ty);
      if (h > 0.85) {
        drawBrokenGlass(ctx, wx, wy, TILE, h);
      }
      // Electrical wires/cables on floor (roughly 8% of tiles)
      const hw = tileHash(tx + 999, ty + 333);
      if (hw > 0.92) {
        drawFloorWire(ctx, wx, wy, TILE, hw);
      }

      // ── Water puddles (deterministic, ~6% of tiles) ─────────────────────
      const hp = tileHash(tx + 4321, ty + 8765);
      if (hp > 0.94) {
        const px = wx + TILE * 0.2 + hp * TILE * 0.3;
        const py = wy + TILE * 0.2 + tileHash(tx, ty + 500) * TILE * 0.4;
        const rw = 18 + hp * 28;
        const rh = 10 + tileHash(tx + 111, ty) * 16;
        ctx.save();
        const pGrd = ctx.createRadialGradient(px, py, 0, px, py, rw);
        pGrd.addColorStop(0, "rgba(160,185,210,0.55)");
        pGrd.addColorStop(0.5, "rgba(130,165,200,0.38)");
        pGrd.addColorStop(1, "rgba(100,140,180,0)");
        ctx.fillStyle = pGrd;
        ctx.beginPath();
        ctx.ellipse(px, py, rw, rh, hp * 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Highlight shimmer
        ctx.fillStyle = "rgba(220,240,255,0.25)";
        ctx.beginPath();
        ctx.ellipse(px - rw * 0.2, py - rh * 0.15, rw * 0.35, rh * 0.3, hp, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Green insect goo stains (~4% of tiles) ──────────────────────────
      const hg = tileHash(tx + 7777, ty + 2468);
      if (hg > 0.96) {
        const gx = wx + TILE * 0.3 + hg * TILE * 0.3;
        const gy = wy + TILE * 0.3 + tileHash(tx + 300, ty + 300) * TILE * 0.3;
        const gr = 12 + hg * 20;
        ctx.save();
        ctx.globalAlpha = 0.55;
        const gGrd = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        gGrd.addColorStop(0, "#88ff44");
        gGrd.addColorStop(0.4, "#44aa00");
        gGrd.addColorStop(1, "rgba(20,60,0,0)");
        ctx.fillStyle = gGrd;
        // Blob: 3 overlapping ellipses
        const ang = hg * Math.PI;
        ctx.beginPath();
        ctx.ellipse(gx, gy, gr, gr * 0.6, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(gx + gr * 0.3, gy + gr * 0.2, gr * 0.7, gr * 0.45, ang + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(gx - gr * 0.25, gy + gr * 0.35, gr * 0.5, gr * 0.35, ang + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
  }

  // ── Boundary walls — worn mall drywall look ──────────────────────────────
  const WALL = 28; // wall thickness in world-px

  // Main wall fill (off-white scuffed paint)
  ctx.fillStyle = "#c8bfb0";
  ctx.fillRect(-WALL, -WALL, mw + WALL * 2, WALL);     // top
  ctx.fillRect(-WALL,   mh,  mw + WALL * 2, WALL);     // bottom
  ctx.fillRect(-WALL, -WALL, WALL, mh + WALL * 2);     // left
  ctx.fillRect(  mw,  -WALL, WALL, mh + WALL * 2);     // right

  // Grunge / dirt layer on wall
  ctx.fillStyle = "rgba(80,60,40,0.18)";
  ctx.fillRect(-WALL, -WALL, mw + WALL * 2, WALL);
  ctx.fillRect(-WALL,   mh,  mw + WALL * 2, WALL);
  ctx.fillRect(-WALL, -WALL, WALL, mh + WALL * 2);
  ctx.fillRect(  mw,  -WALL, WALL, mh + WALL * 2);

  // Baseboard strip (dark, at floor line)
  ctx.fillStyle = "#5a4a38";
  ctx.fillRect(-WALL, -WALL, mw + WALL * 2, 4); // top baseboard (outer edge)
  ctx.fillRect(-WALL, mh - 4, mw + WALL * 2, 4);
  ctx.fillRect(-WALL, -WALL, 4, mh + WALL * 2);
  ctx.fillRect(mw - 4, -WALL, 4, mh + WALL * 2);

  // Inner wall edge shadow line (gives depth between floor and wall)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(0, 0, mw, 4);     // top inner
  ctx.fillRect(0, mh - 4, mw, 4); // bottom inner
  ctx.fillRect(0, 0, 4, mh);     // left inner
  ctx.fillRect(mw - 4, 0, 4, mh); // right inner
}

const STORE_DATA = [
  { name: "GLAMOUR",    color: "#2a0a2e", neon: "#ff44ee", off: false },
  { name: "TECH DEPOT", color: "#0a1a2e", neon: "#00aaff", off: false },
  { name: "SPORT ZONE", color: "#0a200a", neon: "#44ff88", off: true  },
  { name: "ARCADE+",    color: "#1a100a", neon: "#ffaa00", off: false },
  { name: "HOT TOPIC",  color: "#200a0a", neon: "#ff2222", off: true  },
  { name: "CINNABON",   color: "#1e1000", neon: "#ffcc44", off: false },
  { name: "GAME WORLD", color: "#0a0a22", neon: "#8844ff", off: true  },
  { name: "BATH+BODY",  color: "#0a1e1a", neon: "#44ffee", off: false },
  { name: "PRETZEL+",   color: "#1e1408", neon: "#ff8822", off: false },
  { name: "EYEZONE",    color: "#0e0e2a", neon: "#aaaaff", off: true  },
];

function drawMallFeatures(ctx: CanvasRenderingContext2D, mw: number, mh: number) {
  // Flat open mall — no interior obstacles.
  // Just faint atmospheric floor wear marks scattered across the open space.

  // Worn scuff patches (large faint ellipses at deterministic spots)
  const patches = [
    [0.22, 0.25], [0.72, 0.18], [0.5, 0.5],
    [0.3, 0.68], [0.8, 0.72], [0.55, 0.35],
    [0.15, 0.5], [0.85, 0.45], [0.4, 0.82],
  ];
  for (const [fx, fy] of patches) {
    const px = mw * fx, py = mh * fy;
    const rx = 60 + tileHash(Math.floor(fx * 100), Math.floor(fy * 100)) * 80;
    const ry = 30 + tileHash(Math.floor(fx * 100) + 7, Math.floor(fy * 100)) * 50;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#6a5a40";
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, tileHash(Math.floor(fx * 100), Math.floor(fy * 100)) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Faint dashed centerline markings (old directional floor tape, mostly worn off)
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = "#888070";
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 60]);
  // Horizontal center corridor
  ctx.beginPath();
  ctx.moveTo(60, mh / 2);
  ctx.lineTo(mw - 60, mh / 2);
  ctx.stroke();
  // Vertical center corridor
  ctx.beginPath();
  ctx.moveTo(mw / 2, 60);
  ctx.lineTo(mw / 2, mh - 60);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStorefront(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, sw: number, sh: number,
  data: { name: string; color: string; neon: string; off: boolean },
  now: number,
  flipped: boolean
) {
  // ── Store body ──────────────────────────────────────────────────────────
  ctx.fillStyle = data.color;
  ctx.fillRect(sx, sy, sw, sh);

  // Subtle wall texture (vertical strips)
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fillRect(sx + i * (sw / 5), sy, sw / 5 - 1, sh);
  }

  // ── Security gate (partially closed metal slats) ──────────────────────
  const gateY = flipped ? sy : sy + sh * 0.3;
  const gateH = flipped ? sh * 0.7 : sh * 0.7;
  ctx.fillStyle = "rgba(20,20,25,0.75)";
  ctx.fillRect(sx, gateY, sw, gateH);
  // Horizontal slats
  const slats = 6;
  for (let s = 0; s < slats; s++) {
    const ly = gateY + (s / slats) * gateH;
    ctx.fillStyle = s % 2 === 0 ? "rgba(60,60,70,0.9)" : "rgba(45,45,55,0.9)";
    ctx.fillRect(sx + 2, ly, sw - 4, gateH / slats - 1);
    // Slat highlight
    ctx.fillStyle = "rgba(100,100,120,0.3)";
    ctx.fillRect(sx + 2, ly, sw - 4, 2);
    // Horizontal brace marks
    ctx.strokeStyle = "rgba(80,80,100,0.5)";
    ctx.lineWidth = 1;
    for (let seg = 0; seg < 4; seg++) {
      ctx.beginPath();
      ctx.moveTo(sx + 2 + seg * (sw / 4), ly);
      ctx.lineTo(sx + 2 + seg * (sw / 4), ly + gateH / slats - 1);
      ctx.stroke();
    }
  }
  // Gate handle/lock box
  ctx.fillStyle = "#333340";
  ctx.fillRect(sx + sw / 2 - 12, gateY + gateH * 0.5 - 8, 24, 16);
  ctx.fillStyle = "#888899";
  ctx.beginPath();
  ctx.arc(sx + sw / 2, gateY + gateH * 0.5, 5, 0, Math.PI * 2);
  ctx.fill();

  // ── Display window (above gate) ───────────────────────────────────────
  const winY = flipped ? sy + sh * 0.7 : sy;
  const winH = sh * 0.32;
  ctx.fillStyle = "rgba(30,50,70,0.6)";
  ctx.fillRect(sx + 8, winY + 4, sw - 16, winH - 8);
  // Window glass reflection
  const wGrd = ctx.createLinearGradient(sx + 8, winY + 4, sx + sw - 8, winY + winH - 8);
  wGrd.addColorStop(0, "rgba(140,180,220,0.08)");
  wGrd.addColorStop(0.4, "rgba(180,220,255,0.14)");
  wGrd.addColorStop(1, "rgba(100,140,180,0.04)");
  ctx.fillStyle = wGrd;
  ctx.fillRect(sx + 8, winY + 4, sw - 16, winH - 8);
  // Cracked glass line
  ctx.strokeStyle = "rgba(180,220,255,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + sw * 0.3, winY + 4);
  ctx.lineTo(sx + sw * 0.15, winY + winH * 0.6);
  ctx.lineTo(sx + sw * 0.25, winY + winH - 8);
  ctx.stroke();
  // Window border
  ctx.strokeStyle = "rgba(80,100,130,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx + 8, winY + 4, sw - 16, winH - 8);

  // ── Neon sign ───────────────────────────────────────────────────────────
  const signCY = flipped
    ? sy + sh * 0.82
    : sy + sh * 0.15;
  drawNeonSign(ctx, sx + sw / 2, signCY, data.name, data.neon, data.off, now);
}

function drawNeonSign(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  text: string, color: string,
  isOff: boolean, now: number
) {
  ctx.save();

  // Flicker logic: off signs occasionally pulse on briefly
  let alpha = 1.0;
  if (isOff) {
    const t = (now * 0.001 + cx * 0.003) % 4;
    alpha = t < 0.15 ? 0.6 : t < 0.3 ? 0.0 : t < 0.32 ? 0.5 : 0.0;
  } else {
    // On signs: subtle slow flicker
    alpha = 0.82 + Math.sin(now * 0.003 + cx * 0.01) * 0.18;
  }

  if (alpha < 0.01) { ctx.restore(); return; }

  // Sign backing panel
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(cx - 90, cy - 14, 180, 28, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(80,80,80,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - 90, cy - 14, 180, 28, 4);
  ctx.stroke();

  // Outer glow halo
  ctx.globalAlpha = alpha * 0.35;
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.fillStyle = color;
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);

  // Main text
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, cx, cy);

  // Inner color core
  ctx.globalAlpha = alpha * 0.65;
  ctx.fillStyle = color;
  ctx.shadowBlur = 6;
  ctx.fillText(text, cx, cy);

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawKiosk(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  label: string, neonColor: string, now: number
) {
  const kw = 70, kh = 44;
  const sx = cx - kw / 2, sy = cy - kh / 2;

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(sx + 5, sy + 5, kw, kh);

  // Counter surface
  const kGrd = ctx.createLinearGradient(sx, sy, sx, sy + kh);
  kGrd.addColorStop(0, "#3a3028");
  kGrd.addColorStop(1, "#252015");
  ctx.fillStyle = kGrd;
  ctx.fillRect(sx, sy, kw, kh);

  // Counter top (slightly lighter)
  ctx.fillStyle = "#4a4035";
  ctx.fillRect(sx, sy, kw, 10);
  // Glass display case front
  ctx.fillStyle = "rgba(100,160,200,0.15)";
  ctx.fillRect(sx + 2, sy + 10, kw - 4, kh - 14);
  ctx.strokeStyle = "rgba(100,160,200,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 2, sy + 10, kw - 4, kh - 14);

  // Items in case (simplified colored rectangles)
  const itemColors = [neonColor, "#ffffff", "#ffaa44"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = itemColors[i % itemColors.length] + "55";
    ctx.fillRect(sx + 6 + i * 18, sy + 14, 12, 8);
  }

  // Knocked-over sign
  ctx.save();
  ctx.translate(sx + kw * 0.5, sy - 5);
  ctx.rotate(-0.2);
  ctx.fillStyle = "#1a1510";
  ctx.fillRect(-25, -6, 50, 12);
  ctx.restore();

  // Neon label above kiosk
  drawNeonSign(ctx, cx, sy - 22, label, neonColor, false, now);

  // Outline
  ctx.strokeStyle = "#302820";
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, kw, kh);

  // Scattered kiosk debris
  ctx.fillStyle = "rgba(80,60,40,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + 35, cy + 15, 14, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
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

  // Escalator steps (static treads — escalator is broken/stopped)
  const stepH = 22;
  const stepCount = Math.ceil(h / stepH) + 1;
  const offset = 0;

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

  // Electric sparks (broken escalator — slow-pulsing, deterministic, no random jitter)
  const arcCount = 3;
  for (let i = 0; i < arcCount; i++) {
    const t = (now * 0.5 + i * 1.3) % 2;  // slower: 0.5× speed
    if (t > 1.0) continue; // intermittent sparks
    // Anchor position drifts slowly on a sine wave — no per-frame randomness
    const ax = x + 10 + (i / arcCount) * (w - 20);
    const ay = y + 10 + (Math.sin(now * 0.8 + i * 2.1) * 0.5 + 0.5) * (h - 20);
    ctx.save();
    const bright = 200 + Math.floor(Math.sin(now * 1.5 + i) * 55);
    ctx.strokeStyle = `rgba(255,${bright},80,${0.5 + Math.sin(now * 1.2 + i) * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ffdd44";
    ctx.shadowBlur = 8;
    // Deterministic zigzag arc using sines — no Math.random()
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    for (let j = 1; j <= 5; j++) {
      const jx = ax + Math.sin(now * 2 + i * 3 + j * 1.7) * 12;
      const jy = ay + Math.sin(now * 2.3 + i * 2 + j * 2.1) * 12;
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

function drawBossWeb(ctx: CanvasRenderingContext2D, web: { x: number; y: number; radius: number; age: number }) {
  const now = Date.now();
  const pulse = 0.75 + Math.sin(now * 0.012) * 0.25;
  ctx.save();
  ctx.translate(web.x, web.y);
  // Radioactive glow
  ctx.shadowColor = "#cc2200";
  ctx.shadowBlur = 18;
  // Outer ring
  ctx.strokeStyle = `rgba(220,50,0,${0.9 * pulse})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, web.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Web strands (8 spokes + 3 rings)
  const spokes = 8;
  ctx.strokeStyle = `rgba(255,80,20,${0.7 * pulse})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * web.radius, Math.sin(a) * web.radius);
    ctx.stroke();
  }
  // Concentric web rings
  for (let ri = 1; ri <= 3; ri++) {
    const rr = (ri / 3.5) * web.radius;
    ctx.strokeStyle = `rgba(200,40,0,${0.55 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // Central nucleus dot
  ctx.fillStyle = `rgba(255,30,0,${pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: {
  x: number; y: number; radius: number; type: string;
  hp: number; maxHp: number; hitFlash: number; angle: number; legPhase: number;
  isImmune?: boolean;
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

    // ── Immunity shield ──────────────────────────────────────────────────────
    if (enemy.isImmune) {
      const now = Date.now();
      const pulse = 0.6 + Math.sin(now * 0.008) * 0.4;
      const shieldR = r * 1.35 + Math.sin(now * 0.015) * 6;
      // Outer glow ring
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 30 + pulse * 20;
      ctx.strokeStyle = `rgba(255,${Math.floor(60 + pulse * 80)},0,${0.7 + pulse * 0.3})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
      ctx.stroke();
      // Inner shield fill
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,30,0,${0.06 + pulse * 0.06})`;
      ctx.beginPath();
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
      ctx.fill();
      // Hex-web pattern on shield
      ctx.strokeStyle = `rgba(255,100,0,${0.3 + pulse * 0.2})`;
      ctx.lineWidth = 1;
      const hexN = 6;
      for (let hi = 0; hi < hexN; hi++) {
        const a = (hi / hexN) * Math.PI * 2 + now * 0.001;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * shieldR, Math.sin(a) * shieldR);
        ctx.stroke();
      }
      // "IMMUNE" label above boss
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff4400";
      ctx.fillStyle = `rgba(255,${Math.floor(100 + pulse * 100)},0,${0.8 + pulse * 0.2})`;
      ctx.font = `bold ${Math.floor(r * 0.35)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("IMMUNE", 0, -r * 1.8);
    }
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

/** Jagged lightning bolt arc between two world-space points */
function drawJaggedLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  alpha: number, lineWidth: number, color: string, segments = 8
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);

  const dx = x2 - x1, dy = y2 - y1;
  const perpX = -dy / Math.sqrt(dx * dx + dy * dy);
  const perpY = dx / Math.sqrt(dx * dx + dy * dy);

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitter = (Math.random() - 0.5) * Math.hypot(dx, dy) * 0.22;
    ctx.lineTo(x1 + dx * t + perpX * jitter, y1 + dy * t + perpY * jitter);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** AA Battery icon */
function drawBatteryIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);

  // Battery body
  ctx.fillStyle = "#1a2a1a";
  ctx.beginPath();
  ctx.roundRect(-10, -18, 20, 34, 3);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-10, -18, 20, 34, 3);
  ctx.stroke();

  // Positive terminal (top)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-4, -22, 8, 5, 2);
  ctx.fill();

  // Charge level (green fill from bottom)
  const now = Date.now() * 0.001;
  const chargeH = 22 + Math.sin(now * 2) * 3;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.roundRect(-7, 14 - chargeH, 14, chargeH, 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Lightning bolt symbol
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡", 0, 0);

  ctx.restore();
}

/** Berserker rage icon — skull with flames */
function drawBerserkerIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);

  const now = Date.now() * 0.003;

  // Flame background
  for (let i = 0; i < 5; i++) {
    const fa = ((i / 5) * Math.PI * 2) + now;
    const fr = 12 + Math.sin(now * 2 + i) * 4;
    const fx = Math.cos(fa) * fr;
    const fy = Math.sin(fa) * fr;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,60,0,0.7)" : "rgba(255,150,0,0.5)";
    ctx.beginPath();
    ctx.arc(fx, fy, 6 + Math.sin(now * 3 + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Skull body
  ctx.fillStyle = "#cc0022";
  ctx.beginPath();
  ctx.arc(0, -3, 13, 0, Math.PI * 2);
  ctx.fill();

  // Jaw
  ctx.fillStyle = "#aa0018";
  ctx.beginPath();
  ctx.ellipse(0, 8, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye sockets
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-5, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -4, 4, 0, Math.PI * 2);
  ctx.fill();

  // Glowing eyes
  ctx.fillStyle = "#ff0044";
  ctx.shadowColor = "#ff0044";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-5, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Teeth
  ctx.fillStyle = "#ffffff";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.rect(i * 3.2 - 1, 4, 2.5, 5);
    ctx.fill();
  }

  ctx.restore();
}

/** Lightning bolt pickup icon */
function drawLightningIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);

  const now = Date.now() * 0.004;
  const pulse = 0.7 + Math.sin(now) * 0.3;

  // Glow halo
  const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
  grd.addColorStop(0, "rgba(100,220,255,0.5)");
  grd.addColorStop(1, "rgba(30,100,200,0)");
  ctx.fillStyle = grd;
  ctx.globalAlpha = pulse;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Classic lightning bolt shape
  ctx.shadowColor = "#88eeff";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(4, -18);
  ctx.lineTo(-4, -2);
  ctx.lineTo(3, -2);
  ctx.lineTo(-5, 18);
  ctx.lineTo(7, 2);
  ctx.lineTo(-1, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#44ccff";
  ctx.globalAlpha = 0.7 * pulse;
  ctx.beginPath();
  ctx.moveTo(4, -18);
  ctx.lineTo(-4, -2);
  ctx.lineTo(3, -2);
  ctx.lineTo(-5, 18);
  ctx.lineTo(7, 2);
  ctx.lineTo(-1, 2);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── BUFF DROP ───────────────────────────────────────────────────────────────

function drawBuffDrop(ctx: CanvasRenderingContext2D, bd: {
  x: number; y: number; type: string; pulse: number
}) {
  const color = BUFF_COLORS[bd.type] || "#ffffff";
  const scale = 1 + Math.sin(bd.pulse) * 0.18;

  ctx.save();
  ctx.translate(bd.x, bd.y);
  ctx.scale(scale, scale);

  // Glow halo
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
  grd.addColorStop(0, color + "55");
  grd.addColorStop(1, color + "00");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 16;

  if (bd.type === "rapidFire") {
    drawBulletIcon(ctx, 0, 0, 10, 24, "#ffea00", "#ffff88");
  } else if (bd.type === "tripleShot") {
    drawBulletIcon(ctx, -10, 0, 7, 18, "#00e5ff", "#88ffff");
    drawBulletIcon(ctx,   0, 0, 7, 18, "#00e5ff", "#88ffff");
    drawBulletIcon(ctx,  10, 0, 7, 18, "#00e5ff", "#88ffff");
  } else if (bd.type === "quadShot") {
    drawBulletIcon(ctx, -9, -6, 6, 14, "#7c4dff", "#cc88ff");
    drawBulletIcon(ctx,  9, -6, 6, 14, "#7c4dff", "#cc88ff");
    drawBulletIcon(ctx, -9,  6, 6, 14, "#7c4dff", "#cc88ff");
    drawBulletIcon(ctx,  9,  6, 6, 14, "#7c4dff", "#cc88ff");
  } else if (bd.type === "bazookaMode") {
    drawRocketIcon(ctx, 0, 0, "#ff6d00", "#ffcc00");
  } else if (bd.type === "battery") {
    drawBatteryIcon(ctx, 0, 0, "#44ff88");
  } else if (bd.type === "berserker") {
    drawBerserkerIcon(ctx, 0, 0);
  } else if (bd.type === "lightningStrike") {
    drawLightningIcon(ctx, 0, 0);
  }

  ctx.restore();
}

/** Small bullet capsule: oval body + pointed tip */
function drawBulletIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  bodyColor: string,
  tipColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Casing body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.35, w, h * 0.75, w / 2);
  ctx.fill();

  // Pointed tip (triangle)
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.35);
  ctx.lineTo(w / 2, -h * 0.35);
  ctx.lineTo(0, -h * 0.55);
  ctx.closePath();
  ctx.fill();

  // Tip highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.moveTo(-w * 0.15, -h * 0.35);
  ctx.lineTo(w * 0.15, -h * 0.35);
  ctx.lineTo(0, -h * 0.52);
  ctx.closePath();
  ctx.fill();

  // Case rim line
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.1);
  ctx.lineTo(w / 2, -h * 0.1);
  ctx.stroke();

  ctx.restore();
}

/** Rocket/bazooka shell icon */
function drawRocketIcon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  bodyColor: string,
  finColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Body tube
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-8, -18, 16, 28, 4);
  ctx.fill();

  // Nose cone
  ctx.fillStyle = "#ff2200";
  ctx.beginPath();
  ctx.moveTo(-8, -18);
  ctx.lineTo(8, -18);
  ctx.lineTo(0, -32);
  ctx.closePath();
  ctx.fill();

  // Nose highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.moveTo(-3, -18);
  ctx.lineTo(3, -18);
  ctx.lineTo(0, -29);
  ctx.closePath();
  ctx.fill();

  // Exhaust nozzle
  ctx.fillStyle = "#333333";
  ctx.beginPath();
  ctx.roundRect(-6, 8, 12, 8, 2);
  ctx.fill();

  // Side fins
  ctx.fillStyle = finColor;
  // Left fin
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-16, 14);
  ctx.lineTo(-8, 14);
  ctx.closePath();
  ctx.fill();
  // Right fin
  ctx.beginPath();
  ctx.moveTo(8, 4);
  ctx.lineTo(16, 14);
  ctx.lineTo(8, 14);
  ctx.closePath();
  ctx.fill();

  // Yellow band stripe
  ctx.fillStyle = finColor;
  ctx.beginPath();
  ctx.roundRect(-8, -4, 16, 5, 1);
  ctx.fill();

  // Flame exhaust
  const now = Date.now() * 0.01;
  const fl = 6 + Math.sin(now) * 3;
  ctx.fillStyle = `rgba(255,${Math.floor(100 + Math.sin(now * 1.3) * 80)},0,0.85)`;
  ctx.beginPath();
  ctx.ellipse(0, 18 + fl / 2, 5, fl, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,100,0.6)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 2.5, fl * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

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
