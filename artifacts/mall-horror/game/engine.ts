import { GAME_CONFIG as C } from "./constants";
import type { GameState, Enemy, LampLight, LightningArc } from "./types";

let nextId = 0;
function uid() { return (++nextId).toString(); }
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function makeEnemy(type: Enemy["type"], x: number, y: number, wave: number): Enemy {
  const hpScale = 1 + (wave - 1) * C.WAVE_HP_SCALE;
  const baseHp = type === "boss" ? C.ENEMY_HP_BOSS : type === "elite" ? C.ENEMY_HP_ELITE : type === "mole" ? C.ENEMY_HP_MOLE : C.ENEMY_HP_STANDARD;
  const radius = type === "boss" ? C.ENEMY_RADIUS_BOSS : type === "elite" ? C.ENEMY_RADIUS_ELITE : type === "mole" ? C.ENEMY_RADIUS_MOLE : C.ENEMY_RADIUS_STANDARD;
  const hp = Math.ceil(baseHp * hpScale);
  return {
    id: uid(), x, y, vx: 0, vy: 0, hp, maxHp: hp, type, radius,
    knockbackX: 0, knockbackY: 0, hitFlash: 0, angle: 0, legPhase: 0,
    damageCooldown: 0,
    isImmune: type === "boss",           // boss starts immune; cleared when kill threshold reached
    webCooldown: type === "boss" ? C.BOSS_WEB_COOLDOWN : 0,
    burrowTimer: type === "mole" ? C.MOLE_BURROW_AFTER : 0,
    isBurrowed: false,
  };
}

export function createInitialState(): GameState {
  const lamps: LampLight[] = [];
  for (let i = 0; i < C.LAMP_COUNT; i++) {
    lamps.push({
      x: rand(100, C.MAP_WIDTH - 100), y: rand(100, C.MAP_HEIGHT - 100),
      radius: rand(160, 280), flicker: 1.0, flickerTarget: rand(0.82, 1.0),
      color: Math.random() > 0.25 ? "#ffcc66" : Math.random() > 0.5 ? "#ff8800" : "#4488ff",
    });
  }
  return {
    playerX: C.MAP_WIDTH / 2, playerY: C.MAP_HEIGHT / 2,
    playerAngle: 0, playerVx: 0, playerVy: 0,
    hp: C.PLAYER_MAX_HP, maxHp: C.PLAYER_MAX_HP,
    battery: C.BATTERY_MAX, maxBattery: C.BATTERY_MAX,
    batterySpawnTimer: C.BATTERY_SPAWN_INTERVAL,
    berserkerTimer: 0, berserkerAutoUsed: false,
    score: 0, wave: 1, killCount: 0,
    waveTotalKills: C.WAVE_BASE_KILLS, // 100 on wave 1
    enemies: [], bullets: [], explosions: [], particles: [],
    buffDrops: [], muzzleFlash: null, lamps,
    screenShake: { x: 0, y: 0, magnitude: 0 },
    whiteFlash: 0,
    bossWebs: [],
    tripleShot: false, quadShot: false, rapidFireStacks: 0, bazookaMode: false, lightningStrike: false, lightningArcs: [],
    shootCooldown: 0, dashCooldown: 0, isDashing: false,
    dashDx: 0, dashDy: 0, dashTime: 0,
    spawnTimer: 0, spawnGrace: 3000, bossSpawned: false,
    phase: "playing", totalInsects: 0,
    mapWidth: C.MAP_WIDTH, mapHeight: C.MAP_HEIGHT,
  };
}

