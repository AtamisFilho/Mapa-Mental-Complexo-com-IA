"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  CornerDownLeft,
  Plus,
  ArrowRight,
  Sparkles,
  X,
  Edit3,
} from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenAIPanel: () => void;
  onOpenNodeEditor: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  kind: "node" | "action";
  action: () => void;
  group: string;
}

export function CommandPalette({ open, onClose, onOpenAIPanel, onOpenNodeEditor }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nodes = useMindMapStore((s) => s.nodes);
  const focusNode = useMindMapStore((s) => s.focusNode);
  const addNode = useMindMapStore((s) => s.addNode);
  const fitToView = useMindMapStore((s) => s.fitToView);
  const clearSelection = useMindMapStore((s) => s.clearSelection);
  const viewport = useMindMapStore((s) => s.viewport);
  const aiEnabled = useSettingsStore((s) => s.settings.ai.enabled);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  // Build commands
  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    const q = query.trim().toLowerCase();

    // Actions first (only when query is short or matches)
    const actions: CommandItem[] = [
      {
        id: "action-fit",
        label: "Ajustar mapa à tela",
        hint: "F",
        icon: <Search className="h-4 w-4" />,
        kind: "action",
        group: "Ações",
        action: () => { fitToView(80); close(); },
      },
      {
        id: "action-add-concept",
        label: "Adicionar Conceito",
        hint: "C",
        icon: <Plus className="h-4 w-4 text-emerald-500" />,
        kind: "action",
        group: "Ações",
        action: () => {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          addNode({ title: "Novo Conceito", kind: "concept", x: (cx - viewport.x) / viewport.zoom - 110, y: (cy - viewport.y) / viewport.zoom - 44, width: 220, height: 88 });
          close();
        },
      },
      {
        id: "action-add-question",
        label: "Adicionar Pergunta",
        hint: "P",
        icon: <Plus className="h-4 w-4 text-amber-500" />,
        kind: "action",
        group: "Ações",
        action: () => {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          addNode({ title: "Nova Pergunta", kind: "question", x: (cx - viewport.x) / viewport.zoom - 110, y: (cy - viewport.y) / viewport.zoom - 44, width: 220, height: 88 });
          close();
        },
      },
      {
        id: "action-add-idea",
        label: "Adicionar Ideia",
        hint: "I",
        icon: <Plus className="h-4 w-4 text-violet-500" />,
        kind: "action",
        group: "Ações",
        action: () => {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          addNode({ title: "Nova Ideia", kind: "idea", x: (cx - viewport.x) / viewport.zoom - 110, y: (cy - viewport.y) / viewport.zoom - 44, width: 220, height: 88 });
          close();
        },
      },
    ];
    if (aiEnabled) {
      actions.push({
        id: "action-ai",
        label: "Abrir painel de IA",
        hint: "",
        icon: <Sparkles className="h-4 w-4 text-primary" />,
        kind: "action",
        group: "Ações",
        action: () => { onOpenAIPanel(); close(); },
      });
    }

    // Edit selected node action (only when there is a selection)
    const selectedId = useMindMapStore.getState().selectedNodeIds[0];
    if (selectedId) {
      const sel = nodes.find((n) => n.id === selectedId);
      if (sel) {
        actions.unshift({
          id: "action-edit-selected",
          label: `Editar nó: ${sel.title}`,
          hint: "E",
          icon: <Edit3 className="h-4 w-4 text-primary" />,
          kind: "action",
          group: "Ações",
          action: () => { focusNode(selectedId); onOpenNodeEditor(); close(); },
        });
      }
    }

    // Filter actions
    for (const a of actions) {
      if (!q || a.label.toLowerCase().includes(q)) list.push(a);
    }

    // Node matches
    for (const n of nodes) {
      if (q && !n.title.toLowerCase().includes(q) && !(n.content ?? "").toLowerCase().includes(q)) continue;
      const meta = NODE_KIND_META[n.kind as keyof typeof NODE_KIND_META];
      list.push({
        id: `node-${n.id}`,
        label: n.title,
        hint: meta?.label,
        icon: (
          <div
            className="h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold"
            style={{ background: `${meta?.color ?? "#10b981"}22`, color: meta?.color ?? "#10b981" }}
          >
            {n.title[0]?.toUpperCase()}
          </div>
        ),
        kind: "node",
        group: "Nós",
        action: () => { focusNode(n.id); close(); },
      });
    }
    return list.slice(0, 30);
  }, [query, nodes, focusNode, close, fitToView, addNode, viewport, aiEnabled, onOpenAIPanel, onOpenNodeEditor]);

  // Reset active when items change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[activeIndex];
        if (item) item.action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [items, activeIndex, close]
  );

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  // Group items
  const grouped: Record<string, CommandItem[]> = {};
  for (const it of items) {
    if (!grouped[it.group]) grouped[it.group] = [];
    grouped[it.group].push(it);
  }
  let runningIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm fade-in" />
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar nós ou executar comando... (Esc para fechar)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">ESC</kbd>
        </div>

        {/* results */}
        <div ref={listRef} className="flex-1 overflow-y-auto scroll-thin py-1">
          {items.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado para "{query}"</p>
            </div>
          )}
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group}>
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{group}</p>
              {groupItems.map((it) => {
                const idx = runningIdx++;
                return (
                  <button
                    key={it.id}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => it.action()}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      idx === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                      {it.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.label}</p>
                    </div>
                    {it.hint && (
                      <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
                        {it.hint}
                      </kbd>
                    )}
                    {idx === activeIndex && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded border border-border">↑↓</kbd> navegar</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded border border-border">↵</kbd> selecionar</span>
          </div>
          <span className="brand-gradient font-semibold">Mapa Mental · Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
