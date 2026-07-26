"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
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
  isHighlighted?: boolean;
}

function MapNodeComponent({ node, onPointerDown, onConnectHandle, isHighlighted }: Props) {
  const selected = useMindMapStore((s) => s.selectedNodeIds.includes(node.id));
  const hovered = useMindMapStore((s) => s.hoveredNodeId === node.id);
  const selectNode = useMindMapStore((s) => s.selectNode);
  const setHovered = useMindMapStore((s) => s.setHovered);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const hasChildren = useMindMapStore((s) => s.edges.some((e) => e.sourceId === node.id));
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

  const animations = useSettingsStore((s) => s.settings.visual.animations);
  const autoColors = useSettingsStore((s) => s.settings.visual.autoColors);
  const glow = useSettingsStore((s) => s.settings.visual.glow);
  const rounded = useSettingsStore((s) => s.settings.visual.rounded);

  const kindMeta = NODE_KIND_META[node.kind as keyof typeof NODE_KIND_META] ?? NODE_KIND_META.concept;
  const Icon = KIND_ICONS[kindMeta.icon] ?? Lightbulb;
  const accentColor = node.color || (autoColors ? kindMeta.color : "var(--primary)");

  const radius = rounded ? "12px" : "4px";

  // Gradient background: from node-bg to slightly lighter (dark theme) or slightly darker (light theme)
  const gradientBg = `linear-gradient(135deg, var(--node-bg) 0%, color-mix(in oklch, var(--node-bg) 90%, var(--canvas-bg)) 100%)`;

  return (
    <motion.div
      layout={animations}
      data-node-id={node.id}
      initial={animations ? { opacity: 0, scale: 0.85 } : false}
      animate={{ opacity: 1, scale: 1 }}
      exit={animations ? { opacity: 0, scale: 0.85 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      onPointerDown={(e) => onPointerDown(e, node.id)}
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
        node.createdAt && Date.now() - new Date(node.createdAt).getTime() < 3000
          ? "node-pulse"
          : ""
      }`}
    >
      <div
        className={`relative flex flex-col gap-1.5 p-3 ${
          selected && glow ? "node-glow" : ""
        } ${
          isChainConnected ? "chain-highlight" : ""
        } ${
          isHighlighted && !selected ? "chain-highlight" : ""
        }`}
        style={{
          background: gradientBg,
          border: `1.5px solid ${
            selected
              ? accentColor
              : isHighlighted
                ? `color-mix(in oklch, ${accentColor} 40%, var(--node-border))`
                : "var(--node-border)"
          }`,
          borderRadius: radius,
          boxShadow: selected
            ? `0 8px 28px rgba(0,0,0,0.16)`
            : hovered
              ? `0 6px 18px rgba(0,0,0,0.10)`
              : "var(--node-shadow)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        }}
      >
        {/* accent stripe — 5px wide with subtle glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            background: accentColor,
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
            opacity: selected || hovered ? 1 : 0.55,
            boxShadow: selected || hovered
              ? `0 0 8px 2px ${accentColor}40`
              : "none",
            transition: "opacity 0.15s ease, box-shadow 0.15s ease",
          }}
        />
        {/* header */}
        <div className="flex items-start gap-2 pl-1.5">
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px] font-bold leading-snug break-words tracking-tight"
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
          <p className="pl-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3 break-words">
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

        {/* connect handle (visible on hover) — right side */}
        <button
          aria-label="Conectar a partir deste nó"
          onPointerDown={(e) => {
            e.stopPropagation();
            onConnectHandle(e, node.id);
          }}
          className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-background shadow-md transition-all group-hover:flex hover:scale-125"
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
