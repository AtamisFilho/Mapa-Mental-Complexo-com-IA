"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, type FeatureSettings } from "@/lib/settings";

interface SettingsState {
  settings: FeatureSettings;
  setToggle: (
    category: keyof FeatureSettings,
    key: string,
    value: boolean
  ) => void;
  setThemeMode: (mode: FeatureSettings["theme"]["mode"]) => void;
  setAccent: (accent: FeatureSettings["theme"]["accent"]) => void;
  setNumberValue: (
    category: "editor" | "performance",
    key: string,
    value: number
  ) => void;
  resetAll: () => void;
  resetCategory: (category: keyof FeatureSettings) => void;
  isFeatureEnabled: (
    category: keyof FeatureSettings,
    key: string
  ) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      setToggle: (category, key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...(state.settings[category] as object),
              [key]: value,
            },
          },
        })),

      setThemeMode: (mode) =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme: { ...state.settings.theme, mode },
          },
        })),

      setAccent: (accent) =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme: { ...state.settings.theme, accent },
          },
        })),

      setNumberValue: (category, key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: {
              ...(state.settings[category] as object),
              [key]: value,
            },
          },
        })),

      resetAll: () => set({ settings: DEFAULT_SETTINGS }),

      resetCategory: (category) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [category]: DEFAULT_SETTINGS[category],
          },
        })),

      isFeatureEnabled: (category, key) => {
        const s = get().settings;
        if (category === "ai" && key !== "enabled" && !s.ai.enabled) {
          return false;
        }
        return (
          (s[category] as Record<string, unknown>)[key] === true
        );
      },
    }),
    {
      name: "mindmap-settings",
      version: 2,
      // Deep-merge persisted settings with DEFAULT_SETTINGS so that newly-added
      // fields (e.g. `editor.alignmentGuides`) get their default value for
      // users who already have an older persisted state.
      merge: (persisted, current) => {
        const p = (persisted as { settings?: Partial<FeatureSettings> } | undefined);
        const cur = current as SettingsState;
        if (!p?.settings) return cur;
        const ps = p.settings;
        return {
          ...cur,
          settings: {
            ai: { ...DEFAULT_SETTINGS.ai, ...(ps.ai ?? {}) },
            visual: { ...DEFAULT_SETTINGS.visual, ...(ps.visual ?? {}) },
            editor: { ...DEFAULT_SETTINGS.editor, ...(ps.editor ?? {}) },
            performance: { ...DEFAULT_SETTINGS.performance, ...(ps.performance ?? {}) },
            export: { ...DEFAULT_SETTINGS.export, ...(ps.export ?? {}) },
            theme: { ...DEFAULT_SETTINGS.theme, ...(ps.theme ?? {}) },
          },
        };
      },
    }
  )
);
