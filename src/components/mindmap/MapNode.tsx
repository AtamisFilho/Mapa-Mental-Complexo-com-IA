"use client";

<<<<<<< HEAD
import { motion, AnimatePresence } from "framer-motion";
import { memo, useState, useEffect, useRef, useCallback } from "react";
=======
import { motion } from "framer-motion";
import { memo, useState, useEffect } from "react";
>>>>>>> origin/main
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useTool } from "@/hooks/use-tool-context";
import { NODE_KIND_META } from "@/lib/settings";
import type { MapNode as MapNodeType } from "@/lib/types";
import {
  Lightbulb,
  HelpCircle,
  Zap,
  Sparkles,
  BookMarked,
  Target,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  MoreHorizontal,
<<<<<<< HEAD
  Plus,
  StickyNote,
  X,
  Palette,
  Check,
=======
>>>>>>> origin/main
} from "lucide-react";

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  HelpCircle,
  Zap,
  Sparkles,
  BookMarked,
  Target,
};

interface Props {
  node: MapNodeType;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onConnectHandle: (e: React.PointerEvent, id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
  isHighlighted?: boolean;
  isReparentTarget?: boolean; // Task 16-B: highlight when node is reparent drop target
  isBeingDraggedForReparent?: boolean; // Task 16-B: reduced opacity while being dragged for reparent
<<<<<<< HEAD
  isDimmed?: boolean; // Round 17: focus mode dims non-focused nodes
=======
>>>>>>> origin/main
}

/** Hook to track if a node was created within the last 3 seconds */
function useIsFresh(createdAt: string) {
  const [isFresh, setIsFresh] = useState(() => {
    const age = Date.now() - new Date(createdAt).getTime();
    return age < 3000;
  });
  useEffect(() => {
    if (!isFresh) return;
    const age = Date.now() - new Date(createdAt).getTime();
    const remaining = Math.max(0, 3000 - age);
    const timer = setTimeout(() => setIsFresh(false), remaining);
    return () => clearTimeout(timer);
  }, [createdAt, isFresh]);
  return isFresh;
}

<<<<<<< HEAD
function MapNodeComponent({ node, onPointerDown, onConnectHandle, onContextMenu, isHighlighted, isReparentTarget, isBeingDraggedForReparent, isDimmed }: Props) {
=======
function MapNodeComponent({ node, onPointerDown, onConnectHandle, onContextMenu, isHighlighted, isReparentTarget, isBeingDraggedForReparent }: Props) {
>>>>>>> origin/main
  const selected = useMindMapStore((s) => s.selectedNodeIds.includes(node.id));
  const hovered = useMindMapStore((s) => s.hoveredNodeId === node.id);
  const selectNode = useMindMapStore((s) => s.selectNode);
  const setHovered = useMindMapStore((s) => s.setHovered);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
<<<<<<< HEAD
  const addNode = useMindMapStore((s) => s.addNode);
  const addEdge = useMindMapStore((s) => s.addEdge);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const focusNode = useMindMapStore((s) => s.focusNode);
=======
>>>>>>> origin/main
  const childCount = useMindMapStore((s) => s.edges.filter((e) => e.sourceId === node.id).length);
  const hasChildren = childCount > 0;
  // Check if any selected node is directly connected to this node (for chain highlight)
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const edges = useMindMapStore((s) => s.edges);
  const isChainConnected = (() => {
    if (!selected || selectedNodeIds.length <= 1) return false;
    return edges.some(
      (e) =>
        (e.sourceId === node.id && selectedNodeIds.includes(e.targetId)) ||
        (e.targetId === node.id && selectedNodeIds.includes(e.sourceId))
    );
  })();

  // Search match highlighting (Task 15-B) — subscribe to search state.
  const isSearchMatch = useMindMapStore((s) => s.searchMatches.includes(node.id));
  const isSearchHighlight = useMindMapStore((s) => s.highlightedMatchId === node.id);

  const animations = useSettingsStore((s) => s.settings.visual.animations);
  const autoColors = useSettingsStore((s) => s.settings.visual.autoColors);
  const glow = useSettingsStore((s) => s.settings.visual.glow);
  const rounded = useSettingsStore((s) => s.settings.visual.rounded);

  // #10: Check if connect tool is active
  const { tool } = useTool();
  const connectToolActive = tool === "connect";

  const kindMeta = NODE_KIND_META[node.kind as keyof typeof NODE_KIND_META] ?? NODE_KIND_META.concept;
  const Icon = KIND_ICONS[kindMeta.icon] ?? Lightbulb;
  const accentColor = node.color || (autoColors ? kindMeta.color : "var(--primary)");

  const radius = rounded ? "12px" : "4px";

  // #9: Freshly created node detection
  const isFresh = useIsFresh(node.createdAt);

  // #1: Inner gradient — top-light to bottom-slightly-dark for depth
  const innerGradient = `linear-gradient(180deg, color-mix(in oklch, var(--node-bg) 100%, white 6%) 0%, color-mix(in oklch, var(--node-bg) 92%, var(--canvas-bg)) 100%)`;

  // #6: Hover inner glow — faint radial gradient in background
  const hoverGlowOverlay = hovered
    ? `radial-gradient(ellipse at 50% 30%, ${accentColor}08 0%, transparent 70%)`
    : "none";

  // Combined background: gradient + hover glow overlay
  const combinedBg = hoverGlowOverlay !== "none"
    ? `${hoverGlowOverlay}, ${innerGradient}`
    : innerGradient;

  return (
    <motion.div
      layout={animations}
      data-node-id={node.id}
      // #9: Enhanced creation animation for fresh nodes
      initial={
        animations
          ? isFresh
            ? { opacity: 0, scale: 0.6, filter: "brightness(1.6)" }
            : { opacity: 0, scale: 0.85 }
          : false
      }
      animate={{
        opacity: isBeingDraggedForReparent ? 0.7 : 1,
        scale: isReparentTarget ? [1, 1.04, 1] : 1,
        filter: isFresh ? ["brightness(1.6)", "brightness(1.1)", "brightness(1)"] : "brightness(1)",
      }}
      exit={animations ? { opacity: 0, scale: 0.85 } : undefined}
      transition={
        isFresh
          ? { type: "spring", stiffness: 260, damping: 20, filter: { duration: 0.8, ease: "easeOut" } }
          : { type: "spring", stiffness: 320, damping: 26 }
      }
      onPointerDown={(e) => onPointerDown(e, node.id)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, node.id);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(node.id, e.shiftKey);
      }}
      onMouseEnter={() => setHovered(node.id)}
      onMouseLeave={() => setHovered(null)}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: node.height,
        transform: "translate(0, 0)",
        cursor: "grab",
        zIndex: selected ? 30 : hovered ? 20 : 10,
        touchAction: "none",
<<<<<<< HEAD
        // Focus mode: dim non-focused nodes to 25% opacity.
        opacity: isDimmed ? 0.25 : 1,
        filter: isDimmed ? "saturate(0.5)" : "none",
        transition: "opacity 0.3s ease, filter 0.3s ease",
=======
>>>>>>> origin/main
      }}
      className={`select-none group micro-hover-scale ${
        isFresh ? "node-fresh-entrance" : ""
      }`}
    >
      <div
        className={`glass-node relative flex flex-col gap-1.5 p-3 ${
          selected && glow ? "node-glow" : ""
        } ${
          isChainConnected ? "chain-highlight" : ""
        } ${
          isHighlighted && !selected ? "chain-highlight" : ""
        }`}
        style={{
          background: combinedBg,
          border: `1.5px solid ${
            selected
              ? accentColor
              : isHighlighted
                ? `color-mix(in oklch, ${accentColor} 40%, var(--node-border))`
                : "var(--node-border)"
          }`,
          borderRadius: radius,
          boxShadow: selected
            ? `0 0 0 1px ${accentColor}30, 0 12px 36px rgba(0,0,0,0.22), inset 0 1px 0 color-mix(in srgb, white 8%, transparent)`
            : hovered
              ? `0 8px 24px rgba(0,0,0,0.14), 0 0 0 1px ${accentColor}20, inset 0 1px 0 color-mix(in srgb, white 6%, transparent)`
              : `var(--node-shadow), inset 0 1px 0 color-mix(in srgb, white 4%, transparent)`,
          transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.2s ease",
        }}
      >
        {/* Search match ring overlay (Task 15-B) — amber halo for matches, pulsing ring for the highlighted (active) match */}
        {isSearchMatch && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={
              isSearchHighlight
                ? {
                    opacity: [0.65, 1, 0.65],
                    boxShadow: [
                      "0 0 0 2px rgba(245,158,11,0.55), 0 0 10px 2px rgba(245,158,11,0.35)",
                      "0 0 0 3px rgba(245,158,11,1), 0 0 20px 6px rgba(245,158,11,0.7)",
                      "0 0 0 2px rgba(245,158,11,0.55), 0 0 10px 2px rgba(245,158,11,0.35)",
                    ],
                  }
                : { opacity: 1 }
            }
            transition={
              isSearchHighlight
                ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.15 }
            }
            style={{
              position: "absolute",
              inset: -3,
              borderRadius: `calc(${radius} + 3px)`,
              pointerEvents: "none",
              boxShadow: isSearchHighlight
                ? undefined
                : "0 0 0 2px rgba(245,158,11,0.45), 0 0 8px 1px rgba(245,158,11,0.18)",
            }}
          />
        )}

        {/* Reparent target ring overlay (Task 16-B) — primary-colored pulsing ring */}
        {isReparentTarget && (
          <motion.div
            aria-hidden
            animate={{
              boxShadow: [
                "0 0 0 2px var(--primary), 0 0 8px 2px rgba(var(--primary-rgb), 0.35)",
                "0 0 0 4px var(--primary), 0 0 16px 4px rgba(var(--primary-rgb), 0.5)",
                "0 0 0 2px var(--primary), 0 0 8px 2px rgba(var(--primary-rgb), 0.35)",
              ],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: `calc(${radius} + 4px)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* #5: Accent stripe — 6px wide with gradient from solid top to fading bottom */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}88 60%, ${accentColor}00 100%)`,
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
            opacity: selected || hovered ? 1 : 0.6,
            boxShadow: selected || hovered
              ? `0 0 8px 2px ${accentColor}40`
              : "none",
            transition: "opacity 0.15s ease, box-shadow 0.15s ease",
          }}
        />

        {/* #4: Left-side progress bar — 2px accent color with gradient fade to transparent */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 6,
            top: 0,
            bottom: 0,
            width: 2,
            background: `linear-gradient(180deg, ${accentColor}50 0%, ${accentColor}00 100%)`,
            opacity: selected || hovered ? 0.8 : 0.35,
            transition: "opacity 0.15s ease",
          }}
        />

        {/* header */}
        <div className="flex items-start gap-2 pl-1.5">
          {/* #7: Icon container — slightly larger background with pulse when selected */}
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110 ${
                selected ? "icon-pulse" : ""
              }`}
              style={{
                background: `${accentColor}18`,
                color: accentColor,
                boxShadow: selected ? `0 0 0 2px ${accentColor}30` : "none",
              }}
            >
              {node.icon ? (
                <span
                  className="select-none leading-none text-base"
                  role="img"
                  aria-label={`Ícone ${node.icon}`}
                >
                  {node.icon}
                </span>
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>
            {/* #2: Kind badge — tiny uppercase tracked text badge below the icon */}
            <span
              className="text-[8px] leading-none font-semibold uppercase tracking-wider"
              style={{
                color: accentColor,
                background: `${accentColor}12`,
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              {kindMeta.label}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="node-title-text text-[15px] font-semibold leading-snug break-words tracking-tight"
              style={{ color: "var(--foreground)", letterSpacing: "-0.012em" }}
            >
              {node.title}
            </p>
          </div>
          {/* Collapse toggle (only if has children) */}
          {hasChildren && (
            <button
              aria-label={node.collapsed ? "Expandir" : "Recolher"}
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(node.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={node.collapsed ? "Expandir subárvore" : "Recolher subárvore"}
            >
              {node.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          {node.collapsed && (
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
              …
            </span>
          )}
        </div>
        {!node.collapsed && node.content && (
          <p className="node-desc-text pl-1.5 text-[12.5px] leading-relaxed text-foreground/75 line-clamp-3 break-words">
            {node.content}
          </p>
        )}
        {!node.collapsed && node.image && (
          <div className="pl-1.5">
            <img
              src={node.image}
              alt={node.title}
              className="h-20 w-full rounded-md object-cover"
              style={{ borderRadius: radius }}
            />
          </div>
        )}

        {/* #3: Expand indicator — tiny 3-dots at bottom edge when node has content */}
        {!node.collapsed && node.content && (
          <div
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-60 transition-opacity"
            title="Conteúdo expandido"
          >
            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
          </div>
        )}

        {/* #8: Children badge — "N filhos" at bottom-right when node has children but is NOT collapsed */}
        {!node.collapsed && hasChildren && (
          <span
            className="absolute bottom-1 right-2 text-[9px] font-medium leading-none px-1.5 py-0.5 rounded-full"
            style={{
              color: accentColor,
              background: `${accentColor}14`,
            }}
          >
            {childCount} filhos
          </span>
        )}

<<<<<<< HEAD
        {/* Note badge — small sticky-note icon at top-right when the node has
            a note. Clicking it opens a popover to view/edit the note inline,
            without needing to open the full NodeEditor. */}
        {node.note && !node.collapsed && (
          <NoteBadge nodeId={node.id} note={node.note} accentColor={accentColor} />
        )}

        {/* Color quick-picker — small palette button at top-left (on hover).
            Click opens a row of 8 color swatches for instant color changes
            without opening the NodeEditor. */}
        {!node.collapsed && (
          <ColorQuickPicker nodeId={node.id} currentColor={node.color} accentColor={accentColor} />
        )}

=======
>>>>>>> origin/main
        {/* #10: Connect handle — larger (h-6 w-6), smooth transition, ring animation when connect tool active */}
        <button
          aria-label="Conectar a partir deste nó"
          onPointerDown={(e) => {
            e.stopPropagation();
            onConnectHandle(e, node.id);
          }}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-background shadow-md transition-all duration-200 ${
            connectToolActive
              ? "flex h-6 w-6 connect-handle-ring"
              : "hidden h-6 w-6 group-hover:flex hover:scale-125"
          }`}
          style={{ borderColor: accentColor, color: accentColor }}
          title="Arraste para conectar"
        >
          <GripVertical className="h-3 w-3" />
        </button>
