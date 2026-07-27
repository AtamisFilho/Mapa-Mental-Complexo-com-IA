"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useTool } from "@/hooks/use-tool-context";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";
import { MapNodeView } from "./MapNode";
import { MapEdges } from "./MapEdges";
import { NodeContextMenu } from "./NodeContextMenu";

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

// ── Alignment guides (Task 14-C) ────────────────────────────────────────
// A guide is a dashed line drawn across the viewport when the dragged
// node's center / edge snaps into alignment with another visible node.
interface AlignmentGuide {
  // "horizontal" → line drawn horizontally at y=position (centers align on Y)
  // "vertical"   → line drawn vertically   at x=position (centers align on X)
  type: "horizontal" | "vertical";
  position: number;
  // World coords for the distance badge between the dragged node and the matched sibling
  badgeX: number;
  badgeY: number;
  distance: number; // px (rounded)
}

interface AlignmentResult {
  guides: AlignmentGuide[];
  snapX: number | null; // absolute world X to snap the dragged node to (top-left)
  snapY: number | null; // absolute world Y to snap the dragged node to (top-left)
}

// Tolerance (in world px) within which an alignment is detected.
const ALIGNMENT_TOLERANCE = 6;
// When the visible node count exceeds this, only nodes within CULL_RADIUS of
// the dragged node are compared — keeps the comparison O(nearby) on huge maps.
const ALIGNMENT_MAX_NODES = 100;
const ALIGNMENT_CULL_RADIUS = 1800;
// How far (in world px) the guide line extends on either side of the viewport.
// The SVG container is clipped by the canvas, so a very large extent is fine.
const GUIDE_EXTENT = 100000;

/**
 * Compute alignment guides for the dragged node against every other visible
 * node. Also returns the snap target (top-left X / Y of the dragged node) so
 * the caller can apply a magnetic snap when a guide is active.
 */
