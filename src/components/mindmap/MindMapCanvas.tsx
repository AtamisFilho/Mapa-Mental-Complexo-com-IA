"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
<<<<<<< HEAD
import { Sparkles, Trash2, Focus } from "lucide-react";
=======
import { Sparkles } from "lucide-react";
>>>>>>> origin/main
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useTool } from "@/hooks/use-tool-context";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { NODE_KIND_META } from "@/lib/settings";
<<<<<<< HEAD
import type { NodeKind, EdgeKind } from "@/lib/types";
import { MapNodeView } from "./MapNode";
import { MapEdges } from "./MapEdges";
import { NodeContextMenu } from "./NodeContextMenu";
import { NodeKindLegend } from "./NodeKindLegend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
=======
import type { NodeKind } from "@/lib/types";
import { MapNodeView } from "./MapNode";
import { MapEdges } from "./MapEdges";
import { NodeContextMenu } from "./NodeContextMenu";
>>>>>>> origin/main

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
  /**
   * When true, the canvas becomes a read-only viewer: no drag, no connect,
   * no double-click-add, no context menu, no keyboard shortcuts that mutate
   * state. Wheel-zoom and pan-via-empty-canvas-click remain enabled so viewers
   * can still navigate the shared map.
   */
  readOnly?: boolean;
}

export function MindMapCanvas({ onOpenNodeEditor, onOpenAIPanel, readOnly = false }: Props) {
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
<<<<<<< HEAD
    // Multi-select drag: records the starting position of every selected
    // node so they all move together when the dragged node moves. The
    // dragged node itself is also included here (its entry is the source
    // of truth for the snap calculations).
    groupStart?: Array<{ id: string; x: number; y: number }>;
=======
>>>>>>> origin/main
  } | null>(null);

  const { toast } = useToastNotify();

<<<<<<< HEAD
  // Delete-confirmation dialog state. When the user has the
  // "confirmDelete" setting enabled, pressing Delete / Backspace (or the
  // toolbar delete button) opens this dialog instead of silently doing
  // nothing (which was the previous, confusing behaviour).
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // In-memory clipboard for copy/paste of nodes (Ctrl+C / Ctrl+V). Stores
  // a deep copy of the selected nodes so paste can recreate them with new
  // IDs at an offset position.
  const clipboardRef = useRef<Array<{ title: string; kind: NodeKind; content: string | null | undefined; note: string | null | undefined; color: string | null | undefined; icon: string | null | undefined; image: string | null | undefined; width: number; height: number; }>>([]);

=======
>>>>>>> origin/main
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
<<<<<<< HEAD
  const selectedEdgeIds = useMindMapStore((s) => s.selectedEdgeIds);
  const updateEdge = useMindMapStore((s) => s.updateEdge);
  const pushHistoryForEdge = useMindMapStore((s) => s.pushHistory);
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
  const fitSelection = useMindMapStore((s) => s.fitSelection);
  const focusMode = useMindMapStore((s) => s.focusMode);
  const focusNodeIds = useMindMapStore((s) => s.focusNodeIds);
  const toggleFocusMode = useMindMapStore((s) => s.toggleFocusMode);
  const cycleHighlight = useMindMapStore((s) => s.cycleHighlight);
  const selectAll = useMindMapStore((s) => s.selectAll);
  const searchMatchesCount = useMindMapStore((s) => s.searchMatches.length);
  const focusNodeSet = useMemo(() => new Set(focusNodeIds), [focusNodeIds]);
=======
>>>>>>> origin/main

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
      // Read-only mode: only allow panning via empty-canvas drag (so viewers
      // can navigate the shared map). All other interactions (box-select,
      // deselect, connect) are disabled.
      if (readOnly) {
        // Force pan-mode behavior in read-only mode.
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
    [tool, viewport, clearSelection, setConnectingFrom, setCursorWorld, multiSelect, readOnly]
  );

  // Node right-click handler — open context menu
  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (readOnly) {
        // Suppress context menu in read-only mode (no edit actions available).
        e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      selectNodes(id, false);
      setContextMenu({ nodeId: id, x: e.clientX, y: e.clientY });
    },
    [selectNodes, readOnly]
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
<<<<<<< HEAD
      // duplicateNode already pushes history internally (undoable as one step).
      duplicateNode(nodeId);
    },
    [duplicateNode]
=======
      pushHistory();
      duplicateNode(nodeId);
    },
    [pushHistory, duplicateNode]
>>>>>>> origin/main
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

