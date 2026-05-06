"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useGameStore } from "@/lib/useGameStore";
import HUD from "@/components/game/HUD";
import MenuOverlay from "@/components/game/MenuOverlay";
import GameOverOverlay from "@/components/game/GameOverOverlay";

// Dynamic import so Three.js never hits the SSR path
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <h2>Loading Dead Zone…</h2>
      <div className="loading-bar-track">
        <div className="loading-bar-fill" />
      </div>
    </div>
  ),
});

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);

  return (
    <main style={{ width: "100vw", height: "100vh", background: "#000" }}>
      {/* The 3-D canvas is always mounted so assets can preload */}
      <GameCanvas />

      {/* 2-D HUD on top */}
      {phase === "playing" && <HUD />}

      {/* Overlays */}
      {phase === "menu" && <MenuOverlay />}
      {phase === "gameover" && <GameOverOverlay />}
    </main>
  );
}
