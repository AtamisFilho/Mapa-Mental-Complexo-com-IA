import { NextRequest, NextResponse } from "next/server";
import { chatComplete } from "@/lib/ai";

// Conversational assistant about the map
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const messages: Array<{ role: string; content: string }> = body.messages ?? [];
  const mapContext: string = body.mapContext ?? "";
  const thinking: boolean = !!body.thinking;

  if (!messages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const sys =
    "Você é um assistente especialista em mapas mentais e organização do conhecimento. " +
    "Ajuda o usuário a refletir, expandir, reorganizar e entender melhor seu mapa mental. " +
    "Responda em Markdown, de forma clara e objetiva. Quando relevante, sugira ações concretas " +
    "(adicionar nós, criar conexões, explorar um tópico).\n\n" +
    (mapContext ? `Contexto do mapa atual:\n${mapContext}` : "");

  try {
    const reply = await chatComplete(
      [
        { role: "system", content: sys },
        ...messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      { thinking }
    );
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI error" },
      { status: 500 }
    );
  }
}
