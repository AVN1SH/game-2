"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationClip, AnimationMixer, Group, LoopOnce, MathUtils, Vector3 } from "three";
import { SkeletonUtils } from "three-stdlib";
import { useGameStore } from "@/lib/useGameStore";

export type ZombieType = "walk" | "run" | "crawl" | "boss";

interface ZombieProps {
  id: string;
  position: [number, number, number];
  type: ZombieType;
  health: number;
  speed: number;
  onDeath: (id: string) => void;
}

type AIState = "chase" | "attack" | "death";

const ATTACK_RANGE = 2.5;
const DMG = 10;
const ATK_INTERVAL = 1500; // ms
const GROUND_Y = 0;

// Find best matching clip from a list of keyword priorities
function findClip(clips: AnimationClip[], keys: string[]): AnimationClip | null {
  for (const k of keys) {
    const found = clips.find(c => c.name.toLowerCase().includes(k));
    if (found) return found;
  }
  return clips[0] ?? null;
}

export default function Zombie({
  id,
  position,
  type,
  health: initHp,
  speed,
  onDeath,
}: ZombieProps) {
  // ── GLTF (shared across all instances via Suspense cache) ─────────
  const { scene: srcScene, animations } = useGLTF("/assets/zombie.glb");

  // ── Per-instance deep clone (SkeletonUtils keeps skeleton intact) ─
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(srcScene);
    c.traverse((n: any) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.userData.isZombie = true;
      }
    });
    return c;
  }, [srcScene]);

  // ── AnimationMixer tied to THIS clone ────────────────────────────
  const mixer = useMemo(() => new AnimationMixer(cloned), [cloned]);

  // ── Refs ─────────────────────────────────────────────────────────
  const groupRef = useRef<Group>(null);
  const aiState = useRef<AIState>("chase");
  const curAction = useRef<any>(null);
  const hpRef = useRef(initHp);
  const deadRef = useRef(false);
  const deadTimer = useRef(0);
  const lastHit = useRef(0);
  const posXZ = useRef({ x: position[0], z: position[2] });

  // ── Store ─────────────────────────────────────────────────────────
  const addScore = useGameStore(s => s.addScore);
  const addKill = useGameStore(s => s.addKill);
  const zombieKilled = useGameStore(s => s.zombieKilled);
  const takeDmg = useGameStore(s => s.takeDamage);
  const { camera } = useThree();

  // ── Tag meshes for raycasting ─────────────────────────────────────
  useEffect(() => {
    cloned.traverse((n: any) => {
      if (n.isMesh) {
        n.userData.takeDamage = (d: number) => applyDmg(d);
      }
    });
  }, [cloned]);

  // ── Play first animation ─────────────────────────────────────────
  useEffect(() => {
    if (!animations.length) return;
    const clip = getClip("chase");
    if (clip) {
      const action = mixer.clipAction(clip);
      action.reset().play();
      curAction.current = action;
    }
    return () => mixer.stopAllAction();
  }, [mixer, animations]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: pick best clip for state ─────────────────────────────
  function getClip(state: AIState): AnimationClip | null {
    if (state === "death") return findClip(animations, ["death", "dying", "die"]);
    if (state === "attack") return findClip(animations, ["attack", "bite", "biting"]);
    if (type === "run" || type === "boss") {
      const r = findClip(animations, ["run"]);
      if (r) return r;
    }
    if (type === "crawl") {
      const c = findClip(animations, ["crawl"]);
      if (c) return c;
    }
    return findClip(animations, ["walk", "zombie_walk", "idle"]);
  }

  // ── Transition animations ─────────────────────────────────────────
  function playAnim(state: AIState) {
    if (aiState.current === state) return;
    const clip = getClip(state);
    if (!clip) { aiState.current = state; return; }

    const next = mixer.clipAction(clip);
    curAction.current?.fadeOut(0.2);

    if (state === "death") {
      next.reset().setLoop(LoopOnce, 1).fadeIn(0.2).play();
      next.clampWhenFinished = true;
    } else {
      next.reset().fadeIn(0.2).play();
    }
    curAction.current = next;
    aiState.current = state;
  }

  // ── Damage ────────────────────────────────────────────────────────
  function applyDmg(d: number) {
    if (deadRef.current) return;
    hpRef.current -= d;
    if (hpRef.current <= 0) die();
  }

  function die() {
    if (deadRef.current) return;
    deadRef.current = true;
    playAnim("death");
    addScore(type === "boss" ? 500 : 100);
    addKill(type);
    zombieKilled();
    deadTimer.current = 3.5;
  }

  // ── Per-frame AI + animation update ──────────────────────────────
  const _dir = useRef(new Vector3());

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Always tick animations
    mixer.update(delta);

    // Lock to ground
    groupRef.current.position.y = GROUND_Y;

    if (deadRef.current) {
      deadTimer.current -= delta;
      if (deadTimer.current <= 0) onDeath(id);
      return;
    }

    // Direction to player (XZ only)
    const dx = camera.position.x - posXZ.current.x;
    const dz = camera.position.z - posXZ.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > ATTACK_RANGE) {
      playAnim("chase");

      const spd = speed * (type === "run" || type === "boss" ? 1.4 : 1.0) * delta;
      const inv = spd / dist; // normalise inline
      posXZ.current.x += dx * inv;
      posXZ.current.z += dz * inv;

      groupRef.current.position.x = posXZ.current.x;
      groupRef.current.position.z = posXZ.current.z;

      // Face direction of travel
      groupRef.current.rotation.y = MathUtils.lerp(
        groupRef.current.rotation.y,
        Math.atan2(dx, dz),
        0.15,
      );
    } else {
      playAnim("attack");

      const now = performance.now();
      if (now - lastHit.current > ATK_INTERVAL) {
        lastHit.current = now;
        takeDmg(DMG);
      }
    }
  });

  const scale = type === "boss" ? 1.5 : type === "crawl" ? 0.7 : 1.0;

  return (
    <group
      ref={groupRef}
      position={[position[0], GROUND_Y, position[2]]}
    >
      <primitive object={cloned} scale={[scale, scale, scale]} />
    </group>
  );
}

useGLTF.preload("/assets/zombie.glb");
