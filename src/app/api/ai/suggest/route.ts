import { NextRequest, NextResponse } from "next/server";
import { chatComplete, extractJSON } from "@/lib/ai";

// Suggest connections between nodes that don't yet have an edge
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nodes: Array<{ id: string; title: string; kind?: string }> = body.nodes ?? [];
  const existingPairs: Array<[string, string]> = body.existingPairs ?? [];
  const thinking: boolean = !!body.thinking;

  if (nodes.length < 2) {
    return NextResponse.json({ error: "at least 2 nodes required" }, { status: 400 });
  }

  const existingSet = new Set(
    existingPairs.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`))
  );

  const sys =
    "Você é um analista de mapas mentais. Identifica conexões significativas entre nós " +
    "que ainda não estão ligados. Responda APENAS com JSON: " +
    '{"suggestions":[{"source":"nodeId","target":"nodeId","label":"motivo curto","kind":"related|causes|supports|contradicts|depends","rationale":"explicação de uma frase"}]}. ' +
    "Use os ids reais dos nós fornecidos. Não sugira conexões já existentes.";

  const user =
    `Nós disponíveis:\n${nodes
      .map((n) => `- ${n.id}: ${n.title} (${n.kind ?? "concept"})`)
      .join("\n")}\n\n` +
    `Conexões já existentes (não repetir):\n${[...existingSet]
      .map((p) => p.replace("|", " ↔ "))
      .join("\n") || "nenhuma"}\n\n` +
    `Sugira até 6 conexões novas e significativas. Priorize relações causais, de apoio ou dependência.`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      { thinking }
    );
    const parsed = extractJSON<{
      suggestions?: Array<{
        source: string;
        target: string;
        label?: string;
        kind?: string;
        rationale?: string;
      }>;
    }>(raw);
    const validIds = new Set(nodes.map((n) => n.id));
    const suggestions = (parsed?.suggestions ?? [])
      .filter(
        (s) =>
          validIds.has(s.source) &&
          validIds.has(s.target) &&
          s.source !== s.target
      )
      .filter((s) => {
        const key = s.source < s.target ? `${s.source}|${s.target}` : `${s.target}|${s.source}`;
        return !existingSet.has(key);
      })
      .map((s) => ({
        source: s.source,
        target: s.target,
        label: s.label ? String(s.label).slice(0, 60) : null,
        kind: ["related", "causes", "supports", "contradicts", "depends"].includes(s.kind ?? "")
          ? s.kind!
          : "related",
        rationale: s.rationale ? String(s.rationale).slice(0, 200) : null,
      }));
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI error" },
      { status: 500 }
    );
  }
}
