"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Box3, Vector3 } from "three";

/**
 * Gun viewmodel rendered as a camera child.
 * We add a Group to camera.children directly — no R3F scene graph parenting.
 * The group stays in camera-local space, always in view.
 */
export default function Gun() {
  const { scene } = useGLTF("/assets/m4-gun.glb");
  const { camera } = useThree();

  const gunGroup = useMemo(() => {
    const group = new Group();
    const model = scene.clone(true);

    // Auto-scale so gun is ~0.35m tall/wide
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 0.35 / maxDim : 1;
    model.scale.setScalar(scale);

    // Disable frustum culling — it MUST always render
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.frustumCulled = false;
        child.castShadow = false;
      }
    });

    group.add(model);
    return group;
  }, [scene]);

  useEffect(() => {
    // Position in camera-local space (right, down, forward)
    gunGroup.position.set(0.26, -0.20, -0.45);
    gunGroup.rotation.set(0.05, Math.PI, 0);

    camera.add(gunGroup);
    return () => {
      camera.remove(gunGroup);
    };
  }, [camera, gunGroup]);

  // Subtle idle bob animation
  useFrame(() => {
    const t = performance.now() * 0.001;
    gunGroup.position.y = -0.20 + Math.sin(t * 1.5) * 0.004;
    gunGroup.position.x =  0.26 + Math.sin(t * 0.9) * 0.003;
  });

  // No JSX — this component manages the group imperatively
  return null;
}

useGLTF.preload("/assets/m4-gun.glb");
