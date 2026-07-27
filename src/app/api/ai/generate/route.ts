import { NextRequest, NextResponse } from "next/server";
import { chatComplete, extractJSON } from "@/lib/ai";

interface GenNode {
  id: string;
  title: string;
  kind: string;
  content?: string | null;
  parentId?: string | null;
}

interface GenEdge {
  source: string;
  target: string;
  label?: string | null;
  kind?: string;
}

// Generate an entire mind map from a topic
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const topic: string = (body.topic ?? "").trim();
  const depth: number = Math.min(3, Math.max(1, body.depth ?? 2));
  const breadth: number = Math.min(6, Math.max(2, body.breadth ?? 4));
  const thinking: boolean = !!body.thinking;

  if (!topic) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const sys =
    "Você é um especialista em mapas mentais. Gere uma estrutura de mapa mental completa, " +
    "hierárquica e bem organizada. Responda APENAS com JSON válido no formato: " +
    '{"nodes":[{"id":"n1","title":"...","kind":"goal|concept|question|action|idea|resource","content":"...","parentId":null}],"edges":[{"source":"n1","target":"n2","label":"...","kind":"related|causes|supports|contradicts|depends"}]}. ' +
    "O primeiro nó (id 'n1') é a raiz com parentId null e kind 'goal'. " +
    "Cada nó filho tem um parentId apontando para seu pai. " +
    "Os ids devem ser únicos: n1, n2, n3, ... " +
    "As edges conectam pais a filhos (source = pai, target = filho). " +
    "Não inclua texto fora do JSON.";

  const user =
    `Tema central: "${topic}".\n` +
    `Profundidade: ${depth} níveis. Aproximadamente ${breadth} filhos por nó pai. ` +
    `Gere entre ${breadth + 1} e ${breadth * (depth + 1) + 1} nós no total. ` +
    `Varie os tipos (kind) apropriadamente. Títulos curtos (2-5 palavras). ` +
    `content é uma descrição de uma frase (opcional).`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      { thinking }
    );
    const parsed = extractJSON<{ nodes?: GenNode[]; edges?: GenEdge[] }>(raw);
    const nodes = (parsed?.nodes ?? [])
      .filter((n) => n.id && n.title)
      .map((n) => ({
        id: String(n.id),
        title: String(n.title).slice(0, 120),
        kind: ["concept", "question", "action", "idea", "resource", "goal"].includes(n.kind)
          ? n.kind
          : "concept",
        content: n.content ? String(n.content).slice(0, 400) : null,
        parentId: n.parentId ?? null,
      }));
    const validIds = new Set(nodes.map((n) => n.id));
    const edges = (parsed?.edges ?? [])
      .filter(
        (e) =>
          e.source &&
          e.target &&
          validIds.has(String(e.source)) &&
          validIds.has(String(e.target))
      )
      .map((e) => ({
        source: String(e.source),
        target: String(e.target),
        label: e.label ? String(e.label).slice(0, 60) : null,
        kind: ["related", "causes", "supports", "contradicts", "depends"].includes(e.kind ?? "")
          ? e.kind!
          : "related",
      }));

    // Auto-layout: radial tree
    const layouted = layoutRadial(nodes, edges);

    return NextResponse.json({ nodes: layouted, edges });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI error" },
      { status: 500 }
    );
  }
}

interface LayoutNode {
  id: string;
  title: string;
  kind: string;
  content?: string | null;
  parentId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

function layoutRadial(
  nodes: GenNode[],
  edges: GenEdge[]
): LayoutNode[] {
  const children = new Map<string | null, GenNode[]>();
  for (const n of nodes) {
    const p = n.parentId ?? null;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(n);
  }
  const root = (children.get(null) ?? nodes)[0];
  if (!root) {
    return nodes.map((n, i) => ({
      ...n,
      x: (i % 5) * 240,
      y: Math.floor(i / 5) * 130,
      width: 200,
      height: 80,
    }));
  }

  const positions = new Map<string, { x: number; y: number; depth: number }>();
  positions.set(root.id, { x: 0, y: 0, depth: 0 });

  const ringRadius = [0, 260, 460, 620, 760];
  const queue: GenNode[] = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    const depth = positions.get(cur.id)!.depth;
    const kids = (children.get(cur.id) ?? []).filter((k) => k.id !== cur.id);
    if (kids.length === 0) continue;
    const radius = ringRadius[Math.min(depth + 1, ringRadius.length - 1)];
    const parentPos = positions.get(cur.id)!;
    // spread kids in an arc
    const arc = kids.length > 1 ? Math.PI * 0.9 : Math.PI * 0.4;
    const startAngle = Math.atan2(parentPos.y, parentPos.x) - arc / 2;
    kids.forEach((kid, i) => {
      const t = kids.length === 1 ? 0 : i / (kids.length - 1);
      const angle = startAngle + arc * t;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      // root children: distribute around full circle
      if (depth === 0) {
        const fullAngle = (i / Math.max(kids.length, 1)) * Math.PI * 2 - Math.PI / 2;
        positions.set(kid.id, {
          x: Math.cos(fullAngle) * radius,
          y: Math.sin(fullAngle) * radius,
          depth: 1,
        });
      } else {
        positions.set(kid.id, { x: px, y: py, depth: depth + 1 });
      }
      queue.push(kid);
    });
  }

  return nodes.map((n) => {
    const p = positions.get(n.id) ?? { x: 0, y: 0 };
    return {
      ...n,
      x: Math.round(p.x - 100),
      y: Math.round(p.y - 40),
      width: 200,
      height: 80,
    };
  });
}
