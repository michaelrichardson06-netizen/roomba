import { GAME_CONFIG as C } from "./constants";
import type { GameState, Enemy, LampLight } from "./types";

let nextId = 0;
function uid() {
  return (++nextId).toString();
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function createInitialState(): GameState {
  const lamps: LampLight[] = [];
  for (let i = 0; i < C.LAMP_COUNT; i++) {
    lamps.push({
      x: rand(100, C.MAP_WIDTH - 100),
      y: rand(100, C.MAP_HEIGHT - 100),
      radius: rand(160, 280),
      flicker: 1.0,
      flickerTarget: rand(0.82, 1.0),
      color: Math.random() > 0.25 ? "#ffcc66" : Math.random() > 0.5 ? "#ff8800" : "#4488ff",
    });
  }

  return {
    playerX: C.MAP_WIDTH / 2,
    playerY: C.MAP_HEIGHT / 2,
    playerAngle: 0,
    playerVx: 0,
    playerVy: 0,
    hp: C.PLAYER_MAX_HP,
    maxHp: C.PLAYER_MAX_HP,
    score: 0,
    wave: 1,
    killCount: 0,
    waveTotalKills: Math.ceil(C.WAVE_BASE_KILLS),
    enemies: [],
    bullets: [],
    explosions: [],
    particles: [],
    buffDrops: [],
    muzzleFlash: null,
    lamps,
    screenShake: { x: 0, y: 0, magnitude: 0 },
    whiteFlash: 0,
    tripleShot: false,
    quadShot: false,
    rapidFireStacks: 0,
    bazookaMode: false,
    shootCooldown: 0,
    dashCooldown: 0,
    isDashing: false,
    dashDx: 0,
    dashDy: 0,
    dashTime: 0,
    spawnTimer: 0,
    bossSpawned: false,
    phase: "playing",
    totalInsects: 0,
    mapWidth: C.MAP_WIDTH,
    mapHeight: C.MAP_HEIGHT,
    spawnGrace: 3000, // 3 second grace period before first enemies
  };
}

export function updateGame(
  state: GameState,
  dt: number,
  input: {
    dx: number;
    dy: number;
    aimAngle: number;
    shooting: boolean;
    dashing: boolean;
  }
): GameState {
  const s = { ...state };
  s.enemies = [...s.enemies];
  s.bullets = [...s.bullets];
  s.explosions = [...s.explosions];
  s.particles = [...s.particles];
  s.buffDrops = [...s.buffDrops];
  s.screenShake = { ...s.screenShake };

  // Timers
  s.shootCooldown = Math.max(0, s.shootCooldown - dt);
  s.dashCooldown = Math.max(0, s.dashCooldown - dt);
  s.whiteFlash = Math.max(0, s.whiteFlash - dt * 3);

  // Flicker lamps
  s.lamps = s.lamps.map((lamp) => {
    let f = lamp.flicker + (lamp.flickerTarget - lamp.flicker) * 0.05;
    let ft = lamp.flickerTarget;
    if (Math.abs(f - ft) < 0.01) {
      ft = rand(0.7, 1.0);
    }
    return { ...lamp, flicker: f, flickerTarget: ft };
  });

  // Screen shake decay
  if (s.screenShake.magnitude > 0) {
    s.screenShake.magnitude *= 0.85;
    if (s.screenShake.magnitude < 0.5) {
      s.screenShake = { x: 0, y: 0, magnitude: 0 };
    } else {
      const angle = Math.random() * Math.PI * 2;
      s.screenShake.x = Math.cos(angle) * s.screenShake.magnitude;
      s.screenShake.y = Math.sin(angle) * s.screenShake.magnitude;
    }
  }

  // Muzzle flash
  if (s.muzzleFlash) {
    s.muzzleFlash = { ...s.muzzleFlash, age: s.muzzleFlash.age + dt };
    if (s.muzzleFlash.age > s.muzzleFlash.maxAge) s.muzzleFlash = null;
  }

  // Player movement
  s.playerAngle = input.aimAngle;

  if (s.isDashing) {
    s.dashTime -= dt;
    const dashSpeed = C.DASH_SPEED;
    s.playerX += s.dashDx * dashSpeed * (dt / 16);
    s.playerY += s.dashDy * dashSpeed * (dt / 16);
    if (s.dashTime <= 0) {
      s.isDashing = false;
    }
  } else {
    if (input.dashing && s.dashCooldown <= 0) {
      const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
      if (len > 0.1) {
        s.isDashing = true;
        s.dashDx = input.dx / len;
        s.dashDy = input.dy / len;
        s.dashTime = C.DASH_DURATION;
        s.dashCooldown = C.DASH_COOLDOWN;
        // Dash particles
        for (let i = 0; i < 8; i++) {
          s.particles.push({
            id: uid(),
            x: s.playerX,
            y: s.playerY,
            vx: rand(-3, 3),
            vy: rand(-3, 3),
            life: rand(200, 400),
            maxLife: 400,
            color: "#4488ff",
            size: rand(3, 6),
          });
        }
      }
    }

    const speed = C.PLAYER_SPEED * (dt / 16);
    const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
    if (len > 0) {
      s.playerX += (input.dx / len) * speed;
      s.playerY += (input.dy / len) * speed;
    }
  }

  // Clamp player to map
  s.playerX = Math.max(C.PLAYER_RADIUS, Math.min(s.mapWidth - C.PLAYER_RADIUS, s.playerX));
  s.playerY = Math.max(C.PLAYER_RADIUS, Math.min(s.mapHeight - C.PLAYER_RADIUS, s.playerY));

  // Shooting
  const waveHpScale = 1 + (s.wave - 1) * C.WAVE_HP_SCALE;
  let cooldown = C.BASE_SHOOT_COOLDOWN;
  for (let i = 0; i < s.rapidFireStacks; i++) {
    cooldown *= C.RAPID_FIRE_REDUCTION;
  }

  if (input.shooting && s.shootCooldown <= 0) {
    s.shootCooldown = cooldown;
    const mx = Math.cos(s.playerAngle + Math.PI / 2);
    const my = Math.sin(s.playerAngle + Math.PI / 2);

    const spawnBullet = (angle: number) => {
      const isBaz = s.bazookaMode;
      const speed = isBaz ? C.BAZOOKA_SPEED : C.BULLET_SPEED;
      s.bullets.push({
        id: uid(),
        x: s.playerX + mx * 20,
        y: s.playerY + my * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isBaz ? C.BAZOOKA_RADIUS : C.BULLET_RADIUS,
        isBazooka: isBaz,
        trail: [],
      });
    };

    if (s.bazookaMode) {
      const angle = s.playerAngle + Math.PI / 2;
      spawnBullet(angle);
      // Screen shake for bazooka
      s.screenShake.magnitude = C.SHAKE_BAZOOKA;
      s.muzzleFlash = {
        x: s.playerX,
        y: s.playerY,
        age: 0,
        maxAge: 120,
        angle: s.playerAngle,
      };
    } else if (s.quadShot) {
      const base = s.playerAngle + Math.PI / 2;
      for (const offset of [-0.35, -0.12, 0.12, 0.35]) {
        spawnBullet(base + offset);
      }
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 60, angle: s.playerAngle };
    } else if (s.tripleShot) {
      const base = s.playerAngle + Math.PI / 2;
      for (const offset of [-0.25, 0, 0.25]) {
        spawnBullet(base + offset);
      }
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 60, angle: s.playerAngle };
    } else {
      spawnBullet(s.playerAngle + Math.PI / 2);
      s.muzzleFlash = { x: s.playerX, y: s.playerY, age: 0, maxAge: 60, angle: s.playerAngle };
    }
  }

  // Move bullets
  const bulletSpeed = dt / 16;
  s.bullets = s.bullets
    .map((b) => {
      const trail = [...b.trail, { x: b.x, y: b.y }].slice(-6);
      return {
        ...b,
        x: b.x + b.vx * bulletSpeed,
        y: b.y + b.vy * bulletSpeed,
        trail,
      };
    })
    .filter(
      (b) =>
        b.x > -100 &&
        b.x < s.mapWidth + 100 &&
        b.y > -100 &&
        b.y < s.mapHeight + 100
    );

  // Spawn grace period countdown
  if (s.spawnGrace > 0) {
    s.spawnGrace = Math.max(0, s.spawnGrace - dt);
  }

  // Spawn enemies
  const spawnInterval = Math.max(
    C.MIN_SPAWN_INTERVAL,
    C.SPAWN_INTERVAL_BASE - (s.wave - 1) * 120
  );
  s.spawnTimer += dt;

  const killsNeeded = s.waveTotalKills;
  const shouldSpawnBoss = s.killCount >= killsNeeded && !s.bossSpawned;

  if (s.spawnGrace <= 0) {
    if (shouldSpawnBoss) {
      s.bossSpawned = true;
      const pos = randomSpawnPos(s.playerX, s.playerY, s.mapWidth, s.mapHeight);
      const hpScale = 1 + (s.wave - 1) * C.WAVE_HP_SCALE;
      const hp = Math.ceil(C.ENEMY_HP_BOSS * hpScale);
      s.enemies.push({
        id: uid(),
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        hp,
        maxHp: hp,
        type: "boss",
        radius: C.ENEMY_RADIUS_BOSS,
        knockbackX: 0,
        knockbackY: 0,
        hitFlash: 0,
        angle: 0,
        legPhase: 0,
        damageCooldown: 0,
      });
    } else if (!shouldSpawnBoss && s.killCount < killsNeeded) {
      if (s.spawnTimer >= spawnInterval) {
        s.spawnTimer = 0;
        const waveCount = Math.ceil(1 + (s.wave - 1) * C.WAVE_DENSITY_SCALE * 0.5);
        for (let i = 0; i < waveCount; i++) {
          const isElite = Math.random() < 0.2;
          const type = isElite ? "elite" : "standard";
          const hpScale = 1 + (s.wave - 1) * C.WAVE_HP_SCALE;
          const baseHp = type === "elite" ? C.ENEMY_HP_ELITE : C.ENEMY_HP_STANDARD;
          const hp = Math.ceil(baseHp * hpScale);
          const pos = randomSpawnPos(s.playerX, s.playerY, s.mapWidth, s.mapHeight);
          s.enemies.push({
            id: uid(),
            x: pos.x,
            y: pos.y,
            vx: 0,
            vy: 0,
            hp,
            maxHp: hp,
            type,
            radius: type === "elite" ? C.ENEMY_RADIUS_ELITE : C.ENEMY_RADIUS_STANDARD,
            knockbackX: 0,
            knockbackY: 0,
            hitFlash: 0,
            angle: 0,
            legPhase: 0,
            damageCooldown: 0,
          });
        }
      }
    }
  }

  // Move enemies
  s.enemies = s.enemies.map((e) => {
    const baseSpeed =
      e.type === "boss"
        ? C.ENEMY_SPEED_BOSS
        : e.type === "elite"
        ? C.ENEMY_SPEED_ELITE
        : C.ENEMY_SPEED_STANDARD;
    const waveSpeedScale = 1 + (s.wave - 1) * 0.05;
    const speed = baseSpeed * waveSpeedScale * (dt / 16);

    const dx = s.playerX - e.x;
    const dy = s.playerY - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    let nx = d > 0 ? (dx / d) * speed : 0;
    let ny = d > 0 ? (dy / d) * speed : 0;

    // Apply knockback decay
    const kbDecay = 0.8;
    const newKbX = e.knockbackX * kbDecay;
    const newKbY = e.knockbackY * kbDecay;

    return {
      ...e,
      x: e.x + nx + newKbX * (dt / 16),
      y: e.y + ny + newKbY * (dt / 16),
      knockbackX: Math.abs(newKbX) < 0.1 ? 0 : newKbX,
      knockbackY: Math.abs(newKbY) < 0.1 ? 0 : newKbY,
      hitFlash: Math.max(0, e.hitFlash - dt * 4),
      angle: Math.atan2(dy, dx) - Math.PI / 2,
      legPhase: e.legPhase + dt * 0.01,
      damageCooldown: Math.max(0, e.damageCooldown - dt),
    };
  });

  // Bullet vs enemy collision
  const bulletsToRemove = new Set<string>();
  const enemiesToRemove = new Set<string>();

  for (const bullet of s.bullets) {
    if (bulletsToRemove.has(bullet.id)) continue;

    if (bullet.isBazooka) {
      // Bazooka detonates on proximity or map edge
      let exploded = false;
      for (const enemy of s.enemies) {
        if (dist(bullet.x, bullet.y, enemy.x, enemy.y) < enemy.radius + bullet.radius + 10) {
          exploded = true;
          break;
        }
      }

      if (exploded || bullet.x < 0 || bullet.x > s.mapWidth || bullet.y < 0 || bullet.y > s.mapHeight) {
        bulletsToRemove.add(bullet.id);
        // Big explosion
        s.explosions.push({
          id: uid(),
          x: bullet.x,
          y: bullet.y,
          radius: 0,
          maxRadius: C.BAZOOKA_EXPLOSION_RADIUS,
          alpha: 1,
          age: 0,
        });
        s.screenShake.magnitude = C.SHAKE_BAZOOKA;
        s.whiteFlash = 1.0;

        // Damage all enemies in radius
        for (const enemy of s.enemies) {
          const d = dist(bullet.x, bullet.y, enemy.x, enemy.y);
          if (d < C.BAZOOKA_EXPLOSION_RADIUS + enemy.radius) {
            const dmgRatio = 1 - d / (C.BAZOOKA_EXPLOSION_RADIUS + enemy.radius);
            const damage = Math.ceil(999 * dmgRatio);
            const newHp = enemy.hp - damage;
            if (newHp <= 0 && !enemiesToRemove.has(enemy.id)) {
              enemiesToRemove.add(enemy.id);
              spawnDeathParticles(s, enemy);
              s.score += enemy.type === "boss" ? C.SCORE_BOSS : enemy.type === "elite" ? C.SCORE_ELITE : C.SCORE_STANDARD;
              s.killCount++;
              s.totalInsects++;
              if (enemy.type === "elite" && Math.random() < C.ELITE_DROP_CHANCE) {
                spawnBuff(s, enemy.x, enemy.y);
              }
            } else if (!enemiesToRemove.has(enemy.id)) {
              // Knockback from explosion center
              const kbDir = d > 0 ? { x: (enemy.x - bullet.x) / d, y: (enemy.y - bullet.y) / d } : { x: 0, y: -1 };
              enemy.hp = newHp;
              enemy.knockbackX = kbDir.x * 15;
              enemy.knockbackY = kbDir.y * 15;
              enemy.hitFlash = 1.0;
            }
          }
        }

        // Explosion particles
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = rand(3, 12);
          s.particles.push({
            id: uid(),
            x: bullet.x,
            y: bullet.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: rand(300, 800),
            maxLife: 800,
            color: Math.random() > 0.5 ? "#ff6600" : "#ffff00",
            size: rand(4, 10),
          });
        }
      }
    } else {
      for (const enemy of s.enemies) {
        if (enemiesToRemove.has(enemy.id)) continue;
        const d = dist(bullet.x, bullet.y, enemy.x, enemy.y);
        if (d < enemy.radius + bullet.radius) {
          bulletsToRemove.add(bullet.id);
          const newHp = enemy.hp - 25;
          // Knockback
          const bx = bullet.vx;
          const by = bullet.vy;
          const bl = Math.sqrt(bx * bx + by * by);
          const kbMag =
            enemy.type === "boss"
              ? C.KNOCKBACK_BOSS
              : enemy.type === "elite"
              ? C.KNOCKBACK_ELITE
              : C.KNOCKBACK_STANDARD;

          if (newHp <= 0) {
            enemiesToRemove.add(enemy.id);
            spawnDeathParticles(s, enemy);
            s.score += enemy.type === "boss" ? C.SCORE_BOSS : enemy.type === "elite" ? C.SCORE_ELITE : C.SCORE_STANDARD;
            s.killCount++;
            s.totalInsects++;
            if (enemy.type === "elite" && Math.random() < C.ELITE_DROP_CHANCE) {
              spawnBuff(s, enemy.x, enemy.y);
            }
            if (enemy.type === "boss") {
              // Boss death explosion
              s.explosions.push({
                id: uid(),
                x: enemy.x,
                y: enemy.y,
                radius: 0,
                maxRadius: 100,
                alpha: 1,
                age: 0,
              });
              s.screenShake.magnitude = 12;
            }
          } else {
            enemy.hp = newHp;
            enemy.knockbackX = bl > 0 ? (bx / bl) * kbMag : 0;
            enemy.knockbackY = bl > 0 ? (by / bl) * kbMag : 0;
            enemy.hitFlash = 1.0;
          }

          // Bullet hit particles
          for (let i = 0; i < 5; i++) {
            s.particles.push({
              id: uid(),
              x: bullet.x,
              y: bullet.y,
              vx: rand(-4, 4),
              vy: rand(-4, 4),
              life: rand(100, 250),
              maxLife: 250,
              color: "#ff4400",
              size: rand(2, 5),
            });
          }
          break;
        }
      }
    }
  }

  s.bullets = s.bullets.filter((b) => !bulletsToRemove.has(b.id));
  s.enemies = s.enemies.filter((e) => !enemiesToRemove.has(e.id));

  // Wave progression check
  const bossKilledThisUpdate = [...enemiesToRemove].some((id) => {
    // Check if removed enemy was boss
    return state.enemies.find((e) => e.id === id)?.type === "boss";
  });

  if (bossKilledThisUpdate) {
    // Advance wave
    s.wave++;
    s.killCount = 0;
    s.bossSpawned = false;
    s.waveTotalKills = Math.ceil(C.WAVE_BASE_KILLS * Math.pow(1 + C.WAVE_DENSITY_SCALE, s.wave - 1));
  }

  // Enemy vs player collision (with per-enemy damage cooldown so no per-frame draining)
  for (const enemy of s.enemies) {
    const d = dist(s.playerX, s.playerY, enemy.x, enemy.y);
    const minDist = enemy.radius + C.PLAYER_RADIUS;
    if (d < minDist) {
      // Push player away
      if (d > 0) {
        const nx = (s.playerX - enemy.x) / d;
        const ny = (s.playerY - enemy.y) / d;
        s.playerX += nx * (minDist - d);
        s.playerY += ny * (minDist - d);
      }

      // Only deal damage when cooldown has expired
      if (enemy.damageCooldown <= 0) {
        const dmg = enemy.type === "boss" ? 8 : enemy.type === "elite" ? 5 : 3;
        s.hp = Math.max(0, s.hp - dmg);
        enemy.damageCooldown = 800; // 800ms between hits per enemy
        s.screenShake.magnitude = C.SHAKE_DAMAGE;
      }

      if (s.hp <= 0) {
        s.phase = "dead";
      }
    }
  }

  // Buff pickup
  s.buffDrops = s.buffDrops
    .map((b) => ({ ...b, pulse: b.pulse + dt * 0.003 }))
    .filter((bd) => {
      const d = dist(s.playerX, s.playerY, bd.x, bd.y);
      if (d < C.PLAYER_RADIUS + 20) {
        applyBuff(s, bd.type);
        return false;
      }
      return true;
    });

  // Update explosions
  s.explosions = s.explosions
    .map((ex) => ({
      ...ex,
      radius: ex.radius + (ex.maxRadius - ex.radius) * 0.15,
      alpha: ex.alpha - 0.04,
      age: ex.age + dt,
    }))
    .filter((ex) => ex.alpha > 0);

  // Update particles
  const ptSpeed = dt / 16;
  s.particles = s.particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * ptSpeed,
      y: p.y + p.vy * ptSpeed,
      vx: p.vx * 0.93,
      vy: p.vy * 0.93,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);

  return s;
}

