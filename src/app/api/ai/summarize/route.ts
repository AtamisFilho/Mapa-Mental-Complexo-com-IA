import { NextRequest, NextResponse } from "next/server";
import { chatComplete } from "@/lib/ai";

// Summarize a subtree (list of nodes) into prose
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const topic: string = body.topic ?? "";
  const nodes: Array<{ title: string; kind?: string; content?: string | null }> =
    body.nodes ?? [];
  const thinking: boolean = !!body.thinking;

  if (!nodes.length) {
    return NextResponse.json({ error: "nodes required" }, { status: 400 });
  }

  const sys =
    "Você é um analista de conhecimento. Resume um conjunto de nós de um mapa mental " +
    "em um texto coerente, destacando pontos-chave, relações e lacunas. " +
    "Use Markdown. Seja conciso (3-6 parágrafos curtos).";

  const list = nodes
    .map((n, i) => `${i + 1}. [${n.kind ?? "concept"}] ${n.title}${n.content ? ` — ${n.content}` : ""}`)
    .join("\n");

  const user =
    `Tema: ${topic || "não especificado"}\n\nNós do ramo:\n${list}\n\n` +
    `Escreva um resumo estruturado em Markdown com: visão geral, pontos principais, ` +
    `relações e possíveis lacunas ou próximos passos.`;

  try {
    const summary = await chatComplete(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      { thinking }
    );
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI error" },
      { status: 500 }
    );
  }
}
