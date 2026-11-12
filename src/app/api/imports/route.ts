import { AccessError } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiWorkspace } from "@/lib/workspace";
import {
  parseFile,
  hash,
  defaultMapping,
  validateRows,
  type Mapping,
  type Locale,
} from "@/features/imports/parser";
import { requireEntitlement } from "@/features/billing/access";
export const runtime = "nodejs";
export const maxDuration = 30;
async function boundedBody(request: NextRequest) {
  const limit = 5 * 1024 * 1024 + 65536;
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new Error("Upload exceeds 5 MB limit");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty request");
  const deadline = Date.now() + 15000;
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      await reader.cancel();
      throw new Error("Upload timed out");
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void reader.cancel();
          reject(new Error("Upload timed out"));
        }, remaining);
      }),
    ]).finally(() => clearTimeout(timer));
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Upload exceeds 5 MB limit");
    }
    chunks.push(value);
  }
  return new Request("http://internal", {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") || "" },
    body: Buffer.concat(chunks),
  }).formData();
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(process.env.SITE_URL || request.url).origin)
    return NextResponse.json(
      { error: "Request origin is not allowed" },
      { status: 403 },
    );
  try {
    const { store, org } = await apiWorkspace();
    requireEntitlement("imports");
    const form = await boundedBody(request);
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Select a file");
    const buffer = Buffer.from(await file.arrayBuffer());
    const sheets = await parseFile(
      file.name,
      buffer,
      String(form.get("delimiter") || ""),
    );
    const sheetIndex = z.coerce
      .number()
      .int()
      .min(0)
      .max(sheets.length - 1)
      .parse(form.get("sheet") || 0);
    const sheet = sheets[sheetIndex];
    const mapping = form.get("mapping")
      ? (z
          .record(z.string(), z.number().int())
          .parse(JSON.parse(String(form.get("mapping")))) as Mapping)
      : defaultMapping(sheet.headers);
    const locale = z
      .enum(["strict", "eu", "us"])
      .parse(form.get("locale") || "strict") as Locale;
    let validation;
    try {
      validation = validateRows(sheet, mapping, locale, org.default_currency);
    } catch (error) {
      if (form.get("action") === "commit") throw error;
      return NextResponse.json(
        {
          sheets: sheets.map((s) => s.name),
          sheet: sheetIndex,
          headers: sheet.headers,
          mapping,
          preview: sheet.rows.slice(0, 20),
          mappingError:
            error instanceof Error ? error.message : "Check mapping",
          total: sheet.rows.length,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (form.get("action") === "commit") {
      if (!validation.valid)
        return NextResponse.json(
          { error: "Fix all row errors before committing", validation },
          { status: 422 },
        );
      const conflict = z
        .enum(["skip", "update", "create"])
        .parse(form.get("conflict") || "skip");
      const { job, result } = await store.commitImport(
        file.name.split(/[/\\]/).pop()!.slice(0, 200),
        hash(buffer),
        hash(JSON.stringify({ mapping, locale, sheetIndex, conflict })),
        validation.rows.map((r) => r.data),
        conflict,
      );
      return NextResponse.json(
        { job, result },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        sheets: sheets.map((s) => s.name),
        sheet: sheetIndex,
        headers: sheet.headers,
        mapping,
        preview: sheet.rows.slice(0, 20),
        total: sheet.rows.length,
        validation,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid mapping, worksheet or option"
            : error instanceof Error
              ? "code" in error
                ? "Import rolled back. Check permissions, fields and usage limits."
                : error.message
              : "Import unavailable",
      },
      {
        status: error instanceof AccessError ? error.status : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