<<<<<<< HEAD

        {/* Quick-add child menu — appears on hover at the bottom-center.
            Clicking the + button opens a radial mini-menu where the user
            picks the kind of child to add (Conceito, Pergunta, Ação, Ideia,
            Recurso, Objetivo). The chosen kind is created below this node,
            connected automatically, selected, and focused. */}
        <QuickAddMenu
          parentNode={node}
          accentColor={accentColor}
          onAdd={(kind) => {
            pushHistory();
            const childId = addNode({
              title: "Novo " + NODE_KIND_META[kind].label.toLowerCase(),
              kind,
              parentId: node.id,
              x: node.x + 40,
              y: node.y + node.height + 70,
              width: node.width,
              height: node.height,
            });
            if (childId) {
              addEdge(node.id, childId);
              selectNode(childId);
              focusNode(childId);
            }
          }}
        />
=======
>>>>>>> origin/main
      </div>
    </motion.div>
  );
}

export const MapNodeView = memo(MapNodeComponent);
<<<<<<< HEAD

// ── QuickAddMenu ────────────────────────────────────────────────────────────
// A small popover that opens when the user clicks the + button on a node.
// Shows 6 kind options in a 3×2 grid, each with the kind's icon and label.
// Closes on outside-click, Escape, or after a selection.

