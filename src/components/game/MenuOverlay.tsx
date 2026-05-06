"use client";

import { useGameStore } from "@/lib/useGameStore";

export default function MenuOverlay() {
  const setPhase = useGameStore((s) => s.setPhase);
  const reset    = useGameStore((s) => s.reset);

  const handleStart = () => {
    reset();
    // Small delay so state settles, then switch to playing
    setTimeout(() => {
      setPhase("playing");
      // Request pointer lock — browser allows it after a user gesture click
      document.body.requestPointerLock?.();
    }, 300);
  };

  return (
    <div className="menu-overlay">
      <h1>Dead<br />Zone</h1>
      <p className="subtitle">FPS Zombie Survival</p>

      <button id="btn-start" className="btn-start" onClick={handleStart}>
        <span>▶</span> Play Now
      </button>

      <p className="menu-tip">
        WASD · Move &nbsp;|&nbsp; Mouse · Aim &nbsp;|&nbsp; Click · Shoot<br />
        R · Reload &nbsp;|&nbsp; Shift · Sprint<br />
        <span style={{ opacity: 0.5 }}>
          Click the game window to capture your mouse
        </span>
      </p>
    </div>
  );
}
