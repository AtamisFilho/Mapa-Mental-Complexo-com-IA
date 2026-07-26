"use client";

import { useState, useCallback } from "react";
import {
  X,
  Sparkles,
  Expand,
  Map,
  FileText,
  Link2,
  MessageSquare,
  ImagePlus,
  LayoutGrid,
  Loader2,
  ChevronRight,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMindMapStore } from "@/store/mindmap-store";
import { useSettingsStore } from "@/store/settings-store";
import { NODE_KIND_META } from "@/lib/settings";
import ReactMarkdown from "react-markdown";
import type { NodeKind } from "@/lib/types";

type AITab = "expand" | "generate" | "summarize" | "suggest" | "chat" | "image";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<AITab>("expand");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds);
  const addNode = useMindMapStore((s) => s.addNode);
  const addEdge = useMindMapStore((s) => s.addEdge);
  const mergeNodes = useMindMapStore((s) => s.mergeNodes);
  const mergeEdges = useMindMapStore((s) => s.mergeEdges);
  const focusNode = useMindMapStore((s) => s.focusNode);
  const updateNode = useMindMapStore((s) => s.updateNode);
  const mapTitle = useMindMapStore((s) => s.title);

  const settings = useSettingsStore((s) => s.settings);

  const selectedNode = nodes.find((n) => n.id === selectedNodeIds[0]);
  const thinking = settings.ai.thinking;

  // Expand selected node
  const handleExpand = useCallback(async () => {
    if (!selectedNode) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedNode.title,
          context: `${mapTitle}. Nós existentes: ${nodes.slice(0, 20).map((n) => n.title).join(", ")}`,
          count: 5,
          thinking,
        }),
      });
      const data = await res.json();
      if (data.nodes) {
        // Position children around parent
        const children = data.nodes.map((n: { title: string; kind: string; content?: string }, i: number) => {
          const angle = (i / data.nodes.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 280;
          return {
            ...n,
            x: selectedNode.x + Math.cos(angle) * radius - 90,
            y: selectedNode.y + Math.sin(angle) * radius - 36,
            parentId: selectedNode.id,
          };
        });
        const newIds: string[] = [];
        for (const child of children) {
          const id = addNode(child);
          newIds.push(id);
        }
        for (const id of newIds) {
          addEdge(selectedNode.id, id);
        }
        setResult(`✅ ${data.nodes.length} conceitos-filho adicionados.`);
      } else {
        setResult(data.error ?? "Erro ao expandir.");
      }
    } catch (e) {
      setResult("Erro de conexão com a IA.");
    }
    setLoading(false);
  }, [selectedNode, nodes, mapTitle, thinking, addNode, addEdge]);

  // Generate full map from topic
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, depth: 2, breadth: 4, thinking }),
      });
      const data = await res.json();
      if (data.nodes && data.edges) {
        // Load into current map (merge)
        const typedNodes = data.nodes.map((n: Record<string, unknown>) => ({
          ...n,
          id: String(n.id),
          title: String(n.title),
          kind: (["concept", "question", "action", "idea", "resource", "goal"].includes(n.kind as string) ? n.kind : "concept") as NodeKind,
          content: n.content ? String(n.content) : null,
          parentId: n.parentId ? String(n.parentId) : null,
        }));
        const typedEdges = data.edges.map((e: Record<string, unknown>) => ({
          sourceId: String(e.source),
          targetId: String(e.target),
          label: e.label ? String(e.label) : null,
          kind: (["related", "causes", "supports", "contradicts", "depends"].includes(e.kind as string) ? e.kind : "related") as string,
        }));
        mergeNodes(typedNodes);
        for (const e of typedEdges) {
          addEdge(e.sourceId, e.targetId, e.kind, e.label ?? undefined);
        }
        setResult(`✅ Mapa gerado com ${data.nodes.length} nós e ${data.edges.length} conexões.`);
      } else {
        setResult(data.error ?? "Erro ao gerar.");
      }
    } catch (e) {
      setResult("Erro de conexão com a IA.");
    }
    setLoading(false);
  }, [topic, thinking, mergeNodes, addEdge]);

  // Summarize subtree
  const handleSummarize = useCallback(async () => {
    if (!selectedNode) return;
    setLoading(true);
    setResult(null);
    try {
      // Get subtree nodes
      const subtreeIds = new Set<string>();
      const queue = [selectedNode.id];
      while (queue.length) {
        const cur = queue.shift()!;
        if (subtreeIds.has(cur)) continue;
        subtreeIds.add(cur);
        for (const e of edges) {
          if (e.sourceId === cur) queue.push(e.targetId);
          if (e.targetId === cur) queue.push(e.sourceId);
        }
      }
      const subtree = nodes.filter((n) => subtreeIds.has(n.id));
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedNode.title,
          nodes: subtree,
          thinking,
        }),
      });
      const data = await res.json();
      setResult(data.summary ?? data.error ?? "Erro ao resumir.");
    } catch (e) {
      setResult("Erro de conexão com a IA.");
    }
    setLoading(false);
  }, [selectedNode, nodes, edges, thinking]);

  // Suggest connections
  const handleSuggest = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const existingPairs: Array<[string, string]> = edges.map((e) => [e.sourceId, e.targetId]);
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodes.slice(0, 30).map((n) => ({ id: n.id, title: n.title, kind: n.kind })),
          existingPairs,
          thinking,
        }),
      });
      const data = await res.json();
      if (data.suggestions) {
        let text = "💡 Sugestões de conexões:\n\n";
        for (const s of data.suggestions) {
          const src = nodes.find((n) => n.id === s.source);
          const tgt = nodes.find((n) => n.id === s.target);
          text += `- **${src?.title ?? s.source}** ↔ **${tgt?.title ?? s.target}** (${s.kind})${s.rationale ? ` — ${s.rationale}` : ""}\n`;
        }
        setResult(text);
      } else {
        setResult(data.error ?? "Nenhuma sugestão encontrada.");
      }
    } catch (e) {
      setResult("Erro de conexão com a IA.");
    }
    setLoading(false);
  }, [nodes, edges, thinking]);

  // Chat
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setLoading(true);
    try {
      const mapContext = `Mapa: "${mapTitle}". Nós: ${nodes.slice(0, 20).map((n) => `${n.title}(${n.kind})`).join(", ")}. Arestas: ${edges.slice(0, 15).map((e) => `${nodes.find(n=>n.id===e.sourceId)?.title ?? e.sourceId}→${nodes.find(n=>n.id===e.targetId)?.title ?? e.targetId}`).join(", ")}`;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          mapContext,
          thinking,
        }),
      });
      const data = await res.json();
      setChatMessages([...newMessages, { role: "assistant", content: data.reply ?? "Erro." }]);
    } catch (e) {
      setChatMessages([...newMessages, { role: "assistant", content: "Erro de conexão." }]);
    }
    setLoading(false);
  }, [chatInput, chatMessages, mapTitle, nodes, edges, thinking]);

  // Generate image for selected node
  const handleImage = useCallback(async () => {
    if (!selectedNode) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Illustration representing "${selectedNode.title}". ${selectedNode.content ?? ""} Clean, modern, minimal style.`,
          size: "1024x1024",
        }),
      });
      const data = await res.json();
      if (data.image) {
        updateNode(selectedNode.id, { image: data.image });
        setResult("✅ Imagem gerada e aplicada ao nó.");
      } else {
        setResult(data.error ?? "Erro ao gerar imagem.");
      }
    } catch (e) {
      setResult("Erro de conexão.");
    }
    setLoading(false);
  }, [selectedNode, updateNode]);

  // Auto-layout
  const handleLayout = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodes.map((n) => ({ id: n.id, parentId: n.parentId })),
          edges: edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId })),
          mode: "radial",
        }),
      });
      const data = await res.json();
      if (data.positions) {
        for (const n of nodes) {
          const pos = data.positions[n.id];
          if (pos) {
            updateNode(n.id, { x: pos.x, y: pos.y });
          }
        }
        setResult("✅ Layout reorganizado.");
      } else {
        setResult("Erro no layout.");
      }
    } catch (e) {
      setResult("Erro de conexão.");
    }
    setLoading(false);
  }, [nodes, edges, updateNode]);

  if (!open) return null;

  const tabs: Array<{ id: AITab; icon: React.ReactNode; label: string; enabled: boolean }> = [
    { id: "expand", icon: <Expand className="h-4 w-4" />, label: "Expandir", enabled: settings.ai.expandNode },
    { id: "generate", icon: <Map className="h-4 w-4" />, label: "Gerar mapa", enabled: settings.ai.generateMap },
    { id: "summarize", icon: <FileText className="h-4 w-4" />, label: "Resumir", enabled: settings.ai.summarize },
    { id: "suggest", icon: <Link2 className="h-4 w-4" />, label: "Conexões", enabled: settings.ai.suggestConnections },
    { id: "chat", icon: <MessageSquare className="h-4 w-4" />, label: "Chat", enabled: settings.ai.chatAssistant },
    { id: "image", icon: <ImagePlus className="h-4 w-4" />, label: "Imagem", enabled: settings.ai.generateImage },
  ];

  // Pick the first enabled tab if current is disabled
  const effectiveTab = tabs.find((t) => t.id === tab && t.enabled) ? tab : tabs.find((t) => t.enabled)?.id ?? "expand";

  return (
    <div className="w-[320px] bg-card border-l border-border flex flex-col shadow-lg fade-in">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          Inteligência Artificial
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* tab buttons */}
      <div className="flex flex-wrap gap-1 px-3 py-1.5 border-b border-border">
        {tabs.filter((t) => t.enabled).map((t) => (
          <Button
            key={t.id}
            variant={effectiveTab === t.id ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => { setTab(t.id); setResult(null); }}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1 p-3">
        {/* Expand */}
        {effectiveTab === "expand" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Expande o nó selecionado em conceitos-filho gerados pela IA.
            </p>
            {selectedNode ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50">
                <div
                  className="h-6 w-6 rounded flex items-center justify-center"
                  style={{ background: `${NODE_KIND_META[selectedNode.kind]?.color ?? "#10b981"}22`, color: NODE_KIND_META[selectedNode.kind]?.color ?? "#10b981" }}
                >
                  <span className="text-[10px] font-bold">{selectedNode.title[0]}</span>
                </div>
                <span className="text-sm font-medium">{selectedNode.title}</span>
              </div>
            ) : (
              <p className="text-xs text-destructive">Selecione um nó primeiro.</p>
            )}
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={!selectedNode || loading}
              onClick={handleExpand}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Expand className="h-3 w-3" />}
              Expandir nó
            </Button>
          </div>
        )}

        {/* Generate */}
        {effectiveTab === "generate" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Gera um mapa mental completo a partir de um tema.
            </p>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Arquitetura de microsserviços..."
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={!topic.trim() || loading}
              onClick={handleGenerate}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Map className="h-3 w-3" />}
              Gerar mapa
            </Button>
          </div>
        )}

        {/* Summarize */}
        {effectiveTab === "summarize" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Resume o ramo do nó selecionado em texto Markdown.
            </p>
            {selectedNode ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50">
                <span className="text-sm font-medium">{selectedNode.title}</span>
              </div>
            ) : (
              <p className="text-xs text-destructive">Selecione um nó primeiro.</p>
            )}
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={!selectedNode || loading}
              onClick={handleSummarize}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Resumir
            </Button>
          </div>
        )}

        {/* Suggest */}
        {effectiveTab === "suggest" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Sugere conexões entre nós que ainda não estão ligados.
            </p>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={nodes.length < 2 || loading}
              onClick={handleSuggest}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
              Sugerir conexões
            </Button>
          </div>
        )}

        {/* Chat */}
        {effectiveTab === "chat" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Converse com a IA sobre o mapa mental.
            </p>
            <div className="flex flex-col gap-2 min-h-[200px] max-h-[400px] overflow-y-auto scroll-thin">
              {chatMessages.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Pergunte algo sobre seu mapa...</p>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-md text-xs prose-mm ${m.role === "user" ? "bg-accent/50 ml-4" : "bg-muted mr-4"}`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleChatSend(); }}
                placeholder="Pergunta..."
                className="h-7 text-xs flex-1"
              />
              <Button size="icon" className="h-7 w-7" disabled={loading || !chatInput.trim()} onClick={handleChatSend}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Image */}
        {effectiveTab === "image" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Gera uma imagem ilustrativa para o nó selecionado.
            </p>
            {selectedNode ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-accent/50">
                <span className="text-sm font-medium">{selectedNode.title}</span>
              </div>
            ) : (
              <p className="text-xs text-destructive">Selecione um nó primeiro.</p>
            )}
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={!selectedNode || loading}
              onClick={handleImage}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
              Gerar imagem
            </Button>
          </div>
        )}

        {/* Result display */}
        {result && (
          <div className="mt-3 p-2 rounded-md bg-muted text-xs prose-mm">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        )}
      </ScrollArea>

      {/* Auto layout button */}
      {settings.ai.autoLayout && (
        <div className="px-3 py-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 w-full"
            disabled={nodes.length === 0 || loading}
            onClick={handleLayout}
          >
            <LayoutGrid className="h-3 w-3" />
            Auto-layout
          </Button>
        </div>
      )}
    </div>
  );
}
