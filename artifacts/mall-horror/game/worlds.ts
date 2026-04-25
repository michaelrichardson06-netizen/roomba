export interface WorldDef {
  id: number;
  name: string;
  subtitle: string;
  recommendedLevel: number;
  themeColor: string;   // primary accent colour
  floorTint: string;    // canvas floor background
  ambientColor: string; // lamp / ambient tint
  icon: string;         // emoji
}

export const WORLDS: WorldDef[] = [
  {
    id: 0, name: "WESTVIEW MALL",  subtitle: "Default Mall",
    recommendedLevel: 1,
    themeColor: "#ff4422", floorTint: "#1a1310", ambientColor: "#ffcc66", icon: "🏬",
  },
  {
    id: 1, name: "REDLINE SUBWAY", subtitle: "Subway Mall",
    recommendedLevel: 150,
    themeColor: "#4488ff", floorTint: "#0d1020", ambientColor: "#4488ff", icon: "🚇",
  },
  {
    id: 2, name: "TERMINAL 7",     subtitle: "Airport",
    recommendedLevel: 500,
    themeColor: "#44ffcc", floorTint: "#0f1a18", ambientColor: "#44ffcc", icon: "✈️",
  },
  {
    id: 3, name: "WHISPERWOOD",    subtitle: "Forest Horror",
    recommendedLevel: 1250,
    themeColor: "#44ff44", floorTint: "#0a1208", ambientColor: "#44ff44", icon: "🌲",
  },
  {
    id: 4, name: "CRUCIBLE WORKS", subtitle: "Industrial",
    recommendedLevel: 3000,
    themeColor: "#ff8800", floorTint: "#1a1008", ambientColor: "#ff8800", icon: "⚙️",
  },
  {
    id: 5, name: "SECTOR ZERO",    subtitle: "Final Boss",
    recommendedLevel: 7500,
    themeColor: "#ff00ff", floorTint: "#0d000d", ambientColor: "#ff00ff", icon: "☠️",
  },
];

export function getWorldById(id: number): WorldDef {
  return WORLDS[Math.max(0, Math.min(id, WORLDS.length - 1))];
}

/**
 * Returns a multiplier applied to enemy HP + damage when the player enters a world.
 * At recommended level → 1.0.
 * Underleveled → up to 6× harder.
 * Overleveled → down to 0.75 (slight ease).
 */
export function getWorldDifficultyMult(recommendedLevel: number, playerLevel: number): number {
  if (playerLevel >= recommendedLevel) {
    return Math.max(0.75, 1 - (playerLevel - recommendedLevel) * 0.00005);
  }
  const ratio = recommendedLevel / playerLevel;
  return Math.min(6.0, Math.pow(ratio, 0.8));
}

/** Human-readable difficulty label + colour for the world select screen. */
export function getWorldDifficultyLabel(recommendedLevel: number, playerLevel: number): { label: string; color: string } {
  const ratio = recommendedLevel / playerLevel;
  if (playerLevel >= recommendedLevel) return { label: "EASY",        color: "#44ff88" };
  if (ratio < 1.25)                    return { label: "NORMAL",      color: "#88eeaa" };
  if (ratio < 2)                       return { label: "HARD",        color: "#ffcc00" };
  if (ratio < 4)                       return { label: "EXTREME",     color: "#ff6600" };
  return                                      { label: "DEATH ZONE",  color: "#ff2222" };
}
