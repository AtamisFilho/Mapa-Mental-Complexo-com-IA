"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, Maximize, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMindMapStore } from "@/store/mindmap-store";
import {
  LAYOUT_LABELS,
  LAYOUT_DESCRIPTIONS,
  LAYOUT_CATEGORIES,
  LAYOUT_CATEGORY_LABELS,
  LAYOUT_PREVIEW_SVG,
  type LayoutType,
  type LayoutCategory,
} from "@/lib/layout-algorithms";

interface LayoutPanelProps {
  open: boolean;
  onClose: () => void;
}

export function LayoutPanel({ open, onClose }: LayoutPanelProps) {
  const applyLayout = useMindMapStore((s) => s.applyLayout);
  const fitToView = useMindMapStore((s) => s.fitToView);
  const nodes = useMindMapStore((s) => s.nodes);

  // Track the most recently-applied layout so we can show the active card.
  // Persisted to localStorage so the user's last choice is remembered per-browser.
  const [activeLayout, setActiveLayout] = useState<LayoutType | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const v = window.localStorage.getItem("mindmap:lastLayout");
      return (v as LayoutType | null) ?? null;
    } catch {
      return null;
    }
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSelect = useCallback(
    (type: LayoutType) => {
      applyLayout(type);
      setActiveLayout(type);
      try {
        window.localStorage.setItem("mindmap:lastLayout", type);
      } catch {
        /* ignore quota / privacy errors */
      }
      // Fit to view after the layout has been applied on the next frame.
      requestAnimationFrame(() => {
        setTimeout(() => fitToView(80), 30);
      });
    },
    [applyLayout, fitToView]
  );

  const handleFitToView = useCallback(() => {
    fitToView(80);
  }, [fitToView]);

  const hasNodes = nodes.length > 0;
  const categoryOrder: LayoutCategory[] = [
    "tree",
    "radial",
    "force",
    "structured",
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-catcher backdrop — doesn't block interaction, just catches outside clicks */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Painel de organização visual"
            aria-modal="false"
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-card border-l border-border flex flex-col shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-sm font-semibold leading-tight">
                    Organização visual
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">
                    {activeLayout
                      ? `Ativo: ${LAYOUT_LABELS[activeLayout]}`
                      : "Escolha um layout para organizar o mapa"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onClose}
                aria-label="Fechar painel de layout"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body — scrollable list of layouts grouped by category */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              <div className="p-3 flex flex-col gap-5">
                {!hasNodes && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      Crie ou abra um mapa mental para aplicar um layout.
                    </p>
                  </div>
                )}

                {categoryOrder.map((cat) => {
                  const types = LAYOUT_CATEGORIES[cat];
                  if (!types || types.length === 0) return null;
                  return (
                    <section key={cat} className="flex flex-col gap-2">
                      <header className="flex items-center gap-2 px-1">
                        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {LAYOUT_CATEGORY_LABELS[cat]}
                        </h4>
                        <div className="flex-1 h-px bg-border/60" />
                        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                          {types.length}
                        </span>
                      </header>
                      <div className="grid grid-cols-1 gap-2">
                        {types.map((type) => {
                          const isActive = activeLayout === type;
                          return (
                            <LayoutCard
                              key={type}
                              type={type}
                              active={isActive}
                              disabled={!hasNodes}
                              onSelect={handleSelect}
                            />
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                {/* Help text */}
                <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>Dica:</strong> cada layout reorganiza todos os
                    nós automaticamente. Pressione{" "}
                    <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded border border-border font-mono">
                      F
                    </kbd>{" "}
                    ou use &ldquo;Ajustar à tela&rdquo; para enquadrar o mapa
                    após mudar de layout.
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky footer with fit-to-view action */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {nodes.length} {nodes.length === 1 ? "nó" : "nós"} no mapa
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleFitToView}
                disabled={!hasNodes}
              >
                <Maximize className="h-3.5 w-3.5" />
                Ajustar à tela
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Layout card ──────────────────────────────────────
// Each card shows a small SVG preview, the layout name, and its
// description. Clicking it applies the layout and auto-fits to view.
interface LayoutCardProps {
  type: LayoutType;
  active: boolean;
  disabled: boolean;
  onSelect: (type: LayoutType) => void;
}

function LayoutCard({ type, active, disabled, onSelect }: LayoutCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(type)}
      aria-pressed={active}
      aria-label={`Aplicar layout: ${LAYOUT_LABELS[type]}`}
      className={[
        "group relative w-full text-left rounded-lg border p-3 transition-all",
        "flex items-center gap-3",
        active
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-background hover:border-primary/50 hover:bg-accent/40 hover:scale-[1.01]",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer",
      ].join(" ")}
    >
      {/* SVG preview */}
      <div
        className={[
          "h-10 w-16 rounded-md flex items-center justify-center shrink-0",
          "bg-muted/40 border border-border/60",
          active ? "text-primary" : "text-foreground/70 group-hover:text-primary",
          "transition-colors",
        ].join(" ")}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 16"
          className="h-7 w-14"
          dangerouslySetInnerHTML={{ __html: LAYOUT_PREVIEW_SVG[type] }}
        />
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span
          className={[
            "text-xs font-semibold leading-tight truncate",
            active ? "text-primary" : "text-foreground",
          ].join(" ")}
        >
          {LAYOUT_LABELS[type]}
        </span>
        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
          {LAYOUT_DESCRIPTIONS[type]}
        </span>
      </div>

      {/* Active indicator */}
      {active && (
        <div
          className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
          aria-hidden
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

export default LayoutPanel;
