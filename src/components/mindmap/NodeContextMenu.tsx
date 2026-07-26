"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  Link2,
  Trash2,
  Palette,
  RotateCcw,
} from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface Props {
  menuState: ContextMenuState | null;
  onClose: () => void;
  onEdit: (nodeId: string) => void;
  onExpand: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onConnectFrom: (nodeId: string) => void;
  onColorChange: (nodeId: string, color: string | null) => void;
  onDelete: (nodeId: string) => void;
}

const COLOR_PRESETS = [
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

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  action: () => void;
}

export function NodeContextMenu({
  menuState,
  onClose,
  onEdit,
  onExpand,
  onDuplicate,
  onToggleCollapse,
  onConnectFrom,
  onColorChange,
  onDelete,
}: Props) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showColors, setShowColors] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const nodes = useMindMapStore((s) => s.nodes);
  const aiEnabled = useSettingsStore((s) => s.settings.ai.enabled);

  const node = menuState
    ? nodes.find((n) => n.id === menuState.nodeId)
    : null;

  // Build menu items
  const menuItems: MenuItem[] = node
    ? [
        {
          id: "edit",
          label: "Editar",
          icon: <Edit3 className="h-4 w-4" />,
          shortcut: "E",
          action: () => { onEdit(node.id); onClose(); },
        },
        ...(aiEnabled
          ? [
              {
                id: "expand" as string,
                label: "Expandir nó" as string,
                icon: <Sparkles className="h-4 w-4" /> as React.ReactNode,
                shortcut: "Ctrl+E" as string,
                destructive: false as boolean | undefined,
                disabled: false as boolean | undefined,
                action: () => { onExpand(node.id); onClose(); },
              } as MenuItem,
            ]
          : []),
        {
          id: "duplicate",
          label: "Duplicar",
          icon: <Copy className="h-4 w-4" />,
          shortcut: "Ctrl+D",
          action: () => { onDuplicate(node.id); onClose(); },
        },
        {
          id: "collapse",
          label: node.collapsed ? "Expandir subárvore" : "Colapsar subárvore",
          icon: node.collapsed
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronUp className="h-4 w-4" />,
          action: () => { onToggleCollapse(node.id); onClose(); },
        },
      ]
    : [];

  const menuItemsWithConnect: MenuItem[] = node
    ? [
        ...menuItems,
        {
          id: "separator-connect",
          label: "",
          icon: null,
          action: () => {},
        },
        {
          id: "connect",
          label: "Conectar a partir",
          icon: <Link2 className="h-4 w-4" />,
          shortcut: "C",
          action: () => { onConnectFrom(node.id); onClose(); },
        },
        {
          id: "separator-color",
          label: "",
          icon: null,
          action: () => {},
        },
        {
          id: "color",
          label: "Alterar cor",
          icon: <Palette className="h-4 w-4" />,
          action: () => { setShowColors(true); setFocusedIndex(-1); },
        },
        {
          id: "separator-delete",
          label: "",
          icon: null,
          action: () => {},
        },
        {
          id: "delete",
          label: "Excluir",
          icon: <Trash2 className="h-4 w-4" />,
          shortcut: "Del",
          destructive: true,
          action: () => { onDelete(node.id); onClose(); },
        },
      ]
    : [];

  // Keyboard navigation
  useEffect(() => {
    if (!menuState) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowColors(false);
        onClose();
        return;
      }

      if (showColors) return; // skip menu nav when color picker is open

      const actionableItems = menuItemsWithConnect.filter(
        (item) => item.label !== "" && !item.id.startsWith("separator")
      );

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev + 1;
          return next >= actionableItems.length ? 0 : next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const prevIdx = prev - 1;
          return prevIdx < 0 ? actionableItems.length - 1 : prevIdx;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < actionableItems.length) {
          actionableItems[focusedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menuState, focusedIndex, showColors, menuItemsWithConnect, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!menuState) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setShowColors(false);
        onClose();
      }
    };
    // Use a small delay so the right-click event itself doesn't close the menu
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handler);
    };
  }, [menuState, onClose]);


  const handleColorSelect = useCallback(
    (color: string) => {
      if (!node) return;
      onColorChange(node.id, color);
      setShowColors(false);
      onClose();
    },
    [node, onColorChange, onClose]
  );

  const handleResetColor = useCallback(
    () => {
      if (!node) return;
      onColorChange(node.id, null);
      setShowColors(false);
      onClose();
    },
    [node, onColorChange, onClose]
  );

  if (!menuState || !node) return null;

  const nodeKindMeta = NODE_KIND_META[node.kind];
  const currentColor = node.color ?? nodeKindMeta?.color ?? "#10b981";

  // Compute actionable items for keyboard focus matching
  const actionableItems = menuItemsWithConnect.filter(
    (item) => item.label !== "" && !item.id.startsWith("separator")
  );

  // Adjust position so menu doesn't overflow viewport
  const menuWidth = 200;
  const menuHeight = showColors ? 320 : 260;
  const adjustedX = Math.min(menuState.x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(menuState.y, window.innerHeight - menuHeight - 8);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className="context-menu"
        style={{
          left: adjustedX,
          top: adjustedY,
          minWidth: 180,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {menuItemsWithConnect.map((item) => {
          // Separator
          if (item.id.startsWith("separator") || item.label === "") {
            return <div key={item.id} className="context-menu-separator" />;
          }

          // Color item — opens inline picker
          if (item.id === "color") {
            return (
              <div key={item.id}>
                <div
                  className={`context-menu-item ${
                    actionableItems[focusedIndex]?.id === "color"
                      ? "context-menu-item--focused"
                      : ""
                  }`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setFocusedIndex(actionableItems.findIndex((a) => a.id === "color"))}
                >
                  <span className="context-menu-icon">
                    <Palette className="h-4 w-4" style={{ color: currentColor }} />
                  </span>
                  {item.label}
                </div>

                {/* Inline color picker */}
                <AnimatePresence>
                  {showColors && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="context-menu-colors">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c.hex}
                            className={`flex flex-col items-center gap-0.5 p-1 rounded-md transition-all duration-150 hover:bg-accent/40 ${
                              currentColor === c.hex ? "ring-2 ring-foreground bg-accent/30" : ""
                            }`}
                            onClick={() => handleColorSelect(c.hex)}
                            title={c.name}
                          >
                            <div
                              className={`h-5 w-5 rounded-full border-2 ${
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
                      {node.color !== null && (
                        <button
                          className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors rounded-md mx-1 mb-1"
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
            );
          }

          // Regular menu item
          const focusedIdx = actionableItems.findIndex((a) => a.id === item.id);
          return (
            <div
              key={item.id}
              className={`context-menu-item ${
                item.destructive ? "context-menu-item--destructive" : ""
              } ${
                actionableItems[focusedIndex]?.id === item.id
                  ? "context-menu-item--focused"
                  : ""
              } ${item.disabled ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => item.action()}
              onMouseEnter={() => setFocusedIndex(focusedIdx)}
            >
              <span className="context-menu-icon">{item.icon}</span>
              {item.label}
              {item.shortcut && (
                <span className="context-menu-shortcut">{item.shortcut}</span>
              )}
            </div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
