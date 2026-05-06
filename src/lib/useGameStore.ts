import { create } from "zustand";

export type GamePhase = "menu" | "loading" | "playing" | "gameover";

export interface KillEntry {
  id: string;
  type: string;
  ts: number;
}

interface GameState {
  // ── Meta ──────────────────────────────────────────
  phase: GamePhase;
  setPhase: (p: GamePhase) => void;

  // ── Player ────────────────────────────────────────
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  score: number;

  takeDamage: (dmg: number) => void;
  heal: (hp: number) => void;
  shoot: () => boolean; // returns false if out of ammo
  reload: () => void;
  finishReload: () => void;
  addScore: (pts: number) => void;

  // ── Wave ──────────────────────────────────────────
  wave: number;
  zombiesAlive: number;
  zombiesRemaining: number; // left to spawn
  showWaveBanner: boolean;

  startWave: (wave: number, totalCount: number) => void;
  zombieKilled: () => void;
  zombieSpawned: () => void;
  hideBanner: () => void;

  // ── Kill feed ─────────────────────────────────────
  kills: KillEntry[];
  addKill: (type: string) => void;
  pruneKills: () => void;

  // ── Reset ─────────────────────────────────────────
  reset: () => void;
}

const INITIAL: Omit<
  GameState,
  | "setPhase"
  | "takeDamage"
  | "heal"
  | "shoot"
  | "reload"
  | "finishReload"
  | "addScore"
  | "startWave"
  | "zombieKilled"
  | "zombieSpawned"
  | "hideBanner"
  | "addKill"
  | "pruneKills"
  | "reset"
> = {
  phase: "menu",
  health: 100,
  maxHealth: 100,
  ammo: 30,
  maxAmmo: 30,
  reserveAmmo: 180,
  isReloading: false,
  score: 0,
  wave: 0,
  zombiesAlive: 0,
  zombiesRemaining: 0,
  showWaveBanner: false,
  kills: [],
};

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL,

  setPhase: (phase) => set({ phase }),

  takeDamage: (dmg) => {
    const { health, phase } = get();
    if (phase !== "playing") return;
    const next = Math.max(0, health - dmg);
    set({ health: next });
    if (next <= 0) set({ phase: "gameover" });
  },

  heal: (hp) =>
    set((s) => ({ health: Math.min(s.maxHealth, s.health + hp) })),

  shoot: () => {
    const { ammo, isReloading, phase } = get();
    if (phase !== "playing" || isReloading || ammo <= 0) return false;
    set((s) => ({ ammo: s.ammo - 1 }));
    return true;
  },

  reload: () => {
    const { ammo, maxAmmo, reserveAmmo, isReloading } = get();
    if (isReloading || ammo === maxAmmo || reserveAmmo === 0) return;
    set({ isReloading: true });
  },

  finishReload: () => {
    const { ammo, maxAmmo, reserveAmmo } = get();
    const needed = maxAmmo - ammo;
    const take = Math.min(needed, reserveAmmo);
    set({ ammo: ammo + take, reserveAmmo: reserveAmmo - take, isReloading: false });
  },

  addScore: (pts) => set((s) => ({ score: s.score + pts })),

  startWave: (wave, totalCount) =>
    set({ wave, zombiesAlive: 0, zombiesRemaining: totalCount, showWaveBanner: true }),

  zombieKilled: () =>
    set((s) => {
      const alive = Math.max(0, s.zombiesAlive - 1);
      return { zombiesAlive: alive };
    }),

  zombieSpawned: () =>
    set((s) => ({
      zombiesAlive: s.zombiesAlive + 1,
      zombiesRemaining: Math.max(0, s.zombiesRemaining - 1),
    })),

  hideBanner: () => set({ showWaveBanner: false }),

  addKill: (type) =>
    set((s) => ({
      kills: [
        ...s.kills.slice(-4), // keep last 4
        { id: Math.random().toString(36).slice(2), type, ts: Date.now() },
      ],
    })),

  pruneKills: () =>
    set((s) => ({
      kills: s.kills.filter((k) => Date.now() - k.ts < 2500),
    })),

  reset: () =>
    set({
      ...INITIAL,
      phase: "loading",
      kills: [],
    }),
}));
