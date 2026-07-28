import { NextRequest, NextResponse } from "next/server";
import { getZAI } from "@/lib/ai";

// Generate an illustrative image for a node
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt: string = (body.prompt ?? "").trim();
  const size: string = body.size ?? "1024x1024";

  const supported = [
    "1024x1024",
    "768x1344",
    "864x1152",
    "1344x768",
    "1152x864",
    "1440x720",
    "720x1440",
  ];
  if (!supported.includes(size)) {
    return NextResponse.json({ error: "unsupported size" }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  try {
    const zai = await getZAI();
    const response = await zai.images.generations.create({
      prompt,
      size: size as "1024x1024",
    });
    const base64 = response.data[0]?.base64;
    if (!base64) {
      return NextResponse.json({ error: "no image returned" }, { status: 500 });
    }
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ image: dataUrl });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "image generation error" },
      { status: 500 }
    );
  }
}
