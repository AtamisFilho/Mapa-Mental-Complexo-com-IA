"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {};
async function loadIcons() {
  const lucide = await import("lucide-react");
  for (const k of Object.keys(NODE_KIND_META)) {
    const name = NODE_KIND_META[k as NodeKind].icon;
    KIND_ICONS[k] = (lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? lucide.Lightbulb;
  }
}

const KEY_MAP: Record<NodeKind, string> = {
  concept: "C",
  question: "P",
  action: "A",
  idea: "I",
  resource: "R",
  goal: "O",
};

/**
 * Floating "legend" widget that shows the 6 node kinds with their colors,
 * icons, labels, and the keyboard shortcut to add each. Helps new users
 * understand the visual language of the mind map.
 *
 * Renders as a small Info button in the bottom-left corner of the canvas;
 * clicking it toggles a compact popover with the legend. Auto-dismisses
 * when the user clicks elsewhere on the canvas.
 */
export function NodeKindLegend() {
  const [open, setOpen] = useState(false);
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    loadIcons().then(() => setIconsReady(true));
  }, []);

  return (
    <div className="absolute bottom-3 left-3 z-20 pointer-events-auto">
      <button
        aria-label="Legenda dos tipos de nó"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-md shadow-md text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
        title="Legenda dos tipos de nó"
      >
        <Info className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && iconsReady && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-10 left-0 w-56 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <span className="text-xs font-semibold">Tipos de nó</span>
              <button
                aria-label="Fechar legenda"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-2 flex flex-col gap-0.5">
              {(Object.keys(NODE_KIND_META) as NodeKind[]).map((kind) => {
                const meta = NODE_KIND_META[kind];
                const Icon = KIND_ICONS[kind];
                return (
                  <div
                    key={kind}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors group"
                  >
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{
                        background: `${meta.color}18`,
                        color: meta.color,
                        boxShadow: `inset 0 0 0 1px ${meta.color}30`,
                      }}
                    >
                      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="text-xs font-medium flex-1">{meta.label}</span>
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                      {KEY_MAP[kind]}
                    </kbd>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground leading-tight">
                Pressione a tecla no canvas para adicionar um nó desse tipo.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