const QUICK_ADD_KINDS: NodeKind[] = ["concept", "question", "action", "idea", "resource", "goal"];

function QuickAddMenu({
  parentNode,
  accentColor,
  onAdd,
}: {
  parentNode: MapNodeType;
  accentColor: string;
  onAdd: (kind: NodeKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside-click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-50">
      {/* Trigger button */}
      <button
        aria-label="Adicionar filho"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background shadow-md transition-all duration-200 hover:scale-125 hover:border-primary hover:text-primary ${
          open ? "scale-125 border-primary text-primary" : ""
        }`}
        style={{ borderColor: open ? undefined : accentColor, color: open ? undefined : accentColor }}
        title="Adicionar filho"
      >
        <Plus className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
      </button>

      {/* Kind picker popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 8, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 rounded-lg border border-border bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1.5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de nó</span>
            </div>
            <div className="p-1 grid grid-cols-2 gap-0.5">
              {QUICK_ADD_KINDS.map((kind) => {
                const meta = NODE_KIND_META[kind];
                const Icon = KIND_ICONS[kind] ?? Sparkles;
                return (
                  <button
                    key={kind}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd(kind);
                      setOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent/60 transition-colors text-left group"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-transform group-hover:scale-110"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="text-[11px] font-medium leading-none">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── NoteBadge ──────────────────────────────────────────────────────────────
// Small sticky-note icon shown at the top-right of nodes that have a `note`.
// Clicking it opens a popover with the note text and an inline textarea to
// edit it — saves on blur or Escape. This avoids opening the full NodeEditor
// panel just to peek at or tweak a note.

function NoteBadge({
  nodeId,
  note,
  accentColor,
}: {
  nodeId: string;
  note: string;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const badgeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyPushedRef = useRef(false);

  // Reset draft when the note changes externally.
  useEffect(() => {
    setDraft(note);
  }, [note]);

  // Focus the textarea when the popover opens.
  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [open]);

  const commitAndClose = useCallback(() => {
    if (historyPushedRef.current) {
      updateNode(nodeId, { note: draft.trim() || null });
      historyPushedRef.current = false;
    }
    setOpen(false);
  }, [updateNode, nodeId, draft]);

  // Close on outside-click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        commitAndClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, draft, commitAndClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      commitAndClose();
    }
    // Ctrl/Cmd+Enter also commits.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      commitAndClose();
    }
  };

  return (
    <div ref={badgeRef} className="absolute top-1 right-1 z-40">
      <button
        aria-label="Ver/editar nota"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) {
            historyPushedRef.current = true;
            pushHistory();
          }
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex h-5 w-5 items-center justify-center rounded-full transition-all hover:scale-110"
        style={{ background: `${accentColor}20`, color: accentColor }}
        title="Ver/editar nota"
      >
        <StickyNote className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-7 right-0 w-52 rounded-lg border border-border bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-gradient-to-r from-amber-500/10 to-transparent">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <StickyNote className="h-3 w-3 text-amber-500" />
                Nota
              </span>
              <button
                aria-label="Fechar nota"
                onClick={(e) => {
                  e.stopPropagation();
                  commitAndClose();
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitAndClose}
              placeholder="Escreva uma nota…"
              className="w-full px-2.5 py-2 text-xs bg-transparent resize-none outline-none min-h-[60px] max-h-[120px] leading-relaxed"
            />
            <div className="px-2.5 py-1 border-t border-border bg-muted/30 text-[9px] text-muted-foreground">
              Esc para fechar · Ctrl+Enter para salvar
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ColorQuickPicker ───────────────────────────────────────────────────────
// Small palette button at the top-left of a node (visible on hover). Click
// opens a horizontal grid of 8 color swatches — clicking a swatch instantly
// sets the node's color. Includes a "clear" option to reset to the default
// accent color. This avoids opening the NodeEditor just to change a color.

const QUICK_COLORS = [
  { name: "Esmeralda", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Vermelho", value: "#f43f5e" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Ciano", value: "#14b8a6" },
  { name: "Cinza", value: "#64748b" },
];

function ColorQuickPicker({
  nodeId,
  currentColor,
  accentColor,
}: {
  nodeId: string;
  currentColor: string | null | undefined;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const pickerRef = useRef<HTMLDivElement>(null);
  const historyPushedRef = useRef(false);

  const commitAndClose = useCallback(() => {
    historyPushedRef.current = false;
    setOpen(false);
  }, []);

  // Close on outside-click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        commitAndClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") commitAndClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, commitAndClose]);

  const applyColor = (color: string | null) => {
    if (!historyPushedRef.current) {
      pushHistory();
      historyPushedRef.current = true;
    }
    updateNode(nodeId, { color });
    commitAndClose();
  };

  return (
    <div ref={pickerRef} className="absolute top-1 left-1 z-40">
      <button
        aria-label="Alterar cor do nó"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (!open) historyPushedRef.current = true;
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex h-5 w-5 items-center justify-center rounded-full transition-all hover:scale-110"
        style={{
          background: currentColor ? `${currentColor}30` : `${accentColor}20`,
          color: currentColor ?? accentColor,
        }}
        title="Alterar cor"
      >
        <Palette className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-7 left-0 p-2 rounded-lg border border-border bg-popover/95 backdrop-blur-xl shadow-2xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-border">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Cor</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {QUICK_COLORS.map((c) => (
                <button
                  key={c.value}
                  aria-label={c.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyColor(c.value);
                  }}
                  className="h-6 w-6 rounded-md transition-transform hover:scale-110 flex items-center justify-center"
                  style={{
                    background: c.value,
                    boxShadow: currentColor === c.value ? `0 0 0 2px var(--background), 0 0 0 4px ${c.value}` : "none",
                  }}
                  title={c.name}
                >
                  {currentColor === c.value && <Check className="h-3 w-3 text-white drop-shadow" />}
                </button>
              ))}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                applyColor(null);
              }}
              className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors border-t border-border pt-1.5"
            >
              <X className="h-3 w-3" />
              Padrão
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
=======
>>>>>>> origin/main
