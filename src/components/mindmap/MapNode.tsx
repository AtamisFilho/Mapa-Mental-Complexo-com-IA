"use client";

import { motion } from "framer-motion";
import { memo, useState, useEffect } from "react";
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

function MapNodeComponent({ node, onPointerDown, onConnectHandle, onContextMenu, isHighlighted }: Props) {
  const selected = useMindMapStore((s) => s.selectedNodeIds.includes(node.id));
  const hovered = useMindMapStore((s) => s.hoveredNodeId === node.id);
  const selectNode = useMindMapStore((s) => s.selectNode);
  const setHovered = useMindMapStore((s) => s.setHovered);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
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
        opacity: 1,
        scale: 1,
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
            ? `0 0 0 1px ${accentColor}30, 0 12px 36px rgba(0,0,0,0.22)`
            : hovered
              ? `0 8px 24px rgba(0,0,0,0.14), 0 0 0 1px ${accentColor}20`
              : "var(--node-shadow)",
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
              className="text-[14px] font-bold leading-snug break-words tracking-tight"
              style={{ color: "var(--foreground)" }}
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
          <p className="pl-1.5 text-xs leading-relaxed text-muted-foreground/90 line-clamp-3 break-words">
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
      </div>
    </motion.div>
  );
}

export const MapNodeView = memo(MapNodeComponent);
