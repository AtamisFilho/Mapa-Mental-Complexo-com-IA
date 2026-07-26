"use client";

import { useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Trash2,
  Copy,
  Palette,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { NODE_KIND_META } from "@/lib/settings";

interface Props {
  onOpenNodeEditor: () => void;
}

const NODE_COLORS = [
  "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#14b8a6",
  "#ec4899", "#64748b", "#3b82f6", "#ef4444", "#22c55e",
];

export function FloatingToolbar({ onOpenNodeEditor }: Props) {
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const nodes = useMindMapStore((s) => s.nodes);
  const viewport = useMindMapStore((s) => s.viewport);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const duplicateNode = useMindMapStore((s) => s.duplicateNode);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const clearSelection = useMindMapStore((s) => s.clearSelection);

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
    const sy = nodeTopY * viewport.zoom + viewport.y - 20;
    return { x: sx, y: sy };
  }, [node, viewport]);

  // Dismiss on Escape or click outside
  useEffect(() => {
    if (!nodeId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodeId, clearSelection]);

  const handleEdit = useCallback(() => {
    onOpenNodeEditor();
  }, [onOpenNodeEditor]);

  const handleDelete = useCallback(() => {
    if (!nodeId) return;
    pushHistory();
    deleteNode(nodeId);
  }, [nodeId, pushHistory, deleteNode]);

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
    },
    [nodeId, pushHistory, updateNode]
  );

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
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: screenPos.x,
            top: screenPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-card/95 border border-border shadow-lg backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Edit button */}
            <button
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-foreground transition-colors"
              onClick={handleEdit}
              title="Editar (E)"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>

            {/* Delete button */}
            <button
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-destructive/20 text-destructive transition-colors"
              onClick={handleDelete}
              title="Excluir (Del)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {/* Duplicate button */}
            <button
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-foreground transition-colors"
              onClick={handleDuplicate}
              title="Duplicar (Ctrl+D)"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-border mx-0.5" />

            {/* Color dropdown */}
            <div className="relative group/color">
              <button
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                title="Alterar cor"
              >
                <Palette className="h-3.5 w-3.5" style={{ color: currentColor }} />
              </button>
              {/* Color picker popover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-1.5 rounded-lg bg-card border border-border shadow-xl z-50 hidden group-hover/color:block fade-in">
                <div className="grid grid-cols-5 gap-1">
                  {NODE_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`h-5 w-5 rounded-full border-2 transition-all hover:scale-110 ${
                        currentColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ background: color }}
                      onClick={() => handleColorChange(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Collapse/Expand button */}
            <button
              className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-accent text-foreground transition-colors"
              onClick={handleToggleCollapse}
              title={node.collapsed ? "Expandir" : "Colapsar"}
            >
              {node.collapsed ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Node title */}
            <div className="px-1.5 text-xs font-medium text-muted-foreground max-w-[80px] truncate">
              {node.title}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
