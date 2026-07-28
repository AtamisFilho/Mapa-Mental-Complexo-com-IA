"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, Network, GitBranch, Layers, Clock } from "lucide-react";
import { useMindMapStore } from "@/store/mindmap-store";
import { NODE_KIND_META, EDGE_KIND_META } from "@/lib/settings";
import type { NodeKind, EdgeKind } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Map Statistics Dashboard — a slide-out panel showing analytics about the
 * current mind map:
 *  - Total nodes / edges / depth
 *  - Node kind distribution (horizontal bar chart with colored bars)
 *  - Edge kind distribution (horizontal bar chart)
 *  - Nodes with content / notes / images / icons (feature adoption)
 *  - Last updated timestamp
 *
 * Useful for getting a quick overview of map complexity and composition
 * without counting manually.
 */
export function StatsPanel({ open, onClose }: Props) {
  const nodes = useMindMapStore((s) => s.nodes);
  const edges = useMindMapStore((s) => s.edges);
  const title = useMindMapStore((s) => s.title);
  const lastSavedAt = useMindMapStore((s) => s.lastSavedAt);

  if (!open) return null;

  // Compute node kind distribution
  const nodeKindCounts: Record<string, number> = {};
  for (const n of nodes) {
    nodeKindCounts[n.kind] = (nodeKindCounts[n.kind] ?? 0) + 1;
  }
  const nodeKinds = (Object.keys(NODE_KIND_META) as NodeKind[]).filter(
    (k) => (nodeKindCounts[k] ?? 0) > 0
  );
  const maxNodeCount = Math.max(1, ...Object.values(nodeKindCounts));

  // Compute edge kind distribution
  const edgeKindCounts: Record<string, number> = {};
  for (const e of edges) {
    edgeKindCounts[e.kind] = (edgeKindCounts[e.kind] ?? 0) + 1;
  }
  const edgeKinds = (Object.keys(EDGE_KIND_META) as EdgeKind[]).filter(
    (k) => (edgeKindCounts[k] ?? 0) > 0
  );
  const maxEdgeCount = Math.max(1, ...Object.values(edgeKindCounts));

  // Feature adoption
  const withContent = nodes.filter((n) => n.content).length;
  const withNotes = nodes.filter((n) => n.note).length;
  const withImages = nodes.filter((n) => n.image).length;
  const withIcons = nodes.filter((n) => n.icon).length;
  const collapsed = nodes.filter((n) => n.collapsed).length;

  // Map depth (BFS)
  let depth = 0;
  if (nodes.length > 0) {
    const childrenOf = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const e of edges) {
      if (!childrenOf.has(e.sourceId)) childrenOf.set(e.sourceId, []);
      childrenOf.get(e.sourceId)!.push(e.targetId);
      hasParent.add(e.targetId);
    }
    const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);
    const start = roots.length > 0 ? roots : [nodes[0].id];
    const queue: Array<{ id: string; d: number }> = start.map((id) => ({ id, d: 1 }));
    const visited = new Set<string>();
    while (queue.length) {
      const { id, d } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (d > depth) depth = d;
      for (const child of childrenOf.get(id) ?? []) {
        if (!visited.has(child)) queue.push({ id: child, d: d + 1 });
      }
    }
    if (depth === 0) depth = 1;
  }

  // Leaf count (nodes with no children)
  const leafCount = nodes.filter(
    (n) => !edges.some((e) => e.sourceId === n.id)
  ).length;

  // Average children per non-leaf node
  const nonLeafCount = nodes.length - leafCount;
  const avgChildren = nonLeafCount > 0 ? (edges.length / nonLeafCount).toFixed(1) : "0";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-[360px] bg-card border-l border-border flex flex-col shadow-2xl z-30 absolute right-0 top-0 bottom-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/15 via-primary/5 to-transparent">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              Estatísticas do Mapa
            </h3>
            <button
              aria-label="Fechar estatísticas"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Map title */}
            <div className="text-center pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mapa</p>
              <p className="text-sm font-medium truncate">{title}</p>
              {lastSavedAt && (
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Salvo às {new Date(lastSavedAt).toLocaleTimeString("pt-BR")}
                </p>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<Network className="h-3.5 w-3.5" />} label="Nós" value={nodes.length} color="var(--primary)" />
              <StatCard icon={<GitBranch className="h-3.5 w-3.5" />} label="Arestas" value={edges.length} color="#8b5cf6" />
              <StatCard icon={<Layers className="h-3.5 w-3.5" />} label="Níveis" value={depth} color="#f59e0b" />
            </div>

            {/* Node kind distribution */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Network className="h-3 w-3" />
                Distribuição por tipo de nó
              </h4>
              <div className="space-y-1.5">
                {nodeKinds.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sem nós no mapa.</p>
                ) : (
                  nodeKinds.map((kind) => {
                    const meta = NODE_KIND_META[kind];
                    const count = nodeKindCounts[kind] ?? 0;
                    const pct = (count / nodes.length) * 100;
                    const barW = (count / maxNodeCount) * 100;
                    return (
                      <div key={kind} className="flex items-center gap-2">
                        <span className="text-[11px] font-medium w-16 shrink-0">{meta.label}</span>
                        <div className="flex-1 h-5 rounded-md bg-muted/40 overflow-hidden relative">
                          <div
                            className="h-full rounded-md transition-all duration-500 ease-out flex items-center justify-end pr-1.5"
                            style={{
                              width: `${barW}%`,
                              background: `linear-gradient(90deg, ${meta.color}aa, ${meta.color})`,
                              minWidth: count > 0 ? "24px" : "0",
                            }}
                          >
                            <span className="text-[10px] font-bold text-white drop-shadow">{count}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Edge kind distribution */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" />
                Distribuição por tipo de conexão
              </h4>
              <div className="space-y-1.5">
                {edgeKinds.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sem conexões no mapa.</p>
                ) : (
                  edgeKinds.map((kind) => {
                    const meta = EDGE_KIND_META[kind];
                    const count = edgeKindCounts[kind] ?? 0;
                    const pct = (count / edges.length) * 100;
                    const barW = (count / maxEdgeCount) * 100;
                    return (
                      <div key={kind} className="flex items-center gap-2">
                        <span className="text-[11px] font-medium w-20 shrink-0">{meta.label}</span>
                        <div className="flex-1 h-5 rounded-md bg-muted/40 overflow-hidden relative">
                          <div
                            className="h-full rounded-md transition-all duration-500 ease-out flex items-center justify-end pr-1.5"
                            style={{
                              width: `${barW}%`,
                              background: `linear-gradient(90deg, ${meta.color}aa, ${meta.color})`,
                              minWidth: count > 0 ? "24px" : "0",
                            }}
                          >
                            <span className="text-[10px] font-bold text-white drop-shadow">{count}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Feature adoption */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Adoção de recursos
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Com conteúdo" value={withContent} total={nodes.length} />
                <MiniStat label="Com notas" value={withNotes} total={nodes.length} />
                <MiniStat label="Com imagens" value={withImages} total={nodes.length} />
                <MiniStat label="Com ícones" value={withIcons} total={nodes.length} />
                <MiniStat label="Recolhidos" value={collapsed} total={nodes.length} />
                <MiniStat label="Folhas" value={leafCount} total={nodes.length} />
              </div>
            </div>

            {/* Tree metrics */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Métricas da árvore
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Nós raiz</span>
                  <span className="font-medium tabular-nums">
                    {nodes.filter((n) => !edges.some((e) => e.targetId === n.id)).length}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Nós folha</span>
                  <span className="font-medium tabular-nums">{leafCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Ramos médios por pai</span>
                  <span className="font-medium tabular-nums">{avgChildren}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Profundidade máxima</span>
                  <span className="font-medium tabular-nums">{depth} {depth === 1 ? "nível" : "níveis"}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
      style={{ borderTopColor: color, borderTopWidth: 2 }}
    >
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5" style={{ color }}>
        {icon}
      </div>
      <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{label}</span>
    </div>
  );
}

function MiniStat({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="p-2 rounded-md bg-muted/30 border border-border/50">
      <p className="text-[10px] text-muted-foreground leading-none mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-bold tabular-nums">{value}</span>
        <span className="text-[10px] text-muted-foreground">/ {total}</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
