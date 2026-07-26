"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useTool } from "@/hooks/use-tool-context";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";
import { MapNodeView } from "./MapNode";
import { MapEdges } from "./MapEdges";

interface Props {
  onOpenNodeEditor: () => void;
  onOpenAIPanel: () => void;
}

export function MindMapCanvas({ onOpenNodeEditor, onOpenAIPanel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<"node" | "pan" | null>(null);
  const dragRef = useRef<{
    type: "node" | "pan";
    nodeId?: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    vpStartX: number;
    vpStartY: number;
  } | null>(null);

  const { tool, connectingFrom, cursorWorld, setConnectingFrom, setCursorWorld } = useTool();

  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const viewport = useMindMapStore((s) => s.viewport);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const clearSelection = useMindMapStore((s) => s.clearSelection);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const addNode = useMindMapStore((s) => s.addNode);
  const addEdge = useMindMapStore((s) => s.addEdge);
  const panBy = useMindMapStore((s) => s.panBy);
  const zoomBy = useMindMapStore((s) => s.zoomBy);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const focusNode = useMindMapStore((s) => s.focusNode);
  const deleteNode = useMindMapStore((s) => s.deleteNode);

  const showGrid = useSettingsStore((s) => s.settings.visual.grid);
  const snapToGrid = useSettingsStore((s) => s.settings.editor.snapToGrid);
  const gridSize = useSettingsStore((s) => s.settings.editor.gridSize);
  const confirmDelete = useSettingsStore((s) => s.settings.editor.confirmDelete);
  const undoRedo = useSettingsStore((s) => s.settings.editor.undoRedo);
  const shortcutsEnabled = useSettingsStore((s) => s.settings.editor.keyboardShortcuts);
  const undo = useMindMapStore((s) => s.undo);
  const redo = useMindMapStore((s) => s.redo);
  const fitToView = useMindMapStore((s) => s.fitToView);

  // Convert screen coords to world coords
  const screenToWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - viewport.x) / viewport.zoom,
        y: (sy - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Snap to grid
  const snap = useCallback(
    (val: number) => {
      if (!snapToGrid) return val;
      return Math.round(val / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  // Canvas background click — deselect or add node
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== containerRef.current && !(e.target as HTMLElement).dataset?.canvas) return;
      if (tool === "pan") {
        dragRef.current = {
          type: "pan",
          startX: e.clientX,
          startY: e.clientY,
          vpStartX: viewport.x,
          vpStartY: viewport.y,
          nodeStartX: 0,
          nodeStartY: 0,
        };
        setIsDragging(true);
        setDragType("pan");
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      clearSelection();
      setConnectingFrom(null);
      setCursorWorld(null);
    },
    [tool, viewport, clearSelection, setConnectingFrom, setCursorWorld]
  );

  // Node pointer down — start drag or connect
  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      if (tool === "connect") {
        if (connectingFrom) {
          addEdge(connectingFrom, id);
          setConnectingFrom(null);
          setCursorWorld(null);
        } else {
          setConnectingFrom(id);
        }
        return;
      }
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      pushHistory();
      dragRef.current = {
        type: "node",
        nodeId: id,
        startX: e.clientX,
        startY: e.clientY,
        nodeStartX: node.x,
        nodeStartY: node.y,
        vpStartX: 0,
        vpStartY: 0,
      };
      setIsDragging(true);
      setDragType("node");
    },
    [tool, connectingFrom, nodes, addEdge, pushHistory, setConnectingFrom, setCursorWorld]
  );

  // Connect handle pointer down
  const handleConnectHandle = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      setConnectingFrom(id);
      const world = screenToWorld(e.clientX, e.clientY);
      setCursorWorld(world);
    },
    [screenToWorld, setConnectingFrom, setCursorWorld]
  );

  // Pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (connectingFrom) {
        const world = screenToWorld(e.clientX, e.clientY);
        setCursorWorld(world);
      }
      if (!dragRef.current || !isDragging) return;
      const d = dragRef.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;

      if (d.type === "pan") {
        panBy(dx, dy);
        dragRef.current = { ...d, startX: e.clientX, startY: e.clientY };
      } else if (d.type === "node" && d.nodeId) {
        const worldDx = dx / viewport.zoom;
        const worldDy = dy / viewport.zoom;
        const newX = snap(d.nodeStartX + worldDx);
        const newY = snap(d.nodeStartY + worldDy);
        updateNode(d.nodeId, { x: newX, y: newY });
      }
    },
    [isDragging, connectingFrom, viewport.zoom, panBy, updateNode, snap, screenToWorld, setCursorWorld]
  );

  // Pointer up
  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    setDragType(null);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      zoomBy(factor, cx, cy);
    },
    [zoomBy]
  );

  // Double click — add node
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== containerRef.current && !(e.target as HTMLElement).dataset?.canvas) return;
      const world = screenToWorld(e.clientX, e.clientY);
      const id = addNode({
        title: "Novo conceito",
        x: snap(world.x - 100),
        y: snap(world.y - 40),
        kind: "concept",
        width: 200,
        height: 80,
      });
      focusNode(id);
      onOpenNodeEditor();
    },
    [screenToWorld, addNode, snap, focusNode, onOpenNodeEditor]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (!undoRedo) return;
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        if (!undoRedo) return;
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeIds.length > 0 && !confirmDelete) {
          for (const id of selectedNodeIds) {
            deleteNode(id);
          }
        }
        return;
      }
      if (e.key === "Escape") {
        clearSelection();
        setConnectingFrom(null);
        return;
      }
      if (!shortcutsEnabled) return;
      // Fit to view
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        fitToView(80);
        return;
      }
      // Add node shortcuts: C/P/A/I/R/O
      const keyMap: Record<string, NodeKind> = {
        c: "concept", p: "question", a: "action", i: "idea", r: "resource", o: "goal",
      };
      const k = e.key.toLowerCase();
      if (keyMap[k]) {
        e.preventDefault();
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const wx = (cx - viewport.x) / viewport.zoom - 100;
        const wy = (cy - viewport.y) / viewport.zoom - 40;
        addNode({ title: "Novo " + NODE_KIND_META[keyMap[k]].label, kind: keyMap[k], x: wx, y: wy, width: 200, height: 80 });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoRedo, undo, redo, selectedNodeIds, confirmDelete, deleteNode, clearSelection, setConnectingFrom, shortcutsEnabled, fitToView, viewport, addNode]);

  const bgClass = showGrid ? "canvas-grid-bg" : "canvas-plain-bg";

  // Compute visible nodes: hide descendants of collapsed nodes
  const visibleNodeIds = useMemo(() => {
    const collapsedIds = new Set(nodes.filter((n) => n.collapsed).map((n) => n.id));
    if (collapsedIds.size === 0) return null; // all visible
    const hidden = new Set<string>();
    // Build child map
    const childrenOf = new Map<string, string[]>();
    for (const e of edges) {
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, []);
      childrenOf.get(e.sourceId)!.push(e.targetId);
    }
    // BFS from each collapsed node
    const queue = [...collapsedIds];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const child of childrenOf.get(cur) ?? []) {
        if (!hidden.has(child)) {
          hidden.add(child);
          queue.push(child);
        }
      }
    }
    return hidden;
  }, [nodes, edges]);

  const visibleNodes = visibleNodeIds ? nodes.filter((n) => !visibleNodeIds.has(n.id)) : nodes;
  const visibleEdges = visibleNodeIds
    ? edges.filter((e) => !visibleNodeIds.has(e.sourceId) && !visibleNodeIds.has(e.targetId))
    : edges;

  return (
    <div
      ref={containerRef}
      data-canvas="true"
      className={`relative flex-1 overflow-hidden ${bgClass}`}
      style={{
        cursor:
          isDragging && dragType === "pan"
            ? "grabbing"
            : tool === "pan"
              ? "grab"
              : tool === "connect"
                ? "crosshair"
                : isDragging
                  ? "grabbing"
                  : "default",
      }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      {/* transform layer */}
      <div
        data-canvas="true"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          left: 0,
          top: 0,
          willChange: "transform",
        }}
      >
        <MapEdges
          nodes={visibleNodes}
          edges={visibleEdges}
          connectingFrom={connectingFrom}
          cursorWorld={cursorWorld}
        />
        <AnimatePresence>
          {visibleNodes.map((node) => (
            <MapNodeView
              key={node.id}
              node={node}
              onPointerDown={handleNodePointerDown}
              onConnectHandle={handleConnectHandle}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state hint */}
      {nodes.length === 0 && !isDragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold brand-gradient mb-1">Comece seu mapa mental</p>
            <p className="text-sm text-muted-foreground mb-3">
              Clique duplo no canvas para adicionar um nó, ou use o botão <strong className="text-foreground">Adicionar</strong> na barra.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">C</kbd> Conceito
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">P</kbd> Pergunta
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">A</kbd> Ação
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">I</kbd> Ideia
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">F</kbd> Ajustar
            </div>
          </div>
        </div>
      )}

      {/* Connection mode indicator */}
      {tool === "connect" && !connectingFrom && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg fade-in">
            Clique em um nó para iniciar a conexão
          </div>
        </div>
      )}
      {connectingFrom && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg fade-in">
            Clique em outro nó para completar a conexão · Esc para cancelar
          </div>
        </div>
      )}
    </div>
  );
}
