"use client";

import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { Box3, Vector3, Raycaster } from "three";

// Scale 30 → city becomes ~210 units wide (large realistic scale)
export const CITY_SCALE = 30;

export default function CityMap() {
  const { scene } = useGLTF("/assets/old_town.glb");

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
        // Render from both sides so interior walls/roofs are visible
        if (child.material) {
          child.material.side = 2; // THREE.DoubleSide
        }
      }
    });

    // Bounding box in world space (after scale applied by <primitive>)
    const box = new Box3().setFromObject(scene);
    const center = new Vector3();
    box.getCenter(center);

    const cx   = center.x * CITY_SCALE;
    const cz   = center.z * CITY_SCALE;
    const minY = box.min.y * CITY_SCALE;
    const maxY = box.max.y * CITY_SCALE;

    console.log(
      `[OldTown] AABB X:[${(box.min.x*CITY_SCALE).toFixed(1)}, ${(box.max.x*CITY_SCALE).toFixed(1)}]` +
      `  Y:[${minY.toFixed(1)}, ${maxY.toFixed(1)}]` +
      `  Z:[${(box.min.z*CITY_SCALE).toFixed(1)}, ${(box.max.z*CITY_SCALE).toFixed(1)}]`
    );

    // ── Find the actual road surface with a downward raycast into the GLB scene ──
    // The scene object's coordinates are in model-space (scale=1), so we
    // divide by CITY_SCALE to get model-space coords for the ray.
    const msCX = center.x;   // model-space centre X
    const msCZ = center.z;   // model-space centre Z
    const msMY = box.min.y;  // model-space AABB bottom

    const ray = new Raycaster(
      new Vector3(msCX, box.max.y + 1, msCZ),  // start above roof
      new Vector3(0, -1, 0),                    // downward
      0,
      (box.max.y - box.min.y) + 10             // full height of model
    );

    const hits = ray.intersectObjects(scene.children, true);
    console.log(`[OldTown] road raycast hits: ${hits.length}`);
    hits.forEach((h, i) => {
      if (i < 8) console.log(`  hit[${i}] Y=${(h.point.y * CITY_SCALE).toFixed(2)} name=${(h.object as any).name}`);
    });

    // Road surface = lowest hit that is still inside the city walls
    // (ignore bottom-of-wall hits which are below the street floor)
    // We look for a cluster of hits; the road is usually the SECOND hit from top
    // (first = roof/top, second = road if city is open-top, but it's walled)
    // Strategy: take the hit closest to 35% of height from top as road estimate
    const targetY = box.max.y - (box.max.y - box.min.y) * 0.35;
    let roadHit = hits.reduce((best: any, h) => {
      const dist = Math.abs(h.point.y - targetY);
      return (best === null || dist < Math.abs(best.point.y - targetY)) ? h : best;
    }, null);

    let roadY = roadHit ? roadHit.point.y * CITY_SCALE : minY;
    console.log(`[OldTown] road surface Y=${roadY.toFixed(2)}  (model space=${(roadY/CITY_SCALE).toFixed(3)})`);

    // Share with Player & WaveManager
    (window as any).__cityCX    = cx;
    (window as any).__cityCZ    = cz;
    (window as any).__cityRoadY = roadY;
    (window as any).__cityMaxY  = maxY;
    (window as any).__cityMinX  = box.min.x * CITY_SCALE;
    (window as any).__cityMaxX  = box.max.x * CITY_SCALE;
    (window as any).__cityMinZ  = box.min.z * CITY_SCALE;
    (window as any).__cityMaxZ  = box.max.z * CITY_SCALE;
    (window as any).__cityScene = scene;  // expose for Player raycasting
    // Cleanup: wipe globals on unmount so that HMR cycles start fresh.
    // Player.tsx also clears these, but doing it here too is belt-and-suspenders.
    return () => {
      delete (window as any).__cityCX;
      delete (window as any).__cityCZ;
      delete (window as any).__cityRoadY;
      delete (window as any).__cityMaxY;
      delete (window as any).__cityMinX;
      delete (window as any).__cityMaxX;
      delete (window as any).__cityMinZ;
      delete (window as any).__cityMaxZ;
      delete (window as any).__cityScene;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <primitive object={scene} scale={CITY_SCALE} />
    </RigidBody>
  );
}

useGLTF.preload("/assets/old_town.glb");
