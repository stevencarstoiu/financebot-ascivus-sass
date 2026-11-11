import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { fromBuffer, type Entry } from "yauzl";
import readXlsxFile from "read-excel-file/node";
import { z } from "zod";
import { amount, currency, statuses } from "@/lib/validation";
export const fields = [
  "customer_name",
  "contact_name",
  "contact_email",
  "offer_title",
  "offer_value",
  "currency",
  "offer_status",
  "sent_at",
  "external_reference",
  "notes",
] as const;
export type Field = (typeof fields)[number];
export type Mapping = Partial<Record<Field, number>>;
export type Locale = "strict" | "eu" | "us";
export type Sheet = { name: string; headers: string[]; rows: string[][] };
export const hash = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
const fail = (s: string): never => {
  throw new Error(s);
};
export function parseAmount(raw: string, locale: Locale) {
  const value = raw.trim();
  let normalized = value;
  if (locale === "strict") {
    if (/[.,]\d{3}$/.test(value))
      fail("Ambiguous number: select EU or US number format");
    if (!/^\d+(\.\d{1,4})?$/.test(value))
      fail("Invalid decimal; choose number format");
  } else if (locale === "eu") {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,4})?$/.test(value))
      fail("Invalid EU number");
    normalized = value.replaceAll(".", "").replace(",", ".");
  } else {
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(value))
      fail("Invalid US number");
    normalized = value.replaceAll(",", "");
  }
  return amount.parse(normalized.replace(/^0+(?=\d)/, ""));
}
export function parseDate(raw: string) {
  if (!raw) return "";
  const text = raw.trim();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
    !Number.isFinite(Date.parse(text)) ||
    new Date(text).toISOString().slice(0, 10) !== text
  )
    fail("Date must be valid YYYY-MM-DD");
  return text;
}
/** Validate every expanded byte before handing the workbook to an XML parser. */
export async function guardWorkbook(buffer: Buffer) {
  return new Promise<void>((resolve, reject) => {
    fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error || !zip)
          return reject(new Error("Corrupt or encrypted XLSX archive"));
        let total = 0;
        let entries = 0;
        let cells = 0;
        let hasWorkbook = false;
        let done = false;
        const timer = setTimeout(
          () => stop(new Error("Workbook inspection timed out")),
          8000,
        );
        const stop = (err?: Error) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          zip.close();
          if (err) reject(err);
          else resolve();
        };
        zip.on("error", () => stop(new Error("Invalid workbook archive")));
        zip.on("end", () =>
          hasWorkbook ? stop() : stop(new Error("Missing XLSX workbook")),
        );
        zip.on("entry", (entry: Entry) => {
          if (++entries > 2000)
            return stop(new Error("Too many workbook entries"));
          total += entry.uncompressedSize;
          if (
            total > 20 * 1024 * 1024 ||
            entry.uncompressedSize > 8 * 1024 * 1024 ||
            entry.uncompressedSize / Math.max(1, entry.compressedSize) > 150
          )
            return stop(new Error("Expanded workbook exceeds safe limits"));
          if (entry.generalPurposeBitFlag & 1)
            return stop(new Error("Encrypted workbooks are not supported"));
          if (
            /(?:vbaProject|externalLinks|embeddings|activeX)/i.test(
              entry.fileName,
            ) ||
            entry.fileName.includes("..")
          )
            return stop(
              new Error(
                "Macros, external links or embedded objects are not supported",
              ),
            );
          if (entry.fileName === "xl/workbook.xml") hasWorkbook = true;
          if (!/\.(xml|rels)$/i.test(entry.fileName)) {
            zip.readEntry();
            return;
          }
          zip.openReadStream(entry, (err, stream) => {
            if (err || !stream) return stop(new Error("Cannot read workbook"));
            const chunks: Buffer[] = [];
            let size = 0;
            stream.on("data", (b: Buffer) => {
              size += b.length;
              if (size > 8 * 1024 * 1024) {
                stream.destroy();
                stop(new Error("Workbook entry too large"));
              } else chunks.push(b);
            });
            stream.on("error", () => stop(new Error("Corrupt workbook entry")));
            stream.on("end", () => {
              if (done) return;
              const text = Buffer.concat(chunks).toString("utf8");
              if (
                /<!DOCTYPE|<!ENTITY|<(?:[\w.-]+:)?f(?:[\s/>])/i.test(text) ||
                /TargetMode\s*=\s*['"]External/i.test(text)
              )
                return stop(
                  new Error(
                    "Formula cells, external links and XML entities are not supported",
                  ),
                );
              if (
                entry.fileName === "xl/workbook.xml" &&
                (text.match(/<(?:\w+:)?sheet\s/g) || []).length > 5
              )
                return stop(new Error("Use at most five worksheets"));
              if (/macroEnabled/i.test(text))
                return stop(new Error("Macro-enabled files are not supported"));
              if (/xl\/worksheets\//.test(entry.fileName)) {
                for (const match of text.matchAll(
                  /<(?:[\w.-]+:)?row\b[^>]*\br=["'](\d+)["']/gi,
                )) {
                  if (Number(match[1]) < 1 || Number(match[1]) > 1001)
                    return stop(new Error("Worksheet row exceeds bounds"));
                }
                for (const match of text.matchAll(
                  /\b(?:r|ref)=["']([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?["']/g,
                )) {
                  const col = (s: string) =>
                    [...s].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
                  if (
                    Number(match[2]) > 1001 ||
                    Number(match[4] || 0) > 1001 ||
                    col(match[1]) > 50 ||
                    col(match[3] || "A") > 50
                  )
                    return stop(
                      new Error("Worksheet exceeds 1,000 rows or 50 columns"),
                    );
                }
                cells += (text.match(/<(?:\w+:)?c\s/g) || []).length;
                if (cells > 50050)
                  return stop(new Error("Too many workbook cells"));
              }
              zip.readEntry();
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}
function toSheet(name: string, grid: string[][]): Sheet {
  if (grid.length < 2 || grid.length > 1001) fail("Use 1–1,000 data rows");
  const headers = grid[0].map((v) => v.trim());
  if (
    !headers.length ||
    headers.length > 50 ||
    headers.some((h) => !h || h.length > 200) ||
    new Set(headers).size !== headers.length
  )
    fail("Use unique non-empty headers, at most 50 columns");
  if (grid.some((r) => r.length > 50 || r.some((c) => c.length > 4000)))
    fail("Cells must be at most 4,000 characters");
  return { name, headers, rows: grid.slice(1) };
}
export async function parseFile(
  fileName: string,
  buffer: Buffer,
  delimiter?: string,
): Promise<Sheet[]> {
  if (!buffer.length || buffer.length > 5 * 1024 * 1024)
    fail("Upload a non-empty file of at most 5 MB");
  if (/\.csv$/i.test(fileName)) {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      fail("CSV must use UTF-8 encoding");
    }
    const first = text!.replace(/^\uFEFF/, "").split(/\r?\n/)[0];
    const separator =
      delimiter && [",", ";", "\t"].includes(delimiter)
        ? delimiter
        : [",", ";", "\t"].sort(
            (a, b) => first.split(b).length - first.split(a).length,
          )[0];
    let grid: string[][];
    try {
      grid = parse(text!, {
        bom: true,
        delimiter: separator,
        skip_empty_lines: true,
        max_record_size: 16000,
        relax_column_count: false,
      });
    } catch {
      fail("Malformed CSV: check delimiter, quotes and consistent columns");
    }
    return [toSheet("CSV", grid!)];
  }
  if (
    !/\.xlsx$/i.test(fileName) ||
    buffer.length < 4 ||
    buffer.readUInt32LE(0) !== 0x04034b50
  )
    fail("Only valid .csv and .xlsx files are supported");
  await guardWorkbook(buffer);
  let sheets;
  try {
    sheets = await readXlsxFile(buffer, { parseNumber: (s) => s });
  } catch {
    fail("Workbook cannot be read. Use an unencrypted .xlsx file");
  }
  if (!sheets!.length || sheets!.length > 5) fail("Use 1–5 worksheets");
  return sheets!.map((s) =>
    toSheet(
      s.sheet,
      s.data.map((row) =>
        row.map((v) =>
          v == null
            ? ""
            : v instanceof Date
              ? v.toISOString().slice(0, 10)
              : String(v),
        ),
      ),
    ),
  );
}
export const normalizedRow = z
  .object({
    customer_name: z.string().trim().min(1).max(200),
    contact_name: z.string().trim().max(200),
    contact_email: z.union([z.literal(""), z.email()]),
    offer_title: z.string().trim().min(1).max(240),
    offer_value: amount,
    currency,
    offer_status: z.enum(statuses),
    sent_at: z.string(),
    external_reference: z.string().max(120),
    notes: z.string().max(4000),
  })
  .superRefine((v, ctx) => {
    if (v.offer_status !== "draft" && !v.sent_at)
      ctx.addIssue({
        code: "custom",
        path: ["sent_at"],
        message: "Sent date is required for non-draft offers",
      });
    if (v.contact_email && !v.contact_name)
      ctx.addIssue({
        code: "custom",
        path: ["contact_name"],
        message: "Contact name required when email is provided",
      });
  });
export type ImportRow = z.infer<typeof normalizedRow>;
export type Validated = {
  rows: {
    row: number;
    data: ImportRow | null;
    issues: string[];
    duplicate: boolean;
  }[];
  valid: boolean;
  duplicateCount: number;
};
export function defaultMapping(headers: string[]): Mapping {
  const m: Mapping = {};
  for (const f of fields) {
    const i = headers.findIndex(
      (h) => h.trim().toLowerCase().replaceAll(" ", "_") === f,
    );
    if (i >= 0) m[f] = i;
  }
  return m;
}
export function validateRows(
  sheet: Sheet,
  mapping: Mapping,
  locale: Locale,
  defaultCurrency: string,
): Validated {
  for (const required of [
    "customer_name",
    "offer_title",
    "offer_value",
  ] as const)
    if (mapping[required] === undefined)
      fail("Map customer_name, offer_title and offer_value");
  for (const [key, index] of Object.entries(mapping))
    if (
      !fields.includes(key as Field) ||
      !Number.isInteger(index) ||
      index! < 0 ||
      index! >= sheet.headers.length
    )
      fail("Invalid column mapping");
  const used = Object.values(mapping);
  if (new Set(used).size !== used.length)
    fail("Map each source column to only one destination");
  const seen = new Set<string>();
  const rows = sheet.rows.map((raw, i) => {
    try {
      const get = (field: Field) =>
        mapping[field] === undefined ? "" : (raw[mapping[field]!] || "").trim();
      const status = get("offer_status") || "draft";
      const data = normalizedRow.parse({
        customer_name: get("customer_name"),
        contact_name: get("contact_name"),
        contact_email: get("contact_email").toLowerCase(),
        offer_title: get("offer_title"),
        offer_value: parseAmount(get("offer_value"), locale),
        currency: get("currency") || defaultCurrency,
        offer_status: status,
        sent_at: status === "draft" ? "" : parseDate(get("sent_at")),
        external_reference: get("external_reference"),
        notes: get("notes"),
      });
      const key = data.external_reference
        ? "ref:" + data.external_reference
        : JSON.stringify([
            data.customer_name.toLowerCase(),
            data.offer_title,
            data.offer_value,
            data.currency,
            data.sent_at,
          ]);
      const duplicate = seen.has(key);
      seen.add(key);
      return { row: i + 2, data, issues: [], duplicate };
    } catch (error) {
      const issues =
        error instanceof z.ZodError
          ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
          : [error instanceof Error ? error.message : "Invalid row"];
      return { row: i + 2, data: null, issues, duplicate: false };
    }
  });
  return {
    rows,
    valid: rows.every((r) => !r.issues.length),
    duplicateCount: rows.filter((r) => r.duplicate).length,
  };
}
