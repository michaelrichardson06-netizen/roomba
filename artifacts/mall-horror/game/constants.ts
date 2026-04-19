export const GAME_CONFIG = {
  // World
  MAP_WIDTH: 3000,
  MAP_HEIGHT: 3000,
  TILE_SIZE: 64,

  // Player
  PLAYER_RADIUS: 14,
  PLAYER_SPEED: 4.5,
  PLAYER_MAX_HP: 200,

  // Dash
  DASH_SPEED: 18,
  DASH_DURATION: 120,
  DASH_COOLDOWN: 1500,

  // Shooting
  BASE_SHOOT_COOLDOWN: 350,
  RAPID_FIRE_REDUCTION: 0.62,
  BULLET_SPEED: 14,
  BULLET_RADIUS: 5,

  // Bazooka
  BAZOOKA_SPEED: 5,
  BAZOOKA_RADIUS: 10,
  BAZOOKA_EXPLOSION_RADIUS: 250,

  // Flashlight
  FLASHLIGHT_LENGTH: 520,
  FLASHLIGHT_ANGLE: Math.PI / 2,

  // Lighting
  AMBIENT_LIGHT_RADIUS: 180,

  // Enemy base stats (wave 1)
  ENEMY_SPEED_STANDARD: 1.2,
  ENEMY_SPEED_ELITE: 1.9,
  ENEMY_SPEED_BOSS: 0.9,
  ENEMY_SPEED_MOLE: 2.8,
  ENEMY_HP_STANDARD: 30,
  ENEMY_HP_ELITE: 70,
  ENEMY_HP_BOSS: 300,
  ENEMY_HP_MOLE: 45,
  ENEMY_RADIUS_STANDARD: 14,
  ENEMY_RADIUS_ELITE: 18,
  ENEMY_RADIUS_BOSS: 36,
  ENEMY_RADIUS_MOLE: 11,

  // Mole burrow timing (ms)
  MOLE_BURROW_AFTER: 2800,
  MOLE_EMERGE_AFTER: 1600,
  MOLE_EMERGE_DIST: 140,

  // Wave scaling
  WAVE_HP_SCALE: 0.12,
  WAVE_DENSITY_SCALE: 0.15,
  WAVE_BASE_KILLS: 12,
  WAVE_SPEED_SCALE: 0.08,
  SPAWN_COUNT_BASE: 3,
  SPAWN_COUNT_SCALE: 0.8,

  // Scoring
  SCORE_STANDARD: 3,
  SCORE_ELITE: 6,
  SCORE_BOSS: 10,
  SCORE_MOLE: 4,

  // Knockback
  KNOCKBACK_STANDARD: 6,
  KNOCKBACK_ELITE: 4,
  KNOCKBACK_BOSS: 2,
  KNOCKBACK_MOLE: 9,

  // Screen shake
  SHAKE_DAMAGE: 8,
  SHAKE_BAZOOKA: 6,

  // Drop rates
  ELITE_DROP_CHANCE: 0.55,
  BOSS_BERSERKER_DROP_CHANCE: 0.3,

  // Lamps per scene
  LAMP_COUNT: 28,

  // Spawn
  SPAWN_MIN_DIST: 500,
  SPAWN_INTERVAL_BASE: 2400,
  MIN_SPAWN_INTERVAL: 500,
  WAVE_INTERVAL_REDUCTION: 140,

  // ── Battery ──────────────────────────────────────────────────────────────
  BATTERY_MAX: 100,
  BATTERY_DRAIN_RATE: 1.485,     // units/second (67% slower than original 4.5)
  BATTERY_HEALTH_DRAIN: 3,       // HP/second when battery empty
  BATTERY_SPAWN_INTERVAL: 13500, // ms between spawn checks (18% more frequent)
  BATTERY_CHARGE_AMOUNT: 100,    // full recharge per pickup

  // ── Berserker ────────────────────────────────────────────────────────────
  BERSERKER_HP_THRESHOLD: 0.3,   // auto-triggers at 30% HP
  BERSERKER_DURATION_AUTO: 30000, // 30 seconds (automatic)
  BERSERKER_DURATION_BUFF: 15000, // 15 seconds (from boss drop)
  BERSERKER_AOE_RADIUS: 120,     // pixels
  BERSERKER_AOE_DPS: 14,         // damage per second to nearby enemies
  BERSERKER_SPREAD: 8,           // bullets in the 180° arc
};

export const BUFF_COLORS: Record<string, string> = {
  tripleShot: "#00e5ff",
  quadShot: "#7c4dff",
  rapidFire: "#ffea00",
  bazookaMode: "#ff6d00",
  berserker: "#ff0044",
  battery: "#44ff88",
};

export const ENEMY_COLORS: Record<string, { body: string; glow: string }> = {
  standard: { body: "#1a5c1a", glow: "#2aff2a" },
  elite: { body: "#5c1a5c", glow: "#ff2aff" },
  boss: { body: "#5c0000", glow: "#ff0000" },
  mole: { body: "#5c3a1a", glow: "#c87040" },
};