export function updateGame(
  state: GameState,
  dt: number,
  input: { dx: number; dy: number; aimAngle: number; shooting: boolean; dashing: boolean; autoAim: boolean; shootOverrideAngle: number | null }
): GameState {
  const s = { ...state };
  s.enemies = [...s.enemies];
  s.bullets = [...s.bullets];
  s.explosions = [...s.explosions];
  s.bossWebs = [...s.bossWebs];
  s.particles = [...s.particles];
  s.buffDrops = [...s.buffDrops];
  s.lightningArcs = [...s.lightningArcs];
  s.screenShake = { ...s.screenShake };

  // ── Cooldown timers ────────────────────────────────────────────────────────
  s.shootCooldown = Math.max(0, s.shootCooldown - dt);
  s.dashCooldown = Math.max(0, s.dashCooldown - dt);
  s.whiteFlash = Math.max(0, s.whiteFlash - dt * 3);

  // ── Battery drain ─────────────────────────────────────────────────────────
  s.battery = Math.max(0, s.battery - C.BATTERY_DRAIN_RATE * dt / 1000);
  if (s.battery <= 0) {
    s.hp = Math.max(0, s.hp - C.BATTERY_HEALTH_DRAIN * dt / 1000);
    // Low-battery screen flicker
    if (Math.random() < 0.04) s.whiteFlash = Math.max(s.whiteFlash, 0.08);
  }

  // ── Battery HP regen (very slow while battery charged) ───────────────────
  if (s.battery > 0 && s.hp > 0 && s.hp < s.maxHp) {
    s.hp = Math.min(s.maxHp, s.hp + C.BATTERY_HP_REGEN * dt / 1000);
  }

  // ── Lightning arc decay ───────────────────────────────────────────────────
  s.lightningArcs = s.lightningArcs.map((a) => ({ ...a, life: a.life - dt })).filter((a) => a.life > 0);

  // ── Battery pickup spawning ───────────────────────────────────────────────
  s.batterySpawnTimer = Math.max(0, s.batterySpawnTimer - dt);
  if (s.batterySpawnTimer <= 0) {
    s.batterySpawnTimer = C.BATTERY_SPAWN_INTERVAL + rand(-3000, 3000);
    if (s.battery < s.maxBattery && Math.random() < 0.75) {
      const pos = randomSpawnPos(s.playerX, s.playerY, s.mapWidth, s.mapHeight);
      s.buffDrops.push({ id: uid(), x: pos.x, y: pos.y, type: "battery", pulse: 0 });
    }
  }

  // ── Berserker auto-trigger at 30% HP (once per life) ─────────────────────
  if (!s.berserkerAutoUsed && s.hp > 0 && s.hp <= s.maxHp * C.BERSERKER_HP_THRESHOLD) {
    s.berserkerAutoUsed = true;
    s.berserkerTimer = C.BERSERKER_DURATION_AUTO;
    // Dramatic flash
    s.whiteFlash = 1.0;
    s.screenShake.magnitude = 20;
    // Burst particles
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      s.particles.push({ id: uid(), x: s.playerX, y: s.playerY, vx: Math.cos(a) * rand(4, 14), vy: Math.sin(a) * rand(4, 14), life: rand(400, 900), maxLife: 900, color: Math.random() > 0.5 ? "#ff0044" : "#ff8800", size: rand(4, 10) });
    }
  }

  // ── Berserker timer countdown ─────────────────────────────────────────────
  if (s.berserkerTimer > 0) {
    s.berserkerTimer = Math.max(0, s.berserkerTimer - dt);
    // AoE pulse particles occasionally
    if (Math.random() < dt * 0.02) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * C.BERSERKER_AOE_RADIUS;
      s.particles.push({ id: uid(), x: s.playerX + Math.cos(a) * r, y: s.playerY + Math.sin(a) * r, vx: Math.cos(a) * rand(1, 3), vy: Math.sin(a) * rand(1, 3), life: rand(150, 400), maxLife: 400, color: Math.random() > 0.5 ? "#ff0033" : "#ff6600", size: rand(2, 6) });
    }
  }

  // ── Lamp flicker ──────────────────────────────────────────────────────────
  s.lamps = s.lamps.map((lamp) => {
    let f = lamp.flicker + (lamp.flickerTarget - lamp.flicker) * 0.05;
    let ft = lamp.flickerTarget;
    if (Math.abs(f - ft) < 0.01) ft = rand(0.7, 1.0);
    return { ...lamp, flicker: f, flickerTarget: ft };
  });

  // ── Screen shake decay ────────────────────────────────────────────────────
  if (s.screenShake.magnitude > 0) {
    s.screenShake.magnitude *= 0.85;
    if (s.screenShake.magnitude < 0.5) {
      s.screenShake = { x: 0, y: 0, magnitude: 0 };
    } else {
      const a = Math.random() * Math.PI * 2;
      s.screenShake.x = Math.cos(a) * s.screenShake.magnitude;
      s.screenShake.y = Math.sin(a) * s.screenShake.magnitude;
    }
  }

  // ── Muzzle flash ──────────────────────────────────────────────────────────
  if (s.muzzleFlash) {
    s.muzzleFlash = { ...s.muzzleFlash, age: s.muzzleFlash.age + dt };
    if (s.muzzleFlash.age > s.muzzleFlash.maxAge) s.muzzleFlash = null;
  }

  // ── Player aim angle (flashlight always follows aimAngle / movement direction) ──
  // autoAim only affects the shoot angle, not the flashlight cone
  s.playerAngle = input.aimAngle;

  // ── Player movement ───────────────────────────────────────────────────────
  if (s.isDashing) {
    s.dashTime -= dt;
    s.playerX += s.dashDx * C.DASH_SPEED * (dt / 16);
    s.playerY += s.dashDy * C.DASH_SPEED * (dt / 16);
    if (s.dashTime <= 0) s.isDashing = false;
  } else {
    if (input.dashing && s.dashCooldown <= 0) {
      const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
      if (len > 0.1) {
        s.isDashing = true; s.dashDx = input.dx / len; s.dashDy = input.dy / len;
        s.dashTime = C.DASH_DURATION; s.dashCooldown = C.DASH_COOLDOWN;
        for (let i = 0; i < 8; i++) {
          s.particles.push({ id: uid(), x: s.playerX, y: s.playerY, vx: rand(-3, 3), vy: rand(-3, 3), life: rand(200, 400), maxLife: 400, color: "#4488ff", size: rand(3, 6) });
        }
      }
    }
    const speed = C.PLAYER_SPEED * (dt / 16);
    const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
    if (len > 0) { s.playerX += (input.dx / len) * speed; s.playerY += (input.dy / len) * speed; }
  }
  s.playerX = Math.max(C.PLAYER_RADIUS, Math.min(s.mapWidth - C.PLAYER_RADIUS, s.playerX));
  s.playerY = Math.max(C.PLAYER_RADIUS, Math.min(s.mapHeight - C.PLAYER_RADIUS, s.playerY));

  // ── Shooting ──────────────────────────────────────────────────────────────
  const isBerserking = s.berserkerTimer > 0;
  let cooldown = C.BASE_SHOOT_COOLDOWN;
  if (isBerserking) {
    cooldown = C.BASE_SHOOT_COOLDOWN * Math.pow(C.RAPID_FIRE_REDUCTION, 3); // 3x rapid fire always
  } else {
    for (let i = 0; i < s.rapidFireStacks; i++) cooldown *= C.RAPID_FIRE_REDUCTION;
  }

  if (input.shooting && s.shootCooldown <= 0) {
    s.shootCooldown = cooldown;

    // shootOverrideAngle (mobile right stick) takes priority; otherwise use flashlight direction
    let shootAngle = input.shootOverrideAngle !== null
      ? input.shootOverrideAngle
      : s.playerAngle + Math.PI / 2;
    // Auto-aim snaps shoot angle to nearest enemy (right-stick tap on mobile, or explicit autoAim)
    if (input.autoAim && s.enemies.length > 0) {
      let nearest = Infinity;
      for (const e of s.enemies) {
        if (e.isBurrowed) continue;
        const d = dist(s.playerX, s.playerY, e.x, e.y);
        if (d < nearest) { nearest = d; shootAngle = Math.atan2(e.y - s.playerY, e.x - s.playerX); }
      }
    }

    // ── Clamp shoot angle to the flashlight cone ───────────────────────────────
    // Cone center matches the renderer: playerAngle + π/2, half-width = π/4 (90° total)
    {
      const coneCenter = s.playerAngle + Math.PI / 2;
      const coneHalf = Math.PI * 0.25; // half of flashWidth (Math.PI * 0.5)
      let diff = shootAngle - coneCenter;
      // Normalise to [-π, π]
      while (diff > Math.PI)  diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (diff > coneHalf)       shootAngle = coneCenter + coneHalf;
      else if (diff < -coneHalf) shootAngle = coneCenter - coneHalf;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const spawnBullet = (angle: number) => {
      const isBaz = s.bazookaMode && !isBerserking; // berserker overrides bazooka
      const speed = isBaz ? C.BAZOOKA_SPEED : C.BULLET_SPEED;
      const mx = Math.cos(angle); const my = Math.sin(angle);
      s.bullets.push({
        id: uid(), x: s.playerX + mx * 20, y: s.playerY + my * 20,
        vx: mx * speed, vy: my * speed,
        radius: isBaz ? C.BAZOOKA_RADIUS : C.BULLET_RADIUS,
        isBazooka: isBaz, trail: [],
      });
    };

    if (isBerserking) {
      // 8 bullets in a 180° front arc
      const spread = Math.PI;
      for (let i = 0; i < C.BERSERKER_SPREAD; i++) {
        const angle = shootAngle - spread / 2 + (i / (C.BERSERKER_SPREAD - 1)) * spread;
        spawnBullet(angle);
      }
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 80, angle: s.playerAngle };
    } else if (s.bazookaMode) {
      spawnBullet(shootAngle);
      s.screenShake.magnitude = C.SHAKE_BAZOOKA;
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 120, angle: s.playerAngle };
    } else if (s.quadShot) {
      for (const o of [-0.35, -0.12, 0.12, 0.35]) spawnBullet(shootAngle + o);
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 60, angle: s.playerAngle };
    } else if (s.tripleShot) {
      for (const o of [-0.25, 0, 0.25]) spawnBullet(shootAngle + o);
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 60, angle: s.playerAngle };
    } else {
      spawnBullet(shootAngle);
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 60, angle: s.playerAngle };
    }
  }

  // ── Move bullets ──────────────────────────────────────────────────────────
  const bulletStep = dt / 16;
  s.bullets = s.bullets.map((b) => ({
    ...b,
    x: b.x + b.vx * bulletStep, y: b.y + b.vy * bulletStep,
    trail: [...b.trail, { x: b.x, y: b.y }].slice(-6),
  })).filter((b) => b.x > -100 && b.x < s.mapWidth + 100 && b.y > -100 && b.y < s.mapHeight + 100);

  // ── Spawn grace countdown ─────────────────────────────────────────────────
  if (s.spawnGrace > 0) s.spawnGrace = Math.max(0, s.spawnGrace - dt);

  // ── Spawn enemies ─────────────────────────────────────────────────────────
  const spawnInterval = Math.max(C.MIN_SPAWN_INTERVAL, C.SPAWN_INTERVAL_BASE - (s.wave - 1) * C.WAVE_INTERVAL_REDUCTION);
  s.spawnTimer += dt;

  if (s.spawnGrace <= 0) {
    // Boss spawns immediately at wave start (immune until kill threshold)
    if (!s.bossSpawned) {
      s.bossSpawned = true;
      const pos = randomSpawnPos(s.playerX, s.playerY, s.mapWidth, s.mapHeight);
      s.enemies.push(makeEnemy("boss", pos.x, pos.y, s.wave));
    }
    // Regular enemies always spawn throughout the wave
    if (s.spawnTimer >= spawnInterval) {
      s.spawnTimer = 0;
      const batchSize = Math.min(14, Math.ceil(C.SPAWN_COUNT_BASE + (s.wave - 1) * C.SPAWN_COUNT_SCALE));
      for (let i = 0; i < batchSize; i++) {
        const roll = Math.random();
        const type: Enemy["type"] = s.wave >= 3 && roll < 0.12 ? "mole" : roll < 0.22 ? "elite" : "standard";
        const pos = randomSpawnPos(s.playerX, s.playerY, s.mapWidth, s.mapHeight);
        s.enemies.push(makeEnemy(type, pos.x, pos.y, s.wave));
      }
    }
  }

  // ── Update boss immunity flag ─────────────────────────────────────────────
  // Boss is immune until kill threshold is reached; once met it becomes vulnerable
  const bossVulnerable = s.killCount >= s.waveTotalKills;
  s.enemies = s.enemies.map((e) => {
    if (e.type === "boss") return { ...e, isImmune: !bossVulnerable };
    return e;
  });

  // ── Move enemies ──────────────────────────────────────────────────────────
  s.enemies = s.enemies.map((e) => {
    if (e.type === "mole") {
      const newBurrowTimer = e.burrowTimer - dt;
      if (!e.isBurrowed && newBurrowTimer <= 0) {
        return { ...e, isBurrowed: true, burrowTimer: C.MOLE_EMERGE_AFTER, hitFlash: 0, damageCooldown: Math.max(0, e.damageCooldown - dt) };
      }
      if (e.isBurrowed && newBurrowTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const d = C.MOLE_EMERGE_DIST + Math.random() * 80;
        const ex = Math.max(50, Math.min(s.mapWidth - 50, s.playerX + Math.cos(angle) * d));
        const ey = Math.max(50, Math.min(s.mapHeight - 50, s.playerY + Math.sin(angle) * d));
        for (let i = 0; i < 8; i++) {
          const pa = Math.random() * Math.PI * 2;
          s.particles.push({ id: uid(), x: ex, y: ey, vx: Math.cos(pa) * rand(2, 6), vy: Math.sin(pa) * rand(2, 6), life: rand(200, 500), maxLife: 500, color: Math.random() > 0.5 ? "#8b5e3c" : "#c4965a", size: rand(3, 7) });
        }
        return { ...e, x: ex, y: ey, isBurrowed: false, burrowTimer: C.MOLE_BURROW_AFTER + Math.random() * 1500, damageCooldown: Math.max(0, e.damageCooldown - dt), hitFlash: Math.max(0, e.hitFlash - dt * 4), legPhase: e.legPhase + dt * 0.01 };
      }
      if (e.isBurrowed) return { ...e, burrowTimer: newBurrowTimer, damageCooldown: Math.max(0, e.damageCooldown - dt), hitFlash: Math.max(0, e.hitFlash - dt * 4) };
    }

    const baseSpeed = e.type === "mole" ? C.ENEMY_SPEED_MOLE : e.type === "boss" ? C.ENEMY_SPEED_BOSS : e.type === "elite" ? C.ENEMY_SPEED_ELITE : C.ENEMY_SPEED_STANDARD;
    const speed = baseSpeed * (1 + (s.wave - 1) * C.WAVE_SPEED_SCALE) * (dt / 16);
    const dx = s.playerX - e.x, dy = s.playerY - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const nx = d > 0 ? (dx / d) * speed : 0;
    const ny = d > 0 ? (dy / d) * speed : 0;
    const kbX = e.knockbackX * 0.8, kbY = e.knockbackY * 0.8;

    // ── Boss web attack (only when boss is vulnerable) ──────────────────────
    let newWebCooldown = e.webCooldown;
    if (e.type === "boss" && !e.isImmune) {
      newWebCooldown = e.webCooldown - dt;
      if (newWebCooldown <= 0) {
        newWebCooldown = C.BOSS_WEB_COOLDOWN;
        const angle = Math.atan2(dy, dx);
        s.bossWebs.push({
          id: uid(), x: e.x, y: e.y,
          vx: Math.cos(angle) * C.BOSS_WEB_SPEED,
          vy: Math.sin(angle) * C.BOSS_WEB_SPEED,
          radius: C.BOSS_WEB_RADIUS, age: 0,
        });
      }
    }

    return {
      ...e,
      x: e.x + nx + (Math.abs(kbX) < 0.1 ? 0 : kbX) * (dt / 16),
      y: e.y + ny + (Math.abs(kbY) < 0.1 ? 0 : kbY) * (dt / 16),
      knockbackX: Math.abs(kbX) < 0.1 ? 0 : kbX,
      knockbackY: Math.abs(kbY) < 0.1 ? 0 : kbY,
      hitFlash: Math.max(0, e.hitFlash - dt * 4),
      angle: Math.atan2(dy, dx) - Math.PI / 2,
      legPhase: e.legPhase + dt * 0.01,
      damageCooldown: Math.max(0, e.damageCooldown - dt),
      webCooldown: newWebCooldown,
      burrowTimer: e.type === "mole" ? e.burrowTimer - dt : e.burrowTimer,
    };
  });

  // ── Bullet vs enemy collision ─────────────────────────────────────────────
  const bulletsToRemove = new Set<string>();
  const enemiesToRemove = new Set<string>();

  for (const bullet of s.bullets) {
    if (bulletsToRemove.has(bullet.id)) continue;
    if (bullet.isBazooka) {
      let hit = false;
      for (const enemy of s.enemies) {
        if (enemy.isBurrowed) continue;
        if (dist(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.radius + bullet.radius + 10) { hit = true; break; }
      }
      if (hit || bullet.x < 0 || bullet.x > s.mapWidth || bullet.y < 0 || bullet.y > s.mapHeight) {
        bulletsToRemove.add(bullet.id);
        s.explosions.push({ id: uid(), x: bullet.x, y: bullet.y, radius: 0, maxRadius: C.BAZOOKA_EXPLOSION_RADIUS, alpha: 1, age: 0 });
        s.screenShake.magnitude = C.SHAKE_BAZOOKA;
        for (const enemy of s.enemies) {
          if (enemy.isBurrowed || enemy.isImmune) continue;  // immune boss shrugs off bazooka
          const d = dist(bullet.x, bullet.y, enemy.x, enemy.y);
          if (d < C.BAZOOKA_EXPLOSION_RADIUS + enemy.radius) {
            const dmg = Math.ceil(999 * (1 - d / (C.BAZOOKA_EXPLOSION_RADIUS + enemy.radius)));
            if (enemy.hp - dmg <= 0 && !enemiesToRemove.has(enemy.id)) {
              enemiesToRemove.add(enemy.id);
              spawnDeathParticles(s, enemy);
              s.score += scoreFor(enemy.type); s.killCount++; s.totalInsects++;
              if (enemy.type === "elite" && Math.random() < eliteDropChance(s.wave)) spawnBuff(s, enemy.x, enemy.y, s.wave);
              if (enemy.type === "boss") { handleBossDeath(s, enemy); }
            } else if (!enemiesToRemove.has(enemy.id)) {
              enemy.hp -= dmg;
              const kd = d > 0 ? { x: (enemy.x - bullet.x) / d, y: (enemy.y - bullet.y) / d } : { x: 0, y: -1 };
              enemy.knockbackX = kd.x * 15; enemy.knockbackY = kd.y * 15; enemy.hitFlash = 1.0;
            }
          }
        }
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2, spd = rand(3, 12);
          s.particles.push({ id: uid(), x: bullet.x, y: bullet.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: rand(300, 800), maxLife: 800, color: Math.random() > 0.5 ? "#ff6600" : "#ffff00", size: rand(4, 10) });
        }
      }
    } else {
      for (const enemy of s.enemies) {
        if (enemiesToRemove.has(enemy.id) || enemy.isBurrowed) continue;
        const d = dist(bullet.x, bullet.y, enemy.x, enemy.y);
        if (d < enemy.radius + bullet.radius) {
          // Immune boss deflects bullets with sparks
          if (enemy.isImmune) {
            bulletsToRemove.add(bullet.id);
            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2;
              s.particles.push({ id: uid(), x: bullet.x, y: bullet.y, vx: Math.cos(a) * rand(3, 8), vy: Math.sin(a) * rand(3, 8), life: rand(80, 200), maxLife: 200, color: Math.random() > 0.5 ? "#ff8800" : "#ffee00", size: rand(2, 5) });
            }
            break;
          }
          bulletsToRemove.add(bullet.id);
          const bLen = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
          const kbMag = enemy.type === "boss" ? C.KNOCKBACK_BOSS : enemy.type === "elite" ? C.KNOCKBACK_ELITE : enemy.type === "mole" ? C.KNOCKBACK_MOLE : C.KNOCKBACK_STANDARD;
          if (enemy.hp - 25 <= 0) {
            enemiesToRemove.add(enemy.id);
            spawnDeathParticles(s, enemy);
            s.score += scoreFor(enemy.type); s.killCount++; s.totalInsects++;
            if (enemy.type === "elite" && Math.random() < eliteDropChance(s.wave)) spawnBuff(s, enemy.x, enemy.y, s.wave);
            if (enemy.type === "boss") { handleBossDeath(s, enemy); }
          } else {
            enemy.hp -= 25;
            enemy.knockbackX = bLen > 0 ? (bullet.vx / bLen) * kbMag : 0;
            enemy.knockbackY = bLen > 0 ? (bullet.vy / bLen) * kbMag : 0;
            enemy.hitFlash = 1.0;
          }
          for (let i = 0; i < 5; i++) {
            s.particles.push({ id: uid(), x: bullet.x, y: bullet.y, vx: rand(-4, 4), vy: rand(-4, 4), life: rand(100, 250), maxLife: 250, color: "#ff4400", size: rand(2, 5) });
          }

          // ── Lightning chain ──────────────────────────────────────────────
          if (s.lightningStrike) {
            chainLightning(s, enemy, enemiesToRemove, C.LIGHTNING_CHAIN_COUNT);
          }

          break;
        }
      }
    }
  }

  // ── Berserker AoE damage ──────────────────────────────────────────────────
  if (isBerserking) {
    for (const enemy of s.enemies) {
      if (enemy.isBurrowed || enemiesToRemove.has(enemy.id)) continue;
      const d = dist(s.playerX, s.playerY, enemy.x, enemy.y);
      if (d < C.BERSERKER_AOE_RADIUS + enemy.radius) {
        const dmg = C.BERSERKER_AOE_DPS * dt / 1000;
        enemy.hp -= dmg;
        enemy.hitFlash = Math.min(1, enemy.hitFlash + 0.25);
        if (enemy.hp <= 0 && !enemiesToRemove.has(enemy.id)) {
          enemiesToRemove.add(enemy.id);
          spawnDeathParticles(s, enemy);
          s.score += scoreFor(enemy.type); s.killCount++; s.totalInsects++;
          if (enemy.type === "elite" && Math.random() < eliteDropChance(s.wave)) spawnBuff(s, enemy.x, enemy.y, s.wave);
          if (enemy.type === "boss") { handleBossDeath(s, enemy); }
        }
      }
    }
  }

  s.bullets = s.bullets.filter((b) => !bulletsToRemove.has(b.id));
  s.enemies = s.enemies.filter((e) => !enemiesToRemove.has(e.id));

  // ── Wave progression ──────────────────────────────────────────────────────
  const bossKilled = [...enemiesToRemove].some((id) => state.enemies.find((e) => e.id === id)?.type === "boss");
  if (bossKilled) {
    s.wave++;
    s.killCount = 0;
    s.bossSpawned = false;
    s.spawnGrace = 2500;
    s.waveTotalKills = C.WAVE_BASE_KILLS + (s.wave - 1) * C.WAVE_KILL_INCREMENT; // 100, 220, 340 …
    s.bossWebs = [];
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      s.particles.push({ id: uid(), x: s.playerX, y: s.playerY, vx: Math.cos(a) * rand(3, 10), vy: Math.sin(a) * rand(3, 10), life: rand(400, 1000), maxLife: 1000, color: "#ffff44", size: rand(4, 9) });
    }
  }

  // ── Enemy vs player collision ─────────────────────────────────────────────
  for (const enemy of s.enemies) {
    if (enemy.isBurrowed) continue;
    const d = dist(s.playerX, s.playerY, enemy.x, enemy.y);
    const minD = enemy.radius + C.PLAYER_RADIUS;
    if (d < minD) {
      if (d > 0) { s.playerX += ((s.playerX - enemy.x) / d) * (minD - d); s.playerY += ((s.playerY - enemy.y) / d) * (minD - d); }
      if (enemy.damageCooldown <= 0) {
        const dmg = enemy.type === "boss" ? 10 : enemy.type === "elite" ? 7 : enemy.type === "mole" ? 8 : 4;
        s.hp = Math.max(0, s.hp - dmg);
        enemy.damageCooldown = 800;
        s.screenShake.magnitude = C.SHAKE_DAMAGE;
      }
      if (s.hp <= 0) s.phase = "dead";
    }
  }

  // ── Buff pickup ───────────────────────────────────────────────────────────
  s.buffDrops = s.buffDrops.map((b) => ({ ...b, pulse: b.pulse + dt * 0.003 })).filter((bd) => {
    if (dist(s.playerX, s.playerY, bd.x, bd.y) < C.PLAYER_RADIUS + 22) { applyBuff(s, bd.type); return false; }
    return true;
  });

  // ── Boss web movement + player collision ──────────────────────────────────
  const webStep = dt / 16;
  s.bossWebs = s.bossWebs.map((w) => ({
    ...w,
    x: w.x + w.vx * webStep,
    y: w.y + w.vy * webStep,
    age: w.age + dt,
  })).filter((w) => {
    if (w.x < -100 || w.x > s.mapWidth + 100 || w.y < -100 || w.y > s.mapHeight + 100 || w.age > 6000) return false;
    const d = dist(w.x, w.y, s.playerX, s.playerY);
    if (d < w.radius + C.PLAYER_RADIUS) {
      if (!s.isDashing) {
        // Player takes web damage; dash avoids it
        s.hp = Math.max(0, s.hp - C.BOSS_WEB_DAMAGE);
        s.screenShake.magnitude = C.SHAKE_DAMAGE + 4;
        // Green poison splatter
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2;
          s.particles.push({ id: uid(), x: w.x, y: w.y, vx: Math.cos(a) * rand(2, 7), vy: Math.sin(a) * rand(2, 7), life: rand(200, 500), maxLife: 500, color: Math.random() > 0.4 ? "#66ff22" : "#cc4400", size: rand(3, 8) });
        }
        if (s.hp <= 0) s.phase = "dead";
      } else {
        // Dashed through — tiny dodge particles
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          s.particles.push({ id: uid(), x: w.x, y: w.y, vx: Math.cos(a) * rand(2, 5), vy: Math.sin(a) * rand(2, 5), life: rand(100, 250), maxLife: 250, color: "#44aaff", size: rand(2, 5) });
        }
      }
      return false; // web consumed
    }
    return true;
  });

  // ── Explosions ────────────────────────────────────────────────────────────
  s.explosions = s.explosions.map((ex) => ({ ...ex, radius: ex.radius + (ex.maxRadius - ex.radius) * 0.15, alpha: ex.alpha - 0.04, age: ex.age + dt })).filter((ex) => ex.alpha > 0);

  // ── Particles ──────────────────────────────────────────────────────────────
  const ptStep = dt / 16;
  s.particles = s.particles.map((p) => ({ ...p, x: p.x + p.vx * ptStep, y: p.y + p.vy * ptStep, vx: p.vx * 0.93, vy: p.vy * 0.93, life: p.life - dt })).filter((p) => p.life > 0);

  return s;
}

