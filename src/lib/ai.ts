import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatComplete(
  messages: AIMessage[],
  opts: { thinking?: boolean } = {}
): Promise<string> {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: opts.thinking ? "enabled" : "disabled" },
  });
  const content = completion.choices[0]?.message?.content ?? "";
  return content;
}

// Robust JSON extraction from LLM responses (handles ```json fences, prose, etc.)
export function extractJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // strip code fences
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }
  // try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // find first { ... last }
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      const slice = text.slice(first, last + 1);
      try {
        return JSON.parse(slice) as T;
      } catch {
        // try array
      }
    }
    // try array
    const af = text.indexOf("[");
    const al = text.lastIndexOf("]");
    if (af !== -1 && al !== -1 && al > af) {
      try {
        return JSON.parse(text.slice(af, al + 1)) as T;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}
