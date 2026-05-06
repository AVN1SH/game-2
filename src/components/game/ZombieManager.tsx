"use client";

import { useState, useCallback } from "react";
import { useGameStore } from "@/lib/useGameStore";
import Zombie, { ZombieType } from "./Zombie";

interface ZombieEntry {
  id: string;
  position: [number, number, number];
  type: ZombieType;
  health: number;
  speed: number;
}

/**
 * ZombieManager keeps a live array of zombie entries.
 * WaveManager spawns into this list; individual zombies call onDeath to remove themselves.
 */
export default function ZombieManager() {
  const [zombies, setZombies] = useState<ZombieEntry[]>([]);

  const handleDeath = useCallback((id: string) => {
    setZombies((prev) => prev.filter((z) => z.id !== id));
  }, []);

  // Expose spawn function to window for WaveManager to call
  if (typeof window !== "undefined") {
    (window as any).__spawnZombie = (entry: ZombieEntry) => {
      setZombies((prev) => [...prev, entry]);
    };
  }

  return (
    <>
      {zombies.map((z) => (
        <Zombie
          key={z.id}
          id={z.id}
          position={z.position}
          type={z.type}
          health={z.health}
          speed={z.speed}
          onDeath={handleDeath}
        />
      ))}
    </>
  );
}
