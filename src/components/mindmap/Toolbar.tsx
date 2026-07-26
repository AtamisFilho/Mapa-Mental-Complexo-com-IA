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
  Edit3,
  Copy,
  LayoutGrid,
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
  onOpenNodeEditor: () => void;
}

// Keyboard shortcut tooltip map
const SHORTCUT_MAP: Record<string, string> = {
  select: "V",
  pan: "H",
  connect: "L",
  add: "A",
  undo: "Ctrl+Z",
  redo: "Ctrl+Y",
  zoomIn: "+",
  zoomOut: "−",
  fitToView: "F",
  search: "⌘K",
  delete: "Del",
  duplicate: "Ctrl+D",
  edit: "E",
  shortcuts: "?",
  ai: "IA",
  export: "⤓",
  settings: "⚙",
};

function ToolTipBadge({ shortcut }: { shortcut: string }) {
  return (
    <kbd className="text-[9px] bg-muted/80 text-muted-foreground px-1 py-0.5 rounded border border-border/60 ml-1 shrink-0">
      {shortcut}
    </kbd>
  );
}

export function Toolbar({ onOpenSettings, onOpenAIPanel, onOpenSidebar, onOpenShortcuts, onOpenExport, onOpenSearch, onOpenNodeEditor }: Props) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const { tool, setTool } = useTool();
  const zoomBy = useMindMapStore((s) => s.zoomBy);
  const resetViewport = useMindMapStore((s) => s.resetViewport);
  const fitToView = useMindMapStore((s) => s.fitToView);
  const organizeLayout = useMindMapStore((s) => s.organizeLayout);
  const undo = useMindMapStore((s) => s.undo);
  const redo = useMindMapStore((s) => s.redo);
  const past = useMindMapStore((s) => s.past);
  const future = useMindMapStore((s) => s.future);
  const addNode = useMindMapStore((s) => s.addNode);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const duplicateNode = useMindMapStore((s) => s.duplicateNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
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
      const wx = (cx - vp.x) / vp.zoom - 110;
      const wy = (cy - vp.y) / vp.zoom - 44;
      addNode({ title: "Novo " + meta.label, kind, x: wx, y: wy, width: 220, height: 88 });
      setAddMenuOpen(false);
    },
    [addNode, viewport]
  );

  const handleDeleteSelected = useCallback(() => {
    for (const id of selectedNodeIds) {
      deleteNode(id);
    }
  }, [selectedNodeIds, deleteNode]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    pushHistory();
    duplicateNode(selectedNodeIds[0]);
  }, [selectedNodeIds, duplicateNode, pushHistory]);

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

  const toolButtons: Array<{ toolId: string; icon: React.ReactNode; label: string; shortcut: string }> = [
    { toolId: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Selecionar", shortcut: SHORTCUT_MAP.select },
    { toolId: "pan", icon: <Hand className="h-4 w-4" />, label: "Arrastar", shortcut: SHORTCUT_MAP.pan },
    { toolId: "connect", icon: <Link2 className="h-4 w-4" />, label: "Conectar", shortcut: SHORTCUT_MAP.connect },
  ];

  const isToolActive = (toolId: string) => tool === toolId;

  return (
    <div className="relative z-40 flex items-center gap-2 px-2 py-1.5 border-b border-border bg-card/80 backdrop-blur-md overflow-x-auto">
      {/* Group 1: Sidebar toggle | Select, Pan, Connect tools */}
      <span className="toolbar-group">
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenSidebar} title="Mapas">
          <BrainCircuit className="h-4 w-4" />
        </Button>
        <div className="h-4 w-px bg-border mx-0.5" />
        {toolButtons.map((tb) => (
          <Button
            key={tb.toolId}
            variant={isToolActive(tb.toolId) ? "default" : "ghost"}
            size="icon"
            className={`h-8 w-8 transition-all ${isToolActive(tb.toolId) ? "active-tool-ring" : ""}`}
            onClick={() => setTool(tb.toolId as "select" | "pan" | "connect")}
            title={`${tb.label} (${tb.shortcut})`}
          >
            {tb.icon}
            {shortcutsEnabled && !isToolActive(tb.toolId) && (
              <span className="absolute -top-1 -right-1 text-[8px] bg-muted text-muted-foreground rounded px-0.5 leading-none opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />
            )}
          </Button>
        ))}
      </span>

      {/* Group 2: Add node dropdown + Undo/Redo */}
      <span className="toolbar-group">
        <div className="relative" ref={addMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 transition-colors"
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            title="Adicionar nó"
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
        {undoRedoEnabled && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={undo} disabled={past.length === 0} title={`Desfazer (${SHORTCUT_MAP.undo})`}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={redo} disabled={future.length === 0} title={`Refazer (${SHORTCUT_MAP.redo})`}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </span>

      {/* Selection actions (shown when nodes selected) */}
      {selectedNodeIds.length > 0 && (
        <span className="toolbar-group">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive transition-colors" onClick={handleDeleteSelected} title={`Excluir selecionados (${SHORTCUT_MAP.delete})`}>
            <Trash2 className="h-4 w-4" />
            <ToolTipBadge shortcut={SHORTCUT_MAP.delete} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={handleDuplicateSelected} title={`Duplicar (${SHORTCUT_MAP.duplicate})`}>
            <Copy className="h-4 w-4" />
            <ToolTipBadge shortcut={SHORTCUT_MAP.duplicate} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenNodeEditor} title={`Editar nó (${SHORTCUT_MAP.edit})`}>
            <Edit3 className="h-4 w-4" />
            <ToolTipBadge shortcut={SHORTCUT_MAP.edit} />
          </Button>
        </span>
      )}

      {/* Group 3: Zoom controls */}
      <span className="toolbar-group">
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={() => zoomBy(1.2)} title="Zoom+ (+)">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center tabular-nums select-none">{Math.round(viewport.zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={() => zoomBy(0.8)} title="Zoom− (−)">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={() => fitToView(80)} title={`Ajustar à tela (${SHORTCUT_MAP.fitToView})`}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={organizeLayout} title="Organizar layout">
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </span>

      {/* Group 4: Search bar — more prominent */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors text-sm text-muted-foreground brand-gradient-focus"
        title="Buscar (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="font-medium">Buscar...</span>
        <kbd className="ml-3 text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors md:hidden" onClick={onOpenSearch} title="Buscar (Ctrl+K)">
        <Search className="h-4 w-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Group 5: Shortcuts, AI, Export, Settings */}
      <span className="toolbar-group">
        {shortcutsEnabled && (
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenShortcuts} title="Atalhos de teclado">
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
        {aiEnabled && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 transition-colors" onClick={onOpenAIPanel} title="IA">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">IA</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenExport} title="Exportar">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors" onClick={onOpenSettings} title="Configurações">
          <Settings2 className="h-4 w-4" />
        </Button>
      </span>
    </div>
  );
}
