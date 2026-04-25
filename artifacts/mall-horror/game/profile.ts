import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PlayerProfile {
  level: number;        // 1 – 7500
  xp: number;           // accumulated XP within current level
  brushes: number;      // lifetime currency
  prestige: boolean;    // completed Rank-6 reset → permanent 2x multiplier
  selectedWorld: number;// 0-5
}

// Minimum level required to REACH each rank (index = rank 0-6)
export const RANK_LEVELS = [0, 10, 150, 500, 1250, 3000, 7500];
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
  return Math.floor(180 * Math.pow(level, 1.22));
}

const PROFILE_KEY = "@mallhorror_profile_v2";

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
}

export function awardXP(profile: PlayerProfile, xpGain: number): XPAwardResult {
  let { level, xp } = profile;
  let levelsGained = 0;
  xp += xpGain;
  while (level < 7500) {
    const needed = xpForLevel(level);
    if (xp >= needed) { xp -= needed; level++; levelsGained++; }
    else break;
  }
  if (level >= 7500) { level = 7500; xp = 0; }
  return { profile: { ...profile, level, xp }, levelsGained };
}

// ── Rank perks computed from a profile ──────────────────────────────────────

export interface RankPerks {
  rank: number;
  // Rank 1+: damage to standard enemies
  standardDamageBonus: number;    // e.g. 0.05 = +5%
  // Rank 4+: damage to elite/boss
  eliteDamageBonus: number;
  bossDamageBonus: number;
  // Rank 3+: battery & speed
  batteryDrainReduction: number;  // fraction of drain removed (0.10 = 10% less drain)
  speedBonus: number;             // fraction added to base speed (0.03 = +3%)
  // Rank 2: 5% chance for 2x brush pickup
  doubleBrushChance: number;      // 0.05
  // Rank 5: periodic AoE, 2x drops
  hasRank5Aoe: boolean;
  doubleBuffDropChance: boolean;
  doubleBrushDropRate: boolean;
  // Rank 6 prestige
  prestigeMultiplier: number;     // 2.0 if prestige, else 1.0
  // World difficulty applied to enemies
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
