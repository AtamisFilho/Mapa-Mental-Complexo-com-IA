"use client";

import { useCallback } from "react";
import {
  X,
  Sparkles,
  Palette,
  Settings2,
  Gauge,
  Download,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/store/settings-store";
import { SETTING_CATEGORIES, ACCENT_PALETTES, type FeatureSettings } from "@/lib/settings";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai: <Sparkles className="h-4 w-4" />,
  visual: <Palette className="h-4 w-4" />,
  editor: <Settings2 className="h-4 w-4" />,
  performance: <Gauge className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
};

export function SettingsPanel({ open, onClose }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const setToggle = useSettingsStore((s) => s.setToggle);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const resetCategory = useSettingsStore((s) => s.resetCategory);
  const resetAll = useSettingsStore((s) => s.resetAll);

  if (!open) return null;

  return (
    <div className="w-[300px] bg-card border-l border-border flex flex-col shadow-lg fade-in">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Settings2 className="h-4 w-4" />
          Configurações
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetAll}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Resetar tudo
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {/* Theme section */}
        <div className="flex flex-col gap-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tema</p>

          {/* Mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium min-w-[70px]">Modo</span>
            <div className="flex gap-1">
              {[
                { mode: "light", icon: <Sun className="h-3 w-3" />, label: "Claro" },
                { mode: "dark", icon: <Moon className="h-3 w-3" />, label: "Escuro" },
                { mode: "system", icon: <Monitor className="h-3 w-3" />, label: "Sistema" },
              ].map((opt) => (
                <Button
                  key={opt.mode}
                  variant={settings.theme.mode === opt.mode ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setThemeMode(opt.mode as FeatureSettings["theme"]["mode"])}
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium min-w-[70px]">Accent</span>
            <div className="flex gap-1.5">
              {Object.entries(ACCENT_PALETTES).map(([key, palette]) => (
                <button
                  key={key}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    settings.theme.accent === key ? "scale-125 border-foreground" : "border-border"
                  }`}
                  style={{ background: palette.primary }}
                  title={palette.name}
                  onClick={() => setAccent(key as FeatureSettings["theme"]["accent"])}
                />
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Toggle categories */}
        {SETTING_CATEGORIES.map((cat) => {
          const catSettings = settings[cat.id] as Record<string, unknown>;
          // Special: if AI master switch is off, dim other AI toggles
          const isAIDisabled = cat.id === "ai" && catSettings.enabled === false;

          return (
            <div key={cat.id} className="flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {CATEGORY_ICONS[cat.id]}
                  <p className="text-xs font-semibold">{cat.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => resetCategory(cat.id)}
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                  Resetar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">{cat.description}</p>

              <div className={`flex flex-col gap-1.5 ${isAIDisabled ? "opacity-40 pointer-events-none" : ""}`}>
                {cat.toggles.map((toggle) => {
                  const value = catSettings[toggle.key];
                  // Only show boolean toggles (skip number fields)
                  if (typeof value !== "boolean") return null;
                  // Special: if this is the AI master switch, don't dim it
                  const isMasterSwitch = cat.id === "ai" && toggle.key === "enabled";

                  return (
                    <div
                      key={toggle.key}
                      className={`flex items-center justify-between py-1 px-2 rounded-md hover:bg-accent/30 transition ${isMasterSwitch ? "" : ""}`}
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-xs font-medium">{toggle.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{toggle.description}</p>
                      </div>
                      <Switch
                        checked={value as boolean}
                        onCheckedChange={(v) => setToggle(cat.id, toggle.key, v)}
                        className="scale-90"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Number settings for editor category */}
              {cat.id === "editor" && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between py-1 px-2 rounded-md">
                    <p className="text-xs font-medium">Delay autosave (ms)</p>
                    <span className="text-xs text-muted-foreground">{settings.editor.autosaveDelayMs}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded-md">
                    <p className="text-xs font-medium">Tamanho da grade</p>
                    <span className="text-xs text-muted-foreground">{settings.editor.gridSize}px</span>
                  </div>
                </div>
              )}

              {cat.id === "performance" && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between py-1 px-2 rounded-md">
                    <p className="text-xs font-medium">Limite de nós</p>
                    <span className="text-xs text-muted-foreground">{settings.performance.maxNodes}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
