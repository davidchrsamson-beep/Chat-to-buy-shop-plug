// One place where Ndu talks to an AI model. Everything else calls `visionJSON`.
// Today it uses OpenAI; switching provider later means changing only this file.
//
// Settings (in .env.local, server-only):
//   OPENAI_API_KEY  your key from platform.openai.com
//   OPENAI_MODEL    a model that can read images (default below; change any time)

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5-mini";

export class AiError extends Error {
  constructor(public reason: "not_configured" | "busy" | "failed") {
    super(reason);
  }
}

// Sends text + photos to the model and gets back JSON that must match `schema`.
export async function visionJSON<T>({
  system,
  prompt,
  imageUrls,
  schemaName,
  schema,
}: {
  system: string;
  prompt: string;
  imageUrls: string[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiError("not_configured");

  // Each photo is labelled "Photo 0", "Photo 1"… so the model can refer to them.
  const photos = imageUrls.flatMap((url, i) => [
    { type: "text", text: `Photo ${i}` },
    { type: "image_url", image_url: { url, detail: "low" } }, // "low" keeps cost small
  ]);

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: [{ type: "text", text: prompt }, ...photos] },
    ],
    response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
  };
  // "Thinking" models are much faster with light thinking; enough for naming and grouping products.
  if (/^(gpt-5|o\d)/.test(model)) body.reasoning_effort = "low";

  const started = Date.now();
  console.log(`AI: sending ${imageUrls.length} photos to ${model}…`);

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (e) {
    console.error("AI request could not be sent:", e instanceof Error ? e.message : e);
    throw new AiError("failed");
  }
  console.log(`AI: answered in ${Math.round((Date.now() - started) / 1000)}s (status ${res.status})`);

  if (!res.ok) {
    // Logs the provider's reason (never the key) so problems are easy to diagnose.
    console.error("AI request failed:", res.status, (await res.text()).slice(0, 400));
    throw new AiError(res.status === 429 ? "busy" : "failed");
  }

  try {
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    return JSON.parse(String(content)) as T;
  } catch {
    console.error("AI reply was not valid JSON");
    throw new AiError("failed");
  }
}
