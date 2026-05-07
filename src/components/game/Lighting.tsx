"use client";

/**
 * Eerie night / dusk atmosphere.
 *
 * Fog design:
 *   - THREE.Fog(color, near, far) is inherently centred on the camera,
 *     so it's already "clear around the player" by definition.
 *   - near = 15  → clean visibility up to 15 m
 *   - far  = 38  → completely obscured at 38 m
 *   - Zombies spawn 20–32 m away, so they always materialise inside the fog
 *     and are invisible at the moment of spawn. They walk INTO view.
 */
export default function Lighting() {
  // Fog colour — a muted, eerie greenish-grey that sells the horror mood
  const FOG_COLOR = "#1a1f14";

  return (
    <>
      {/* ── Fog (player-centred, hides zombie spawn) ───────────────── */}
      <fog attach="fog" args={[FOG_COLOR, -2, 22]} />

      {/* ── Ambient: very dim so fog feels thick, not washed-out ────── */}
      <ambientLight intensity={0.4} color="#8faabf" />

      {/* ── Moon / cold overhead fill ─────────────────────────────── */}
      <directionalLight
        castShadow
        position={[60, 80, 40]}
        intensity={1.2}
        color="#b0c8e8"
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

      {/* ── Dim warm ground-bounce (city lanterns feel) ───────────── */}
      <directionalLight
        position={[-40, 10, -30]}
        intensity={0.5}
        color="#ff8844"
      />

      {/* ── Hemisphere: dark sky, darker ground ───────────────────── */}
      <hemisphereLight args={["#1a2030", "#0a0f08", 0.6]} />

      {/* ── A handful of subtle point lights to break up the dark ─── */}
      {/* Street-corner lantern glow (orange) */}
      <pointLight position={[30, 4, -5]} intensity={8} color="#ff7722" distance={30} decay={2} />
      <pointLight position={[10, 4, 10]} intensity={6} color="#ff9933" distance={25} decay={2} />
      <pointLight position={[50, 4, -20]} intensity={7} color="#ff6611" distance={28} decay={2} />
      {/* Cool blue accent (moonlight through alley) */}
      <pointLight position={[20, 6, -25]} intensity={5} color="#4488cc" distance={20} decay={2} />
    </>
  );
}
