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
  isImmune: boolean;    // boss only: immune until kill threshold
  webCooldown: number;  // boss only: time until next web throw
  // Mole-specific
  burrowTimer: number;
  isBurrowed: boolean;
  // Freeze state
  frozenTimer: number;  // > 0 = frozen/slowed; standard/mole = fully frozen, elite/boss = slowed
}

export interface BossWeb {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  age: number;
}

export type BuffType = "tripleShot" | "quadShot" | "rapidFire" | "bazookaMode" | "berserker" | "battery" | "lightningStrike" | "freezeWave";

export interface LightningArc {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number;
  maxLife: number;
}

export interface IceWave {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  age: number;
  maxAge: number;
  color: string;
  vy: number;
}

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
  // Battery system
  battery: number;
  maxBattery: number;
  batterySpawnTimer: number;
  // Berserker
  berserkerTimer: number;
  berserkerAutoUsed: boolean;
  // Scores / wave
  score: number;
  wave: number;
  killCount: number;
  waveTotalKills: number;
  // Entities
  enemies: Enemy[];
  bullets: Bullet[];
  explosions: Explosion[];
  particles: Particle[];
  buffDrops: BuffDrop[];
  muzzleFlash: MuzzleFlash | null;
  lamps: LampLight[];
  // FX
  screenShake: { x: number; y: number; magnitude: number };
  whiteFlash: number;
  redFlash: number;    // 0-1, set on any player damage, decays fast — visible hit feedback
  // Power-ups
  tripleShot: boolean;
  quadShot: boolean;
  rapidFireStacks: number;
  bazookaMode: boolean;
  lightningStrike: boolean;
  lightningArcs: LightningArc[];
  bossWebs: BossWeb[];
  // Freeze wave
  iceWaves: IceWave[];
  // Floating texts (IMMUNE!, etc.)
  floatingTexts: FloatingText[];
  // Cooldowns / timers
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
