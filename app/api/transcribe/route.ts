// Receives audio blobs from the Chrome extension, proxies to Deepgram,
// returns the transcript text. Runs server-side so the API key is never
// exposed to the extension code.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS });
}

export async function POST(req: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "DEEPGRAM_API_KEY not set in .env.local" },
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
    const arrayBuffer = await audio.arrayBuffer();

    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/webm;codecs=opus",
        },
        body: arrayBuffer,
      }
    );

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error("Deepgram error:", dgRes.status, errText);
      return Response.json(
        { error: "Deepgram transcription failed" },
        { status: 502, headers: CORS }
      );
    }

    const data = await dgRes.json();
    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    const confidence =
      data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0;

    return Response.json({ transcript, confidence }, { headers: CORS });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("Transcribe error:", err.message);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
