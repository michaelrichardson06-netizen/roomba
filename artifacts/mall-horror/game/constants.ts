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
  DASH_DURATION: 120, // ms
  DASH_COOLDOWN: 1500, // ms

  // Shooting
  BASE_SHOOT_COOLDOWN: 350, // ms
  RAPID_FIRE_REDUCTION: 0.65,
  BULLET_SPEED: 14,
  BULLET_RADIUS: 5,

  // Bazooka
  BAZOOKA_SPEED: 5,
  BAZOOKA_RADIUS: 10,
  BAZOOKA_EXPLOSION_RADIUS: 250,

  // Flashlight
  FLASHLIGHT_LENGTH: 260,
  FLASHLIGHT_ANGLE: Math.PI / 3, // 60 degrees

  // Lighting
  AMBIENT_LIGHT_RADIUS: 80,

  // Enemy base stats (wave 1)
  ENEMY_SPEED_STANDARD: 1.4,
  ENEMY_SPEED_ELITE: 2.2,
  ENEMY_SPEED_BOSS: 1.0,
  ENEMY_HP_STANDARD: 30,
  ENEMY_HP_ELITE: 70,
  ENEMY_HP_BOSS: 300,
  ENEMY_RADIUS_STANDARD: 14,
  ENEMY_RADIUS_ELITE: 18,
  ENEMY_RADIUS_BOSS: 36,

  // Wave scaling
  WAVE_HP_SCALE: 0.10,
  WAVE_DENSITY_SCALE: 0.15,
  WAVE_BASE_KILLS: 12,

  // Scoring
  SCORE_STANDARD: 3,
  SCORE_ELITE: 6,
  SCORE_BOSS: 10,

  // Knockback
  KNOCKBACK_STANDARD: 6,
  KNOCKBACK_ELITE: 4,
  KNOCKBACK_BOSS: 2,

  // Screen shake
  SHAKE_DAMAGE: 8,
  SHAKE_BAZOOKA: 16,

  // Drop rates
  ELITE_DROP_CHANCE: 0.55,

  // Lamps per scene
  LAMP_COUNT: 14,

  // Spawn
  SPAWN_INTERVAL_BASE: 2200,
  MIN_SPAWN_INTERVAL: 600,
};

export const BUFF_COLORS: Record<string, string> = {
  tripleShot: "#00e5ff",
  quadShot: "#7c4dff",
  rapidFire: "#ffea00",
  bazookaMode: "#ff6d00",
};

export const ENEMY_COLORS: Record<string, { body: string; glow: string }> = {
  standard: { body: "#1a5c1a", glow: "#2aff2a" },
  elite: { body: "#5c1a5c", glow: "#ff2aff" },
  boss: { body: "#5c0000", glow: "#ff0000" },
};