<<<<<<< HEAD
  // Perform a batch delete of the given node ids as a single undoable step.
  // Used by the keyboard Delete/Backspace handler, the toolbar button, and
  // the confirm-delete dialog.
  const performDelete = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      pushHistory();
      for (const id of ids) {
        deleteNode(id);
      }
      toast({
        title: `${ids.length} ${ids.length === 1 ? "nó excluído" : "nós excluídos"}`,
        description: "Use Ctrl+Z para desfazer.",
      });
    },
    [pushHistory, deleteNode, toast]
  );

=======
>>>>>>> origin/main
  // Node pointer down — start drag or connect
  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      // Read-only mode: no node dragging, no connecting.
      if (readOnly) return;
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
<<<<<<< HEAD
      // Multi-select drag: if the pointer-down node is part of the current
      // selection (and there is more than one selected node), capture the
      // starting positions of ALL selected nodes so they move as a group.
      // Clicking a non-selected node falls back to single-node behaviour
      // (the click also selects just that node via the MapNode onClick).
      const groupStart =
        selectedNodeIds.length > 1 && selectedNodeIds.includes(id)
          ? nodes
              .filter((n) => selectedNodeIds.includes(n.id))
              .map((n) => ({ id: n.id, x: n.x, y: n.y }))
          : undefined;
=======
>>>>>>> origin/main
      dragRef.current = {
        type: "node",
        nodeId: id,
        startX: e.clientX,
        startY: e.clientY,
        nodeStartX: node.x,
        nodeStartY: node.y,
        vpStartX: 0,
        vpStartY: 0,
<<<<<<< HEAD
        groupStart,
=======
>>>>>>> origin/main
      };
      setIsDragging(true);
      setDragType("node");
    },
<<<<<<< HEAD
    [tool, connectingFrom, nodes, addEdge, pushHistory, setConnectingFrom, setCursorWorld, setDraggedNode, readOnly, selectedNodeIds]
=======
    [tool, connectingFrom, nodes, addEdge, pushHistory, setConnectingFrom, setCursorWorld, setDraggedNode, readOnly]
>>>>>>> origin/main
  );

  // Connect handle pointer down
  const handleConnectHandle = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (readOnly) return;
      e.stopPropagation();
      setConnectingFrom(id);
      const world = screenToWorld(e.clientX, e.clientY);
      setCursorWorld(world);
    },
    [screenToWorld, setConnectingFrom, setCursorWorld, readOnly]
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

<<<<<<< HEAD
        // Apply the new position to the primary dragged node.
        updateNode(d.nodeId, { x: newX, y: newY });

        // Multi-select drag: move every other selected node by the same
        // world-space delta. We use the captured groupStart positions so the
        // relative layout between selected nodes is preserved. Snap is applied
        // per-node to respect grid settings.
        if (d.groupStart && d.groupStart.length > 1) {
          const primaryStart = d.groupStart.find((g) => g.id === d.nodeId);
          if (primaryStart) {
            const deltaX = newX - primaryStart.x;
            const deltaY = newY - primaryStart.y;
            for (const g of d.groupStart) {
              if (g.id === d.nodeId) continue; // already updated above
              updateNode(g.id, { x: snap(g.x + deltaX), y: snap(g.y + deltaY) });
            }
          }
        }

=======
        updateNode(d.nodeId, { x: newX, y: newY });

