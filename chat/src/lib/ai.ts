// One place where errand talks to an AI model (same idea as the main site's lib/ai.ts).
// Switching provider later means changing only this file.
//
// Settings (in chat\.env.local, server-only, never NEXT_PUBLIC_):
//   OPENAI_API_KEY  your key from platform.openai.com
//   OPENAI_MODEL    a model that can read images (default below)

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5-mini";

export class AiError extends Error {
  constructor(public reason: "not_configured" | "busy" | "failed") {
    super(reason);
  }
}

export const aiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

// Sends text (and optionally one photo) and gets back JSON that must match `schema`.
export async function askJSON<T>({
  system,
  prompt,
  imageUrl,
  schemaName,
  schema,
  timeoutMs = 25_000,
}: {
  system: string;
  prompt: string;
  imageUrl?: string;
  schemaName: string;
  schema: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiError("not_configured");

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl, detail: "low" } });

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
  };
  // "Thinking" models answer much faster with minimal thinking, which is plenty for search.
  if (/^(gpt-5|o\d)/.test(model)) body.reasoning_effort = "minimal";

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    console.error("AI request could not be sent:", e instanceof Error ? e.message : e);
    throw new AiError("failed");
  }

  if (!res.ok) {
    // Logs the provider's reason (never the key) so problems are easy to diagnose.
    console.error("AI request failed:", res.status, (await res.text()).slice(0, 400));
    throw new AiError(res.status === 429 ? "busy" : "failed");
  }

  try {
    const data = await res.json();
    return JSON.parse(String(data?.choices?.[0]?.message?.content)) as T;
  } catch {
    console.error("AI reply was not valid JSON");
    throw new AiError("failed");
  }
}
