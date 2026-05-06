"use client";

import { RigidBody } from "@react-three/rapier";

/** A large flat collider at Y=0 — the road surface the player walks on. */
export default function GroundPlane() {
  return (
    <RigidBody type="fixed" colliders="cuboid" name="ground">
      {/* The box top face sits exactly at Y=0 */}
      <mesh receiveShadow position={[73, -0.5, 65]}>
        <boxGeometry args={[800, 1, 800]} />
        <meshStandardMaterial color="#222" roughness={0.9} emissive="#1a1110" emissiveIntensity={0.2} />
      </mesh>
    </RigidBody>
  );
}
