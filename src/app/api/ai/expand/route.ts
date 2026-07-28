import { NextRequest, NextResponse } from "next/server";
import { chatComplete, extractJSON } from "@/lib/ai";

// Expand a single node into child concepts
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const topic: string = body.topic ?? "";
  const context: string = body.context ?? "";
  const count: number = Math.min(8, Math.max(2, body.count ?? 5));
  const thinking: boolean = !!body.thinking;

  if (!topic) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const sys =
    "Você é um especialista em mapas mentais e organização do conhecimento. " +
    "Gera conceitos-filho relevantes, específicos e não redundantes. " +
    "Responda APENAS com JSON válido, sem texto adicional, no formato: " +
    '{"nodes":[{"title":"...","kind":"concept|question|action|idea|resource|goal","content":"descrição curta"}]}. ' +
    "kind deve ser um desses valores exatos. content é uma frase curta.";

  const user =
    `Tópico pai: "${topic}".\n` +
    (context ? `Contexto do mapa: ${context}\n` : "") +
    `Gere ${count} conceitos-filho diretos, cada um com título curto (2-5 palavras), ` +
    `tipo apropriado e uma descrição de uma frase. Varie os tipos quando fizer sentido.`;

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      { thinking }
    );
    const parsed = extractJSON<{ nodes?: Array<{ title: string; kind?: string; content?: string }> }>(raw);
    const nodes = (parsed?.nodes ?? [])
      .filter((n) => n.title && n.title.trim().length > 0)
      .map((n) => ({
        title: n.title.trim().slice(0, 120),
        kind: (n.kind && ["concept", "question", "action", "idea", "resource", "goal"].includes(n.kind)
          ? n.kind
          : "concept") as string,
        content: (n.content ?? "").trim().slice(0, 400) || null,
      }));
    return NextResponse.json({ nodes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI error" },
      { status: 500 }
    );
  }
}
