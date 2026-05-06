"use client";

import { useGameStore } from "@/lib/useGameStore";

export default function GameOverOverlay() {
  const score = useGameStore((s) => s.score);
  const wave = useGameStore((s) => s.wave);
  const reset = useGameStore((s) => s.reset);
  const setPhase = useGameStore((s) => s.setPhase);

  const handleRestart = () => {
    reset();
    setTimeout(() => setPhase("playing"), 600);
  };

  const handleMenu = () => {
    reset();
    setPhase("menu");
  };

  return (
    <div className="gameover-overlay">
      <h1>You Died</h1>

      <div className="final-score">
        Score: <strong>{score.toLocaleString()}</strong>
      </div>
      <div className="final-score" style={{ fontSize: 14 }}>
        Survived to Wave <strong style={{ fontSize: 20 }}>{wave}</strong>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <button id="btn-restart" className="btn-start" onClick={handleRestart}>
          ↺ Try Again
        </button>
        <button
          id="btn-menu"
          className="btn-start"
          onClick={handleMenu}
          style={{ background: "rgba(255,255,255,0.08)", boxShadow: "none" }}
        >
          ⌂ Menu
        </button>
      </div>
    </div>
  );
}
