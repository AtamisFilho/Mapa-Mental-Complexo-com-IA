"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Trash2,
  Copy,
  Palette,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { NODE_KIND_META } from "@/lib/settings";

interface Props {
  onOpenNodeEditor: () => void;
  onExpand?: () => void;
  onConnectFrom?: () => void;
}

const NODE_COLORS = [
  { hex: "#10b981", name: "Esmeralda" },
  { hex: "#f59e0b", name: "Ambar" },
  { hex: "#f43f5e", name: "Rosa" },
  { hex: "#8b5cf6", name: "Violeta" },
  { hex: "#14b8a6", name: "Turquesa" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#64748b", name: "Cinza" },
  { hex: "#3b82f6", name: "Azul" },
  { hex: "#ef4444", name: "Vermelho" },
  { hex: "#22c55e", name: "Verde" },
];

export function FloatingToolbar({ onOpenNodeEditor, onExpand, onConnectFrom }: Props) {
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const nodes = useMindMapStore((s) => s.nodes);
  const viewport = useMindMapStore((s) => s.viewport);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const duplicateNode = useMindMapStore((s) => s.duplicateNode);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const clearSelection = useMindMapStore((s) => s.clearSelection);

  const aiEnabled = useSettingsStore((s) => s.settings.ai.enabled);
  const confirmDelete = useSettingsStore((s) => s.settings.editor.confirmDelete);
  const { toast } = useToastNotify();

  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // Only show for exactly 1 selected node
  const nodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
  const node = nodeId ? nodes.find((n) => n.id === nodeId) : null;

  // Calculate position in screen space (above the node)
  const screenPos = useMemo(() => {
    if (!node) return null;
    const nodeCenterX = node.x + node.width / 2;
    const nodeTopY = node.y;
    // Convert world to screen
    const sx = nodeCenterX * viewport.zoom + viewport.x;
    const sy = nodeTopY * viewport.zoom + viewport.y - 24;
    return { x: sx, y: sy };
  }, [node, viewport]);

  // Dismiss on Escape or click outside
  useEffect(() => {
    if (!nodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
        setColorPickerOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodeId, clearSelection]);

  // Close color picker on click outside
  useEffect(() => {
    if (!colorPickerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-color-picker]")) {
        setColorPickerOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [colorPickerOpen]);

  const handleEdit = useCallback(() => {
    onOpenNodeEditor();
  }, [onOpenNodeEditor]);

  const handleDelete = useCallback(() => {
    if (!nodeId) return;
    if (confirmDelete && !window.confirm("Excluir este nó e suas conexões?")) return;
    pushHistory();
    deleteNode(nodeId);
    toast({ title: "Nó excluído", variant: "default" });
  }, [nodeId, pushHistory, deleteNode, confirmDelete, toast]);

  const handleDuplicate = useCallback(() => {
    if (!nodeId) return;
    pushHistory();
    duplicateNode(nodeId);
  }, [nodeId, pushHistory, duplicateNode]);

  const handleToggleCollapse = useCallback(() => {
    if (!nodeId) return;
    toggleCollapse(nodeId);
  }, [nodeId, toggleCollapse]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (!nodeId) return;
      pushHistory();
      updateNode(nodeId, { color });
      setColorPickerOpen(false);
    },
    [nodeId, pushHistory, updateNode]
  );

  const handleResetColor = useCallback(() => {
    if (!nodeId) return;
    pushHistory();
    updateNode(nodeId, { color: null });
    setColorPickerOpen(false);
  }, [nodeId, pushHistory, updateNode]);

  const handleExpand = useCallback(() => {
    onExpand?.();
  }, [onExpand]);

  const handleConnectFrom = useCallback(() => {
    onConnectFrom?.();
  }, [onConnectFrom]);

  if (!node || !screenPos) return null;

  const nodeKindMeta = NODE_KIND_META[node.kind];
  const currentColor = node.color ?? nodeKindMeta?.color ?? "#10b981";

  return (
    <AnimatePresence>
      {nodeId && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: screenPos.x,
            top: screenPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {/* Gradient border wrapper */}
          <div
            className="rounded-[14px] p-[1.5px]"
            style={{
              background: `linear-gradient(135deg, ${currentColor}60, ${currentColor}20, transparent 70%)`,
            }}
          >
            {/* Glass-panel toolbar card */}
            <div
              className="glass-panel rounded-[13px] px-3 py-2 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: selectedNodeIds.length === 1
                  ? `0 0 0 1px ${currentColor}30, 0 4px 20px rgba(0,0,0,0.08), 0 0 12px 2px ${currentColor}15`
                  : "var(--panel-shadow)",
                animation: selectedNodeIds.length === 1
                  ? "toolbar-pulse-ring 2.5s ease-in-out infinite"
                  : "none",
              }}
            >
              {/* Edit button */}
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground transition-all duration-150 hover:bg-accent/60 hover:text-accent-foreground"
                onClick={handleEdit}
                title="Editar (E)"
              >
                <Edit3 className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </button>

              {/* AI Expand button (only if AI enabled) */}
              {aiEnabled && (
                <button
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-primary transition-all duration-150 hover:bg-primary/15 hover:text-primary"
                  onClick={handleExpand}
                  title="Expandir com IA (Ctrl+E)"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="sr-only">Expandir com IA</span>
                </button>
              )}

              {/* Delete button */}
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-destructive transition-all duration-150 hover:bg-destructive/15 hover:text-destructive"
                onClick={handleDelete}
                title="Excluir (Del)"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
              </button>

              {/* Duplicate button */}
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground transition-all duration-150 hover:bg-accent/60 hover:text-accent-foreground"
                onClick={handleDuplicate}
                title="Duplicar (Ctrl+D)"
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Duplicar</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-border/60" />

              {/* Color picker button */}
              <div data-color-picker className="relative">
                <button
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-accent/60"
                  onClick={() => setColorPickerOpen((v) => !v)}
                  title="Alterar cor"
                >
                  <Palette className="h-4 w-4" style={{ color: currentColor }} />
                  <span className="sr-only">Alterar cor</span>
                </button>

                {/* Color picker popover */}
                <AnimatePresence>
                  {colorPickerOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 rounded-xl glass-panel z-[60]"
                      style={{ minWidth: 200 }}
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {NODE_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all duration-150 hover:bg-accent/40 ${
                              currentColor === c.hex ? "ring-2 ring-foreground bg-accent/30" : ""
                            }`}
                            onClick={() => handleColorChange(c.hex)}
                            title={c.name}
                          >
                            <div
                              className={`h-5 w-5 rounded-full border-2 transition-all ${
                                currentColor === c.hex ? "border-foreground scale-110" : "border-transparent"
                              }`}
                              style={{ background: c.hex }}
                            />
                            <span className="text-[9px] leading-none text-muted-foreground truncate w-full text-center">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                      {/* Reset to default */}
                      {node.color !== null && (
                        <button
                          className="mt-1.5 flex items-center gap-1.5 w-full px-2 py-1 rounded-lg text-xs text-muted-foreground transition-all duration-150 hover:bg-accent/60 hover:text-foreground"
                          onClick={handleResetColor}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurar padrão
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Collapse/Expand button */}
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground transition-all duration-150 hover:bg-accent/60 hover:text-accent-foreground"
                onClick={handleToggleCollapse}
                title={node.collapsed ? "Expandir (Ctrl+Shift+E)" : "Colapsar (Ctrl+Shift+E)"}
              >
                {node.collapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                <span className="sr-only">{node.collapsed ? "Expandir" : "Colapsar"}</span>
              </button>

              {/* Connect from here button */}
              <button
                className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground transition-all duration-150 hover:bg-accent/60 hover:text-accent-foreground"
                onClick={handleConnectFrom}
                title="Conectar a partir (C)"
              >
                <GripVertical className="h-4 w-4" />
                <span className="sr-only">Conectar a partir</span>
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-border/60" />

              {/* Node title - more prominent */}
              <div
                className="px-2 text-sm font-semibold max-w-[100px] truncate"
                style={{ color: currentColor }}
              >
                {node.title}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