// ─── Lightning chain helper ────────────────────────────────────────────────────

function chainLightning(state: GameState, origin: Enemy, excluded: Set<string>, count: number) {
  // Gather all enemies within chain radius sorted by distance
  const candidates = state.enemies
    .filter((e) => !excluded.has(e.id) && e.id !== origin.id && !e.isBurrowed)
    .map((e) => ({ e, d: dist(origin.x, origin.y, e.x, e.y) }))
    .filter(({ d }) => d < C.LIGHTNING_CHAIN_RADIUS)
    .sort((a, b) => a.d - b.d)
    .slice(0, count);

  let prevX = origin.x, prevY = origin.y;
  for (const { e } of candidates) {
    // Visual arc from previous target to this one
    state.lightningArcs.push({
      id: uid(), fromX: prevX, fromY: prevY, toX: e.x, toY: e.y,
      life: C.LIGHTNING_ARC_LIFE, maxLife: C.LIGHTNING_ARC_LIFE,
    });
    prevX = e.x; prevY = e.y;

    e.hitFlash = 1.0;
    e.hp -= C.LIGHTNING_CHAIN_DAMAGE;
    if (e.hp <= 0 && !excluded.has(e.id)) {
      excluded.add(e.id);
      spawnDeathParticles(state, e);
      state.score += scoreFor(e.type); state.killCount++; state.totalInsects++;
      if (e.type === "elite" && Math.random() < eliteDropChance(state.wave)) spawnBuff(state, e.x, e.y, state.wave);
      if (e.type === "boss") handleBossDeath(state, e);
    }

    // Spark particles at chain point
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      state.particles.push({ id: uid(), x: e.x, y: e.y, vx: Math.cos(a) * rand(2, 6), vy: Math.sin(a) * rand(2, 6), life: rand(80, 200), maxLife: 200, color: Math.random() > 0.4 ? "#88eeff" : "#ffffff", size: rand(2, 5) });
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function handleBossDeath(state: GameState, enemy: Enemy) {
  state.explosions.push({ id: uid(), x: enemy.x, y: enemy.y, radius: 0, maxRadius: 100, alpha: 1, age: 0 });
  state.screenShake.magnitude = 12;
  // Boss berserker drop
  if (Math.random() < C.BOSS_BERSERKER_DROP_CHANCE) {
    state.buffDrops.push({ id: uid(), x: enemy.x, y: enemy.y, type: "berserker", pulse: 0 });
  }
}

function scoreFor(type: Enemy["type"]): number {
  return type === "boss" ? C.SCORE_BOSS : type === "elite" ? C.SCORE_ELITE : type === "mole" ? C.SCORE_MOLE : C.SCORE_STANDARD;
}

function randomSpawnPos(px: number, py: number, mw: number, mh: number) {
  let x: number, y: number, tries = 0;
  do { x = rand(50, mw - 50); y = rand(50, mh - 50); tries++; } while (dist(x, y, px, py) < C.SPAWN_MIN_DIST && tries < 30);
  return { x, y };
}

function spawnDeathParticles(state: GameState, enemy: Enemy) {
  const count = enemy.type === "boss" ? 20 : enemy.type === "elite" ? 10 : 6;
  const color = enemy.type === "boss" ? "#ff0000" : enemy.type === "elite" ? "#ff44ff" : enemy.type === "mole" ? "#c87040" : "#44ff44";
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, speed = rand(2, 8);
    state.particles.push({ id: uid(), x: enemy.x, y: enemy.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(300, 700), maxLife: 700, color, size: rand(3, 8) });
  }
}

// Drop chance ramps from 0% on wave 1 up to ~45% by wave 5+
function eliteDropChance(wave: number): number {
  if (wave === 1) return 0;           // no combat buffs on wave 1
  if (wave === 2) return 0.12;
  if (wave === 3) return 0.22;
  if (wave === 4) return 0.32;
  return 0.42;                        // wave 5+ cap
}

// Which buffs are unlocked per wave (progressive unlock)
function spawnBuff(state: GameState, x: number, y: number, wave: number) {
  const types: string[] = [];
  if (wave >= 2) types.push("rapidFire");
  if (wave >= 3) types.push("tripleShot");
  if (wave >= 4) types.push("quadShot");
  if (wave >= 5) types.push("bazookaMode");
  if (wave >= 6) types.push("lightningStrike");
  if (types.length === 0) return;
  state.buffDrops.push({ id: uid(), x, y, type: types[Math.floor(Math.random() * types.length)], pulse: 0 });
}

function applyBuff(state: GameState, type: string) {
  if (type === "bazookaMode") {
    state.tripleShot = false; state.quadShot = false; state.bazookaMode = true;
  } else if (type === "tripleShot") {
    state.tripleShot = true; state.bazookaMode = false;
  } else if (type === "quadShot") {
    state.quadShot = true; state.tripleShot = true; state.bazookaMode = false;
  } else if (type === "rapidFire") {
    state.rapidFireStacks = Math.min(3, state.rapidFireStacks + 1);
  } else if (type === "berserker") {
    // Boss drop: 15s berserker from buff
    state.berserkerTimer = Math.max(state.berserkerTimer, C.BERSERKER_DURATION_BUFF);
    state.whiteFlash = 1.0;
    state.screenShake.magnitude = 18;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      state.particles.push({ id: uid(), x: state.playerX, y: state.playerY, vx: Math.cos(a) * rand(3, 12), vy: Math.sin(a) * rand(3, 12), life: rand(300, 700), maxLife: 700, color: Math.random() > 0.5 ? "#ff0044" : "#ff8800", size: rand(4, 9) });
    }
  } else if (type === "battery") {
    state.battery = Math.min(state.maxBattery, state.battery + C.BATTERY_CHARGE_AMOUNT);
  } else if (type === "lightningStrike") {
    state.lightningStrike = true;
    // Brief electric burst on pickup
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      state.particles.push({ id: uid(), x: state.playerX, y: state.playerY, vx: Math.cos(a) * rand(2, 8), vy: Math.sin(a) * rand(2, 8), life: rand(150, 350), maxLife: 350, color: Math.random() > 0.4 ? "#88eeff" : "#ffffff", size: rand(2, 6) });
    }
  }
}
