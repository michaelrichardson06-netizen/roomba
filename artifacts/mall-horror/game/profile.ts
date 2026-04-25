import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StartingBuffs {
  tripleShot?: boolean;
  quadShot?: boolean;
  rapidFireStacks?: number;
  speedBoost?: number;
  lightningStrike?: boolean;
}

export interface PlayerProfile {
  level: number;        // 1 – 1000
  xp: number;           // accumulated XP within current level
  brushes: number;      // lifetime currency
  prestige: boolean;    // completed Rank-6 reset → permanent 2x multiplier
  selectedWorld: number;// 0-5
}

// Max level
export const MAX_LEVEL = 1000;

// Minimum level required to REACH each rank (index = rank 0-6)
export const RANK_LEVELS = [0, 10, 100, 250, 500, 750, 1000];
export const RANK_NAMES  = ["ROOKIE", "NOVICE", "AMATEUR", "ELITE", "MASTER", "LEGEND", "ASCENDED"];
export const RANK_COLORS = ["#888888", "#66ff88", "#4499ff", "#cc44ff", "#ffaa00", "#ff4422", "#ff00ff"];
export const RANK_TAGLINES = [
  "KEEP FIGHTING",
  "+5% DMG VS BUGS",
  "DOUBLE BRUSH CHANCE",
  "SPEED BURST · BATTERY SAVER",
  "BOSS BREAKER · ENHANCED COMBAT",
  "AOE BLAST · 2× DROPS",
  "ASCENDED · 2× EVERYTHING",
];

export function getRank(level: number): number {
  for (let i = RANK_LEVELS.length - 1; i >= 0; i--) {
    if (level >= RANK_LEVELS[i]) return i;
  }
  return 0;
}

// XP required to level up FROM level n to n+1
export function xpForLevel(level: number): number {
  if (level <= 0) return 100;
  return Math.floor(120 * Math.pow(level, 1.18));
}

const PROFILE_KEY = "@mallhorror_profile_v3";

export const DEFAULT_PROFILE: PlayerProfile = {
  level: 1, xp: 0, brushes: 0, prestige: false, selectedWorld: 0,
};

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(p: PlayerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

export interface XPAwardResult {
  profile: PlayerProfile;
  levelsGained: number;
  finalRank: number;
}

export function awardXP(profile: PlayerProfile, xpGain: number): XPAwardResult {
  let { level, xp } = profile;
  const startRank = getRank(level);
  let levelsGained = 0;
  xp += xpGain;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (xp >= needed) { xp -= needed; level++; levelsGained++; }
    else break;
  }
  if (level >= MAX_LEVEL) { level = MAX_LEVEL; xp = 0; }
  const finalRank = getRank(level);
  return { profile: { ...profile, level, xp }, levelsGained, finalRank };
}

// ── Rank perks computed from a profile ──────────────────────────────────────

export interface RankPerks {
  rank: number;
  standardDamageBonus: number;
  eliteDamageBonus: number;
  bossDamageBonus: number;
  batteryDrainReduction: number;
  speedBonus: number;
  doubleBrushChance: number;
  hasRank5Aoe: boolean;
  doubleBuffDropChance: boolean;
  doubleBrushDropRate: boolean;
  prestigeMultiplier: number;
  worldDifficultyMult: number;
}

export function getRankPerks(profile: PlayerProfile, worldDifficultyMult: number): RankPerks {
  const rank = getRank(profile.level);
  return {
    rank,
    standardDamageBonus : rank >= 4 ? 0.10 : rank >= 1 ? 0.05 : 0,
    eliteDamageBonus    : rank >= 4 ? 0.15 : 0,
    bossDamageBonus     : rank >= 4 ? 0.15 : 0,
    batteryDrainReduction: rank >= 3 ? 0.10 : 0,
    speedBonus          : rank >= 3 ? 0.03 : 0,
    doubleBrushChance   : rank >= 2 ? 0.05 : 0,
    hasRank5Aoe         : rank >= 5,
    doubleBuffDropChance: rank >= 5,
    doubleBrushDropRate : rank >= 5,
    prestigeMultiplier  : profile.prestige ? 2.0 : 1.0,
    worldDifficultyMult,
  };
}

// ── Buff store prices ────────────────────────────────────────────────────────
export const STORE_ITEMS = [
  { id: "tripleShot",     label: "TRIPLE SHOT",   icon: "⚡",  desc: "Fire 3 bullets per shot",     cost: 3  },
  { id: "quadShot",       label: "QUAD SHOT",     icon: "💥",  desc: "Fire 4 bullets per shot",     cost: 8  },
  { id: "rapidFire",      label: "RAPID FIRE",    icon: "🔥",  desc: "+1 rapid fire stack",          cost: 5  },
  { id: "speedBoost",     label: "SPEED BOOST",   icon: "💨",  desc: "Start with speed boost",      cost: 4  },
  { id: "lightningStrike",label: "LIGHTNING",     icon: "🌩️",  desc: "Lightning strike mode",       cost: 10 },
] as const;

export type StoreItemId = typeof STORE_ITEMS[number]["id"];
