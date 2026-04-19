import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export type GamePhase = "menu" | "playing" | "dead";

export interface Buff {
  type: "tripleShot" | "quadShot" | "rapidFire" | "bazookaMode";
  stacks?: number;
}

export interface ActiveBuffs {
  tripleShot: boolean;
  quadShot: boolean;
  rapidFireStacks: number;
  bazookaMode: boolean;
}

export interface GameStats {
  score: number;
  wave: number;
  killCount: number;
  waveTotalKills: number;
  hp: number;
  maxHp: number;
  activeBuffs: ActiveBuffs;
}

export interface GameResult {
  score: number;
  wavesCleared: number;
  insectsExterminated: number;
}

interface GameContextType {
  phase: GamePhase;
  stats: GameStats;
  lastResult: GameResult | null;
  startGame: () => void;
  endGame: (result: GameResult) => void;
  returnToMenu: () => void;
  updateStats: (updater: (prev: GameStats) => GameStats) => void;
}

const DEFAULT_STATS: GameStats = {
  score: 0,
  wave: 1,
  killCount: 0,
  waveTotalKills: 0,
  hp: 200,
  maxHp: 200,
  activeBuffs: {
    tripleShot: false,
    quadShot: false,
    rapidFireStacks: 0,
    bazookaMode: false,
  },
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  const startGame = useCallback(() => {
    setStats({ ...DEFAULT_STATS });
    setPhase("playing");
  }, []);

  const endGame = useCallback((result: GameResult) => {
    setLastResult(result);
    setPhase("dead");
  }, []);

  const returnToMenu = useCallback(() => {
    setPhase("menu");
    setLastResult(null);
  }, []);

  const updateStats = useCallback(
    (updater: (prev: GameStats) => GameStats) => {
      setStats(updater);
    },
    []
  );

  return (
    <GameContext.Provider
      value={{ phase, stats, lastResult, startGame, endGame, returnToMenu, updateStats }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
