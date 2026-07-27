"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, X } from "lucide-react";

interface EmojiCategory {
  name: string;
  emojis: string[];
}

/**
 * Curated grid of emojis organized in 6 categories.
 * Total: 61 emojis (~48 as requested, with some flexibility).
 */
const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Conceitos",
    emojis: ["💡", "⭐", "🎯", "📌", "🔑", "✨", "🌟", "💎", "🧠", "📊", "🔥", "⚡"],
  },
  {
    name: "Pessoas",
    emojis: ["👤", "👥", "🧑", "👨", "💁", "🙋", "👨‍💻", "👩‍💻", "🗣️", "💬"],
  },
  {
    name: "Natureza",
    emojis: ["🌍", "🌱", "🌳", "🌞", "🌙", "☀️", "❄️", "🔥", "💧", "🌸"],
  },
  {
    name: "Tecnologia",
    emojis: ["💻", "📱", "🤖", "⚙️", "🔧", "🛠️", "📡", "🔬", "🔗"],
  },
  {
    name: "Emoções",
    emojis: ["❤️", "✅", "❌", "⚠️", "❓", "❗", "🎉", "💪", "👍", "🤔"],
  },
  {
    name: "Símbolos",
    emojis: ["➕", "➖", "➗", "✓", "✗", "→", "←", "↑", "↓", "⚙"],
  },
];

interface IconPickerContentProps {
  onSelect: (emoji: string | null) => void;
  hasIcon: boolean;
}

/**
 * The inner content of the IconPicker popover (the emoji grid + Limpar button).
 * Exported so it can be embedded inline in places like the NodeContextMenu.
 */
export function IconPickerContent({ onSelect, hasIcon }: IconPickerContentProps) {
  return (
    <div
      className="w-[264px] max-h-[300px] overflow-y-auto scroll-thin p-2 flex flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 px-1">
            {cat.name}
          </p>
          <div className="grid grid-cols-8 gap-0.5">
            {cat.emojis.map((em, i) => (
              <button
                key={`${em}-${i}`}
                type="button"
                className="h-7 w-7 rounded-md flex items-center justify-center text-base leading-none hover:bg-accent hover:scale-110 transition-all duration-100 cursor-pointer"
                onClick={() => onSelect(em)}
                title={em}
                aria-label={`Selecionar ícone ${em}`}
              >
                <span className="select-none">{em}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {hasIcon && (
        <button
          type="button"
          className="mt-1 flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer"
          onClick={() => onSelect(null)}
        >
          <X className="h-3 w-3" />
          Limpar
        </button>
      )}
    </div>
  );
}

interface IconPickerProps {
  /** Current emoji value (null/undefined/empty = no icon set) */
  value: string | null | undefined;
  /** Called with the selected emoji string, or null when cleared */
  onSelect: (emoji: string | null) => void;
  /** "icon" = icon-only button (default), "labeled" = button with text label */
  variant?: "icon" | "labeled";
  /** Label text shown when no icon is set (labeled variant) */
  label?: string;
  /** Popover horizontal alignment relative to the trigger */
  align?: "start" | "center" | "end";
  /** Whether to open the popover above the trigger (instead of below) */
  openUpward?: boolean;
  /** Whether to stopPropagation on trigger interactions (for nested clickable parents) */
  stopPropagation?: boolean;
  /** Optional className override for the trigger button */
  buttonClassName?: string;
}

/**
 * Popover-style emoji picker triggered by a button (Smile icon from lucide).
 * Closes on outside click and Escape. Uses AnimatePresence for animation.
 */
export function IconPicker({
  value,
  onSelect,
  variant = "icon",
  label = "Escolher emoji",
  align = "center",
  openUpward = false,
  stopPropagation = false,
  buttonClassName,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click (mousedown so it fires before click)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as HTMLElement)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      if (stopPropagation) e.stopPropagation();
      setOpen((v) => !v);
    },
    [stopPropagation]
  );

  const handleSelect = useCallback(
    (emoji: string | null) => {
      onSelect(emoji);
      setOpen(false);
    },
    [onSelect]
  );

  const alignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  const verticalClass = openUpward
    ? "bottom-full mb-2"
    : "top-full mt-2";

  const defaultButtonClass =
    variant === "labeled"
      ? `h-8 px-2 inline-flex items-center gap-1.5 rounded-md border border-input bg-background hover:bg-accent/60 hover:text-accent-foreground transition-all duration-150 text-xs ${
          value ? "text-foreground" : "text-muted-foreground"
        }`
      : "h-8 w-8 inline-flex items-center justify-center rounded-lg text-foreground transition-all duration-150 hover:bg-accent/60 hover:text-accent-foreground";

  return (
    <div ref={containerRef} className="relative" data-icon-picker>
      <button
        type="button"
        onClick={handleToggle}
        onPointerDown={(e) => {
          if (stopPropagation) e.stopPropagation();
        }}
        className={buttonClassName ?? defaultButtonClass}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value ? (
          <span className="text-base leading-none select-none">{value}</span>
        ) : (
          <Smile className="h-4 w-4" />
        )}
        {variant === "labeled" && (
          <span className="text-xs">{value ? "Trocar ícone" : label}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: openUpward ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: openUpward ? 4 : -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute ${verticalClass} ${alignClass} rounded-xl glass-panel z-[100] shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <IconPickerContent onSelect={handleSelect} hasIcon={!!value} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
