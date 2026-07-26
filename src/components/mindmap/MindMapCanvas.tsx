"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { MapNodeView } from "./MapNode";
import { MapEdges } from "./MapEdges";
import type { Tool } from "@/lib/types";

interface Props {
  onOpenNodeEditor: () => void;
  onOpenAIPanel: () => void;
}

export function MindMapCanvas({ onOpenNodeEditor, onOpenAIPanel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    type: "node" | "pan" | "connect";
    nodeId?: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    vpStartX: number;
    vpStartY: number;
  } | null>(null);

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
  const undo = useMindMapStore((s) => s.undo);
  const redo = useMindMapStore((s) => s.redo);

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
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      clearSelection();
      setConnectingFrom(null);
    },
    [tool, viewport, clearSelection]
  );

  // Node pointer down — start drag or connect
  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      if (tool === "connect") {
        if (connectingFrom) {
          // Second click — create edge
          addEdge(connectingFrom, id);
          setConnectingFrom(null);
          setCursorWorld(null);
        } else {
          // First click — start connecting
          setConnectingFrom(id);
        }
        return;
      }
      // Select + start drag
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
    },
    [tool, connectingFrom, nodes, addEdge, pushHistory]
  );

  // Connect handle pointer down
  const handleConnectHandle = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      setConnectingFrom(id);
      setTool("connect");
      const world = screenToWorld(e.clientX, e.clientY);
      setCursorWorld(world);
    },
    [screenToWorld]
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
    [isDragging, connectingFrom, viewport.zoom, panBy, updateNode, snap, screenToWorld]
  );

  // Pointer up
  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
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
        x: snap(world.x - 90),
        y: snap(world.y - 36),
        kind: "concept",
      });
      focusNode(id);
      onOpenNodeEditor();
    },
    [screenToWorld, addNode, snap, focusNode, onOpenNodeEditor]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!undoRedo) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeIds.length > 0) {
          if (confirmDelete) {
            // We'll handle confirm in the node editor
            return;
          }
          for (const id of selectedNodeIds) {
            deleteNode(id);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoRedo, undo, redo, selectedNodeIds, confirmDelete, deleteNode]);

  // Expose tool setter for toolbar
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__mmSetTool = setTool;
  }, []);

  const bgClass = showGrid ? "canvas-grid-bg" : "canvas-plain-bg";

  return (
    <div
      ref={containerRef}
      data-canvas="true"
      className={`relative flex-1 overflow-hidden ${bgClass}`}
      style={{ cursor: tool === "pan" ? "grab" : tool === "connect" ? "crosshair" : "default" }}
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
          nodes={nodes}
          edges={edges}
          connectingFrom={connectingFrom}
          cursorWorld={cursorWorld}
        />
        <AnimatePresence>
          {nodes.map((node) => (
            <MapNodeView
              key={node.id}
              node={node}
              onPointerDown={handleNodePointerDown}
              onConnectHandle={handleConnectHandle}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
