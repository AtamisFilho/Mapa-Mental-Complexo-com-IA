"use client";

import { useState, useCallback } from "react";
import {
  X,
  Download,
  FileJson,
  FileText,
  Image,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportPanel({ open, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const title = useMindMapStore((s) => s.title);

  const jsonEnabled = useSettingsStore((s) => s.settings.export.json);
  const mdEnabled = useSettingsStore((s) => s.settings.export.markdown);
  const pngEnabled = useSettingsStore((s) => s.settings.export.png);
  const includeNotes = useSettingsStore((s) => s.settings.export.includeNotes);

  if (!open) return null;

  const handleExportJSON = useCallback(() => {
    setExporting(true);
    try {
      const data = {
        title,
        nodes,
        edges,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("✅ JSON exportado com sucesso!");
    } catch (e) {
      setMessage("Erro ao exportar JSON.");
    }
    setExporting(false);
  }, [title, nodes, edges]);

  const handleExportMarkdown = useCallback(() => {
    setExporting(true);
    try {
      // Build a hierarchical markdown from the edges tree
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const children = new Map<string | null, string[]>();
      for (const e of edges) {
        if (!children.has(e.sourceId)) children.set(e.sourceId, []);
        children.get(e.sourceId)!.push(e.targetId);
      }
      // Find root nodes (no incoming edges or parentId)
      const incoming = new Set(edges.map((e) => e.targetId));
      const roots = nodes.filter(
        (n) => !incoming.has(n.id) || n.parentId === null
      );

      let md = `# ${title}\n\n`;
      const indent = (depth: number) => "  ".repeat(depth) + "- ";

      const visit = (nodeId: string, depth: number) => {
        const node = nodeMap.get(nodeId);
        if (!node) return;
        md += indent(depth) + `**${node.title}** (${node.kind})`;
        if (node.content) md += ` — ${node.content}`;
        if (includeNotes && node.note) md += `\n${indent(depth + 1)}📝 ${node.note}`;
        md += "\n";
        const kids = children.get(nodeId) ?? [];
        for (const kid of kids) visit(kid, depth + 1);
      };

      for (const root of roots) visit(root.id, 0);

      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("✅ Markdown exportado com sucesso!");
    } catch (e) {
      setMessage("Erro ao exportar Markdown.");
    }
    setExporting(false);
  }, [title, nodes, edges, includeNotes]);

  const handleExportPNG = useCallback(() => {
    setExporting(true);
    setMessage("ℹ️ PNG export will be available when the canvas can be captured via html2canvas or similar.");
    setExporting(false);
  }, []);

  return (
    <div className="w-[280px] bg-card border-l border-border flex flex-col shadow-lg fade-in">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Download className="h-4 w-4" />
          Exportar
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Exporte o mapa mental em diferentes formatos.
          </p>
          <p className="text-xs text-muted-foreground">
            {nodes.length} nós · {edges.length} conexões
          </p>

          {jsonEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-2 w-full justify-start"
              disabled={exporting}
              onClick={handleExportJSON}
            >
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
              Exportar JSON
            </Button>
          )}

          {mdEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-2 w-full justify-start"
              disabled={exporting}
              onClick={handleExportMarkdown}
            >
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Exportar Markdown
            </Button>
          )}

          {pngEnabled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-2 w-full justify-start"
              disabled={exporting}
              onClick={handleExportPNG}
            >
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
              Exportar PNG (em breve)
            </Button>
          )}
        </div>

        {message && (
          <div className="mt-3 p-2 rounded-md bg-muted text-xs">{message}</div>
        )}
      </ScrollArea>
    </div>
  );
}
