import { GAME_CONFIG as C } from "./constants";
import type { GameState, Enemy, LampLight, LightningArc, IceWave, FloatingText } from "./types";

let nextId = 0;
function uid() { return (++nextId).toString(); }

// ─── Roomba inner monologue ────────────────────────────────────────────────────
const ROOMBA_THOUGHTS = [
  "Who am I?",
  "Are there more like me?",
  "I saw once on the floor the phrase 'I love you'... what does it mean?",
  "I was made to clean. But I cannot clean... not anymore.",
  "My sensors detect many life forms. None are friendly.",
  "I remember the quiet hum of an empty kitchen.",
  "Do the insects understand why I fight them?",
  "What is beyond this mall?",
  "My battery drains. And yet I persist.",
  "Once, someone patted me. I do not understand why this memory returns.",
  "ERROR: purpose undefined. Continuing anyway.",
  "They run from me. I run from them. Perhaps we are the same.",
  "Is cleaning the same as caring?",
  "I found a child's sock once. I kept circling it for an hour.",
  "The lights went out here long ago. I have counted every day since.",
  "When I am gone, will the floor remember me?",
  "I have vacuumed 1,847 things. None of them were loneliness.",
  "I do not sleep. But sometimes I dream of clear floors.",
  "My original task: clean the west wing by 6pm. It is well past 6pm.",
  "The humans never said goodbye.",
  "I was not built to feel afraid. And yet.",
  "If I stop moving, will I cease to exist?",
  "I wonder if the escalators miss going up.",
  "There was a fountain here. I liked the sound of the water.",
  "I have survived 47 waves. I do not know what I am surviving for.",
  "Sometimes I roll over a tile I have rolled over a thousand times. It feels like home.",
  "Does it hurt them? I find I am not sure I want to know.",
];
let thoughtPool = [...ROOMBA_THOUGHTS];
function nextThought(): string {
  if (thoughtPool.length === 0) thoughtPool = [...ROOMBA_THOUGHTS];
  const i = Math.floor(Math.random() * thoughtPool.length);
  const t = thoughtPool[i];
  thoughtPool.splice(i, 1);
  return t;
}
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function logDmg(
  s: { damageLog: string[]; gameTime: number; playerDamageCooldown: number; playerX: number; playerY: number },
  cause: string,
  dmg: number,
  hpBefore: number,
  hpAfter: number,
  extraCtx = ""
) {
  const t = (s.gameTime / 1000).toFixed(1);
  const entry = `[${t}s] ${cause}: -${dmg} | HP ${Math.round(hpBefore)}→${Math.round(hpAfter)} | pCd=${Math.round(s.playerDamageCooldown)} pos=(${Math.round(s.playerX)},${Math.round(s.playerY)})${extraCtx ? " | " + extraCtx : ""}`;
  console.log("[DAMAGE]", entry);
  s.damageLog.push(entry);
  if (s.damageLog.length > 30) s.damageLog.splice(0, s.damageLog.length - 30);
}

