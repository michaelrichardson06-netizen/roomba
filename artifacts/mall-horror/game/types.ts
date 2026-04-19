export interface Vec2 {
  x: number;
  y: number;
}

export type EnemyType = "standard" | "elite" | "boss" | "mole";

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  radius: number;
  knockbackX: number;
  knockbackY: number;
  hitFlash: number;
  angle: number;
  legPhase: number;
  damageCooldown: number;
  // Mole-specific
  burrowTimer: number;
  isBurrowed: boolean;
}

export type BuffType = "tripleShot" | "quadShot" | "rapidFire" | "bazookaMode";

export interface BuffDrop {
  id: string;
  x: number;
  y: number;
  type: BuffType;
  pulse: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isBazooka: boolean;
  trail: Array<{ x: number; y: number }>;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  age: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface MuzzleFlash {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  angle: number;
}

export interface LampLight {
  x: number;
  y: number;
  radius: number;
  flicker: number;
  flickerTarget: number;
  color: string;
}

export interface GameState {
  playerX: number;
  playerY: number;
  playerAngle: number;
  playerVx: number;
  playerVy: number;
  hp: number;
  maxHp: number;
  score: number;
  wave: number;
  killCount: number;
  waveTotalKills: number;
  enemies: Enemy[];
  bullets: Bullet[];
  explosions: Explosion[];
  particles: Particle[];
  buffDrops: BuffDrop[];
  muzzleFlash: MuzzleFlash | null;
  lamps: LampLight[];
  screenShake: { x: number; y: number; magnitude: number };
  whiteFlash: number;
  tripleShot: boolean;
  quadShot: boolean;
  rapidFireStacks: number;
  bazookaMode: boolean;
  shootCooldown: number;
  dashCooldown: number;
  isDashing: boolean;
  dashDx: number;
  dashDy: number;
  dashTime: number;
  spawnTimer: number;
  spawnGrace: number;
  bossSpawned: boolean;
  phase: "playing" | "dead";
  totalInsects: number;
  mapWidth: number;
  mapHeight: number;
}
