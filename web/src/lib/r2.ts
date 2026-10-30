import { AwsClient } from "aws4fetch";

// Cloudflare R2 holds every photo. These keys are SERVER-ONLY (no NEXT_PUBLIC_),
// so they never reach a phone. Only short-lived upload links leave the server.

export function mediaBase(): string {
  return (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/$/, "");
}

// A link that lets the browser upload ONE photo to ONE exact place, valid for 10 minutes.
export async function presignPut(key: string, contentType: string): Promise<string> {
    // Accept "abc123", "https://abc123" or "https://abc123.r2.cloudflarestorage.com".
  const accountId = (process.env.R2_ACCOUNT_ID ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\.r2\.cloudflarestorage\.com.*$/, "")
    .replace(/\/.*$/, "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !mediaBase()) {
    throw new Error("R2 settings are missing from .env.local");
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`);
  url.searchParams.set("X-Amz-Expires", "600");

  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}
