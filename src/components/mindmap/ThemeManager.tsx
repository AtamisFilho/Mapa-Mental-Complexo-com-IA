"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings-store";
import { ACCENT_PALETTES, type FeatureSettings } from "@/lib/settings";

export function ThemeManager() {
  const mode = useSettingsStore((s) => s.settings.theme.mode);
  const accent = useSettingsStore((s) => s.settings.theme.accent);

  useEffect(() => {
    const root = document.documentElement;
    // Dark/light mode
    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [mode]);

  useEffect(() => {
    const palette = ACCENT_PALETTES[accent];
    if (!palette) return;
    const root = document.documentElement;
    // Apply accent CSS variables for dynamic accent coloring
    root.style.setProperty("--accent-primary", palette.primary);
    root.style.setProperty("--accent-primary-fg", palette.primaryFg);
    root.style.setProperty("--accent-soft", palette.soft);
    root.style.setProperty("--accent-ring", palette.ring);
    // Override the primary theme variables with accent
    root.style.setProperty("--primary", palette.primary);
    root.style.setProperty("--primary-foreground", palette.primaryFg);
    root.style.setProperty("--ring", palette.ring);
  }, [accent]);

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return null; // no visual output — only CSS variable manipulation
}
