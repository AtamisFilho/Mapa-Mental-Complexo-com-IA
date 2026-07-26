"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  Trash2,
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
  const [loading, loadingAction] = useState<null | string>(null);
  const [result, setResult] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

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
    loadingAction("expand");
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
        const children = data.nodes.map((n: { title: string; kind: string; content?: string }, i: number) => {
          const angle = (i / data.nodes.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 280;
          return {
            ...n,
            x: selectedNode.x + selectedNode.width / 2 + Math.cos(angle) * radius - 100,
            y: selectedNode.y + selectedNode.height / 2 + Math.sin(angle) * radius - 40,
            parentId: selectedNode.id,
            width: 200,
            height: 80,
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
    loadingAction(null);
  }, [selectedNode, nodes, mapTitle, thinking, addNode, addEdge]);

  // Generate full map from topic
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;
    loadingAction("generate");
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
    loadingAction(null);
  }, [topic, thinking, mergeNodes, addEdge]);

  // Summarize subtree
  const handleSummarize = useCallback(async () => {
    if (!selectedNode) return;
    loadingAction("summarize");
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
    loadingAction(null);
  }, [selectedNode, nodes, edges, thinking]);

  // Suggest connections
  const handleSuggest = useCallback(async () => {
    loadingAction("suggest");
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
    loadingAction(null);
  }, [nodes, edges, thinking]);

  // Chat
  const handleChatSend = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    loadingAction("chat");
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
    loadingAction(null);
  }, [chatInput, chatMessages, mapTitle, nodes, edges, thinking]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  // Generate image for selected node
  const handleImage = useCallback(async () => {
    if (!selectedNode) return;
    loadingAction("image");
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
    loadingAction(null);
  }, [selectedNode, updateNode]);

  // Auto-layout
  const handleLayout = useCallback(async () => {
    loadingAction("layout");
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
    loadingAction(null);
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
    <div className="w-[340px] bg-card border-l border-border flex flex-col shadow-2xl fade-in z-30">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          Inteligência Artificial
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* tab buttons */}
      <div className="flex flex-wrap gap-1 px-2.5 py-2 border-b border-border bg-muted/30">
        {tabs.filter((t) => t.enabled).map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              effectiveTab === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            onClick={() => { setTab(t.id); setResult(null); }}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-3">
        {/* Expand */}
        {effectiveTab === "expand" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Expande o nó selecionado em conceitos-filho gerados pela IA.
            </p>
            {selectedNode ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/40 border border-border">
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: `${NODE_KIND_META[selectedNode.kind]?.color ?? "#10b981"}22`, color: NODE_KIND_META[selectedNode.kind]?.color ?? "#10b981" }}
                >
                  <span className="text-[10px] font-bold">{selectedNode.title[0]}</span>
                </div>
                <span className="text-sm font-medium truncate">{selectedNode.title}</span>
              </div>
            ) : (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">⚠ Selecione um nó primeiro.</p>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              disabled={!selectedNode || loading !== null}
              onClick={handleExpand}
            >
              {loading === "expand" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Expand className="h-3.5 w-3.5" />}
              Expandir nó
            </Button>
          </>
        )}

        {/* Generate */}
        {effectiveTab === "generate" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera um mapa mental completo a partir de um tema.
            </p>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && topic.trim() && !loading) handleGenerate(); }}
              placeholder="Ex: Arquitetura de microsserviços..."
              className="h-9 text-sm"
            />
            <div className="flex flex-wrap gap-1">
              {["Inteligência Artificial", "Mudanças Climáticas", "Filosofia Grega", "Nutrição Humana"].map((s) => (
                <button
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40 hover:bg-accent hover:border-primary/40 text-muted-foreground transition-colors"
                  onClick={() => setTopic(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              disabled={!topic.trim() || loading !== null}
              onClick={handleGenerate}
            >
              {loading === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Map className="h-3.5 w-3.5" />}
              Gerar mapa
            </Button>
          </>
        )}

        {/* Summarize */}
        {effectiveTab === "summarize" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Resume o ramo do nó selecionado em texto Markdown.
            </p>
            {selectedNode ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/40 border border-border">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{selectedNode.title}</span>
              </div>
            ) : (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">⚠ Selecione um nó primeiro.</p>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              disabled={!selectedNode || loading !== null}
              onClick={handleSummarize}
            >
              {loading === "summarize" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Resumir subárvore
            </Button>
          </>
        )}

        {/* Suggest */}
        {effectiveTab === "suggest" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sugere conexões entre nós que ainda não estão ligados.
            </p>
            <div className="rounded-lg bg-muted/30 border border-border p-2.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                <strong className="text-foreground">{nodes.length}</strong> nós · <strong className="text-foreground">{edges.length}</strong> conexões
              </p>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              disabled={nodes.length < 2 || loading !== null}
              onClick={handleSuggest}
            >
              {loading === "suggest" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Sugerir conexões
            </Button>
          </>
        )}

        {/* Chat */}
        {effectiveTab === "chat" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Converse com a IA sobre o mapa.</p>
              {chatMessages.length > 0 && (
                <button
                  className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                  onClick={() => setChatMessages([])}
                  title="Limpar conversa"
                >
                  <Trash2 className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
            <div
              ref={chatScrollRef}
              className="flex flex-col gap-2 min-h-[240px] max-h-[420px] overflow-y-auto scroll-thin pr-1"
            >
              {chatMessages.length === 0 && (
                <div className="text-center py-6">
                  <BrainCircuit className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground italic">Pergunte algo sobre seu mapa...</p>
                  <div className="mt-3 flex flex-col gap-1">
                    {["Quais são os temas principais?", "Sugira melhorias para este mapa", "Explique o conceito de..."].map((q) => (
                      <button
                        key={q}
                        className="text-[11px] px-2 py-1 rounded-md border border-border bg-muted/30 hover:bg-accent hover:border-primary/40 text-muted-foreground transition-colors text-left"
                        onClick={() => setChatInput(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg text-xs prose-mm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground ml-6 rounded-br-sm"
                      : "bg-muted mr-6 rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              ))}
              {loading === "chat" && (
                <div className="bg-muted mr-6 p-2.5 rounded-lg rounded-bl-sm flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
                  <span className="ml-1">IA pensando...</span>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Pergunta..."
                className="h-8 text-xs flex-1"
              />
              <Button size="icon" className="h-8 w-8" disabled={loading !== null || !chatInput.trim()} onClick={handleChatSend}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* Image */}
        {effectiveTab === "image" && (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gera uma imagem ilustrativa para o nó selecionado.
            </p>
            {selectedNode ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/40 border border-border">
                <ImagePlus className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{selectedNode.title}</span>
              </div>
            ) : (
              <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">⚠ Selecione um nó primeiro.</p>
            )}
            {selectedNode?.image && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img src={selectedNode.image} alt={selectedNode.title} className="w-full h-32 object-cover" />
              </div>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 w-full"
              disabled={!selectedNode || loading !== null}
              onClick={handleImage}
            >
              {loading === "image" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {selectedNode?.image ? "Regenerar imagem" : "Gerar imagem"}
            </Button>
          </>
        )}

        {/* Result display */}
        {result && (
          <div className="mt-1 p-2.5 rounded-lg bg-primary/8 border border-primary/20 text-xs prose-mm">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        )}
        </div>
      </ScrollArea>

      {/* Auto layout button */}
      {settings.ai.autoLayout && (
        <div className="px-3 py-2.5 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 w-full hover:border-primary/40"
            disabled={nodes.length === 0 || loading !== null}
            onClick={handleLayout}
          >
            {loading === "layout" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            Reorganizar layout (auto-layout)
          </Button>
        </div>
      )}
    </div>
  );
}
