"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import * as THREE from "three";
import { useGameStore } from "@/lib/useGameStore";

// ── Real measured values (CITY_SCALE=10, CityMap raycast):
//    city centre = (12.15, -4.40)
//    road surface Y = -0.52  →  spawn Y = 1.48 (2 units above road)
//    Offsetting X and Z slightly to avoid spawning inside the center fountain/building
const SPAWN = { x: 50, y: 3, z: -10 } as const;
// If the player falls below this Y, snap them back — covers HMR physics reset edge cases
const FLOOR_KILL_Y = -30;
const EYE = 0.75;   // camera height above capsule centre

// ── Boundary: city walls footprint X[-22,46] Z[-38,29] ──────────────
const B = { minX: -22, maxX: 46, minZ: -38, maxZ: 29 } as const;

const SPEED_KB = 3;    // keyboard walk
const SPEED_SPR = 7;   // keyboard sprint
const SPEED_JOY = 3;    // joystick
const SHOT_DMG = 34;
const RELOAD_MS = 2200;

const keys: Record<string, boolean> = {};

export default function Player() {
  const bodyRef = useRef<any>(null);
  const { camera, scene } = useThree();

  const phase = useGameStore((s) => s.phase);
  const shoot = useGameStore((s) => s.shoot);
  const reload = useGameStore((s) => s.reload);
  const finishReload = useGameStore((s) => s.finishReload);

  const yaw = useRef(0);
  const pitch = useRef(0);
  const locked = useRef(false);
  const joystick = useRef({ x: 0, y: 0 });
  const reloadTm = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Camera rotation order
  useEffect(() => { camera.rotation.order = "YXZ"; }, [camera]);

  // Pointer lock
  useEffect(() => {
    const onLC = () => { locked.current = !!document.pointerLockElement; };
    const onMM = (e: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= e.movementX * 0.002;
      pitch.current -= e.movementY * 0.002;
      pitch.current = THREE.MathUtils.clamp(pitch.current, -1.1, 1.1);
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

  // ── Snap to road surface reported by CityMap ──────────────────────────
  useEffect(() => {
    // Clear any stale globals from a previous HMR cycle so we don't snap
    // against an old roadY while the new physics world is still initialising.
    delete (window as any).__cityRoadY;
    delete (window as any).__cityCX;
    delete (window as any).__cityCZ;

    let cancelled = false;
    const trySnap = (attempts = 0) => {
      if (cancelled) return;
      const cx    = (window as any).__cityCX    as number | undefined;
      const cz    = (window as any).__cityCZ    as number | undefined;
      const roadY = (window as any).__cityRoadY as number | undefined;

      // Wait until BOTH the CityMap globals AND the RigidBody are ready
      if (cx != null && cz != null && roadY != null && bodyRef.current) {
        // roadY is the actual cobblestone road surface (from CityMap raycast)
        // Spawn 2 units above it so the capsule collider lands cleanly
        const spawnY = roadY + 2.0;
        bodyRef.current.setTranslation({ x: SPAWN.x, y: spawnY, z: SPAWN.z }, true);
        bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
        console.log(`[Player] spawned at (${SPAWN.x.toFixed(1)}, ${spawnY.toFixed(1)}, ${SPAWN.z.toFixed(1)})  roadY=${roadY.toFixed(2)}`);
      } else if (attempts < 60) {
        // Retry every 300 ms for up to 18 s — long enough for slow HMR reloads
        setTimeout(() => trySnap(attempts + 1), 300);
      } else {
        // Last-resort fallback: use the hardcoded SPAWN position
        if (bodyRef.current) {
          bodyRef.current.setTranslation({ x: SPAWN.x, y: SPAWN.y, z: SPAWN.z }, true);
          bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          console.warn("[Player] snap timed out — using fallback SPAWN position");
        }
      }
    };

    // Give the physics world and CityMap a moment to initialise on first render
    // and after every HMR cycle before we start polling.
    const id = setTimeout(() => trySnap(), 800);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // ── Safety floor: if the player falls through the world (e.g. during an
    //    HMR cycle where colliders reinitialise mid-frame) snap them back.
    const curPos = bodyRef.current.translation();
    if (curPos.y < FLOOR_KILL_Y) {
      const roadY = (window as any).__cityRoadY as number | undefined;
      const snapY = roadY != null ? roadY + 2.0 : SPAWN.y;
      bodyRef.current.setTranslation({ x: SPAWN.x, y: snapY, z: SPAWN.z }, true);
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      console.warn("[Player] fell through floor — re-snapping to spawn");
      return;
    }

    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0; // Force upright so you never look sideways

    const sinY = Math.sin(yaw.current);
    const cosY = Math.cos(yaw.current);

    let dx = 0, dz = 0, spd = SPEED_KB;

    // Joystick takes priority
    if (joystick.current.x !== 0 || joystick.current.y !== 0) {
      dx = joystick.current.x;
      dz = joystick.current.y;
      spd = SPEED_JOY;
    } else {
      if (keys["KeyW"] || keys["ArrowUp"]) dz = 1;
      if (keys["KeyS"] || keys["ArrowDown"]) dz = -1;
      if (keys["KeyA"] || keys["ArrowLeft"]) dx = -1;
      if (keys["KeyD"] || keys["ArrowRight"]) dx = 1;
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