function computeAlignmentGuides(
  draggedId: string,
  draggedX: number,
  draggedY: number,
  draggedW: number,
  draggedH: number,
  allNodes: { id: string; x: number; y: number; width: number; height: number }[]
): AlignmentResult {
  const draggedCx = draggedX + draggedW / 2;
  const draggedCy = draggedY + draggedH / 2;
  const draggedRight = draggedX + draggedW;
  const draggedBottom = draggedY + draggedH;

  const guides: AlignmentGuide[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  // Cull to nearby nodes when there are many visible nodes (perf cap).
  let candidates = allNodes.filter((n) => n.id !== draggedId);
  if (candidates.length > ALIGNMENT_MAX_NODES) {
    candidates = candidates.filter((n) => {
      const dx = Math.abs(n.x + n.width / 2 - draggedCx);
      const dy = Math.abs(n.y + n.height / 2 - draggedCy);
      return dx < ALIGNMENT_CULL_RADIUS && dy < ALIGNMENT_CULL_RADIUS;
    });
  }

  for (const other of candidates) {
    const oW = other.width;
    const oH = other.height;
    const oCx = other.x + oW / 2;
    const oCy = other.y + oH / 2;
    const oRight = other.x + oW;
    const oBottom = other.y + oH;

    // ── Vertical guide (alignment on the X axis) ───────────────────────
    // Possible matches: center-X, left edge, right edge.
    let vertPos: number | null = null;
    if (Math.abs(draggedCx - oCx) < ALIGNMENT_TOLERANCE) {
      vertPos = oCx;
      if (snapX === null) snapX = oCx - draggedW / 2;
    } else if (Math.abs(draggedX - other.x) < ALIGNMENT_TOLERANCE) {
      vertPos = other.x;
      if (snapX === null) snapX = other.x;
    } else if (Math.abs(draggedRight - oRight) < ALIGNMENT_TOLERANCE) {
      vertPos = oRight;
      if (snapX === null) snapX = oRight - draggedW;
    }
    if (vertPos !== null) {
      // Distance along the perpendicular (Y) axis: gap between the two boxes.
      const isDraggedBelow = draggedY > other.y;
      const gap = isDraggedBelow
        ? Math.max(0, draggedY - oBottom)
        : Math.max(0, other.y - draggedBottom);
      const badgeY = isDraggedBelow
        ? (oBottom + draggedY) / 2
        : (draggedBottom + other.y) / 2;
      guides.push({
        type: "vertical",
        position: vertPos,
        badgeX: vertPos,
        badgeY,
        distance: Math.round(gap),
      });
    }

    // ── Horizontal guide (alignment on the Y axis) ────────────────────
    // Possible matches: center-Y, top edge, bottom edge.
    let horizPos: number | null = null;
    if (Math.abs(draggedCy - oCy) < ALIGNMENT_TOLERANCE) {
      horizPos = oCy;
      if (snapY === null) snapY = oCy - draggedH / 2;
    } else if (Math.abs(draggedY - other.y) < ALIGNMENT_TOLERANCE) {
      horizPos = other.y;
      if (snapY === null) snapY = other.y;
    } else if (Math.abs(draggedBottom - oBottom) < ALIGNMENT_TOLERANCE) {
      horizPos = oBottom;
      if (snapY === null) snapY = oBottom - draggedH;
    }
    if (horizPos !== null) {
      const isDraggedRight = draggedX > other.x;
      const gap = isDraggedRight
        ? Math.max(0, draggedX - oRight)
        : Math.max(0, other.x - draggedRight);
      const badgeX = isDraggedRight
        ? (oRight + draggedX) / 2
        : (draggedRight + other.x) / 2;
      guides.push({
        type: "horizontal",
        position: horizPos,
        badgeX,
        badgeY: horizPos,
        distance: Math.round(gap),
      });
    }
  }

  return { guides, snapX, snapY };
}

interface Props {
  onOpenNodeEditor: () => void;
  onOpenAIPanel: () => void;
}

export function MindMapCanvas({ onOpenNodeEditor, onOpenAIPanel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<"node" | "pan" | "box" | null>(null);
  const [boxSel, setBoxSel] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const dragRef = useRef<{
    type: "node" | "pan" | "box";
    nodeId?: string;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    vpStartX: number;
    vpStartY: number;
  } | null>(null);

  const { toast } = useToastNotify();

  const { tool, connectingFrom, cursorWorld, setConnectingFrom, setCursorWorld, setTool } = useTool();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
  const duplicateNode = useMindMapStore((s) => s.duplicateNode);
  const selectNodes = useMindMapStore((s) => s.selectNode);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  // Reparent (Task 16-B)
  const reparentTargetId = useMindMapStore((s) => s.reparentTargetId);
  const draggedNodeId = useMindMapStore((s) => s.draggedNodeId);
  const setReparentTarget = useMindMapStore((s) => s.setReparentTarget);
  const setDraggedNode = useMindMapStore((s) => s.setDraggedNode);
  const reparentNode = useMindMapStore((s) => s.reparentNode);
  const isDescendantOf = useMindMapStore((s) => s.isDescendantOf);
  const multiSelect = useSettingsStore((s) => s.settings.editor.multiSelect);
  const alignmentGuidesEnabled = useSettingsStore(
    (s) => s.settings.editor.alignmentGuides ?? true
  );

  // Active alignment guides while dragging a node. Cleared on pointer-up.
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);

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
      // Select tool + empty canvas click → start box selection
      if (tool === "select" && multiSelect) {
        dragRef.current = {
          type: "box",
          startX: e.clientX,
          startY: e.clientY,
          vpStartX: 0,
          vpStartY: 0,
          nodeStartX: 0,
          nodeStartY: 0,
        };
        setIsDragging(true);
        setDragType("box");
        setBoxSel({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      clearSelection();
      setConnectingFrom(null);
      setCursorWorld(null);
    },
    [tool, viewport, clearSelection, setConnectingFrom, setCursorWorld, multiSelect]
  );

  // Node right-click handler — open context menu
  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      selectNodes(id, false);
      setContextMenu({ nodeId: id, x: e.clientX, y: e.clientY });
    },
    [selectNodes]
  );

  // Context menu callbacks
  const handleContextEdit = useCallback(
    (nodeId: string) => {
      selectNodes(nodeId, false);
      onOpenNodeEditor();
    },
    [selectNodes, onOpenNodeEditor]
  );

  const handleContextExpand = useCallback(
    (nodeId: string) => {
      selectNodes(nodeId, false);
      onOpenAIPanel();
    },
    [selectNodes, onOpenAIPanel]
  );

  const handleContextDuplicate = useCallback(
    (nodeId: string) => {
      pushHistory();
      duplicateNode(nodeId);
    },
    [pushHistory, duplicateNode]
  );

  const handleContextToggleCollapse = useCallback(
    (nodeId: string) => {
      toggleCollapse(nodeId);
    },
    [toggleCollapse]
  );

  const handleContextConnectFrom = useCallback(
    (nodeId: string) => {
      selectNodes(nodeId, false);
      setTool("connect");
      setConnectingFrom(nodeId);
    },
    [selectNodes, setTool, setConnectingFrom]
  );

  const handleContextColorChange = useCallback(
    (nodeId: string, color: string | null) => {
      pushHistory();
      if (color !== null) {
        updateNode(nodeId, { color });
      } else {
        updateNode(nodeId, { color: null });
      }
    },
    [pushHistory, updateNode]
  );

  const handleContextIconChange = useCallback(
    (nodeId: string, icon: string | null) => {
      pushHistory();
      updateNode(nodeId, { icon });
    },
    [pushHistory, updateNode]
  );

  const handleContextDelete = useCallback(
    (nodeId: string) => {
      pushHistory();
      deleteNode(nodeId);
    },
    [pushHistory, deleteNode]
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
      setDraggedNode(id); // Task 16-B: mark node as being dragged
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
    [tool, connectingFrom, nodes, addEdge, pushHistory, setConnectingFrom, setCursorWorld, setDraggedNode]
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

  // Compute visible nodes: hide descendants of collapsed nodes.
  // Declared here (above handlePointerMove) so the pointer-move handler can
  // depend on `visibleNodes` for alignment-guide computation.
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
      } else if (d.type === "box") {
        setBoxSel({ startX: d.startX, startY: d.startY, endX: e.clientX, endY: e.clientY });
      } else if (d.type === "node" && d.nodeId) {
        const worldDx = dx / viewport.zoom;
        const worldDy = dy / viewport.zoom;
        let newX = snap(d.nodeStartX + worldDx);
        let newY = snap(d.nodeStartY + worldDy);

        // Alignment guides: detect center / edge alignments with sibling nodes
        // and (a) render dashed guide lines + distance badges, (b) magnetically
        // snap the dragged node to the exact aligned position.
        if (alignmentGuidesEnabled) {
          const draggedNode = visibleNodes.find((n) => n.id === d.nodeId);
          if (draggedNode) {
            const w = draggedNode.width;
            const h = draggedNode.height;
            const result = computeAlignmentGuides(
              d.nodeId,
              newX,
              newY,
              w,
              h,
              visibleNodes
            );
            // Only update state if the guide set actually changed — avoids
            // unnecessary re-renders on every pointer-move tick.
            setActiveGuides((prev) => {
              if (
                prev.length === result.guides.length &&
                prev.every(
                  (g, i) =>
                    g.type === result.guides[i].type &&
                    g.position === result.guides[i].position &&
                    g.badgeX === result.guides[i].badgeX &&
                    g.badgeY === result.guides[i].badgeY &&
                    g.distance === result.guides[i].distance
                )
              ) {
                return prev;
              }
              return result.guides;
            });
            if (result.snapX !== null) newX = result.snapX;
            if (result.snapY !== null) newY = result.snapY;
          } else if (activeGuides.length > 0) {
            setActiveGuides([]);
          }
        } else if (activeGuides.length > 0) {
          setActiveGuides([]);
        }

        updateNode(d.nodeId, { x: newX, y: newY });

        // ── Reparent detection (Task 16-B) ────────────────────────────────
        // Check if the dragged node's center overlaps with another node's
        // bounding box. If so, that node becomes the reparent target.
        const draggedNodeCurrent = visibleNodes.find((n) => n.id === d.nodeId);
        if (draggedNodeCurrent) {
          const draggedCx = newX + draggedNodeCurrent.width / 2;
          const draggedCy = newY + draggedNodeCurrent.height / 2;

          let newTarget: string | null = null;
          for (const other of visibleNodes) {
            if (other.id === d.nodeId) continue; // skip self
            // Check if dragged center is inside other node's bounding box
            if (
              draggedCx >= other.x &&
              draggedCx <= other.x + other.width &&
              draggedCy >= other.y &&
              draggedCy <= other.y + other.height
            ) {
              // Validate: cannot reparent to own descendant
              if (!isDescendantOf(other.id, d.nodeId)) {
                newTarget = other.id;
              }
              break; // only one target at a time
            }
          }
          setReparentTarget(newTarget);
        }
      }
    },
    [isDragging, connectingFrom, viewport.zoom, panBy, updateNode, snap, screenToWorld, setCursorWorld, alignmentGuidesEnabled, activeGuides.length, visibleNodes, setReparentTarget, isDescendantOf]
  );

  // Pointer up
  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    // ── Reparent execution (Task 16-B) ──────────────────────────────────
    if (d?.type === "node" && d.nodeId && reparentTargetId) {
      const success = reparentNode(d.nodeId, reparentTargetId);
      if (success) {
        const targetNode = nodes.find((n) => n.id === reparentTargetId);
        toast({
          title: `Nó movido para ${targetNode?.title ?? "nó"}`,
          variant: "success",
        });
      }
      setReparentTarget(null);
      setDraggedNode(null);
    } else {
      setReparentTarget(null);
      setDraggedNode(null);
    }

    if (d?.type === "box" && boxSel) {
      // Convert box to world coords, then select nodes within
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x1 = Math.min(boxSel.startX, boxSel.endX) - rect.left;
        const y1 = Math.min(boxSel.startY, boxSel.endY) - rect.top;
        const x2 = Math.max(boxSel.startX, boxSel.endX) - rect.left;
        const y2 = Math.max(boxSel.startY, boxSel.endY) - rect.top;
        // World-space rect
        const wx1 = (x1 - viewport.x) / viewport.zoom;
        const wy1 = (y1 - viewport.y) / viewport.zoom;
        const wx2 = (x2 - viewport.x) / viewport.zoom;
        const wy2 = (y2 - viewport.y) / viewport.zoom;
        const hits = nodes.filter(
          (n) => n.x + n.width >= wx1 && n.x <= wx2 && n.y + n.height >= wy1 && n.y <= wy2
        );
        // Box-select only when meaningful drag (>=4px), else treat as click → clear
        const movedEnough = Math.abs(boxSel.endX - boxSel.startX) > 4 || Math.abs(boxSel.endY - boxSel.startY) > 4;
        if (movedEnough) {
          if (hits.length > 0) {
            // Replace selection with hits
            useMindMapStore.setState({ selectedNodeIds: hits.map((n) => n.id), selectedEdgeIds: [] });
          } else {
            clearSelection();
          }
        } else {
          clearSelection();
        }
      }
      setBoxSel(null);
    }
    dragRef.current = null;
    setIsDragging(false);
    setDragType(null);
    // Always clear alignment guides on pointer-up — they should only appear
    // while a node is being actively dragged.
    setActiveGuides([]);
  }, [boxSel, viewport, nodes, clearSelection, reparentTargetId, reparentNode, setReparentTarget, setDraggedNode, toast]);

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

  // Double click on canvas — add node. Double click on node → open editor.
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isCanvasBg = target === containerRef.current || !!target.dataset?.canvas;
      if (!isCanvasBg) {
        // Was a node double-click? Look for data-node-id
        const nodeEl = target.closest("[data-node-id]") as HTMLElement | null;
        if (nodeEl?.dataset.nodeId) {
          // Select and open editor
          selectNodes(nodeEl.dataset.nodeId, false);
          onOpenNodeEditor();
          return;
        }
        return;
      }
      const world = screenToWorld(e.clientX, e.clientY);
      const id = addNode({
        title: "Novo conceito",
        x: snap(world.x - 100),
        y: snap(world.y - 40),
        kind: "concept",
        width: 220,
        height: 88,
      });
      focusNode(id);
      onOpenNodeEditor();
    },
    [screenToWorld, addNode, snap, focusNode, onOpenNodeEditor, selectNodes]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      // Duplicate node: Ctrl/Cmd+D
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          pushHistory();
          // Duplicate the first selected node
          duplicateNode(selectedNodeIds[0]);
        }
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
        const wx = (cx - viewport.x) / viewport.zoom - 110;
        const wy = (cy - viewport.y) / viewport.zoom - 44;
        addNode({ title: "Novo " + NODE_KIND_META[keyMap[k]].label, kind: keyMap[k], x: wx, y: wy, width: 220, height: 88 });
        return;
      }
      // E or Enter — open Node Editor for the selected node
      if (k === "e" || e.key === "Enter") {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          onOpenNodeEditor();
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoRedo, undo, redo, selectedNodeIds, confirmDelete, deleteNode, duplicateNode, pushHistory, clearSelection, setConnectingFrom, shortcutsEnabled, fitToView, viewport, addNode, onOpenNodeEditor]);

  const canvasBackground = useSettingsStore((s) => s.settings.visual.canvasBackground);
  const bgClass = canvasBackground === "grid" ? "canvas-grid-bg"
    : canvasBackground === "gradient" ? "canvas-gradient-bg"
    : canvasBackground === "dots" ? "canvas-dots-bg"
    : "canvas-plain-bg";

  const visibleEdges = visibleNodeIds
    ? edges.filter((e) => !visibleNodeIds.has(e.sourceId) && !visibleNodeIds.has(e.targetId))
    : edges;

  // Compute highlighted nodes (ancestors + descendants of selected nodes)
  const highlightedNodeIds = useMemo(() => {
    if (selectedNodeIds.length === 0) return new Set<string>();
    const highlighted = new Set<string>();
    // Build parent map and child map from edges
    const parentOf = new Map<string, string>(); // child → parent
    const childrenOf = new Map<string, string[]>(); // parent → children
    for (const e of edges) {
      parentOf.set(e.targetId, e.sourceId);
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, []);
      childrenOf.get(e.sourceId)!.push(e.targetId);
    }
    // For each selected node, trace ancestors upward
    for (const selId of selectedNodeIds) {
      let current = parentOf.get(selId);
      while (current) {
        if (!selectedNodeIds.includes(current)) highlighted.add(current);
        current = parentOf.get(current);
      }
    }
    // For each selected node, trace descendants downward
    const queue = [...selectedNodeIds];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const child of childrenOf.get(cur) ?? []) {
        if (!selectedNodeIds.includes(child) && !highlighted.has(child)) {
          highlighted.add(child);
          queue.push(child);
        }
      }
    }
    return highlighted;
  }, [selectedNodeIds, edges]);

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
      onContextMenu={(e) => e.preventDefault()}
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
        {/* Alignment / snap guides — rendered ABOVE edges but BELOW nodes
            (z-order in SVG/HTML is determined by document order, so this
             layer sits between MapEdges and the node motion.divs). Only
             rendered while a node is being actively dragged. */}
        {activeGuides.length > 0 && (
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1,
              height: 1,
              overflow: "visible",
              pointerEvents: "none",
              shapeRendering: "crispEdges",
            }}
            aria-hidden="true"
          >
            {activeGuides.map((g, i) => {
              const badgeW = 38;
              const badgeH = 18;
              return (
                <g key={`guide-${i}`}>
                  {g.type === "horizontal" ? (
                    <line
                      className="alignment-guide"
                      x1={-GUIDE_EXTENT}
                      y1={g.position}
                      x2={GUIDE_EXTENT}
                      y2={g.position}
                      stroke="#ec4899"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : (
                    <line
                      className="alignment-guide"
                      x1={g.position}
                      y1={-GUIDE_EXTENT}
                      x2={g.position}
                      y2={GUIDE_EXTENT}
                      stroke="#ec4899"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {/* Distance badge between the dragged node and the matched sibling */}
                  <rect
                    className="alignment-guide-badge-bg"
                    x={g.badgeX - badgeW / 2}
                    y={g.badgeY - badgeH / 2}
                    width={badgeW}
                    height={badgeH}
                    rx={4}
                  />
                  <text
                    className="alignment-guide-badge"
                    x={g.badgeX}
                    y={g.badgeY + 3.5}
                    textAnchor="middle"
                  >
                    {g.distance}px
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        <AnimatePresence>
          {visibleNodes.map((node) => (
            <MapNodeView
              key={node.id}
              node={node}
              onPointerDown={handleNodePointerDown}
              onConnectHandle={handleConnectHandle}
              onContextMenu={handleNodeContextMenu}
              isHighlighted={highlightedNodeIds.has(node.id)}
              isReparentTarget={reparentTargetId === node.id}
              isBeingDraggedForReparent={draggedNodeId === node.id}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state hint */}
      {nodes.length === 0 && !isDragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md px-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center relative">
              <Sparkles className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping opacity-30" />
            </div>
            <p className="text-lg font-semibold brand-gradient mb-1">Comece seu mapa mental</p>
            <p className="text-sm text-muted-foreground mb-3">
              Clique duplo no canvas para adicionar um nó, ou use o botão <strong className="text-foreground">Adicionar</strong> na barra.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center text-[10px] text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">C</kbd> Conceito</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">P</kbd> Pergunta</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">A</kbd> Ação</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">I</kbd> Ideia</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">F</kbd> Ajustar</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">⌘K</kbd> Buscar</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 italic">
              Dica: explore os <strong className="text-foreground/80">templates</strong> no painel Mapas (botão no canto esquerdo).
            </p>
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

      {/* Box-selection visual */}
      {boxSel && (
        <div
          className="absolute pointer-events-none border-2 border-primary/60 bg-primary/15 rounded-sm z-40"
          style={{
            left: Math.min(boxSel.startX, boxSel.endX),
            top: Math.min(boxSel.startY, boxSel.endY),
            width: Math.abs(boxSel.endX - boxSel.startX),
            height: Math.abs(boxSel.endY - boxSel.startY),
          }}
        />
      )}

      {/* Selection info badge when multiple nodes selected */}
      {selectedNodeIds.length > 1 && !isDragging && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-card/95 border border-border text-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg fade-in flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {selectedNodeIds.length} nós selecionados · <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded border border-border">Del</kbd> excluir · <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded border border-border">Ctrl+D</kbd> duplicar 1º
          </div>
        </div>
      )}

      {/* Node context menu */}
      <NodeContextMenu
        key={contextMenu?.nodeId ?? "none"}
        menuState={contextMenu}
        onClose={() => setContextMenu(null)}
        onEdit={handleContextEdit}
        onExpand={handleContextExpand}
        onDuplicate={handleContextDuplicate}
        onToggleCollapse={handleContextToggleCollapse}
        onConnectFrom={handleContextConnectFrom}
        onColorChange={handleContextColorChange}
        onIconChange={handleContextIconChange}
        onDelete={handleContextDelete}
      />
    </div>
  );
}