function randomSpawnPos(px: number, py: number, mw: number, mh: number) {
  const minDist = C.SPAWN_MIN_DIST;
  let x: number, y: number, tries = 0;
  do {
    x = rand(50, mw - 50);
    y = rand(50, mh - 50);
    tries++;
  } while (dist(x, y, px, py) < minDist && tries < 30);
  return { x, y };
}

function spawnDeathParticles(state: GameState, enemy: Enemy) {
  const count = enemy.type === "boss" ? 20 : enemy.type === "elite" ? 10 : 6;
  const color = enemy.type === "boss" ? "#ff0000" : enemy.type === "elite" ? "#ff44ff" : "#44ff44";
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(2, 8);
    state.particles.push({
      id: uid(),
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(300, 700),
      maxLife: 700,
      color,
      size: rand(3, 8),
    });
  }
}

function spawnBuff(state: GameState, x: number, y: number) {
  const types: Array<"tripleShot" | "quadShot" | "rapidFire" | "bazookaMode"> = [
    "tripleShot",
    "quadShot",
    "rapidFire",
    "bazookaMode",
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  state.buffDrops.push({
    id: uid(),
    x,
    y,
    type,
    pulse: 0,
  });
}

function applyBuff(state: GameState, type: "tripleShot" | "quadShot" | "rapidFire" | "bazookaMode") {
  if (type === "bazookaMode") {
    // Clear all buffs
    state.tripleShot = false;
    state.quadShot = false;
    state.rapidFireStacks = 0;
    state.bazookaMode = true;
  } else if (type === "tripleShot") {
    state.tripleShot = true;
    state.bazookaMode = false;
  } else if (type === "quadShot") {
    state.quadShot = true;
    state.tripleShot = true;
    state.bazookaMode = false;
  } else if (type === "rapidFire") {
    state.rapidFireStacks = Math.min(3, state.rapidFireStacks + 1);
    state.bazookaMode = false;
  }
}
