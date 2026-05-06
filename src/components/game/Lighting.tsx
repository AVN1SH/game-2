"use client";

/** Bright sunset — warm golden light, clear visibility */
export default function Lighting() {
  return (
    <>
      {/* Strong warm ambient — nothing in the scene is dark */}
      <ambientLight intensity={2.5} color="#ffe8cc" />

      {/* Main sun — low sunset angle, golden */}
      <directionalLight
        castShadow
        position={[120, 50, 80]}
        intensity={4.0}
        color="#ffcc44"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={600}
        shadow-camera-left={-250}
        shadow-camera-right={250}
        shadow-camera-top={250}
        shadow-camera-bottom={-250}
        shadow-bias={-0.001}
      />

      {/* Warm fill from opposite side to soften shadows */}
      <directionalLight position={[-80, 30, -60]} intensity={1.8} color="#ffddaa" />

      {/* Sky/ground hemisphere */}
      <hemisphereLight args={["#ffd580", "#c06020", 1.2]} />

      {/* Light haze — starts very far so full city is visible */}
      <fog attach="fog" args={["#ff9944", 300, 700]} />
    </>
  );
}
