"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/useGameStore";

export default function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const ammo = useGameStore((s) => s.ammo);
  const maxAmmo = useGameStore((s) => s.maxAmmo);
  const reserveAmmo = useGameStore((s) => s.reserveAmmo);
  const isReloading = useGameStore((s) => s.isReloading);
  const score = useGameStore((s) => s.score);
  const wave = useGameStore((s) => s.wave);
  const zombiesAlive = useGameStore((s) => s.zombiesAlive);
  const zombiesRemaining = useGameStore((s) => s.zombiesRemaining);
  const showWaveBanner = useGameStore((s) => s.showWaveBanner);
  const kills = useGameStore((s) => s.kills);
  const pruneKills = useGameStore((s) => s.pruneKills);

  const vignetteRef = useRef<HTMLDivElement>(null);
  const prevHealth = useRef(health);

  // Flash vignette on damage
  useEffect(() => {
    if (health < prevHealth.current) {
      vignetteRef.current?.classList.add("flash");
      setTimeout(() => vignetteRef.current?.classList.remove("flash"), 200);
    }
    prevHealth.current = health;
  }, [health]);

  // Prune old kills periodically
  useEffect(() => {
    const t = setInterval(pruneKills, 500);
    return () => clearInterval(t);
  }, [pruneKills]);

  const totalRemaining = zombiesAlive + zombiesRemaining;

  return (
    <>
      {/* Damage vignette */}
      <div ref={vignetteRef} className="hit-vignette" />

      {/* Crosshair */}
      <div id="crosshair" />

      <div className="hud">
        {/* Top center — wave info */}
        <div className="hud-top">
          <div className="hud-wave">
            Wave <span>{wave}</span>
          </div>
          <div className="hud-wave">
            Zombies <span>{totalRemaining}</span>
          </div>
        </div>

        {/* Bottom left — health + ammo bars */}
        <div className="hud-bottom-left">
          <div className="health-bar">
            <label>HP</label>
            <div className="health-bar-track">
              <div
                className="health-bar-fill health"
                style={{ width: `${(health / maxHealth) * 100}%` }}
              />
            </div>
            <span style={{ fontSize: 12, opacity: 0.7 }}>{health}</span>
          </div>
          <div className="health-bar">
            <label>AMMO</label>
            <div className="health-bar-track">
              <div
                className="health-bar-fill ammo"
                style={{ width: `${(ammo / maxAmmo) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom right — ammo counter */}
        <div className="hud-bottom-right">
          <div className="score-display" style={{ marginBottom: 12 }}>
            <div className="score-val">{score.toLocaleString()}</div>
            <div className="score-label">Score</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="ammo-counter">
              {isReloading ? (
                <span style={{ fontSize: 18, color: "#eab308" }}>RELOADING…</span>
              ) : (
                <>
                  {ammo}
                  <small> / {reserveAmmo}</small>
                </>
              )}
            </div>
            <div className="ammo-label">Rounds</div>
          </div>
        </div>
      </div>

      {/* Wave banner */}
      {showWaveBanner && (
        <div className="wave-banner">
          <h2>Wave {wave}</h2>
          <p>{wave === 1 ? "They Rise" : wave >= 3 ? "They Run" : "More Come"}</p>
        </div>
      )}

      {/* Kill feed */}
      <div className="kill-feed">
        {kills.map((k) => (
          <div key={k.id} className="kill-item">
            💀 {k.type.toUpperCase()} ZOMBIE
          </div>
        ))}
      </div>
    </>
  );
}