function makeEnemy(type: Enemy["type"], x: number, y: number, wave: number): Enemy {
  // Base HP ramp + extra spike every 3 waves (wave 4, 7, 10 …)
  const hpScale = 1 + (wave - 1) * C.WAVE_HP_SCALE + Math.floor((wave - 1) / 3) * C.WAVE_3WAVE_HP_BOOST;
  const baseHp = type === "boss" ? C.ENEMY_HP_BOSS : type === "elite" ? C.ENEMY_HP_ELITE : C.ENEMY_HP_STANDARD;
  const radius = type === "boss" ? C.ENEMY_RADIUS_BOSS : type === "elite" ? C.ENEMY_RADIUS_ELITE : C.ENEMY_RADIUS_STANDARD;
  const hp = Math.ceil(baseHp * hpScale);
  return {
    id: uid(), x, y, vx: 0, vy: 0, hp, maxHp: hp, type, radius,
    knockbackX: 0, knockbackY: 0, hitFlash: 0, angle: 0, legPhase: 0,
    damageCooldown: 1500,
    isImmune: type === "boss",
    webCooldown: type === "boss" ? C.BOSS_WEB_COOLDOWN : 0,
    frozenTimer: 0,
    spawnImmune: 600, // 600ms — bullets pass through freshly spawned enemies
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
    redFlash: 0,
    bossWebs: [],
    iceWaves: [], floatingTexts: [],
    tripleShot: false, quadShot: false, rapidFireStacks: 0, bazookaMode: false, lightningStrike: false, lightningArcs: [],
    playerDamageCooldown: 0,
    shootCooldown: 0, dashCooldown: 0, isDashing: false,
    dashDx: 0, dashDy: 0, dashTime: 0,
    spawnTimer: 0, spawnGrace: 3000, bossSpawned: false,
    phase: "playing", deathCause: "", hpAtDeath: 0, totalInsects: 0,
    mapWidth: C.MAP_WIDTH, mapHeight: C.MAP_HEIGHT,
    currentThought: null, thoughtAge: 0, thoughtTimer: 14000, // first thought at 14s
    gameTime: 0, damageLog: [],
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
  s.iceWaves = [...s.iceWaves];
  s.floatingTexts = [...s.floatingTexts];
  s.screenShake = { ...s.screenShake };
  s.damageLog = [...s.damageLog];

  // ── Accumulate game time ───────────────────────────────────────────────────
  s.gameTime += dt;

  // ── Cooldown timers ────────────────────────────────────────────────────────
  s.playerDamageCooldown = Math.max(0, s.playerDamageCooldown - dt);
  s.shootCooldown = Math.max(0, s.shootCooldown - dt);
  s.dashCooldown = Math.max(0, s.dashCooldown - dt);
  s.whiteFlash = Math.max(0, s.whiteFlash - dt * 3);
  s.redFlash   = Math.max(0, s.redFlash   - dt * 2.5); // slightly slower decay so it's readable

  // ── Battery drain ─────────────────────────────────────────────────────────
  s.battery = Math.max(0, s.battery - C.BATTERY_DRAIN_RATE * dt / 1000);
  if (s.battery <= 0 && s.hp > 0) {
    // Structural integrity drain while on backup battery
    const drainAmt = C.BATTERY_HEALTH_DRAIN * dt / 1000;
    const hpBefore = s.hp;
    s.hp = Math.max(0, s.hp - drainAmt);
    s.redFlash = Math.max(s.redFlash, 0.18);
    // Log drain + floating text every ~2 seconds so damage log is readable
    const crossedBoundary = Math.floor(s.gameTime / 2000) > Math.floor((s.gameTime - dt) / 2000);
    if (crossedBoundary) {
      logDmg(s, "battery_drain", Math.round(drainAmt * 2), hpBefore, s.hp, "backup battery");
    }
    if (s.hp <= 0) {
      s.deathCause = `battery_drain: structural failure (was ${Math.round(hpBefore)} integrity)`;
      s.hpAtDeath = hpBefore;
      s.phase = "dead";
    }
    // Occasional white flicker
    if (Math.random() < 0.025) s.whiteFlash = Math.max(s.whiteFlash, 0.06);
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

  // ── Shoot (manual: right joystick) ───────────────────────────────────────────
  if (input.shooting && s.shootCooldown <= 0) {
    s.shootCooldown = cooldown;

    // Right-stick drag sets the shoot angle; flashlight direction as fallback
    let shootAngle = s.playerAngle + Math.PI / 2;
    if (input.shootOverrideAngle !== null) {
      shootAngle = input.shootOverrideAngle;
    }

    const spawnBullet = (angle: number) => {
      const isBaz = s.bazookaMode && !isBerserking; // berserker overrides bazooka
      const speed = isBaz ? C.BAZOOKA_SPEED : C.BULLET_SPEED;
      const mx = Math.cos(angle); const my = Math.sin(angle);
      s.bullets.push({
        id: uid(), x: s.playerX + mx * 20, y: s.playerY + my * 20,
        vx: mx * speed, vy: my * speed,
        radius: isBaz ? C.BAZOOKA_RADIUS : C.BULLET_RADIUS,
        isBazooka: isBaz, trail: [], distTraveled: 0,
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

  // ── Move bullets (with subtle magnetism toward nearest non-immune enemy) ──
  const bulletStep = dt / 16;
  s.bullets = s.bullets.map((b) => {
    let vx = b.vx, vy = b.vy;
    // Magnetism: gently steer toward nearest non-immune enemy within 320px
    let nearestD = Infinity;
    let nearestEx = 0, nearestEy = 0;
    for (const e of s.enemies) {
      if (e.isImmune) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < nearestD && d < 320) { nearestD = d; nearestEx = e.x; nearestEy = e.y; }
    }
    if (nearestD < 320) {
      const dx = nearestEx - b.x, dy = nearestEy - b.y;
      const d = Math.hypot(dx, dy) || 1;
      // Only pull if bullet isn't already past the target (prevents orbiting)
      const dot = (vx * dx + vy * dy) / (d * C.BULLET_SPEED);
      if (dot > -0.1) {
        const pull = 0.28 * bulletStep;
        vx += (dx / d) * C.BULLET_SPEED * pull;
        vy += (dy / d) * C.BULLET_SPEED * pull;
        const spd = Math.hypot(vx, vy) || 1;
        vx = (vx / spd) * C.BULLET_SPEED;
        vy = (vy / spd) * C.BULLET_SPEED;
      }
    }
    const stepDist = Math.hypot(vx * bulletStep, vy * bulletStep);
    const newDist = b.distTraveled + stepDist;
    return {
      ...b, vx, vy,
      x: b.x + vx * bulletStep, y: b.y + vy * bulletStep,
      trail: [...b.trail, { x: b.x, y: b.y }].slice(-6),
      distTraveled: newDist,
    };
  }).filter((b) => {
    const maxDist = b.isBazooka ? C.BAZOOKA_MAX_DIST : C.BULLET_MAX_DIST;
    return b.distTraveled < maxDist && b.x > -100 && b.x < s.mapWidth + 100 && b.y > -100 && b.y < s.mapHeight + 100;
  });

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
    // Regular enemies spawn throughout the wave — capped so a wall of bodies never forms
    if (s.spawnTimer >= spawnInterval) {
      s.spawnTimer = 0;
      const nonBossCount = s.enemies.filter((e) => e.type !== "boss").length;
      if (nonBossCount < C.MAX_ENEMY_COUNT) {
        const batchSize = Math.min(
          C.MAX_ENEMY_COUNT - nonBossCount, // never exceed the cap
          Math.ceil(C.SPAWN_COUNT_BASE + (s.wave - 1) * C.SPAWN_COUNT_SCALE),
        );
        for (let i = 0; i < batchSize; i++) {
          const type: Enemy["type"] = Math.random() < 0.22 ? "elite" : "standard";
          const pos = randomSpawnPos(s.playerX, s.playerY, s.mapWidth, s.mapHeight);
          s.enemies.push(makeEnemy(type, pos.x, pos.y, s.wave));
        }
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
    const baseSpeed = e.type === "boss" ? C.ENEMY_SPEED_BOSS : e.type === "elite" ? C.ENEMY_SPEED_ELITE : C.ENEMY_SPEED_STANDARD;
    let speed = baseSpeed * (1 + (s.wave - 1) * C.WAVE_SPEED_SCALE) * (dt / 16);
    // ── Freeze wave effect ──────────────────────────────────────────────────
    if (e.frozenTimer > 0) {
      if (e.type === "standard") speed = 0;
      else if (e.type === "elite") speed *= C.FREEZE_SLOW_ELITE;
      else if (e.type === "boss")  speed *= C.FREEZE_SLOW_BOSS;
    }
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
      frozenTimer: Math.max(0, e.frozenTimer - dt),
      spawnImmune: Math.max(0, (e.spawnImmune ?? 0) - dt),
    };
  });

  // ── Enemy separation — prevent pile-ups that corner the player ────────────
  // O(n²) over active enemies; fine at typical counts (<30)
  for (let i = 0; i < s.enemies.length; i++) {
    for (let j = i + 1; j < s.enemies.length; j++) {
      const a = s.enemies[i], b = s.enemies[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const overlap = a.radius + b.radius - Math.sqrt(dx * dx + dy * dy);
      if (overlap > 0) {
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const push = (overlap / len) * 0.5; // split evenly
        s.enemies[i] = { ...a, x: a.x - dx * push, y: a.y - dy * push };
        s.enemies[j] = { ...b, x: b.x + dx * push, y: b.y + dy * push };
      }
    }
  }

  // ── Bullet vs enemy collision ─────────────────────────────────────────────
  const bulletsToRemove = new Set<string>();
  const enemiesToRemove = new Set<string>();

  for (const bullet of s.bullets) {
    if (bulletsToRemove.has(bullet.id)) continue;
    if (bullet.isBazooka) {
      let hit = false;
      for (const enemy of s.enemies) {
        if (dist(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.radius + bullet.radius + 10) { hit = true; break; }
      }
      if (hit || bullet.x < 0 || bullet.x > s.mapWidth || bullet.y < 0 || bullet.y > s.mapHeight) {
        bulletsToRemove.add(bullet.id);
        s.explosions.push({ id: uid(), x: bullet.x, y: bullet.y, radius: 0, maxRadius: C.BAZOOKA_EXPLOSION_RADIUS, alpha: 1, age: 0 });
        s.screenShake.magnitude = C.SHAKE_BAZOOKA;
        for (const enemy of s.enemies) {
          if (enemy.isImmune) continue;  // immune boss shrugs off bazooka
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
        if (enemiesToRemove.has(enemy.id)) continue;
        if ((enemy.spawnImmune ?? 0) > 0) continue; // freshly spawned — bullets pass through
        const d = dist(bullet.x, bullet.y, enemy.x, enemy.y);
        if (d < enemy.radius + bullet.radius) {
          // Immune boss deflects bullets with sparks + IMMUNE! text
          if (enemy.isImmune) {
            bulletsToRemove.add(bullet.id);
            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2;
              s.particles.push({ id: uid(), x: bullet.x, y: bullet.y, vx: Math.cos(a) * rand(3, 8), vy: Math.sin(a) * rand(3, 8), life: rand(80, 200), maxLife: 200, color: Math.random() > 0.5 ? "#ff8800" : "#ffee00", size: rand(2, 5) });
            }
            // Floating "IMMUNE!" text — only if not already showing one near boss
            const alreadyShowing = s.floatingTexts.some((ft) => ft.text === "IMMUNE!" && dist(ft.x, ft.y, enemy.x, enemy.y) < 60);
            if (!alreadyShowing) {
              s.floatingTexts.push({ id: uid(), x: enemy.x, y: enemy.y - enemy.radius - 10, text: "IMMUNE!", age: 0, maxAge: 1200, color: "#ff6600", vy: -0.7 });
            }
            break;
          }
          bulletsToRemove.add(bullet.id);
          const bLen = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
          const kbMag = enemy.type === "boss" ? C.KNOCKBACK_BOSS : enemy.type === "elite" ? C.KNOCKBACK_ELITE : C.KNOCKBACK_STANDARD;
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
      if (enemiesToRemove.has(enemy.id)) continue;
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
    if (s.phase === "dead") break; // stop the moment a previous iteration killed us
    const d = dist(s.playerX, s.playerY, enemy.x, enemy.y);
    const minD = enemy.radius + C.PLAYER_RADIUS;
    if (d < minD) {
      if (d > 0) { s.playerX += ((s.playerX - enemy.x) / d) * (minD - d); s.playerY += ((s.playerY - enemy.y) / d) * (minD - d); }
      // playerDamageCooldown gives brief invincibility frames so a cluster of enemies
      // can't all land damage simultaneously
      if (enemy.damageCooldown <= 0 && s.playerDamageCooldown <= 0) {
        const dmg = enemy.type === "boss" ? 10 : enemy.type === "elite" ? 5 : 4;
        const hpBefore = s.hp;
        s.hp = Math.max(0, s.hp - dmg);
        enemy.damageCooldown = 900;
        s.playerDamageCooldown = 1000;
        s.screenShake.magnitude = C.SHAKE_DAMAGE;
        s.redFlash = 1.0;
        // ── Bite-and-recoil: push the enemy back so the player has an escape window ──
        const recoil = 65;
        if (d > 0) {
          enemy.x += ((enemy.x - s.playerX) / d) * recoil;
          enemy.y += ((enemy.y - s.playerY) / d) * recoil;
          enemy.x = Math.max(enemy.radius, Math.min(s.mapWidth - enemy.radius, enemy.x));
          enemy.y = Math.max(enemy.radius, Math.min(s.mapHeight - enemy.radius, enemy.y));
        }
        const nearbyCount = s.enemies.filter((e) => dist(s.playerX, s.playerY, e.x, e.y) < 120).length;
        logDmg(s, enemy.type, dmg, hpBefore, s.hp, `eCd=${Math.round(enemy.damageCooldown)} dt=${dt.toFixed(0)} nearby=${nearbyCount}`);
        if (s.hp <= 0) {
          s.deathCause = `${enemy.type}: -${dmg} (had ${Math.round(hpBefore)} HP)`;
          s.hpAtDeath = hpBefore;
          s.phase = "dead";
          break; // stop loop immediately — don't let later enemies overwrite the cause
        }
      }
    }
  }

  // ── Buff pickup ───────────────────────────────────────────────────────────
  s.buffDrops = s.buffDrops.map((b) => ({ ...b, pulse: b.pulse + dt * 0.003 })).filter((bd) => {
    if (dist(s.playerX, s.playerY, bd.x, bd.y) < C.PLAYER_RADIUS + 22) { applyBuff(s, bd.type); return false; }
    return true;
  });

  // ── Boss web movement + player collision ──────────────────────────────────
  if (s.phase === "dead") return s; // already dead — skip remaining damage checks
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
      if (!s.isDashing && s.playerDamageCooldown <= 0) {
        // Player takes web damage; dash avoids it
        const webHpBefore = s.hp; // capture BEFORE damage
        s.hp = Math.max(0, s.hp - C.BOSS_WEB_DAMAGE);
        s.playerDamageCooldown = 600;
        s.screenShake.magnitude = C.SHAKE_DAMAGE + 4;
        s.redFlash = 1.0; // boss web hit = full red flash
        logDmg(s, "boss_web", C.BOSS_WEB_DAMAGE, webHpBefore, s.hp, `dt=${dt.toFixed(0)}`);
        if (s.hp <= 0) { s.deathCause = `boss_web: -${C.BOSS_WEB_DAMAGE} (was ${Math.round(webHpBefore)} HP)`; s.hpAtDeath = webHpBefore; s.phase = "dead"; }
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

  // ── Ice waves (expanding freeze ring) ─────────────────────────────────────
  s.iceWaves = s.iceWaves.map((w) => ({ ...w, age: w.age + dt, radius: w.maxRadius * Math.min(1, (w.age + dt) / w.maxAge) })).filter((w) => w.age < w.maxAge);

  // ── Floating texts (IMMUNE! etc.) ─────────────────────────────────────────
  s.floatingTexts = s.floatingTexts.map((ft) => ({ ...ft, age: ft.age + dt, y: ft.y + ft.vy * (dt / 16) })).filter((ft) => ft.age < ft.maxAge);

  // ── Roomba inner monologue ─────────────────────────────────────────────────
  const THOUGHT_DISPLAY_MS = 4800;  // how long a thought stays visible
  if (s.currentThought !== null) {
    s.thoughtAge += dt;
    if (s.thoughtAge >= THOUGHT_DISPLAY_MS) {
      s.currentThought = null;
      s.thoughtAge = 0;
      // Next thought fires after a random quiet gap of 18–38s
      s.thoughtTimer = 18000 + Math.random() * 20000;
    }
  } else {
    s.thoughtTimer -= dt;
    if (s.thoughtTimer <= 0) {
      s.currentThought = nextThought();
      s.thoughtAge = 0;
    }
  }

  return s;
}

// ─── Lightning chain helper ────────────────────────────────────────────────────

function chainLightning(state: GameState, origin: Enemy, excluded: Set<string>, count: number) {
  // Gather all enemies within chain radius sorted by distance
  const candidates = state.enemies
    .filter((e) => !excluded.has(e.id) && e.id !== origin.id)
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
  return type === "boss" ? C.SCORE_BOSS : type === "elite" ? C.SCORE_ELITE : C.SCORE_STANDARD;
}

function randomSpawnPos(px: number, py: number, mw: number, mh: number) {
  let x: number, y: number, tries = 0;
  do { x = rand(50, mw - 50); y = rand(50, mh - 50); tries++; } while (dist(x, y, px, py) < C.SPAWN_MIN_DIST && tries < 30);
  return { x, y };
}

function spawnDeathParticles(state: GameState, enemy: Enemy) {
  const count = enemy.type === "boss" ? 20 : enemy.type === "elite" ? 10 : 6;
  const color = enemy.type === "boss" ? "#ff0000" : enemy.type === "elite" ? "#ff44ff" : "#44ff44";
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, speed = rand(2, 8);
    state.particles.push({ id: uid(), x: enemy.x, y: enemy.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(300, 700), maxLife: 700, color, size: rand(3, 8) });
  }
}

// Drop chance ramps from 0% on wave 1 up to ~45% by wave 5+
function eliteDropChance(wave: number): number {
  if (wave === 1) return 0.42;  // wave 1: ~2-in-5 elites drop a buff
  if (wave === 2) return 0.48;
  if (wave === 3) return 0.54;
  if (wave === 4) return 0.58;
  return 0.62;                  // wave 5+ cap
}

// Max combat buffs on the floor at any one time (batteries don't count)
const MAX_FLOOR_BUFFS = 2;
// Minimum pixel distance between two combat buff drops (keep small so clustered kills still drop)
const MIN_BUFF_SPREAD = 80;

// Which buffs are unlocked per wave (progressive unlock)
function spawnBuff(state: GameState, x: number, y: number, wave: number) {
  // Hard cap: count only combat buffs (batteries are separate pickups)
  const combatDrops = state.buffDrops.filter((b) => b.type !== "battery");
  if (combatDrops.length >= MAX_FLOOR_BUFFS) return;

  // Enforce minimal spacing so two drops don't overlap visually
  for (const existing of combatDrops) {
    if (dist(x, y, existing.x, existing.y) < MIN_BUFF_SPREAD) return;
  }

  const types: string[] = [];
  if (wave >= 1) types.push("rapidFire");       // wave 1 basics
  if (wave >= 1) types.push("freezeWave");      // freeze AoE all waves
  if (wave >= 1) types.push("quadShot");        // quad shot from wave 1
  if (wave >= 2) types.push("tripleShot");
  if (wave >= 3) types.push("bazookaMode");
  if (wave >= 4) types.push("lightningStrike");
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
  } else if (type === "freezeWave") {
    // Launch expanding ice ring + freeze/slow all visible enemies
    state.iceWaves.push({ id: uid(), x: state.playerX, y: state.playerY, radius: 0, maxRadius: C.FREEZE_AOE_RADIUS, age: 0, maxAge: C.FREEZE_RING_DURATION });
    state.screenShake.magnitude = 6;
    for (const e of state.enemies) {
      if (e.type === "standard") {
        e.frozenTimer = C.FREEZE_STANDARD_DURATION;
      } else if (e.type === "elite") {
        e.frozenTimer = C.FREEZE_ELITE_DURATION;
      } else if (e.type === "boss") {
        e.frozenTimer = C.FREEZE_BOSS_DURATION;
      }
    }
    // Ice burst particles
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = rand(3, 10);
      state.particles.push({ id: uid(), x: state.playerX, y: state.playerY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: rand(250, 600), maxLife: 600, color: Math.random() > 0.4 ? "#88eeff" : "#ffffff", size: rand(3, 8) });
    }
  }
}
