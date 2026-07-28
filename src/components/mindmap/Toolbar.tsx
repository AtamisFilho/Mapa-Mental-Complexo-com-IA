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
  Share2,
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
  onOpenShare: () => void;
  /** Optional: parent hook fired when the layout panel button is clicked
   *  (e.g. to close other right-side panels via mutual exclusion). When not
   *  provided, the Toolbar manages the LayoutPanel open-state internally. */
  onOpenLayout?: () => void;
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

export function Toolbar({ onOpenSettings, onOpenAIPanel, onOpenSidebar, onOpenShortcuts, onOpenExport, onOpenSearch, onOpenNodeEditor, onOpenShare, onOpenLayout }: Props) {
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
  const duplicateNode = useMindMapStore((s) => s.duplicateNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const viewport = useMindMapStore((s) => s.viewport);
  const mapId = useMindMapStore((s) => s.mapId);

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
    if (selectedNodeIds.length === 0) return;
    // Snapshot so bulk delete is a single undoable step.
    pushHistory();
    for (const id of selectedNodeIds) {
      deleteNode(id);
    }
  }, [selectedNodeIds, deleteNode, pushHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    // duplicateNode pushes history internally (single undoable step).
    duplicateNode(selectedNodeIds[0]);
  }, [selectedNodeIds, duplicateNode]);

  // Close add-menu on outside click / Escape
  useEffect(() => {
    if (!addMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddMenuOpen(false);
      }
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

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="relative z-40 flex items-center gap-3 px-2 py-1.5 border-b border-border overflow-x-auto toolbar-container">
      {/* Bottom shadow gradient for depth */}
      <div className="toolbar-shadow" />

      {/* ── Brand Section (far-left) ── */}
      <div className="toolbar-brand flex items-center gap-1.5 mr-1 shrink-0">
        <BrainCircuit className="h-5 w-5 toolbar-brand-icon brand-gradient-icon" />
        <span className="text-sm font-semibold brand-gradient tracking-wide">Mapa Mental</span>
      </div>

      {/* Gradient divider */}
      <div className="toolbar-divider" />

      {/* Group 1: Select, Pan, Connect tools */}
      <span className="toolbar-group">
        {toolButtons.map((tb) => (
          <Button
            key={tb.toolId}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-all relative toolbar-btn ${isToolActive(tb.toolId) ? "toolbar-btn--active" : ""}`}
            onClick={() => setTool(tb.toolId as "select" | "pan" | "connect")}
            data-tooltip={`${tb.label} (${tb.shortcut})`}
          >
            {tb.icon}
            {/* Pulsing dot indicator when active */}
            {isToolActive(tb.toolId) && (
              <span className="active-tool-dot" />
            )}
          </Button>
        ))}
      </span>

      {/* Gradient divider */}
      <div className="toolbar-divider" />

      {/* Group 2: Add node dropdown + Undo/Redo */}
      <span className="toolbar-group">
        <div className="relative" ref={addMenuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 transition-colors toolbar-btn"
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            data-tooltip="Adicionar nó (A)"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">Adicionar</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
          {addMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 z-[100] toolbar-dropdown fade-in">
              <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de nó</p>
              {Object.entries(NODE_KIND_META).map(([kind, meta]) => (
                <button
                  key={kind}
                  className="toolbar-dropdown-item"
                  onClick={() => {
                    handleAddNode(kind as NodeKind);
                    setAddMenuOpen(false);
                  }}
                >
                  <div
                    className="toolbar-dropdown-icon"
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
            <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={undo} disabled={past.length === 0} data-tooltip={`Desfazer (${SHORTCUT_MAP.undo})`}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={redo} disabled={future.length === 0} data-tooltip={`Refazer (${SHORTCUT_MAP.redo})`}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </span>

      {/* Gradient divider */}
      <div className="toolbar-divider" />

      {/* Selection actions (shown when nodes selected) */}
      {selectedNodeIds.length > 0 && (
        <>
          <span className="toolbar-group">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive transition-colors toolbar-btn" onClick={handleDeleteSelected} data-tooltip={`Excluir selecionados (${SHORTCUT_MAP.delete})`}>
              <Trash2 className="h-4 w-4" />
              <ToolTipBadge shortcut={SHORTCUT_MAP.delete} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={handleDuplicateSelected} data-tooltip={`Duplicar (${SHORTCUT_MAP.duplicate})`}>
              <Copy className="h-4 w-4" />
              <ToolTipBadge shortcut={SHORTCUT_MAP.duplicate} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={onOpenNodeEditor} data-tooltip={`Editar nó (${SHORTCUT_MAP.edit})`}>
              <Edit3 className="h-4 w-4" />
              <ToolTipBadge shortcut={SHORTCUT_MAP.edit} />
            </Button>
          </span>
          <div className="toolbar-divider" />
        </>
      )}

      {/* Group 3: Zoom controls */}
      <span className="toolbar-group">
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={() => zoomBy(1.2)} data-tooltip="Zoom+ (+)">
          <ZoomIn className="h-4 w-4" />
        </Button>
        {/* Zoom percentage badge */}
        <span className="toolbar-zoom-badge">{zoomPercent}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={() => zoomBy(0.8)} data-tooltip="Zoom− (−)">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={() => fitToView(80)} data-tooltip={`Ajustar à tela (${SHORTCUT_MAP.fitToView})`}>
          <Maximize className="h-4 w-4" />
        </Button>
        {/* Layout panel trigger — opens the dedicated LayoutPanel with all 10 layouts */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 transition-colors toolbar-btn"
          onClick={() => {
            if (onOpenLayout) onOpenLayout();
          }}
          data-tooltip="Organizar layout (Shift+L)"
          aria-label="Abrir painel de organização visual"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </span>

      {/* Gradient divider */}
      <div className="toolbar-divider" />

      {/* Group 4: Search bar — more prominent */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-lg border border-border bg-muted/40 hover:bg-accent transition-colors text-sm text-muted-foreground toolbar-search-btn"
        data-tooltip="Buscar (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="font-medium">Buscar...</span>
        <kbd className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/30 font-mono font-semibold tracking-wide shadow-sm">⌘K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors md:hidden toolbar-btn" onClick={onOpenSearch} data-tooltip="Buscar (Ctrl+K)">
        <Search className="h-4 w-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Group 5: Shortcuts, AI, Export, Settings */}
      <span className="toolbar-group">
        {shortcutsEnabled && (
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={onOpenShortcuts} data-tooltip="Atalhos de teclado (?)">
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
        {aiEnabled && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 transition-colors toolbar-btn toolbar-ai-btn" onClick={onOpenAIPanel} data-tooltip="IA">
            <Sparkles className="h-4 w-4 toolbar-sparkle-icon" />
            <span className="text-xs hidden sm:inline">IA</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={onOpenExport} data-tooltip="Exportar (⤓)">
          <Download className="h-4 w-4" />
        </Button>
        {/* Share button — only show when a map is loaded (not in read-only mode).
            The page.tsx wrapper hides the entire Toolbar in read-only mode,
            but we also gate on mapId here for safety. */}
        {mapId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 transition-colors toolbar-btn"
            onClick={onOpenShare}
            data-tooltip="Partilhar"
            aria-label="Partilhar mapa"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors toolbar-btn" onClick={onOpenSettings} data-tooltip="Configurações (⚙)">
          <Settings2 className="h-4 w-4" />
        </Button>
      </span>
    </div>
  );
}
