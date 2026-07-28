"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Replace,
  CaseSensitive,
  CaseUpper,
  CornerDownLeft,
  Lightbulb,
  HelpCircle,
  Zap,
  Sparkles,
  BookMarked,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useMindMapStore } from "@/store/mindmap-store";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { NODE_KIND_META } from "@/lib/settings";
import type { MapNode, NodeKind } from "@/lib/types";

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  HelpCircle,
  Zap,
  Sparkles,
  BookMarked,
  Target,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Highlight every occurrence of `query` inside `text`. Returns React nodes. */
function highlightMatches(
  text: string,
  query: string,
  caseSensitive: boolean
): React.ReactNode {
  if (!query) return text;
  const flags = caseSensitive ? "g" : "gi";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const re = new RegExp(escaped, flags);
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(
          <span key={`p-${keyCounter++}`}>{text.slice(lastIdx, match.index)}</span>
        );
      }
      parts.push(
        <mark
          key={`m-${keyCounter++}`}
          className="rounded-sm px-0.5"
          style={{
            background: "color-mix(in srgb, var(--primary) 75%, transparent)",
            color: "var(--primary-foreground)",
            boxShadow: "0 0 0 1px color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          {match[0]}
        </mark>
      );
      lastIdx = match.index + match[0].length;
      if (match[0].length === 0) {
        // Prevent infinite loop on zero-length match
        re.lastIndex++;
      }
    }
    if (lastIdx < text.length) {
      parts.push(<span key={`p-${keyCounter++}`}>{text.slice(lastIdx)}</span>);
    }
    return parts;
  } catch {
    return text;
  }
}

/** Build a parent-chain breadcrumb for a node. Uses parentId first, then edges. */
function buildBreadcrumb(
  node: MapNode,
  nodes: MapNode[],
  parentMap: Map<string, string | null>
): string[] {
  const chain: string[] = [];
  let currentId: string | null | undefined = node.id;
  const visited = new Set<string>();
  let safety = 0;
  while (currentId && safety < 50) {
    safety++;
    const parent = parentMap.get(currentId);
    if (!parent || visited.has(parent)) break;
    visited.add(parent);
    const parent_ = nodes.find((n) => n.id === parent);
    if (!parent_) break;
    chain.unshift(parent_.title);
    currentId = parent;
  }
  return chain;
}

/** Take a snippet of the content around the first match (max ~60 chars). */
function snippetAroundMatch(
  text: string,
  query: string,
  caseSensitive: boolean
): string | null {
  if (!text || !query) return null;
  const flags = caseSensitive ? "" : "i";
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const re = new RegExp(escaped, flags);
    const m = re.exec(text);
    if (!m) return null;
    const start = Math.max(0, m.index - 20);
    const end = Math.min(text.length, m.index + query.length + 40);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < text.length ? "…" : "";
    return prefix + text.slice(start, end) + suffix;
  } catch {
    return null;
  }
}

