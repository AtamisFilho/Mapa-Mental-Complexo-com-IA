"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";

export interface RemoteCursor {
  userId: string;
  displayName: string;
  color: string;
  x: number; // world coords
  y: number; // world coords
}

interface RemoteCursorsProps {
  cursors: RemoteCursor[];
}

/**
 * RemoteCursors — overlays remote users' cursors on the canvas.
 *
 * Position is computed from world coords using the live viewport from the
 * mind-map store: `screenX = worldX * zoom + viewport.x`. The container is
 * `pointer-events: none` so it never blocks canvas interactions.
 *
 * Smooth animation between cursor positions is provided by Framer Motion
 * (`animate` on x/y) — values are interpolated rather than snapping.
 *
 * When reduced-motion is enabled (Settings → Performance) we snap instead
 * of animating.
 */
export function RemoteCursors({ cursors }: RemoteCursorsProps) {
  const viewport = useMindMapStore((s) => s.viewport);
  const reducedMotion = useSettingsStore(
    (s) => s.settings.performance.reducedMotion
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence>
        {cursors.map((c) => {
          const screenX = c.x * viewport.zoom + viewport.x;
          const screenY = c.y * viewport.zoom + viewport.y;
          // Skip cursors that are wildly off-screen (perf optimization)
          if (
            screenX < -200 ||
            screenY < -200 ||
            screenX > window.innerWidth + 200 ||
            screenY > window.innerHeight + 200
          ) {
            return null;
          }
          return (
            <motion.div
              key={c.userId}
              className="absolute left-0 top-0 flex items-start gap-0.5"
              initial={
                reducedMotion ? false : { opacity: 0, scale: 0.6 }
              }
              animate={
                reducedMotion
                  ? { x: screenX, y: screenY, opacity: 1, scale: 1 }
                  : {
                      x: screenX,
                      y: screenY,
                      opacity: 1,
                      scale: 1,
                    }
              }
              exit={
                reducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.6, transition: { duration: 0.15 } }
              }
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 500, damping: 40, mass: 0.5 }
              }
              style={{ willChange: "transform" }}
            >
              {/* Arrow / pin SVG */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
              >
                <path
                  d="M3 2 L19 18 L11 16 L8 21 L5 19 L7 14 L3 2 Z"
                  fill={c.color}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              {/* Label pill */}
              <div
                className="mt-3 -ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm whitespace-nowrap max-w-[140px] truncate"
                style={{
                  backgroundColor: c.color,
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
                title={c.displayName}
              >
                {c.displayName}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
