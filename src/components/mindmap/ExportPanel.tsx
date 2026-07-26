"use client";

import { useState, useCallback, useRef } from "react";
import {
  X,
  Download,
  FileJson,
  FileText,
  ImageIcon,
  Loader2,
  Copy,
  Check,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Validate imported JSON structure
function validateImportJSON(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "JSON deve ser um objeto." };
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.nodes)) {
    return { valid: false, error: "Campo 'nodes' ausente ou não é um array." };
  }
  if (!Array.isArray(obj.edges)) {
    return { valid: false, error: "Campo 'edges' ausente ou não é um array." };
  }
  for (const n of obj.nodes as Array<Record<string, unknown>>) {
    if (!n.title || typeof n.title !== "string") {
      return { valid: false, error: `Node sem 'title': ${JSON.stringify(n).slice(0, 60)}` };
    }
    if (n.kind && typeof n.kind !== "string") {
      return { valid: false, error: `Node kind inválido: ${n.kind}` };
    }
  }
  for (const e of obj.edges as Array<Record<string, unknown>>) {
    if (!e.sourceId || !e.targetId) {
      return { valid: false, error: `Edge sem 'sourceId' ou 'targetId': ${JSON.stringify(e).slice(0, 60)}` };
    }
  }
  if (obj.nodes.length === 0) {
    return { valid: false, error: "O mapa importado não tem nenhum nó." };
  }
  return { valid: true };
}

