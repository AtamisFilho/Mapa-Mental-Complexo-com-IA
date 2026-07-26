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
      version: 1,
    }
  )
);
