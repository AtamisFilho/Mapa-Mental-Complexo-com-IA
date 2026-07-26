"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MousePointer2,
  Hand,
  Link2,
  PlusCircle,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Sparkles,
  Settings2,
  Trash2,
  ChevronDown,
  BrainCircuit,
  Keyboard,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useTool } from "@/hooks/use-tool-context";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";

interface Props {
  onOpenSettings: () => void;
  onOpenAIPanel: () => void;
  onOpenSidebar: () => void;
  onOpenShortcuts: () => void;
  onOpenExport: () => void;
  onOpenSearch: () => void;
}

export function Toolbar({ onOpenSettings, onOpenAIPanel, onOpenSidebar, onOpenShortcuts, onOpenExport, onOpenSearch }: Props) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const { tool, setTool } = useTool();
  const zoomBy = useMindMapStore((s) => s.zoomBy);
  const resetViewport = useMindMapStore((s) => s.resetViewport);
  const fitToView = useMindMapStore((s) => s.fitToView);
  const undo = useMindMapStore((s) => s.undo);
  const redo = useMindMapStore((s) => s.redo);
  const past = useMindMapStore((s) => s.past);
  const future = useMindMapStore((s) => s.future);
  const addNode = useMindMapStore((s) => s.addNode);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const viewport = useMindMapStore((s) => s.viewport);

  const undoRedoEnabled = useSettingsStore((s) => s.settings.editor.undoRedo);
  const aiEnabled = useSettingsStore((s) => s.settings.ai.enabled);
  const shortcutsEnabled = useSettingsStore((s) => s.settings.editor.keyboardShortcuts);

  const handleAddNode = useCallback(
    (kind: NodeKind) => {
      const meta = NODE_KIND_META[kind];
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
      const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
      const vp = viewport;
      const wx = (cx - vp.x) / vp.zoom - 100;
      const wy = (cy - vp.y) / vp.zoom - 40;
      addNode({ title: "Novo " + meta.label, kind, x: wx, y: wy, width: 200, height: 80 });
      setAddMenuOpen(false);
    },
    [addNode, viewport]
  );

  const handleDeleteSelected = useCallback(() => {
    for (const id of selectedNodeIds) {
      deleteNode(id);
    }
  }, [selectedNodeIds, deleteNode]);

  // Close add-menu on outside click / Escape
  useEffect(() => {
    if (!addMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [addMenuOpen]);

  const toolButtons: Array<{ toolId: string; icon: React.ReactNode; label: string }> = [
    { toolId: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Selecionar" },
    { toolId: "pan", icon: <Hand className="h-4 w-4" />, label: "Arrastar" },
    { toolId: "connect", icon: <Link2 className="h-4 w-4" />, label: "Conectar" },
  ];

  return (
    <div className="relative z-40 flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card/80 backdrop-blur-md">
      {/* Left: sidebar toggle */}
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenSidebar} title="Mapas">
        <BrainCircuit className="h-4 w-4" />
      </Button>

      {/* Separator */}
      <div className="h-5 w-px bg-border mx-1" />

      {/* Tools with active indicator */}
      {toolButtons.map((tb) => (
        <Button
          key={tb.toolId}
          variant={tool === tb.toolId ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8 transition-all"
          onClick={() => setTool(tb.toolId as "select" | "pan" | "connect")}
          title={tb.label}
        >
          {tb.icon}
        </Button>
      ))}

      <div className="h-5 w-px bg-border mx-1" />

      {/* Add node dropdown */}
      <div className="relative" ref={addMenuRef}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 transition-colors"
          onClick={() => setAddMenuOpen(!addMenuOpen)}
        >
          <PlusCircle className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Adicionar</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
        {addMenuOpen && (
          <div className="absolute top-full left-0 mt-1.5 z-[100] bg-popover border border-border rounded-lg shadow-2xl p-1.5 min-w-[200px] fade-in backdrop-blur-xl">
            <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de nó</p>
            {Object.entries(NODE_KIND_META).map(([kind, meta]) => (
              <button
                key={kind}
                className="flex items-center gap-2.5 w-full px-2 py-2 rounded-md hover:bg-accent text-xs transition-colors group"
                onClick={() => {
                  handleAddNode(kind as NodeKind);
                  setAddMenuOpen(false);
                }}
              >
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  <span className="text-[10px] font-bold">{meta.label[0]}</span>
                </div>
                <span className="font-medium">{meta.label}</span>
                <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{meta.label[0]}</kbd>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-border mx-1" />

      {/* Undo/Redo */}
      {undoRedoEnabled && (
        <>
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={undo} disabled={past.length === 0} title="Desfazer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={redo} disabled={future.length === 0} title="Refazer (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-border mx-1" />
        </>
      )}

      {/* Delete */}
      {selectedNodeIds.length > 0 && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive transition-colors" onClick={handleDeleteSelected} title="Excluir selecionados">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Zoom */}
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={() => zoomBy(1.2)} title="Zoom+">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">{Math.round(viewport.zoom * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={() => zoomBy(0.8)} title="Zoom−">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={() => fitToView(80)} title="Ajustar à tela (F)">
        <Maximize className="h-4 w-4" />
      </Button>

      {/* Search / Command palette */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md border border-border bg-muted/40 hover:bg-accent hover:border-primary/40 transition-colors text-xs text-muted-foreground"
        title="Buscar (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-2 text-[10px] bg-background px-1 py-0.5 rounded border border-border">⌘K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors md:hidden" onClick={onOpenSearch} title="Buscar (Ctrl+K)">
        <Search className="h-4 w-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Shortcuts */}
      {shortcutsEnabled && (
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenShortcuts} title="Atalhos de teclado">
          <Keyboard className="h-4 w-4" />
        </Button>
      )}

      {/* AI */}
      {aiEnabled && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 transition-colors" onClick={onOpenAIPanel} title="IA">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">IA</span>
        </Button>
      )}

      {/* Export */}
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenExport} title="Exportar">
        <Download className="h-4 w-4" />
      </Button>

      {/* Settings */}
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenSettings} title="Configurações">
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
