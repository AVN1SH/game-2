export type ZombieType = "walk" | "run" | "crawl" | "boss";

export interface WaveConfig {
  wave: number;
  count: number;
  speed: number; // multiplier
  health: number; // hp each
  types: ZombieType[];
  spawnRadius: number;
  boss: boolean;
  breakDuration: number; // seconds before this wave starts
}

export const WAVES: WaveConfig[] = [
  {
    wave: 1,
    count: 5,
    speed: 0.8,
    health: 60,
    types: ["walk"],
    spawnRadius: 40,
    boss: false,
    breakDuration: 3,
  },
  {
    wave: 2,
    count: 12,
    speed: 1.2,
    health: 80,
    types: ["walk", "crawl"],
    spawnRadius: 55,
    boss: false,
    breakDuration: 4,
  },
  {
    wave: 3,
    count: 20,
    speed: 1.6,
    health: 100,
    types: ["walk", "run", "crawl"],
    spawnRadius: 70,
    boss: true,
    breakDuration: 5,
  },
  {
    wave: 4,
    count: 28,
    speed: 1.9,
    health: 130,
    types: ["run", "crawl"],
    spawnRadius: 80,
    boss: true,
    breakDuration: 5,
  },
  {
    wave: 5,
    count: 40,
    speed: 2.2,
    health: 160,
    types: ["run", "crawl", "boss"],
    spawnRadius: 90,
    boss: true,
    breakDuration: 6,
  },
];

/** Returns wave config, cycling and scaling for waves beyond the defined list */
export function getWaveConfig(waveNumber: number): WaveConfig {
  if (waveNumber <= WAVES.length) return WAVES[waveNumber - 1];
  // Endless scaling after wave 5
  const last = WAVES[WAVES.length - 1];
  const extra = waveNumber - WAVES.length;
  return {
    ...last,
    wave: waveNumber,
    count: last.count + extra * 8,
    speed: Math.min(last.speed + extra * 0.15, 3.5),
    health: last.health + extra * 30,
    spawnRadius: Math.min(last.spawnRadius + extra * 5, 120),
    breakDuration: 6,
  };
}
