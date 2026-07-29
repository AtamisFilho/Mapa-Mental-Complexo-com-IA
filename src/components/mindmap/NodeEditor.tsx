"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Edit3,
  Share2,
  Link2,
  Lightbulb,
  HelpCircle,
  Zap,
  Sparkles,
  BookMarked,
  Target,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPicker } from "@/components/mindmap/IconPicker";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { useToastNotify } from "@/hooks/use-toast-notify";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Lightbulb,
  HelpCircle,
  Zap,
  Sparkles,
  BookMarked,
  Target,
};

// 10 preset colors for the color picker row
const PRESET_COLORS = [
  "#10b981", // emerald
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#ec4899", // pink
  "#6366f1", // indigo-like
  "#ef4444", // red
  "#22c55e", // green
  "#0ea5e9", // sky
];

function formatPtBR(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NodeEditor({ open, onClose }: Props) {
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const toggleCollapse = useMindMapStore((s) => s.toggleCollapse);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const mapId = useMindMapStore((s) => s.mapId);

  const confirmDelete = useSettingsStore((s) => s.settings.editor.confirmDelete);
  const aiImageEnabled = useSettingsStore((s) => s.settings.ai.enabled && s.settings.ai.generateImage);

  const { toast } = useToastNotify();

  const node = nodes.find((n) => n.id === selectedNodeIds[0]);

  // Coalesce rapid keystrokes into a single undo entry. Previously every
  // keystroke pushed a new history entry, so typing a 10-char title created
  // 10 undo steps. We now push at most once per EDIT_DEBOUNCE_MS of
  // inactivity, and reset the window when the selected node changes.
  const lastHistoryPushRef = useRef(0);
  const lastEditedNodeRef = useRef<string | null>(null);
  const EDIT_DEBOUNCE_MS = 1500;
  useEffect(() => {
    // Reset the debounce window when switching to a different node so the
    // first edit on the new node always captures a clean "before" snapshot.
    if (node && node.id !== lastEditedNodeRef.current) {
      lastEditedNodeRef.current = node.id;
      lastHistoryPushRef.current = 0;
    }
  }, [node]);

  // Find edges connected to this node
  const connectedEdges = node
    ? edges.filter((e) => e.sourceId === node.id || e.targetId === node.id)
    : [];
  const connectedNodeIds = connectedEdges.map((e) =>
    e.sourceId === node?.id ? e.targetId : e.sourceId
  );
  const connectedNodes = nodes.filter((n) => connectedNodeIds.includes(n.id));

  const handleChange = useCallback(
    (field: string, value: string | boolean) => {
      if (!node) return;
      const now = Date.now();
      if (now - lastHistoryPushRef.current > EDIT_DEBOUNCE_MS) {
        pushHistory();
        lastHistoryPushRef.current = now;
      }
      updateNode(node.id, { [field]: value });
    },
    [node, pushHistory, updateNode]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!node) return;
      pushHistory();
      updateNode(node.id, { color });
      toast({ title: "Cor alterada", description: "A cor do nó foi atualizada.", variant: "success" });
    },
    [node, pushHistory, updateNode, toast]
  );

  const handleIconChange = useCallback(
    (icon: string | null) => {
      if (!node) return;
      pushHistory();
      updateNode(node.id, { icon });
      if (icon) {
        toast({ title: "Ícone definido", description: "O ícone do nó foi atualizado.", variant: "success" });
      } else {
        toast({ title: "Ícone removido", description: "O ícone do nó foi removido.", variant: "default" });
      }
    },
    [node, pushHistory, updateNode, toast]
  );

  const handleDelete = useCallback(() => {
    if (!node) return;
    if (confirmDelete) {
      if (!window.confirm("Excluir este nó e suas conexões?")) return;
    }
    pushHistory();
    deleteNode(node.id);
    toast({ title: "Nó excluído", description: `"${node.title}" foi removido do mapa.`, variant: "error" });
    onClose();
  }, [node, confirmDelete, deleteNode, onClose, toast, pushHistory]);

  const handleGenerateImage = useCallback(async () => {
    if (!node || !aiImageEnabled) return;
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Illustration representing the concept of "${node.title}". ${node.content ?? ""} Clean, modern, minimal style, suitable for a mind map node.`,
          size: "1024x1024",
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.image) {
        updateNode(node.id, { image: data.image });
        toast({ title: "Imagem gerada", description: "Imagem IA adicionada ao nó.", variant: "success" });
      }
    } catch {
      toast({ title: "Erro ao gerar imagem", description: "Não foi possível gerar a imagem.", variant: "error" });
    }
  }, [node, aiImageEnabled, updateNode, toast]);

  const handleToggleCollapsed = useCallback(() => {
    if (!node) return;
    // toggleCollapse pushes history internally (undoable).
    toggleCollapse(node.id);
  }, [node, toggleCollapse]);

  const handleShare = useCallback(() => {
    if (!node || !mapId) return;
    // Build a working deep-link to the editor with a ?node= param. The page
    // reads this on load and selects/focuses the node. Previously this
    // pointed to a /map/:id/node/:nodeId route that never existed (404).
    const params = new URLSearchParams();
    params.set("node", node.id);
    const link = `${window.location.origin}/?${params.toString()}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Link do nó copiado", description: "Cole em outra aba para abrir este nó.", variant: "success" });
    }).catch(() => {
      toast({ title: "Link gerado", description: link, variant: "default" });
    });
  }, [node, mapId, toast]);

  if (!open || !node) return null;

  const kindMeta = NODE_KIND_META[node.kind as keyof typeof NODE_KIND_META] ?? NODE_KIND_META.concept;
  const Icon = KIND_ICONS[kindMeta.icon] ?? Lightbulb;
  const nodeColor = node.color ?? kindMeta.color;
  const wordCount = countWords(node.content);

  return (
    <div className="w-[280px] glass-panel flex flex-col panel-slide-in">
      {/* ── Gradient header ────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Edit3 className="h-4 w-4" />
          Editar nó
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Node type icon + color hero ─────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
        <div
          className="flex items-center justify-center rounded-lg p-2 shrink-0"
          style={{ background: `${nodeColor}18` }}
        >
          <Icon className="h-6 w-6" style={{ color: nodeColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate" style={{ color: nodeColor }}>
            {kindMeta.label}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{node.title}</p>
        </div>
        <div
          className="h-4 w-4 rounded-full shrink-0 border border-border"
          style={{ background: nodeColor }}
        />
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-4">

          {/* ── Title ─────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
            <Input
              value={node.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Kind ──────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
            <Select
              value={node.kind}
              onValueChange={(v) => handleChange("kind", v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(NODE_KIND_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: m.color }}
                      />
                      {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Icon (emoji picker) ──────────────────────── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ícone</label>
            <IconPicker
              value={node.icon}
              onSelect={handleIconChange}
              variant="labeled"
              label="Escolher emoji"
              align="start"
              stopPropagation
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Description (with word count) ─────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              {wordCount > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {wordCount} palavras
                </span>
              )}
            </div>
            <Textarea
              value={node.content ?? ""}
              onChange={(e) => handleChange("content", e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              placeholder="Descrição curta do conceito..."
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Note ──────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nota pessoal</label>
            <Textarea
              value={node.note ?? ""}
              onChange={(e) => handleChange("note", e.target.value)}
              className="min-h-[40px] text-sm resize-none"
              placeholder="Notas, referências..."
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Color picker (preset row + native picker) ─── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cor personalizada</label>
            {/* Preset color row */}
            <div className="flex items-center gap-1.5 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded-md border-2 transition-colors cursor-pointer hover:scale-110 ${
                    nodeColor === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  onClick={() => handleColorChange(c)}
                  title={c}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
            {/* Native picker + reset */}
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={nodeColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-8 w-10 cursor-pointer"
              />
              {node.color && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleColorChange("")}
                >
                  Resetar
                </Button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Collapsed ─────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleToggleCollapsed}
            >
              {node.collapsed ? (
                <><ChevronDown className="h-3 w-3" /> Expandir</>
              ) : (
                <><ChevronUp className="h-3 w-3" /> Recolher</>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Image ─────────────────────────────────────── */}
          {node.image && (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Imagem</label>
                <img
                  src={node.image}
                  alt=""
                  className="w-full h-32 object-cover rounded-md"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={() => handleChange("image", "")}
                >
                  Remover imagem
                </Button>
              </div>
              <div className="h-px bg-border/60" />
            </>
          )}

          {/* ── Generate image ────────────────────────────── */}
          {aiImageEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 w-full"
                onClick={handleGenerateImage}
              >
                <ImagePlus className="h-3 w-3" />
                Gerar imagem com IA
              </Button>
              <div className="h-px bg-border/60" />
            </>
          )}

          {/* ── Connection count ──────────────────────────── */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">
                Conexões ({connectedEdges.length})
              </label>
            </div>
            {connectedNodes.length > 0 ? (
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto scroll-thin">
                {connectedNodes.map((cn) => {
                  const cnMeta = NODE_KIND_META[cn.kind as keyof typeof NODE_KIND_META] ?? NODE_KIND_META.concept;
                  return (
                    <div
                      key={cn.id}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: cn.color ?? cnMeta.color }}
                      />
                      <span className="truncate">{cn.title}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Nenhuma conexão</p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Timestamps ────────────────────────────────── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              <span>Criado: {formatPtBR(node.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              <span>Editado: {formatPtBR(node.updatedAt)}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60" />

          {/* ── Share / Link button ────────────────────────── */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 w-full"
            onClick={handleShare}
          >
            <Share2 className="h-3 w-3" />
            Copiar link do nó
          </Button>

        </div>
      </ScrollArea>

      {/* ── Footer: delete ────────────────────────────── */}
      <div className="px-3 py-2 border-t border-border">
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs gap-1 w-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
          Excluir nó
        </Button>
      </div>
    </div>
  );
}
