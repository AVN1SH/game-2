"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import * as THREE from "three";
import { useGameStore } from "@/lib/useGameStore";

// ── City centre: X=73, Z=65 ────────
const SPAWN = { x: 73, y: 5, z: 65 } as const;
const EYE   = 0.75;   // camera above capsule centre

// ── Boundary (keep player inside city) ────────────────────────────
const B = { minX: -5, maxX: 150, minZ: -60, maxZ: 190 } as const;

const SPEED_KB  = 7;    // keyboard walk
const SPEED_SPR = 12;   // keyboard sprint
const SPEED_JOY = 3;    // joystick (slower for thumb control)
const SHOT_DMG  = 34;
const RELOAD_MS = 2200;

const keys: Record<string, boolean> = {};

export default function Player() {
  const bodyRef = useRef<any>(null);
  const { camera, scene } = useThree();

  const phase        = useGameStore((s) => s.phase);
  const shoot        = useGameStore((s) => s.shoot);
  const reload       = useGameStore((s) => s.reload);
  const finishReload = useGameStore((s) => s.finishReload);

  const yaw      = useRef(0);
  const pitch    = useRef(0);
  const locked   = useRef(false);
  const joystick = useRef({ x: 0, y: 0 });
  const reloadTm = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Camera rotation order
  useEffect(() => { camera.rotation.order = "YXZ"; }, [camera]);

  // Pointer lock
  useEffect(() => {
    const onLC = () => { locked.current = !!document.pointerLockElement; };
    const onMM = (e: MouseEvent) => {
      if (!locked.current) return;
      yaw.current   -= e.movementX * 0.002;
      pitch.current -= e.movementY * 0.002;
      pitch.current  = THREE.MathUtils.clamp(pitch.current, -1.1, 1.1);
    };
    document.addEventListener("pointerlockchange", onLC);
    document.addEventListener("mousemove", onMM);
    return () => {
      document.removeEventListener("pointerlockchange", onLC);
      document.removeEventListener("mousemove", onMM);
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys[e.code] = true; if (e.code === "KeyR") triggerReload(); };
    const up = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse shoot
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (e.button !== 0 || phase !== "playing" || !locked.current) return;
      doShoot();
    };
    window.addEventListener("mousedown", fn);
    return () => window.removeEventListener("mousedown", fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Mobile joystick bridge
  useEffect(() => {
    (window as any).__setJoystickDir = (x: number, y: number) => { joystick.current = { x, y }; };
  }, []);

  function triggerReload() {
    reload();
    if (reloadTm.current) clearTimeout(reloadTm.current);
    reloadTm.current = setTimeout(() => finishReload(), RELOAD_MS);
  }

  const rc = new THREE.Raycaster();
  function doShoot() {
    if (!shoot()) { triggerReload(); return; }
    rc.setFromCamera({ x: 0, y: 0 }, camera);
    for (const hit of rc.intersectObjects(scene.children, true)) {
      let o: any = hit.object;
      while (o) { if (o.userData?.isZombie) { o.userData.takeDamage?.(SHOT_DMG); break; } o = o.parent; }
      break;
    }
  }

  // Per-frame: move + look + boundary
  useFrame((_, delta) => {
    if (phase !== "playing" || !bodyRef.current) return;

    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    const sinY = Math.sin(yaw.current);
    const cosY = Math.cos(yaw.current);

    let dx = 0, dz = 0, spd = SPEED_KB;

    // Joystick takes priority
    if (joystick.current.x !== 0 || joystick.current.y !== 0) {
      dx = joystick.current.x;
      dz = joystick.current.y;
      spd = SPEED_JOY;
    } else {
      if (keys["KeyW"] || keys["ArrowUp"])    dz =  1;
      if (keys["KeyS"] || keys["ArrowDown"])  dz = -1;
      if (keys["KeyA"] || keys["ArrowLeft"])  dx = -1;
      if (keys["KeyD"] || keys["ArrowRight"]) dx =  1;
      if (keys["ShiftLeft"] || keys["ShiftRight"]) spd = SPEED_SPR;
    }

    let vx = 0, vz = 0;
    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      vx = (-sinY * (dz / len) + cosY * (dx / len)) * spd;
      vz = (-cosY * (dz / len) - sinY * (dx / len)) * spd;
    }

    // Keep Rapier's gravity (Y), override horizontal
    const vel = bodyRef.current.linvel();
    bodyRef.current.setLinvel({ x: vx, y: vel.y, z: vz }, true);

    // Read position, clamp to boundary
    let pos = bodyRef.current.translation();
    const cx = THREE.MathUtils.clamp(pos.x, B.minX, B.maxX);
    const cz = THREE.MathUtils.clamp(pos.z, B.minZ, B.maxZ);
    if (cx !== pos.x || cz !== pos.z) {
      bodyRef.current.setTranslation({ x: cx, y: pos.y, z: cz }, true);
      bodyRef.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
      pos = bodyRef.current.translation();
    }

    // Sync camera
    camera.position.set(pos.x, pos.y + EYE, pos.z);
    (window as any).__playerPos = { x: pos.x, z: pos.z };
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      type="dynamic"
      ccd={true}
      position={[SPAWN.x, SPAWN.y, SPAWN.z]}
      enabledRotations={[false, false, false]}
      linearDamping={8}
      mass={80}
    >
      <CapsuleCollider args={[0.4, 0.35]} />
    </RigidBody>
  );
}
