"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { useGameStore } from "@/lib/useGameStore";
import Player from "./Player";
import CityMap from "./CityMap";
import ZombieManager from "./ZombieManager";
import WaveManager from "./WaveManager";
import Lighting from "./Lighting";
import Gun from "./Gun";
import GroundPlane from "./GroundPlane";

export default function GameCanvas() {
  const phase = useGameStore((s) => s.phase);

  return (
    <Canvas
      shadows
      camera={{ fov: 75, near: 0.05, far: 500, position: [18.0, 2.23, 0.0] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))}
      style={{ width: "100%", height: "100%" }}
      onClick={() => phase === "playing" && document.body.requestPointerLock?.()}
    >
      {/* Must exactly match fog color in Lighting.tsx to avoid seam at fog edge */}
      <color attach="background" args={["#1a1f14"]} />

      <Suspense fallback={null}>
        <Lighting />

        {/* All physics objects in one provider */}
        <Physics gravity={[0, -20, 0]} timeStep="vary">
          <GroundPlane />
          <CityMap />
          <Player />
          <ZombieManager />
          <WaveManager />
        </Physics>

        {/* Gun is purely visual — no physics */}
        <Gun />
      </Suspense>

      {process.env.NODE_ENV === "development" && <Stats />}
    </Canvas>
  );
}
