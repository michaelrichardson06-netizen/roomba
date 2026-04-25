export const GAME_CONFIG = {
  // World
  MAP_WIDTH: 3000,
  MAP_HEIGHT: 3000,
  TILE_SIZE: 64,

  // Player
  PLAYER_RADIUS: 14,
  PLAYER_SPEED: 3.4,          // slowed base speed
  SPEED_BOOST_MULT: 1.65,     // speed buff multiplier
  SPEED_BOOST_DURATION: 12000, // ms
  PLAYER_MAX_HP: 200,

  // Dash
  DASH_SPEED: 18,
  DASH_DURATION: 120,
  DASH_COOLDOWN: 600,

  // Shooting
  BASE_SHOOT_COOLDOWN: 350,
  RAPID_FIRE_REDUCTION: 0.60,    // was 0.62 — rapid fire slightly more effective
  BULLET_SPEED: 14,
  BULLET_RADIUS: 9,
  BULLET_MAX_DIST: 360,     // pixels before bullet fades out
  BAZOOKA_MAX_DIST: 240,    // bazooka is close-range explosive

  // Bazooka
  BAZOOKA_SPEED: 5,
  BAZOOKA_RADIUS: 10,
  BAZOOKA_EXPLOSION_RADIUS: 290,  // was 250 — bigger blast radius for crowds

  // Flashlight
  FLASHLIGHT_LENGTH: 520,
  FLASHLIGHT_ANGLE: Math.PI / 2,

  // Lighting
  AMBIENT_LIGHT_RADIUS: 180,

  // Enemy base stats (wave 1)
  ENEMY_SPEED_STANDARD: 1.2,
  ENEMY_SPEED_ELITE: 1.5,
  ENEMY_SPEED_BOSS: 0.9,
  ENEMY_HP_STANDARD: 38,       // was 30 (+27% tougher baseline)
  ENEMY_HP_ELITE: 88,          // was 70
  ENEMY_HP_BOSS: 860,          // was 750
  MEGA_BOSS_HP_MULT: 3.5,
  MEGA_BOSS_RADIUS_MULT: 1.85,
  ENEMY_RADIUS_STANDARD: 14,
  ENEMY_RADIUS_ELITE: 18,
  ENEMY_RADIUS_BOSS: 36,

  // Wave scaling
  WAVE_HP_SCALE: 0.13,         // +13% HP per wave (was 0.10)
  WAVE_3WAVE_HP_BOOST: 0.40,   // Additional +40% HP spike every 3 waves (was 0.35)
  WAVE_DENSITY_SCALE: 0.18,
  WAVE_BASE_KILLS: 30,         // Wave 1 kill threshold (boss immune until met)
  WAVE_KILL_INCREMENT: 30,     // Per wave: 30 → 60 → 90 → 120 … (scales with density)
  WAVE_SPEED_SCALE: 0.09,      // enemies move 9% faster per wave (was 0.07)
  MAX_ENEMY_COUNT: 60,         // Hard cap — absolute ceiling for non-boss enemies
  SPAWN_COUNT_BASE: 6,         // Wave 1 batch: 6 at once (was 2)
  SPAWN_COUNT_SCALE: 1.52,     // Exponential: w1=6 w2=10 w3=14 w4=22 w5=34 w6=52…

  // Scoring (bigger numbers for high-density waves)
  SCORE_STANDARD: 7,           // was 5
  SCORE_ELITE: 18,             // was 12
  SCORE_BOSS: 35,              // was 25

  // Knockback
  KNOCKBACK_STANDARD: 6,
  KNOCKBACK_ELITE: 4,
  KNOCKBACK_BOSS: 2,

  // Screen shake
  SHAKE_DAMAGE: 8,
  SHAKE_BAZOOKA: 6,

  // Drop rates
  ELITE_DROP_CHANCE: 0.62,          // was 0.55 — more drops for harder enemies
  BOSS_BERSERKER_DROP_CHANCE: 0.38, // was 0.30

  // Lamps per scene
  LAMP_COUNT: 28,

  // Spawn
  SPAWN_MIN_DIST: 700,
  SPAWN_INTERVAL_BASE: 1800,   // wave 1 starts fast (was 3100)
  MIN_SPAWN_INTERVAL: 250,     // floor for late waves — near-constant pressure (was 400)
  WAVE_INTERVAL_REDUCTION: 200, // -200ms/wave: w1=1800 w5=1000 w8=400 w9=250(floor)

  // ── Boss web attack ───────────────────────────────────────────────────────
  BOSS_WEB_COOLDOWN: 3500,   // ms between web throws
  BOSS_WEB_SPEED: 3.5,       // px/frame movement speed
  BOSS_WEB_RADIUS: 16,       // collision radius
  BOSS_WEB_DAMAGE: 12,       // slightly more than standard enemy contact (4)

  // ── Battery ──────────────────────────────────────────────────────────────
  BATTERY_MAX: 100,
  BATTERY_DRAIN_RATE: 1.485,     // units/second (67% slower than original 4.5)
  BATTERY_HEALTH_DRAIN: 3,       // HP/second when battery empty
  BATTERY_SPAWN_INTERVAL: 22000, // ms between spawn checks (slower — was 13500)
  BATTERY_CHARGE_AMOUNT: 100,    // full recharge per pickup

  // ── Freeze Wave ───────────────────────────────────────────────────────────
  FREEZE_AOE_RADIUS: 500,           // px — ring expands to this size
  FREEZE_RING_DURATION: 700,        // ms for the ring animation
  FREEZE_STANDARD_DURATION: 3500,   // ms — standard enemy fully frozen
  FREEZE_ELITE_DURATION: 2500,      // ms — elite slowed
  FREEZE_BOSS_DURATION: 1500,       // ms — boss slowed
  FREEZE_SLOW_ELITE: 0.28,          // speed multiplier for elite while frozen
  FREEZE_SLOW_BOSS: 0.38,           // speed multiplier for boss while frozen

  // ── Lightning Strike ─────────────────────────────────────────────────────
  LIGHTNING_CHAIN_RADIUS: 240,   // px — slightly longer chain reach (was 220)
  LIGHTNING_CHAIN_DAMAGE: 24,    // damage per chained enemy (was 18, +33%)
  LIGHTNING_CHAIN_COUNT: 5,      // max enemies chained per hit (was 4)
  LIGHTNING_ARC_LIFE: 280,       // ms arcs stay visible
  LIGHTNING_AMBIENT_RADIUS: 180, // px — ambient static arc range between enemies

  // ── Battery HP regen ──────────────────────────────────────────────────────
  BATTERY_HP_REGEN: 0.3,         // HP/second while battery > 0

  // ── Berserker ────────────────────────────────────────────────────────────
  BERSERKER_HP_THRESHOLD: 0.3,   // auto-triggers at 30% HP
  BERSERKER_DURATION_AUTO: 30000, // 30 seconds (automatic)
  BERSERKER_DURATION_BUFF: 15000, // 15 seconds (from boss drop)
  BERSERKER_AOE_RADIUS: 140,     // pixels (was 120 — bigger AOE for denser crowds)
  BERSERKER_AOE_DPS: 20,         // damage per second to nearby enemies (was 14, +43%)
  BERSERKER_SPREAD: 8,           // bullets in the 180° arc

  // ── Bullet base damage ────────────────────────────────────────────────────
  BULLET_DAMAGE: 25,             // base damage per non-bazooka bullet

  // ── Brush drops (in-game currency) ───────────────────────────────────────
  BRUSH_DROP_CHANCE_STANDARD: 0.08,  // 8% from standard enemies
  BRUSH_DROP_CHANCE_ELITE:    0.20,  // 20% from elite enemies
  BRUSH_DROP_AMOUNT_BOSS_MIN: 3,     // boss always drops 3-5 brushes
  BRUSH_DROP_AMOUNT_BOSS_MAX: 5,
  BRUSH_PICKUP_RADIUS: 28,           // px — player walks over this to collect

  // ── XP per kill ───────────────────────────────────────────────────────────
  XP_STANDARD: 220,
  XP_ELITE:    580,
  XP_BOSS:     2200,
  XP_WAVE_BONUS_MULT: 900,          // wave × 900 XP on boss kill (wave completion)

  // ── Rank 5 AoE blast ──────────────────────────────────────────────────────
  RANK5_AOE_INTERVAL: 10000,        // ms between auto-blasts
  RANK5_AOE_DAMAGE:   60,           // damage to all enemies within radius
  RANK5_AOE_RADIUS:   320,          // px
};

export const BUFF_COLORS: Record<string, string> = {
  tripleShot: "#00e5ff",
  quadShot: "#7c4dff",
  rapidFire: "#ffea00",
  bazookaMode: "#ff6d00",
  berserker: "#ff0044",
  battery: "#44ff88",
  lightningStrike: "#88eeff",
  freezeWave: "#00cfff",
  speed: "#00ff88",
};

export const ENEMY_COLORS: Record<string, { body: string; glow: string }> = {
  standard: { body: "#1a5c1a", glow: "#2aff2a" },
  elite: { body: "#5c1a5c", glow: "#ff2aff" },
  boss: { body: "#5c0000", glow: "#ff0000" },
};
