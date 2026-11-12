import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
const payload = z.object({
  cookie: z.string().min(1).max(4096),
  expires: z.number().int().positive(),
});
const aad = Buffer.from("ascivus-managed-auth-v1");
export function sealSession(cookie: string, secret: string, expires: number) {
  if (secret.length < 32)
    throw new Error("Cookie secret must have at least 32 characters");
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    createHash("sha256").update(secret).digest(),
    iv,
  );
  cipher.setAAD(aad);
  const data = Buffer.concat([
    cipher.update(JSON.stringify({ cookie, expires }), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function openSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  try {
    if (!value || value.length > 8192 || secret.length < 32) return null;
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) return null;
    const cipher = createDecipheriv(
      "aes-256-gcm",
      createHash("sha256").update(secret).digest(),
      bytes.subarray(0, 12),
    );
    cipher.setAAD(aad);
    cipher.setAuthTag(bytes.subarray(12, 28));
    const parsed = payload.parse(
      JSON.parse(
        Buffer.concat([
          cipher.update(bytes.subarray(28)),
          cipher.final(),
        ]).toString("utf8"),
      ),
    );
    if (
      parsed.expires <= now ||
      /[\r\n]/.test(parsed.cookie) ||
      !/^(?:__Secure-|__Host-)?(?:neon-auth|better-auth)\.session_token=/.test(
        parsed.cookie,
      )
    )
      return null;
    return parsed.cookie;
  } catch {
    return null;
  }
}
