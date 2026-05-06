"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { Box3, Vector3 } from "three";

const CITY_SCALE = 10;

export default function CityMap() {
  const { scene } = useGLTF("/assets/city-compressed.glb");

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    const box = new Box3().setFromObject(scene);
    const center = new Vector3();
    box.getCenter(center);
    const cx = center.x * CITY_SCALE;
    const cz = center.z * CITY_SCALE;
    console.log(`[City] centre world: (${cx.toFixed(1)}, ${cz.toFixed(1)})  Y min:${(box.min.y*CITY_SCALE).toFixed(1)} max:${(box.max.y*CITY_SCALE).toFixed(1)}`);

    // Expose city centre so WaveManager can spawn relative to it
    (window as any).__cityCX = cx;
    (window as any).__cityCZ = cz;
  }, [scene]);

  return (
    // scale={10} only — NO rotation, NO position offset
    // Road surface is at whatever Y the model places it at
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} scale={CITY_SCALE} />
    </RigidBody>
  );
}

useGLTF.preload("/assets/city-compressed.glb");