export function SearchPanel({ open, onClose }: Props) {
  // Local UI state — initialized fresh thanks to `key` remount in parent.
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [titleOnly, setTitleOnly] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const searchMatches = useMindMapStore((s) => s.searchMatches);
  const highlightedMatchId = useMindMapStore((s) => s.highlightedMatchId);
  const searchNodes = useMindMapStore((s) => s.searchNodes);
  const setHighlightedMatch = useMindMapStore((s) => s.setHighlightedMatch);
  const focusNode = useMindMapStore((s) => s.focusNode);
  const replaceInNode = useMindMapStore((s) => s.replaceInNode);
  const replaceAll = useMindMapStore((s) => s.replaceAll);

  const { toast } = useToastNotify();

  // Run search whenever query / toggles change (store action — safe to call
  // in effect; sets searchMatches and highlightedMatchId[0] atomically).
  useEffect(() => {
    if (!open) return;
    searchNodes(query, { caseSensitive, titleOnly });
  }, [query, caseSensitive, titleOnly, open, searchNodes]);

  // Clear search state when panel unmounts (close) so canvas highlights reset.
  useEffect(() => {
    if (!open) return;
    return () => {
      searchNodes("", {});
    };
  }, [open, searchNodes]);

  // Auto-focus the search input on open.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Build a parentId lookup map for breadcrumbs
  const parentMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const n of nodes) {
      // Prefer explicit parentId; fall back to incoming edge sourceId.
      if (n.parentId) {
        m.set(n.id, n.parentId);
      } else {
        const inc = edges.find((e) => e.targetId === n.id);
        m.set(n.id, inc ? inc.sourceId : null);
      }
    }
    return m;
  }, [nodes, edges]);

  // Compute matching node objects in order
  const matchedNodes = useMemo<MapNode[]>(() => {
    const out: MapNode[] = [];
    for (const id of searchMatches) {
      const n = nodes.find((x) => x.id === id);
      if (n) out.push(n);
    }
    return out;
  }, [searchMatches, nodes]);

  const matchCount = matchedNodes.length;

  // Derive activeIdx from the store's highlightedMatchId — no local state needed.
  const activeIdx = useMemo(() => {
    if (!highlightedMatchId) return matchCount > 0 ? 0 : -1;
    const idx = searchMatches.indexOf(highlightedMatchId);
    return idx === -1 ? (matchCount > 0 ? 0 : -1) : idx;
  }, [highlightedMatchId, searchMatches, matchCount]);

  // Scroll active result into view
  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const goNext = useCallback(() => {
    if (matchCount === 0) return;
    const next = (activeIdx + 1) % matchCount;
    setHighlightedMatch(matchedNodes[next]?.id ?? null);
  }, [matchCount, activeIdx, matchedNodes, setHighlightedMatch]);

  const goPrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = (activeIdx - 1 + matchCount) % matchCount;
    setHighlightedMatch(matchedNodes[prev]?.id ?? null);
  }, [matchCount, activeIdx, matchedNodes, setHighlightedMatch]);

  const goToMatch = useCallback(
    (idx: number) => {
      if (matchCount === 0) return;
      const node = matchedNodes[idx];
      if (!node) return;
      setHighlightedMatch(node.id);
      focusNode(node.id);
      onClose();
    },
    [matchedNodes, matchCount, setHighlightedMatch, focusNode, onClose]
  );

  // Keyboard shortcuts (Enter = next, Shift+Enter = prev, Esc = close)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [goNext, goPrev, onClose]
  );

  const handleReplaceCurrent = useCallback(() => {
    if (!query) return;
    const node = matchedNodes[activeIdx];
    if (!node) return;
    const count = replaceInNode(node.id, query, replaceText, { caseSensitive });
    if (count > 0) {
      toast({
        title: "Substituição aplicada",
        description: `${count} ocorrência${count > 1 ? "s" : ""} substituída${count > 1 ? "s" : ""} em "${node.title}".`,
        variant: "success",
      });
    } else {
      toast({
        title: "Nada para substituir",
        description: "Nenhuma ocorrência encontrada neste nó.",
        variant: "default",
      });
    }
    // Re-run search after replace so matches stay fresh
    searchNodes(query, { caseSensitive, titleOnly });
  }, [query, replaceText, caseSensitive, matchedNodes, activeIdx, replaceInNode, toast, searchNodes, titleOnly]);

  const handleReplaceAll = useCallback(() => {
    if (!query) return;
    const count = replaceAll(query, replaceText, { caseSensitive });
    if (count > 0) {
      toast({
        title: "Substituição em massa",
        description: `${count} ocorrência${count > 1 ? "s" : ""} substituída${count > 1 ? "s" : ""} em ${searchMatches.length} nó${searchMatches.length > 1 ? "s" : ""}.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Nada para substituir",
        description: "Nenhuma ocorrência encontrada.",
        variant: "default",
      });
    }
    searchNodes(query, { caseSensitive, titleOnly });
  }, [query, replaceText, caseSensitive, replaceAll, toast, searchNodes, titleOnly, searchMatches.length]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="glass-panel !bg-card/95 sm:max-w-[560px] max-w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden top-[12vh] translate-y-0 !left-1/2 !-translate-x-1/2"
        onOpenAutoFocus={(e) => {
          // Prevent autofocus stealing from our input
          e.preventDefault();
          setTimeout(() => inputRef.current?.focus(), 30);
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="flex flex-col"
        >
          <DialogHeader className="px-4 pt-3 pb-2 border-b border-border/50">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
                  <Search className="h-3.5 w-3.5 text-primary" />
                </div>
                Buscar nós
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => setReplaceMode((v) => !v)}
                  title={replaceMode ? "Ocultar substituição" : "Mostrar substituição"}
                  data-active={replaceMode ? "true" : undefined}
                >
                  <Replace className="h-3.5 w-3.5" />
                  Substituir
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onClose}
                  title="Fechar (Esc)"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Encontrar nós por título ou conteúdo.
            </DialogDescription>
          </DialogHeader>

          {/* Search + Replace inputs */}
          <div className="px-4 py-3 flex flex-col gap-2 border-b border-border/50 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar por título ou conteúdo..."
                className="pl-8 h-8 text-sm"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors"
                  title="Limpar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {replaceMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <Replace className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={replaceInputRef}
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Substituir por..."
                        className="pl-8 h-8 text-sm"
                        spellCheck={false}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-[11px] gap-1"
                      onClick={handleReplaceCurrent}
                      disabled={!query || matchCount === 0}
                      title="Substituir no nó atual"
                    >
                      Substituir
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-[11px] gap-1"
                      onClick={handleReplaceAll}
                      disabled={!query || matchCount === 0}
                      title="Substituir em todos os nós"
                    >
                      Todos
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggles row */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={caseSensitive}
                  onCheckedChange={setCaseSensitive}
                  aria-label="Sensível a maiúsculas"
                />
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 select-none">
                  <CaseSensitive className="h-3 w-3" />
                  Maiúsculas
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={titleOnly}
                  onCheckedChange={setTitleOnly}
                  aria-label="Apenas título"
                />
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 select-none">
                  <CaseUpper className="h-3 w-3" />
                  Apenas título
                </span>
              </label>
            </div>
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            className="max-h-96 overflow-y-auto scroll-thin"
            role="listbox"
            aria-label="Resultados da busca"
          >
            {matchCount === 0 && (
              <div className="px-6 py-10 text-center">
                {query ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum resultado para{" "}
                    <span className="font-semibold text-foreground">“{query}”</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Comece a digitar para buscar nós por título ou conteúdo.
                  </p>
                )}
              </div>
            )}

            {matchedNodes.map((node, idx) => {
              const meta = NODE_KIND_META[node.kind as NodeKind] ?? NODE_KIND_META.concept;
              const Icon = KIND_ICONS[meta.icon] ?? Lightbulb;
              const accent = meta.color;
              const breadcrumb = buildBreadcrumb(node, nodes, parentMap);
              const isActive = idx === activeIdx;
              const isHighlighted = node.id === highlightedMatchId;
              const snippet = snippetAroundMatch(
                node.content ?? "",
                query,
                caseSensitive
              );
              return (
                <button
                  key={node.id}
                  data-idx={idx}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setHighlightedMatch(node.id)}
                  onClick={() => goToMatch(idx)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors border-b border-border/30 ${
                    isActive ? "bg-primary/12" : "hover:bg-accent/40"
                  }`}
                >
                  {/* Kind icon */}
                  <div
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center"
                    style={{
                      background: `${accent}1a`,
                      color: accent,
                      boxShadow: isHighlighted ? `0 0 0 2px ${accent}55` : "none",
                    }}
                  >
                    {node.icon ? (
                      <span className="text-base leading-none select-none">{node.icon}</span>
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold leading-snug truncate flex-1 min-w-0">
                        {highlightMatches(node.title, query, caseSensitive)}
                      </p>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[9px] font-semibold py-0 px-1.5"
                        style={{ color: accent, borderColor: `${accent}40` }}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    {snippet && (
                      <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2 break-words mt-0.5">
                        {highlightMatches(snippet, query, caseSensitive)}
                      </p>
                    )}
                    {breadcrumb.length > 0 && (
                      <p className="text-[10px] leading-snug text-muted-foreground/70 truncate mt-0.5">
                        {breadcrumb.map((b, i) => (
                          <span key={i}>
                            {i > 0 && <span className="mx-0.5 text-muted-foreground/40">→</span>}
                            <span className={i === breadcrumb.length - 1 ? "font-medium" : ""}>
                              {b.length > 22 ? b.slice(0, 22) + "…" : b}
                            </span>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  {isActive && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                {matchCount > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">{matchCount}</span>{" "}
                    resultado{matchCount > 1 ? "s" : ""}
                    {matchCount > 0 && (
                      <span className="text-muted-foreground/60">
                        {" "}
                        · {activeIdx + 1}/{matchCount}
                      </span>
                    )}
                  </>
                ) : (
                  "Sem resultados"
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goPrev}
                disabled={matchCount === 0}
                title="Anterior (Shift+Enter)"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={goNext}
                disabled={matchCount === 0}
                title="Próximo (Enter)"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-[11px] ml-1"
                onClick={onClose}
                title="Fechar (Esc)"
              >
                Fechar
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
