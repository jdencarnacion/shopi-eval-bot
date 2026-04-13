import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/knowledge-base";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS });
}

const client = new OpenAI({
  baseURL: process.env.SHOPIFY_LLM_BASE_URL,
  defaultHeaders: {
    "X-Shopify-Session-Affinity-Header": "X-Claude-Code-Session-Id",
  },
});

export async function POST(req: Request) {
  const { transcript } = await req.json();

  if (!transcript?.trim()) {
    return Response.json({ error: "No transcript provided" }, { status: 400, headers: CORS });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "anthropic:claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Merchant just said: "${transcript}"` },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    return Response.json(result, { headers: CORS });
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number };
    console.error("Analyze error:", err.message, err.status);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
