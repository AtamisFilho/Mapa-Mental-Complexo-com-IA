"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  LayoutTemplate,
  Plus,
  Crosshair,
  MousePointerClick,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMindMapStore } from "@/store/mindmap-store";
import { useToastNotify } from "@/hooks/use-toast-notify";
import {
  SUBTREE_TEMPLATES,
  SUBTREE_CATEGORY_META,
  countSubtreeNodes,
  type SubtreeTemplate,
  type SubtreeTemplateCategory,
} from "@/lib/subtree-templates";

type CategoryFilter = "all" | SubtreeTemplateCategory;

interface InsertPositionOption {
  id: "center" | "near-selected" | "free";
  label: string;
  description: string;
  icon: React.ReactNode;
}

const INSERT_OPTIONS: InsertPositionOption[] = [
  {
    id: "center",
    label: "No centro do canvas",
    description: "Insere o template na área visível do canvas.",
    icon: <Crosshair className="h-4 w-4" />,
  },
  {
    id: "near-selected",
    label: "Próximo ao nó selecionado",
    description: "Offset de +200px à direita e abaixo do nó atual.",
    icon: <MousePointerClick className="h-4 w-4" />,
  },
  {
    id: "free",
    label: "Em posição livre",
    description: "Usa a posição padrão (200, 200) no canvas.",
    icon: <MapPin className="h-4 w-4" />,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TemplatesPanel({ open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [pickedTemplate, setPickedTemplate] = useState<SubtreeTemplate | null>(null);
  const [inserting, setInserting] = useState(false);

  const nodes = useMindMapStore((s) => s.nodes);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const viewport = useMindMapStore((s) => s.viewport);
  const insertSubtree = useMindMapStore((s) => s.insertSubtree);
  const focusNode = useMindMapStore((s) => s.focusNode);

  const { toast } = useToastNotify();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SUBTREE_TEMPLATES.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.root.title.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const computeInsertPosition = useCallback(
    (optionId: InsertPositionOption["id"]): { x: number; y: number } => {
      if (optionId === "center") {
        // Convert screen center → world coords
        const screenCx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
        const screenCy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
        // toolbar ~44, status bar + footer ~ 60
        const screenCyAdjusted = screenCy - 50;
        const wx = (screenCx - viewport.x) / viewport.zoom;
        const wy = (screenCyAdjusted - viewport.y) / viewport.zoom;
        return { x: wx - 100, y: wy - 40 };
      }
      if (optionId === "near-selected") {
        const selected = nodes.find((n) => n.id === selectedNodeIds[0]);
        if (selected) {
          return { x: selected.x + 200, y: selected.y + 200 };
        }
        // Fallback to center if no selection
        const screenCx = typeof window !== "undefined" ? window.innerWidth / 2 : 600;
        const screenCy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
        const wx = (screenCx - viewport.x) / viewport.zoom;
        const wy = (screenCy - viewport.y) / viewport.zoom;
        return { x: wx - 100, y: wy - 40 };
      }
      // free position default
      return { x: 200, y: 200 };
    },
    [nodes, selectedNodeIds, viewport]
  );

  const handleConfirmInsert = useCallback(
    async (option: InsertPositionOption) => {
      if (!pickedTemplate) return;
      setInserting(true);
      try {
        const pos = computeInsertPosition(option.id);
        const rootId = insertSubtree(pickedTemplate.root, pos);
        toast({
          title: "Template inserido",
          description: `${pickedTemplate.name} — ${countSubtreeNodes(pickedTemplate.root)} nós adicionados.`,
          variant: "success",
        });
        // Focus the newly inserted root so the user sees it
        setTimeout(() => focusNode(rootId), 50);
        setPickedTemplate(null);
      } catch (e) {
        toast({
          title: "Erro ao inserir template",
          description: (e as Error).message ?? "Tente novamente.",
          variant: "error",
        });
      } finally {
        setInserting(false);
      }
    },
    [pickedTemplate, computeInsertPosition, insertSubtree, focusNode, toast]
  );

  if (!open) return null;

  const categoryPills: Array<{ id: CategoryFilter; label: string }> = [
    { id: "all", label: "Todos" },
    { id: "productivity", label: "Produtividade" },
    { id: "study", label: "Estudos" },
    { id: "business", label: "Negócios" },
    { id: "creative", label: "Criativo" },
    { id: "personal", label: "Pessoal" },
  ];

  return (
    <>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-[340px] glass-panel flex flex-col shadow-2xl z-30 mr-3 mt-2 mb-2 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
              <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
            </div>
            Biblioteca de Templates
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search input */}
        <div className="px-3 py-2 border-b border-border/60 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar templates..."
              className="h-8 text-xs pl-8 pr-2"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border/60 bg-muted/10">
          {categoryPills.map((p) => {
            const isActive = category === p.id;
            const accent =
              p.id !== "all" ? SUBTREE_CATEGORY_META[p.id].color : undefined;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCategory(p.id)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                  isActive
                    ? "text-primary-foreground border-transparent shadow-sm"
                    : "text-muted-foreground border-border bg-muted/40 hover:bg-accent hover:text-foreground"
                }`}
                style={
                  isActive
                    ? {
                        background: accent
                          ? `color-mix(in srgb, ${accent} 85%, transparent)`
                          : "var(--primary)",
                      }
                    : undefined
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto scroll-thin">
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-8 text-xs text-muted-foreground">
                <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum template encontrado.
              </div>
            )}
            {filtered.map((t) => {
              const accent = SUBTREE_CATEGORY_META[t.category].color;
              const count = countSubtreeNodes(t.root);
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => setPickedTemplate(t)}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="group relative text-left rounded-lg border border-border/70 bg-card/70 hover:bg-card hover:border-primary/60 transition-all p-2.5 flex flex-col gap-1.5 min-h-[110px] overflow-hidden hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
                  style={{
                    // Subtle accent-tinted top stripe for visual depth
                    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, var(--card)) 0%, var(--card) 60%)`,
                  }}
                >
                  {/* Top row: icon + name + node count */}
                  <div className="flex items-start gap-2">
                    <div
                      className="h-8 w-8 rounded-md flex items-center justify-center text-base shrink-0 transition-transform group-hover:scale-110"
                      style={{
                        background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)`,
                      }}
                    >
                      <span className="select-none leading-none" role="img" aria-label={t.name}>
                        {t.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-semibold text-foreground leading-tight line-clamp-2 break-words"
                        title={t.name}
                      >
                        {t.name}
                      </p>
                      <p
                        className="text-[10px] font-medium uppercase tracking-wide mt-0.5"
                        style={{ color: accent }}
                      >
                        {SUBTREE_CATEGORY_META[t.category].label}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4 font-mono shrink-0"
                      title="Número de nós"
                    >
                      {count}
                    </Badge>
                  </div>

                  {/* Description (truncated 2 lines) */}
                  <p className="text-[11px] text-muted-foreground/90 leading-snug line-clamp-2 flex-1">
                    {t.description}
                  </p>

                  {/* Hover overlay with "Inserir" button */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 12%, var(--card) 92%) 0%, var(--card) 80%)`,
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-md ring-1 ring-primary/30">
                      <Plus className="h-3.5 w-3.5" />
                      Inserir
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "template" : "templates"}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </motion.div>

      {/* Insert position dialog */}
      <Dialog
        open={pickedTemplate !== null}
        onOpenChange={(v) => {
          if (!v) setPickedTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {pickedTemplate && (
                <span
                  className="h-7 w-7 rounded-md flex items-center justify-center text-base"
                  style={{
                    background: `color-mix(in srgb, ${
                      SUBTREE_CATEGORY_META[pickedTemplate.category].color
                    } 18%, transparent)`,
                  }}
                >
                  {pickedTemplate.icon}
                </span>
              )}
              Inserir "{pickedTemplate?.name}"
            </DialogTitle>
            <DialogDescription className="text-xs">
              Escolha onde o template será inserido no mapa atual.{" "}
              {pickedTemplate && (
                <>
                  Serão adicionados{" "}
                  <strong className="text-foreground">
                    {countSubtreeNodes(pickedTemplate.root)}
                  </strong>{" "}
                  nós.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 mt-1">
            {INSERT_OPTIONS.map((opt) => {
              const disabled =
                opt.id === "near-selected" && selectedNodeIds.length === 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled || inserting}
                  onClick={() => handleConfirmInsert(opt)}
                  className={`group flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    disabled
                      ? "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
                      : "border-border hover:border-primary/50 hover:bg-accent/40 cursor-pointer"
                  }`}
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {inserting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      opt.icon
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {disabled
                        ? "Nenhum nó selecionado — selecione um nó primeiro."
                        : opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-2">
            <button
              type="button"
              onClick={() => setPickedTemplate(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <span className="text-[10px] text-muted-foreground">
              {pickedTemplate
                ? `Categoria: ${SUBTREE_CATEGORY_META[pickedTemplate.category].label}`
                : ""}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Wrap with AnimatePresence so the exit animation works when `open` flips false
export function TemplatesPanelAnimated(props: Props) {
  return (
    <AnimatePresence>
      {props.open && <TemplatesPanel key="templates-panel" {...props} />}
    </AnimatePresence>
  );
}
