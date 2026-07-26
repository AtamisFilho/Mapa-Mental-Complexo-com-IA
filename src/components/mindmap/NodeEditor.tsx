"use client";

import { useCallback } from "react";
import {
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Edit3,
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
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";
import type { NodeKind } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NodeEditor({ open, onClose }: Props) {
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const nodes = useMindMapStore((s) => s.nodes);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const deleteNode = useMindMapStore((s) => s.deleteNode);
  const pushHistory = useMindMapStore((s) => s.pushHistory);
  const addEdge = useMindMapStore((s) => s.addEdge);

  const confirmDelete = useSettingsStore((s) => s.settings.editor.confirmDelete);
  const aiImageEnabled = useSettingsStore((s) => s.settings.ai.enabled && s.settings.ai.generateImage);

  const node = nodes.find((n) => n.id === selectedNodeIds[0]);

  const handleChange = useCallback(
    (field: string, value: string | boolean) => {
      if (!node) return;
      pushHistory();
      updateNode(node.id, { [field]: value });
    },
    [node, pushHistory, updateNode]
  );

  const handleDelete = useCallback(() => {
    if (!node) return;
    if (confirmDelete) {
      if (!window.confirm("Excluir este nó e suas conexões?")) return;
    }
    deleteNode(node.id);
    onClose();
  }, [node, confirmDelete, deleteNode, onClose]);

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
      }
    } catch {
      /* silent */
    }
  }, [node, aiImageEnabled, updateNode]);

  const handleToggleCollapsed = useCallback(() => {
    if (!node) return;
    updateNode(node.id, { collapsed: !node.collapsed });
  }, [node, updateNode]);

  if (!open || !node) return null;

  const kindMeta = NODE_KIND_META[node.kind as keyof typeof NODE_KIND_META] ?? NODE_KIND_META.concept;

  return (
    <div className="w-[260px] bg-card border-l border-border flex flex-col shadow-lg fade-in">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Edit3 className="h-4 w-4" />
          Editar nó
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
            <Input
              value={node.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Kind */}
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

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
            <Textarea
              value={node.content ?? ""}
              onChange={(e) => handleChange("content", e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              placeholder="Descrição curta do conceito..."
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nota pessoal</label>
            <Textarea
              value={node.note ?? ""}
              onChange={(e) => handleChange("note", e.target.value)}
              className="min-h-[40px] text-sm resize-none"
              placeholder="Notas, referências..."
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cor personalizada</label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={node.color ?? kindMeta.color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="h-8 w-10 cursor-pointer"
              />
              {node.color && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleChange("color", "")}
                >
                  Resetar
                </Button>
              )}
            </div>
          </div>

          {/* Collapsed */}
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

          {/* Image */}
          {node.image && (
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
          )}

          {/* Generate image */}
          {aiImageEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 w-full"
              onClick={handleGenerateImage}
            >
              <ImagePlus className="h-3 w-3" />
              Gerar imagem com IA
            </Button>
          )}
        </div>
      </ScrollArea>

      {/* footer */}
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
