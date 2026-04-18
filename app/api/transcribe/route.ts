// Receives audio blobs from the Chrome extension, transcribes via the
// Shopify AI proxy (Whisper) — reuses the same key as /api/analyze,
// no additional service or account needed.

import { CORS } from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { headers: CORS });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.SHOPIFY_LLM_BASE_URL ?? "https://proxy.shopify.ai/v1";

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY not set in .env.local" },
      { status: 500, headers: CORS }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400, headers: CORS });
  }

  const audio = formData.get("audio") as Blob | null;
  if (!audio) {
    return Response.json({ error: "No audio field in request" }, { status: 400, headers: CORS });
  }

  try {
    // Forward to Shopify AI proxy Whisper endpoint
    const outForm = new FormData();
    outForm.append("file", audio, "chunk.webm");
    outForm.append("model", "whisper-1");

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: outForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Whisper error:", res.status, errText);
      return Response.json(
        { error: "Transcription failed" },
        { status: 502, headers: CORS }
      );
    }

    const data = await res.json();
    // Whisper returns { text: "..." }
    const transcript = data.text?.trim() ?? "";

    return Response.json({ transcript }, { headers: CORS });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("Transcribe error:", err.message);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
