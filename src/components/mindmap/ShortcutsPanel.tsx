"use client";

import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settings-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsPanel({ open, onClose }: Props) {
  const shortcutsEnabled = useSettingsStore((s) => s.settings.editor.keyboardShortcuts);
  if (!open || !shortcutsEnabled) return null;

  const shortcuts = [
    { keys: "Ctrl + Z", action: "Desfazer" },
    { keys: "Ctrl + Y", action: "Refazer" },
    { keys: "Ctrl + Shift + Z", action: "Refazer (alternativo)" },
    { keys: "Delete / Backspace", action: "Excluir nó selecionado" },
    { keys: "Esc", action: "Cancelar seleção / conexão" },
    { keys: "Clique duplo", action: "Adicionar novo nó" },
    { keys: "Scroll", action: "Zoom in/out" },
    { keys: "Arrastar (bg)", action: "Mover canvas (pan)" },
    { keys: "Arrastar (nó)", action: "Mover nó" },
    { keys: "Shift + Clique", action: "Multi-seleção de nós" },
    { keys: "Clique duplo (aresta)", action: "Excluir aresta" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm fade-in" onClick={onClose}>
      <div
        className="w-[360px] bg-card rounded-xl border border-border shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos de teclado
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/30">
              <span className="text-xs text-muted-foreground">{s.action}</span>
              <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono text-foreground border border-border">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