export function ExportPanel({ open, onClose }: Props) {
  const [exporting, setExporting] = useState<null | "json" | "md" | "png" | "svg" | "copy" | "import">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const title = useMindMapStore((s) => s.title);
  const viewport = useMindMapStore((s) => s.viewport);
  const loadMap = useMindMapStore((s) => s.loadMap);

  const jsonEnabled = useSettingsStore((s) => s.settings.export.json);
  const mdEnabled = useSettingsStore((s) => s.settings.export.markdown);
  const pngEnabled = useSettingsStore((s) => s.settings.export.png);
  const includeNotes = useSettingsStore((s) => s.settings.export.includeNotes);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const safeName = useCallback(
    (ext: string) => `${(title || "mapa-mental").replace(/[^\w\-]+/g, "_").slice(0, 60)}.${ext}`,
    [title]
  );

  const handleExportJSON = useCallback(async () => {
    setExporting("json");
    try {
      const data = {
        title,
        nodes,
        edges,
        exportedAt: new Date().toISOString(),
        version: 1,
      };
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
        safeName("json")
      );
      setMessage("✅ JSON exportado com sucesso!");
    } catch {
      setMessage("Erro ao exportar JSON.");
    }
    setExporting(null);
  }, [title, nodes, edges, downloadBlob, safeName]);

  const handleExportMarkdown = useCallback(async () => {
    setExporting("md");
    try {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const children = new Map<string, string[]>();
      for (const e of edges) {
        if (!children.has(e.sourceId)) children.set(e.sourceId, []);
        children.get(e.sourceId)!.push(e.targetId);
      }
      const incoming = new Set(edges.map((e) => e.targetId));
      const roots =
        nodes.filter((n) => !incoming.has(n.id) || n.parentId === null);

      let md = `# ${title}\n\n`;
      if (nodes.length === 0) {
        md += `_(mapa vazio)_\n`;
      } else {
        const indent = (depth: number) => "  ".repeat(depth) + "- ";
        const visit = (nodeId: string, depth: number, seen: Set<string>) => {
          if (seen.has(nodeId)) return; // guard against cycles
          seen.add(nodeId);
          const node = nodeMap.get(nodeId);
          if (!node) return;
          const kindLabel = NODE_KIND_META[node.kind]?.label ?? node.kind;
          md += indent(depth) + `**${node.title}** _(${kindLabel})_`;
          if (node.content) md += ` — ${node.content}`;
          md += "\n";
          if (includeNotes && node.note) {
            md += `${indent(depth + 1)}📝 ${node.note}\n`;
          }
          const kids = children.get(nodeId) ?? [];
          for (const kid of kids) visit(kid, depth + 1, seen);
        };
        for (const root of roots) visit(root.id, 0, new Set());
      }
      // Append loose edges (not in tree)
      const treeEdges = new Set<string>();
      const walk = (id: string, seen: Set<string>) => {
        if (seen.has(id)) return;
        seen.add(id);
        for (const e of edges) {
          if (e.sourceId === id) {
            treeEdges.add(e.id);
            walk(e.targetId, seen);
          }
        }
      };
      for (const r of roots) walk(r.id, new Set());
      const loose = edges.filter((e) => !treeEdges.has(e.id));
      if (loose.length > 0) {
        md += `\n## Conexões avulsas\n\n`;
        for (const e of loose) {
          const s = nodeMap.get(e.sourceId)?.title ?? e.sourceId;
          const t = nodeMap.get(e.targetId)?.title ?? e.targetId;
          md += `- ${s} → ${t}${e.label ? ` _(${e.label})_` : ""}\n`;
        }
      }
      downloadBlob(new Blob([md], { type: "text/markdown" }), safeName("md"));
      setMessage("✅ Markdown exportado com sucesso!");
    } catch {
      setMessage("Erro ao exportar Markdown.");
    }
    setExporting(null);
  }, [title, nodes, edges, includeNotes, downloadBlob, safeName]);

  // Build an SVG string that embeds the nodes as styled foreignObject HTML.
  const buildSVGString = useCallback((): string => {
    if (nodes.length === 0) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="200" y="100" text-anchor="middle" fill="#888">Mapa vazio</text></svg>`;
    }
    const padding = 80;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const x2s = nodes.map((n) => n.x + n.width);
    const y2s = nodes.map((n) => n.y + n.height);
    const minX = Math.min(...xs) - padding;
    const minY = Math.min(...ys) - padding;
    const maxX = Math.max(...x2s) + padding;
    const maxY = Math.max(...y2s) + padding;
    const w = Math.max(400, maxX - minX);
    const h = Math.max(300, maxY - minY);
    const ox = -minX;
    const oy = -minY;

    const esc = (s: string) =>
      (s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    // Edges as bezier paths
    const edgePaths = edges
      .map((e) => {
        const s = nodes.find((n) => n.id === e.sourceId);
        const t = nodes.find((n) => n.id === e.targetId);
        if (!s || !t) return "";
        const sx = s.x + s.width / 2 + ox;
        const sy = s.y + s.height / 2 + oy;
        const tx = t.x + t.width / 2 + ox;
        const ty = t.y + t.height / 2 + oy;
        const dx = (tx - sx) / 2;
        const path = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
        const labelText = e.label
          ? `<text x="${(sx + tx) / 2}" y="${(sy + ty) / 2 - 6}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">${esc(e.label)}</text>`
          : "";
        return `<path d="${path}" stroke="#64748b" stroke-width="2" fill="none" opacity="0.6"/>${labelText}`;
      })
      .join("");

    // Nodes as foreignObject (HTML inside SVG)
    const nodeHtml = nodes
      .map((n) => {
        const meta = NODE_KIND_META[n.kind];
        const color = n.color ?? meta?.color ?? "#10b981";
        const kindLabel = meta?.label ?? n.kind;
        const contentHtml = n.content
          ? `<div style="font-size:12px;color:#cbd5e1;margin-top:4px;line-height:1.3;">${esc(n.content)}</div>`
          : "";
        const imageHtml = n.image
          ? `<img src="${n.image}" style="width:100%;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;" crossorigin="anonymous"/>`
          : "";
        return `
          <foreignObject x="${n.x + ox}" y="${n.y + oy}" width="${n.width}" height="${n.height}">
            <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:100%;height:100%;background:#1e293b;border:1px solid ${color};border-left:4px solid ${color};border-radius:10px;padding:8px 10px;font-family:Inter,system-ui,sans-serif;overflow:hidden;">
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:${color};font-weight:600;">${kindLabel}</div>
              <div style="font-size:14px;font-weight:600;color:#f1f5f9;line-height:1.25;margin-top:2px;">${esc(n.title)}</div>
              ${contentHtml}
              ${imageHtml}
            </div>
          </foreignObject>`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="100%" height="100%" fill="#0f172a"/>
      ${edgePaths}
      ${nodeHtml}
    </svg>`;
  }, [nodes, edges]);

  const handleExportSVG = useCallback(async () => {
    setExporting("svg");
    try {
      const svg = buildSVGString();
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), safeName("svg"));
      setMessage("✅ SVG exportado com sucesso!");
    } catch {
      setMessage("Erro ao exportar SVG.");
    }
    setExporting(null);
  }, [buildSVGString, downloadBlob, safeName]);

  const handleExportPNG = useCallback(async () => {
    setExporting("png");
    try {
      const svg = buildSVGString();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("SVG load failed"));
        img.src = url;
      });
      const scale = 2; // retina
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          downloadBlob(pngBlob, safeName("png"));
          setMessage("✅ PNG exportado com sucesso!");
        } else {
          setMessage("Erro ao gerar PNG.");
        }
        setExporting(null);
      }, "image/png");
    } catch (e) {
      setMessage("Erro ao exportar PNG: " + (e as Error).message);
      setExporting(null);
    }
  }, [buildSVGString, downloadBlob, safeName]);

  const handleCopySummary = useCallback(async () => {
    setExporting("copy");
    try {
      const summary = `📋 ${title}\n${nodes.length} nós · ${edges.length} conexões\nZoom: ${Math.round(viewport.zoom * 100)}%\n\n` +
        nodes.slice(0, 12).map((n) => `• ${n.title} (${n.kind})`).join("\n") +
        (nodes.length > 12 ? `\n... e mais ${nodes.length - 12}` : "");
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setMessage("✅ Resumo copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Não foi possível copiar.");
    }
    setExporting(null);
  }, [title, nodes, edges, viewport.zoom]);

  // JSON Import handler
  const handleImportJSON = useCallback(async () => {
    setImportError(null);
    // Trigger file input
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset input so the same file can be re-selected
      e.target.value = "";

      setExporting("import");
      setMessage(null);
      setImportError(null);

      try {
        const text = await file.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          setImportError("Arquivo JSON inválido — não foi possível parsear.");
          setExporting(null);
          return;
        }

        // Validate structure
        const validation = validateImportJSON(data);
        if (!validation.valid) {
          setImportError(validation.error ?? "JSON inválido.");
          setExporting(null);
          return;
        }

        const obj = data as Record<string, unknown>;
        const importNodes = obj.nodes as Array<Record<string, unknown>>;
        const importEdges = obj.edges as Array<Record<string, unknown>>;
        const importTitle = (obj.title as string) || "Mapa Importado";

        // Transform nodes: strip IDs and only keep relevant fields for API
        // Map old node IDs to their array index for edge resolution
        const oldIdToIndex = new Map<string, number>();
        const transformedNodes = importNodes.map((n, i) => {
          // Store the old ID → index mapping
          if (n.id && typeof n.id === "string") {
            oldIdToIndex.set(n.id, i);
          }
          return {
            title: n.title,
            kind: n.kind ?? "concept",
            x: typeof n.x === "number" ? n.x : 0,
            y: typeof n.y === "number" ? n.y : 0,
            width: typeof n.width === "number" ? n.width : 220,
            height: typeof n.height === "number" ? n.height : 88,
            content: n.content ?? null,
            note: n.note ?? null,
            color: n.color ?? null,
          };
        });

        // Transform edges: resolve sourceId/targetId using old ID → index map
        // If sourceId/targetId are already index strings ("0", "1", etc.), use them directly
        const transformedEdges = importEdges.map((e) => {
          let srcIdx: string;
          let tgtIdx: string;
          const srcId = String(e.sourceId);
          const tgtId = String(e.targetId);

          // Check if these are already numeric index strings
          if (oldIdToIndex.has(srcId)) {
            srcIdx = String(oldIdToIndex.get(srcId));
          } else if (/^\d+$/.test(srcId) && parseInt(srcId) < importNodes.length) {
            srcIdx = srcId;
          } else {
            srcIdx = "0"; // fallback
          }

          if (oldIdToIndex.has(tgtId)) {
            tgtIdx = String(oldIdToIndex.get(tgtId));
          } else if (/^\d+$/.test(tgtId) && parseInt(tgtId) < importNodes.length) {
            tgtIdx = tgtId;
          } else {
            tgtIdx = "0"; // fallback
          }

          return {
            sourceId: srcIdx,
            targetId: tgtIdx,
            label: e.label ?? null,
            kind: e.kind ?? "related",
          };
        });

        // POST to /api/maps
        const res = await fetch("/api/maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: importTitle,
            nodes: transformedNodes,
            edges: transformedEdges,
          }),
        });

        if (!res.ok) {
          setImportError(`Erro do servidor (${res.status}). Tente novamente.`);
          setExporting(null);
          return;
        }

        const createData = await res.json();

        // Load the full map
        const mapRes = await fetch(`/api/maps/${createData.map.id}`);
        if (!mapRes.ok) {
          setImportError("Mapa criado, mas não foi possível carregar.");
          setExporting(null);
          return;
        }
        const mapData = await mapRes.json();
        loadMap(mapData.map);
        setMessage(`✅ Mapa "${importTitle}" importado com sucesso!`);
        onClose();
      } catch (err) {
        setImportError(`Erro inesperado: ${(err as Error).message}`);
      }
      setExporting(null);
    },
    [loadMap, onClose]
  );

  if (!open) return null;

  return (
    <div className="w-[300px] bg-card border-l border-border flex flex-col shadow-xl fade-in z-30">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Download className="h-4 w-4 text-primary" />
          Exportar / Importar
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Mapa atual</p>
            <p className="text-sm font-semibold mt-0.5 truncate">{title}</p>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{nodes.length}</strong> nós</span>
              <span><strong className="text-foreground">{edges.length}</strong> conexões</span>
              <span><strong className="text-foreground">{Math.round(viewport.zoom * 100)}%</strong> zoom</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {/* IMPORT JSON card */}
            <div className="group flex items-start gap-3 p-3 rounded-lg border border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-all text-left relative">
              <div className="h-9 w-9 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {exporting === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Importar JSON</p>
                <p className="text-xs text-muted-foreground">Carregar mapa de um arquivo .json</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 mt-2 text-xs gap-1"
                  disabled={exporting !== null}
                  onClick={handleImportJSON}
                >
                  <Upload className="h-3 w-3" />
                  Selecionar arquivo
                </Button>
                <div className="mt-2 rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground leading-relaxed border border-border/50">
                  <p className="font-medium text-foreground/80 mb-1">Formato esperado:</p>
                  <pre className="whitespace-pre-wrap font-mono">{`{ "title": "...", "nodes": [{ "title": "...", "kind": "concept", "x": 0, "y": 0 }], "edges": [{ "sourceId": "n-id-1", "targetId": "n-id-2" }] }`}</pre>
                </div>
                {importError && (
                  <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {importError}
                  </div>
                )}
              </div>
            </div>

            {pngEnabled && (
              <button
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-left"
                disabled={exporting !== null}
                onClick={handleExportPNG}
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {exporting === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">PNG</p>
                  <p className="text-xs text-muted-foreground">Imagem do mapa (alta resolução)</p>
                </div>
              </button>
            )}

            {pngEnabled && (
              <button
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-left"
                disabled={exporting !== null}
                onClick={handleExportSVG}
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {exporting === "svg" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">SVG</p>
                  <p className="text-xs text-muted-foreground">Vetorial escalável (editável)</p>
                </div>
              </button>
            )}

            {jsonEnabled && (
              <button
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-left"
                disabled={exporting !== null}
                onClick={handleExportJSON}
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {exporting === "json" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">JSON</p>
                  <p className="text-xs text-muted-foreground">Dados brutos para reimportar</p>
                </div>
              </button>
            )}

            {mdEnabled && (
              <button
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-left"
                disabled={exporting !== null}
                onClick={handleExportMarkdown}
              >
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {exporting === "md" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Markdown</p>
                  <p className="text-xs text-muted-foreground">Lista hierárquica {includeNotes ? "com notas" : ""}</p>
                </div>
              </button>
            )}

            <button
              className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-left"
              disabled={exporting !== null}
              onClick={handleCopySummary}
            >
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {exporting === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Copiar resumo</p>
                <p className="text-xs text-muted-foreground">Área de transferência</p>
              </div>
            </button>
          </div>

          {message && !importError && (
            <div className="mt-1 p-2.5 rounded-md bg-primary/10 border border-primary/20 text-xs text-foreground">
              {message}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Os formatos habilitados podem ser controlados em Configurações → Exportação.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