>>>>>>> origin/main
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
      // Read-only mode: no double-click actions (no add-node, no open-editor).
      if (readOnly) return;
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
    [screenToWorld, addNode, snap, focusNode, onOpenNodeEditor, selectNodes, readOnly]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Read-only mode: skip all mutating keyboard shortcuts (the only ones
      // remaining useful are undo/redo, fit-to-view, and search — but in
      // read-only share mode we disable all of them to avoid confusing the
      // viewer with no-op actions).
      if (readOnly) return;
      // Skip if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      // Duplicate node: Ctrl/Cmd+D
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
<<<<<<< HEAD
          // duplicateNode pushes history internally (single undoable step).
          duplicateNode(selectedNodeIds[0]);
        }
        return;
      }
      // Select all nodes: Ctrl/Cmd+A
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        selectAll();
        return;
      }
      // Copy nodes: Ctrl/Cmd+C
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        if (selectedNodeIds.length > 0) {
          const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
          clipboardRef.current = selectedNodes.map((n) => ({
            title: n.title, kind: n.kind, content: n.content, note: n.note,
            color: n.color, icon: n.icon, image: n.image, width: n.width, height: n.height,
          }));
        }
        return;
      }
      // Paste nodes: Ctrl/Cmd+V
      if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
        if (clipboardRef.current.length > 0) {
          e.preventDefault();
          pushHistory();
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          const baseX = (cx - viewport.x) / viewport.zoom;
          const baseY = (cy - viewport.y) / viewport.zoom;
          const newIds: string[] = [];
          clipboardRef.current.forEach((c, i) => {
            const id = addNode({
              title: c.title,
              kind: c.kind,
              content: c.content,
              note: c.note,
              color: c.color,
              icon: c.icon,
              image: c.image,
              x: baseX + (i % 4) * 36,
              y: baseY + Math.floor(i / 4) * 36,
              width: c.width,
              height: c.height,
            });
            newIds.push(id);
          });
          if (newIds.length > 0) {
            selectNodes(newIds[0]);
          }
=======
          pushHistory();
          // Duplicate the first selected node
          duplicateNode(selectedNodeIds[0]);
>>>>>>> origin/main
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
<<<<<<< HEAD
        if (selectedNodeIds.length > 0) {
          // Backspace can trigger browser history-back; prevent it.
          e.preventDefault();
          if (confirmDelete) {
            // Open the confirmation dialog instead of silently deleting.
            setConfirmDeleteIds([...selectedNodeIds]);
          } else {
            performDelete([...selectedNodeIds]);
=======
        if (selectedNodeIds.length > 0 && !confirmDelete) {
          for (const id of selectedNodeIds) {
            deleteNode(id);
>>>>>>> origin/main
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
<<<<<<< HEAD
      const k = e.key.toLowerCase();
      // Cycle search matches: Ctrl+G (next), Ctrl+Shift+G (previous).
      // Only fires when there are active search matches.
      if ((e.ctrlKey || e.metaKey) && (e.key === "g" || e.key === "G")) {
        if (searchMatchesCount > 0) {
          e.preventDefault();
          cycleHighlight(e.shiftKey ? -1 : 1);
        }
        return;
      }
=======
>>>>>>> origin/main
      // Fit to view
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        fitToView(80);
        return;
      }
<<<<<<< HEAD
      // Zoom to selection (Z) — fits the viewport to the currently selected
      // node(s). If nothing is selected, falls back to fitToView.
      if (e.key === "z" || e.key === "Z") {
        if (!(e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          fitSelection(selectedNodeIds, 80);
          return;
        }
      }
      // Focus mode (M) — dims non-focused nodes (ancestors + descendants of selection stay bright).
      if (k === "m") {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
      // Cycle edge kind (T) — when an edge is selected, pressing T cycles its
      // kind through related → causes → supports → contradicts → depends → related.
      // Each kind has a distinct color and dash pattern (see EDGE_KIND_META).
      if (k === "t" && selectedEdgeIds.length > 0) {
        e.preventDefault();
        const EDGE_KINDS: EdgeKind[] = ["related", "causes", "supports", "contradicts", "depends"];
        pushHistoryForEdge();
        for (const eid of selectedEdgeIds) {
          const edge = edges.find((e2) => e2.id === eid);
          if (!edge) continue;
          const curIdx = EDGE_KINDS.indexOf(edge.kind);
          const nextKind = EDGE_KINDS[(curIdx + 1) % EDGE_KINDS.length];
          updateEdge(eid, { kind: nextKind });
        }
        return;
      }
=======
>>>>>>> origin/main
      // Add node shortcuts: C/P/A/I/R/O
      const keyMap: Record<string, NodeKind> = {
        c: "concept", p: "question", a: "action", i: "idea", r: "resource", o: "goal",
      };
<<<<<<< HEAD
=======
      const k = e.key.toLowerCase();
>>>>>>> origin/main
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
<<<<<<< HEAD
      // L — toggle the Connect tool (the toolbar tooltip advertises "(L)"
      // but there was no handler, so the hint was misleading).
      if (k === "l") {
        e.preventDefault();
        setTool(tool === "connect" ? "select" : "connect");
        return;
      }
      // Arrow-key navigation — move selection through the tree:
      //   ↑  parent,  ↓  first child,  ←  prev sibling,  →  next sibling.
      if (selectedNodeIds.length === 1 && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const curId = selectedNodeIds[0];
        const parentEdge = edges.find((e2) => e2.targetId === curId);
        const parentId = parentEdge?.sourceId;
        const childrenIds = edges.filter((e2) => e2.sourceId === curId).map((e2) => e2.targetId);
        let targetId: string | null = null;
        if (e.key === "ArrowUp" && parentId) targetId = parentId;
        if (e.key === "ArrowDown" && childrenIds.length > 0) targetId = childrenIds[0];
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          if (parentId) {
            const siblings = edges.filter((e2) => e2.sourceId === parentId).map((e2) => e2.targetId);
            const idx = siblings.indexOf(curId);
            if (e.key === "ArrowLeft" && idx > 0) targetId = siblings[idx - 1];
            if (e.key === "ArrowRight" && idx < siblings.length - 1) targetId = siblings[idx + 1];
          }
        }
        if (targetId) {
          e.preventDefault();
          selectNodes(targetId);
          focusNode(targetId);
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoRedo, undo, redo, selectedNodeIds, selectedEdgeIds, confirmDelete, deleteNode, duplicateNode, pushHistory, clearSelection, setConnectingFrom, shortcutsEnabled, fitToView, fitSelection, toggleFocusMode, cycleHighlight, selectAll, searchMatchesCount, viewport, addNode, onOpenNodeEditor, readOnly, performDelete, nodes, selectNodes, focusNode, tool, setTool, edges, updateEdge, pushHistoryForEdge]);
=======
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoRedo, undo, redo, selectedNodeIds, confirmDelete, deleteNode, duplicateNode, pushHistory, clearSelection, setConnectingFrom, shortcutsEnabled, fitToView, viewport, addNode, onOpenNodeEditor, readOnly]);
>>>>>>> origin/main

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
          readOnly
            ? (isDragging && dragType === "pan" ? "grabbing" : "grab")
            : isDragging && dragType === "pan"
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
<<<<<<< HEAD
          focusMode={focusMode}
          focusNodeIds={focusNodeSet}
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
              isDimmed={focusMode && !focusNodeSet.has(node.id)}
=======
>>>>>>> origin/main
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state hint — hidden in read-only share mode (no editing hints for viewers) */}
      {nodes.length === 0 && !isDragging && !readOnly && (
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
<<<<<<< HEAD
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">L</kbd> Conectar</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">F</kbd> Ajustar</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">Z</kbd> Zoom seleção</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">M</kbd> Modo foco</span>
=======
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">F</kbd> Ajustar</span>
>>>>>>> origin/main
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">⌘K</kbd> Buscar</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 italic">
              Dica: explore os <strong className="text-foreground/80">templates</strong> no painel Mapas (botão no canto esquerdo).
            </p>
          </div>
        </div>
      )}

      {/* Connection mode indicator — hidden in read-only mode (no connecting) */}
      {!readOnly && tool === "connect" && !connectingFrom && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg fade-in">
            Clique em um nó para iniciar a conexão
          </div>
        </div>
      )}
<<<<<<< HEAD
      {/* Focus mode indicator — shows when focus mode is active */}
      {!readOnly && focusMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg fade-in backdrop-blur-sm">
            <Focus className="h-3 w-3" />
            Modo foco ativo · {focusNodeIds.length} nós em foco
            <button
              onClick={() => toggleFocusMode()}
              className="ml-1 hover:bg-primary-foreground/20 rounded px-1.5 py-0.5 transition-colors"
              title="Sair do modo foco"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Search match counter — shows when there are active search matches.
          Displays "N resultados" and hints for Ctrl+G to cycle. */}
      {!readOnly && searchMatchesCount > 0 && !focusMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 bg-amber-500/90 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg fade-in backdrop-blur-sm">
            <span className="font-bold">{searchMatchesCount}</span>
            <span>resultados · Ctrl+G para navegar</span>
          </div>
        </div>
      )}
=======
>>>>>>> origin/main
      {!readOnly && connectingFrom && (
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

      {/* Selection info badge — hidden in read-only mode */}
      {!readOnly && selectedNodeIds.length > 1 && !isDragging && (
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
<<<<<<< HEAD

      {/* Delete-confirmation dialog (only shown when confirmDelete is on) */}
      <AlertDialog
        open={confirmDeleteIds !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteIds(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Excluir {confirmDeleteIds?.length ?? 0}{" "}
              {confirmDeleteIds?.length === 1 ? "nó" : "nós"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o{confirmDeleteIds?.length === 1 ? " nó selecionado" : "s nós selecionados"}{" "}
              e todas as conexões associadas. Você poderá desfazer com Ctrl+Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteIds) performDelete(confirmDeleteIds);
                setConfirmDeleteIds(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Node kind legend — floating Info button (bottom-left) with a popover
          showing the 6 node kinds, their colors, and the add-shortcut keys.
          Hidden in read-only share mode (no editing hints for viewers). */}
      {!readOnly && <NodeKindLegend />}
=======
>>>>>>> origin/main
    </div>
  );
}
