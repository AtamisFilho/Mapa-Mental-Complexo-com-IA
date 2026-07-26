"use client";

import { useState, useCallback } from "react";
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
}

export function Toolbar({ onOpenSettings, onOpenAIPanel, onOpenSidebar, onOpenShortcuts, onOpenExport }: Props) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const { tool, setTool } = useTool();
  const zoomBy = useMindMapStore((s) => s.zoomBy);
  const resetViewport = useMindMapStore((s) => s.resetViewport);
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
      const wx = (cx - vp.x) / vp.zoom - 90;
      const wy = (cy - vp.y) / vp.zoom - 36;
      addNode({ title: meta.label, kind, x: wx, y: wy });
      setAddMenuOpen(false);
    },
    [addNode, viewport]
  );

  const handleDeleteSelected = useCallback(() => {
    for (const id of selectedNodeIds) {
      deleteNode(id);
    }
  }, [selectedNodeIds, deleteNode]);

  const toolButtons: Array<{ toolId: string; icon: React.ReactNode; label: string }> = [
    { toolId: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Selecionar" },
    { toolId: "pan", icon: <Hand className="h-4 w-4" />, label: "Arrastar" },
    { toolId: "connect", icon: <Link2 className="h-4 w-4" />, label: "Conectar" },
  ];

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card/80 backdrop-blur-md">
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
      <div className="relative">
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
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[180px] fade-in">
            {Object.entries(NODE_KIND_META).map(([kind, meta]) => (
              <button
                key={kind}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent text-xs transition-colors"
                onClick={() => {
                  handleAddNode(kind as NodeKind);
                  setAddMenuOpen(false);
                }}
              >
                <div
                  className="h-5 w-5 rounded flex items-center justify-center"
                  style={{ background: `${meta.color}22`, color: meta.color }}
                >
                  <span className="text-[10px] font-bold">{meta.label[0]}</span>
                </div>
                <span>{meta.label}</span>
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
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={resetViewport} title="Resetar visão">
        <Maximize className="h-4 w-4" />
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
