"use client";

import { useEffect, useRef } from "react";

/**
 * Mobile joystick — renders nipplejs in the bottom-left.
 * Fires direction via window.__setJoystickDir (consumed by Player).
 * Only mounts on touch devices.
 */
export default function Joystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<any>(null);

  useEffect(() => {
    // Only on touch screens
    if (!("ontouchstart" in window)) return;
    if (!zoneRef.current) return;

    import("nipplejs").then(({ default: nipplejs }) => {
      joystickRef.current = nipplejs.create({
        zone: zoneRef.current!,
        mode: "static",
        position: { left: "80px", bottom: "80px" },
        color: "rgba(255,255,255,0.3)",
        size: 120,
      });

      joystickRef.current.on("move", (_: any, data: any) => {
        const { x, y } = data.vector;
        (window as any).__setJoystickDir?.(x, y);
      });

      joystickRef.current.on("end", () => {
        (window as any).__setJoystickDir?.(0, 0);
      });
    });

    return () => {
      joystickRef.current?.destroy();
    };
  }, []);

  return (
    <>
      <div id="joystick-zone" ref={zoneRef} />
      <button
        id="shoot-btn"
        style={{ display: "ontouchstart" in (typeof window !== "undefined" ? window : {}) ? "flex" : "none" }}
        onTouchStart={() => {
          const ev = new MouseEvent("mousedown", { button: 0 });
          window.dispatchEvent(ev);
        }}
      >
        🔫
      </button>
    </>
  );
}
