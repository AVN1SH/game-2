"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/lib/useGameStore";
import { getWaveConfig } from "@/lib/waveConfig";
import type { ZombieType } from "./Zombie";

const SPAWN_INTERVAL = 1.5; // seconds between each zombie spawn

export default function WaveManager() {
  const phase = useGameStore((s) => s.phase);
  const wave = useGameStore((s) => s.wave);
  const zombiesAlive = useGameStore((s) => s.zombiesAlive);
  const zombiesRemaining = useGameStore((s) => s.zombiesRemaining);
  const startWave = useGameStore((s) => s.startWave);
  const zombieSpawned = useGameStore((s) => s.zombieSpawned);
  const hideBanner = useGameStore((s) => s.hideBanner);

  const spawnTimer = useRef(0);
  const breakTimer = useRef(0);
  const waitingForBreak = useRef(false);
  const initialized = useRef(false);

  // Start wave 1 when game starts
  useEffect(() => {
    if (phase === "playing" && !initialized.current) {
      initialized.current = true;
      launchWave(1);
    }
    if (phase !== "playing") {
      initialized.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function launchWave(waveNum: number) {
    const cfg = getWaveConfig(waveNum);
    startWave(waveNum, cfg.count);
    breakTimer.current = cfg.breakDuration;
    waitingForBreak.current = false;
    spawnTimer.current = 0;

    // Hide banner after 3s
    setTimeout(() => hideBanner(), 3000);
  }

  function spawnOneZombie(waveNum: number) {
    const cfg = getWaveConfig(waveNum);
    const angle = Math.random() * Math.PI * 2;
    const r = cfg.spawnRadius * (0.8 + Math.random() * 0.2);
    const px = (window as any).__playerPos?.x ?? 0;
    const pz = (window as any).__playerPos?.z ?? 0;
    const x = px + Math.cos(angle) * r;
    const z = pz + Math.sin(angle) * r;

    const typeRoll = Math.random();
    let type: ZombieType = "walk";
    const types = cfg.types;
    if (types.includes("boss") && typeRoll < 0.05) type = "boss";
    else if (types.includes("crawl") && typeRoll < 0.2) type = "crawl";
    else if (types.includes("run") && typeRoll < 0.5) type = "run";
    else type = "walk";

    const groundY = (window as any).__groundY ?? 0;
    const entry = {
      id: `z-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      position: [x, 5, z] as [number, number, number],
      type,
      health: cfg.health * (type === "boss" ? 5 : 1),
      speed: cfg.speed * (type === "boss" ? 0.8 : 1),
    };

    (window as any).__spawnZombie?.(entry);
    zombieSpawned();
  }

  useFrame((_, delta) => {
    if (phase !== "playing") return;

    // Still in break period before first spawn
    if (breakTimer.current > 0) {
      breakTimer.current -= delta;
      return;
    }

    // Spawn remaining zombies for current wave
    if (zombiesRemaining > 0) {
      spawnTimer.current -= delta;
      if (spawnTimer.current <= 0) {
        spawnTimer.current = SPAWN_INTERVAL;
        spawnOneZombie(wave);
      }
      return;
    }

    // All spawned — wait for all to die, then next wave
    if (zombiesAlive === 0 && !waitingForBreak.current) {
      waitingForBreak.current = true;
      setTimeout(() => {
        launchWave(wave + 1);
        waitingForBreak.current = false;
      }, 5000); // 5s between waves
    }
  });

  return null;
}
