"use client";

import { useRef, useEffect, useMemo } from "react";

import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { Group, AnimationMixer, AnimationClip, Vector3, MathUtils } from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
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
const ATTACK_RANGE = 2.2;
const DMG = 10;
const ATK_INTERVAL = 1400;
const GROUND_Y = 0; // road surface

function findClip(clips: AnimationClip[], keys: string[]) {
  for (const k of keys) {
    const c = clips.find(cl => cl.name.toLowerCase().includes(k.toLowerCase()));
    if (c) return c;
  }
  return clips[0] ?? null;
}

export default function Zombie({ id, position, type, health: initHp, speed, onDeath }: ZombieProps) {
  const { scene: src, animations } = useGLTF("/assets/zombie.glb");
  const bodyRef   = useRef<any>(null);
  const groupRef  = useRef<Group>(null);
  const aiState   = useRef<AIState | null>(null);
  const curAction = useRef<any>(null);
  const hp        = useRef(initHp);
  const dead      = useRef(false);
  const deadTimer = useRef(0);
  const lastHit   = useRef(0);

  const addScore     = useGameStore((s) => s.addScore);
  const addKill      = useGameStore((s) => s.addKill);
  const zombieKilled = useGameStore((s) => s.zombieKilled);
  const takeDmg      = useGameStore((s) => s.takeDamage);
  const { camera }   = useThree();

  const cloned = useMemo(() => SkeletonUtils.clone(src), [src]);
  const mixer  = useMemo(() => new AnimationMixer(cloned), [cloned]);

  // Tag meshes for raycasting when cloned object loads
  useEffect(() => {
    cloned.traverse((n: any) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.userData.isZombie   = true;
        n.userData.takeDamage = (d: number) => applyDmg(d);
      }
    });
  }, [cloned]);

  // Start walk animation initially
  useEffect(() => {
    if (!animations.length) return;
    playAnim("chase");
    return () => mixer.stopAllAction();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, animations]);

  function pickClip(state: AIState) {
    if (state === "death")  return findClip(animations, ["death", "dying"]);
    if (state === "attack") return findClip(animations, ["attack", "biting", "bite", "neck"]);
    if (type === "run" || type === "boss") {
      const r = findClip(animations, ["run"]);
      if (r) return r;
    }
    if (type === "crawl") {
      const c = findClip(animations, ["crawl"]);
      if (c) return c;
    }
    return findClip(animations, ["walk", "idle"]);
  }

  function playAnim(state: AIState) {
    if (aiState.current === state) return;
    const clip = pickClip(state);
    if (!clip) return;
    const next = mixer.clipAction(clip);
    
    curAction.current?.fadeOut(0.25);
    if (state === "death") {
      next.reset().setLoop(2200, 1).fadeIn(0.25).play(); // LoopOnce is 2200
      next.clampWhenFinished = true;
    } else {
      next.reset().fadeIn(0.25).play();
    }
    curAction.current = next;
    aiState.current = state;
  }

  function applyDmg(d: number) {
    if (dead.current) return;
    hp.current -= d;
    if (hp.current <= 0) die();
  }

  function die() {
    if (dead.current) return;
    dead.current = true;
    playAnim("death");
    addScore(type === "boss" ? 500 : 100);
    addKill(type);
    zombieKilled();
    deadTimer.current = 3.5;
  }

  const dir = new Vector3();

  useFrame((_, delta) => {
    if (!groupRef.current || !bodyRef.current) return;
    mixer.update(delta);

    const pos = bodyRef.current.translation();
    
    // Lock visual mesh to physics body (capsule foot offset)
    groupRef.current.position.set(pos.x, pos.y - 0.85, pos.z);

    if (dead.current) {
      deadTimer.current -= delta;
      if (deadTimer.current <= 0) onDeath(id);
      return;
    }

    // Chase player in X,Z only 
    dir.set(
      camera.position.x - pos.x,
      0,
      camera.position.z - pos.z
    );
    const dist = dir.length();

    if (dist > ATTACK_RANGE) {
      if (aiState.current !== "chase") playAnim("chase");
      dir.normalize();
      const spd = speed * (type === "run" || type === "boss" ? 1.35 : 1);
      
      const vel = bodyRef.current.linvel();
      bodyRef.current.setLinvel({ x: dir.x * spd, y: vel.y, z: dir.z * spd }, true);

      groupRef.current.rotation.y = MathUtils.lerp(
        groupRef.current.rotation.y, Math.atan2(dir.x, dir.z), 0.12
      );
    } else {
      if (aiState.current !== "attack") playAnim("attack");
      
      bodyRef.current.setLinvel({ x: 0, y: bodyRef.current.linvel().y, z: 0 }, true);
      
      const now = performance.now();
      if (now - lastHit.current > ATK_INTERVAL) {
        lastHit.current = now;
        takeDmg(DMG);
      }
    }
  });

  const scale = type === "boss" ? 1.5 : type === "crawl" ? 0.7 : 1.0;

  return (
    <>
      <RigidBody
        ref={bodyRef}
        colliders={false}
        type="dynamic"
        position={position}
        enabledRotations={[false, false, false]}
        linearDamping={3}
        mass={70}
      >
        <CapsuleCollider args={[0.5, 0.35]} />
      </RigidBody>

      <group ref={groupRef} position={[position[0], position[1] - 0.85, position[2]]}>
        <primitive object={cloned} scale={scale} />
      </group>
    </>
  );
}

useGLTF.preload("/assets/zombie.glb");
