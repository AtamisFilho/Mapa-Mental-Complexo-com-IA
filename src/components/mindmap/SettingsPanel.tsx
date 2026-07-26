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
  Check,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/store/settings-store";
import { SETTING_CATEGORIES, ACCENT_PALETTES, type FeatureSettings } from "@/lib/settings";

interface Props {
  open: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai: <Sparkles className="h-3.5 w-3.5" />,
  visual: <Palette className="h-3.5 w-3.5" />,
  editor: <Settings2 className="h-3.5 w-3.5" />,
  performance: <Gauge className="h-3.5 w-3.5" />,
  export: <Download className="h-3.5 w-3.5" />,
};

export function SettingsPanel({ open, onClose, onReplayTour }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const setToggle = useSettingsStore((s) => s.setToggle);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const setNumberValue = useSettingsStore((s) => s.setNumberValue);
  const resetCategory = useSettingsStore((s) => s.resetCategory);
  const resetAll = useSettingsStore((s) => s.resetAll);

  if (!open) return null;

  return (
    <div className="w-[320px] bg-card border-l border-border flex flex-col shadow-2xl fade-in z-30">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
            <Settings2 className="h-3.5 w-3.5 text-primary" />
          </div>
          Configurações
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={resetAll} title="Restaurar padrões">
            <RotateCcw className="h-3 w-3" />
            Resetar
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-4">
          {/* Theme section */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tema</p>

            {/* Mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium min-w-[60px]">Modo</span>
              <div className="flex gap-1 flex-1">
                {[
                  { mode: "light", icon: <Sun className="h-3 w-3" />, label: "Claro" },
                  { mode: "dark", icon: <Moon className="h-3 w-3" />, label: "Escuro" },
                  { mode: "system", icon: <Monitor className="h-3 w-3" />, label: "Auto" },
                ].map((opt) => (
                  <button
                    key={opt.mode}
                    className={`flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-medium transition-all ${
                      settings.theme.mode === opt.mode
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-accent"
                    }`}
                    onClick={() => setThemeMode(opt.mode as FeatureSettings["theme"]["mode"])}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium min-w-[60px]">Accent</span>
              <div className="flex gap-1.5 flex-1 flex-wrap">
                {Object.entries(ACCENT_PALETTES).map(([key, palette]) => (
                  <button
                    key={key}
                    className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                      settings.theme.accent === key ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ background: palette.primary }}
                    title={palette.name}
                    onClick={() => setAccent(key as FeatureSettings["theme"]["accent"])}
                  >
                    {settings.theme.accent === key && (
                      <Check className="h-3 w-3 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            {/* Repetir tour button */}
            <button
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors text-xs text-muted-foreground hover:text-foreground w-full"
              onClick={onReplayTour}
            >
              <MapPin className="h-3.5 w-3.5" />
              Repetir tour de introdução
            </button>
            </div>
          </div>

          {/* Toggle categories */}
          {SETTING_CATEGORIES.map((cat) => {
            const catSettings = settings[cat.id] as Record<string, unknown>;
            const isAIDisabled = cat.id === "ai" && catSettings.enabled === false;
            const enabledCount = cat.toggles.filter((t) => catSettings[t.key] === true).length;

            return (
              <div key={cat.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                      {CATEGORY_ICONS[cat.id]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{cat.title}</p>
                      <p className="text-[9px] text-muted-foreground">{enabledCount}/{cat.toggles.length} ativas</p>
                    </div>
                  </div>
                  <button
                    className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
                    onClick={() => resetCategory(cat.id)}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Resetar
                  </button>
                </div>

                <div className={`flex flex-col gap-1 ${isAIDisabled ? "opacity-40 pointer-events-none" : ""}`}>
                  {cat.toggles.map((toggle) => {
                    const value = catSettings[toggle.key];
                    if (typeof value !== "boolean") return null;
                    const isMasterSwitch = cat.id === "ai" && toggle.key === "enabled";

                    return (
                      <div
                        key={toggle.key}
                        className={`flex items-center justify-between py-1.5 px-2.5 rounded-md hover:bg-accent/40 transition-colors group ${
                          isMasterSwitch ? "ring-1 ring-primary/30 bg-primary/5" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-xs font-medium flex items-center gap-1.5">
                            {toggle.label}
                            {isMasterSwitch && (
                              <span className="text-[9px] bg-primary text-primary-foreground px-1 py-0.5 rounded font-bold">MASTER</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{toggle.description}</p>
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
                  <div className="flex flex-col gap-2 mt-1 px-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Delay do autosave</p>
                        <span className="text-[10px] text-muted-foreground font-mono">{settings.editor.autosaveDelayMs}ms</span>
                      </div>
                      <Slider
                        value={[settings.editor.autosaveDelayMs]}
                        min={300}
                        max={5000}
                        step={100}
                        onValueChange={(v) => setNumberValue("editor", "autosaveDelayMs", v[0])}
                        className="h-1"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Tamanho da grade</p>
                        <span className="text-[10px] text-muted-foreground font-mono">{settings.editor.gridSize}px</span>
                      </div>
                      <Slider
                        value={[settings.editor.gridSize]}
                        min={8}
                        max={80}
                        step={4}
                        onValueChange={(v) => setNumberValue("editor", "gridSize", v[0])}
                        className="h-1"
                      />
                    </div>
                  </div>
                )}

                {cat.id === "performance" && (
                  <div className="flex flex-col gap-2 mt-1 px-2.5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">Limite de nós (aviso)</p>
                        <span className="text-[10px] text-muted-foreground font-mono">{settings.performance.maxNodes}</span>
                      </div>
                      <Slider
                        value={[settings.performance.maxNodes]}
                        min={50}
                        max={2000}
                        step={50}
                        onValueChange={(v) => setNumberValue("performance", "maxNodes", v[0])}
                        className="h-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-[10px] text-muted-foreground text-center pt-2 pb-1">
            As preferências são salvas localmente no navegador.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
