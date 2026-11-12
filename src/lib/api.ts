import "server-only";
import { AccessError } from "./db";
import { z } from "zod";
export async function jsonApi(work: () => Promise<unknown>) {
  try {
    return Response.json(await work(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const status =
      e instanceof AccessError ? e.status : e instanceof z.ZodError ? 400 : 500;
    return Response.json(
      {
        error:
          e instanceof AccessError
            ? e.message
            : status === 400
              ? "Check fields and identifiers"
              : "Request unavailable",
      },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
export function requireOrigin(request: Request) {
  const expected = process.env.SITE_URL;
  if (!expected || request.headers.get("origin") !== new URL(expected).origin)
    throw new AccessError(403, "Request origin is not allowed");
}

export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Empty request");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const deadline = Date.now() + 10000;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      await reader.cancel();
      throw new AccessError(408, "Request timed out");
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { done, value } = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void reader.cancel();
          reject(new AccessError(408, "Request timed out"));
        }, remaining);
      }),
    ]).finally(() => clearTimeout(timer));
    if (done) break;
    size += value.length;
    if (size > 20000) {
      await reader.cancel();
      throw new AccessError(413, "Request too large");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AccessError(400, "Invalid JSON");
  }
}
