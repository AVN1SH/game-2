"use client";

import { RigidBody } from "@react-three/rapier";

/**
 * Fallback ground plane at the real city road level.
 * The GLB trimesh is the PRIMARY collider for buildings/walls.
 * This plane is the safety net so the player never falls through road gaps.
 *
 * Values at CITY_SCALE=30:
 *   CityMap raycast road Y ≈ -15  (CITY_SCALE=30, model road ~-0.52 → -15.6)
 *   We place the box top face at -14 to sit just under the road surface,
 *   so the player always has a hard floor even if trimesh has gaps.
 *
 *   City footprint at scale 30 is roughly 3x bigger than scale 10:
 *   X: [-66, 138]   Z: [-114, 87]  → centre ≈ (36, -14)
 *   Box is 400 × 400 to fully cover any spawn point.
 */
export default function GroundPlane() {
  return (
    <RigidBody type="fixed" colliders="cuboid" name="ground">
      <mesh receiveShadow position={[36, -15.5, -14]}>
        <boxGeometry args={[400, 1, 400]} />
        <meshStandardMaterial color="#888070" roughness={1} />
      </mesh>
    </RigidBody>
  );
}
