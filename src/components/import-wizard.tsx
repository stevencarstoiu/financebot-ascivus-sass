"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  fields,
  type Mapping,
  type Validated,
} from "@/features/imports/parser-types";
import { safeCsv } from "@/lib/validation";
type Preview = {
  sheets: string[];
  sheet: number;
  headers: string[];
  mapping: Mapping;
  preview: string[][];
  mappingError?: string;
  validation?: Validated;
  total: number;
};
const subscribeReady = () => () => {};
export function ImportWizard() {
  const hydrated = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [sheet, setSheet] = useState(0);
  const [locale, setLocale] = useState("strict");
  const [conflict, setConflict] = useState("skip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  async function upload(commit = false) {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("sheet", String(sheet));
      form.set("locale", locale);
      form.set("conflict", conflict);
      if (preview) form.set("mapping", JSON.stringify(mapping));
      form.set("action", commit ? "commit" : "preview");
      const response = await fetch("/api/imports", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");
      if (commit) setResult(data.result);
      else {
        setPreview(data);
        setMapping(data.mapping);
        setDirty(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import unavailable");
    } finally {
      setBusy(false);
    }
  }
  function downloadErrors() {
    if (!preview?.validation) return;
    const text = [
      "row,issues",
      ...preview.validation.rows
        .filter((r) => r.issues.length)
        .map((r) => `${r.row},${safeCsv(r.issues.join("; "))}`),
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    link.download = "import-errors.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <section className="panel">
      <h2>Bring your offers into focus</h2>
      <p className="muted">
        Upload → map columns → validate every row → commit. Preview creates no
        customers, contacts or offers.
      </p>
      <p className="subtle">
        CSV (UTF-8) or XLSX · up to 5 MB and 1,000 rows · 50 columns · 5 sheets.
        Hosting may impose a lower upload limit. Formula cells, macros, external
        links and encrypted workbooks are rejected.
      </p>
      <label>
        Offers spreadsheet
        <input
          type="file"
          disabled={!hydrated || busy}
          accept=".csv,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setPreview(null);
            setMapping({});
            setResult(null);
            setSheet(0);
          }}
        />
      </label>
      <label>
        Number format
        <select
          value={locale}
          onChange={(e) => {
            setLocale(e.target.value);
            setDirty(true);
          }}
        >
          <option value="strict">
            Strict decimal point (ambiguous separators rejected)
          </option>
          <option value="eu">EU: 1.234,56 (comma decimal)</option>
          <option value="us">
            US / XLSX numeric: 1,234.56 (point decimal)
          </option>
        </select>
      </label>
      <button disabled={!file || busy} onClick={() => upload()}>
        {busy
          ? "Processing…"
          : preview
            ? "Validate mapping again"
            : "Inspect file & preview"}
      </button>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {preview && (
        <>
          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--line)",
              margin: "28px 0",
            }}
          />
          <h2>Map your columns</h2>
          <label>
            Worksheet
            <select
              value={sheet}
              onChange={(e) => {
                setSheet(Number(e.target.value));
                setMapping({});
                setPreview(null);
                setDirty(true);
              }}
            >
              {preview.sheets.map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <p className="subtle">
            Required mappings: customer_name, offer_title, offer_value. Unmapped
            status defaults to draft; currency defaults to organization
            currency. Dates use YYYY-MM-DD. XLSX numeric cells use point
            decimals: choose US format.
          </p>
          <div className="mapping-grid">
            {fields.map((f) => (
              <label key={f}>
                {f.replaceAll("_", " ")}
                <select
                  value={mapping[f] === undefined ? "" : mapping[f]}
                  onChange={(e) => {
                    setMapping((m) => {
                      const next = { ...m };
                      if (e.target.value === "") delete next[f];
                      else next[f] = Number(e.target.value);
                      return next;
                    });
                    setDirty(true);
                  }}
                >
                  <option value="">Not mapped</option>
                  {preview.headers.map((h, i) => (
                    <option value={i} key={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {preview.mappingError && (
            <p className="notice error">{preview.mappingError}</p>
          )}
          <button
            disabled={busy}
            className="secondary"
            onClick={() => upload()}
          >
            Validate all rows
          </button>
          <h2 style={{ marginTop: 26 }}>
            Preview · first {Math.min(20, preview.total)} of {preview.total}{" "}
            rows
          </h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  {preview.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 2}</td>
                    {r.map((v, j) => (
                      <td key={j}>{v.slice(0, 150)}</td>
                    ))}
                    <td>
                      {preview.validation?.rows[i]?.issues.join("; ") ||
                        (preview.validation?.rows[i]?.duplicate
                          ? "Duplicate within file"
                          : "Valid")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.validation && (
            <>
              <p className="notice">
                {preview.validation.rows.filter((r) => !r.issues.length).length}{" "}
                valid ·{" "}
                {preview.validation.rows.filter((r) => r.issues.length).length}{" "}
                invalid · {preview.validation.duplicateCount} duplicates within
                this file. Existing database duplicates are resolved
                transactionally at commit.
              </p>
              {!preview.validation.valid && (
                <button className="secondary" onClick={downloadErrors}>
                  Download safe error report
                </button>
              )}
              <label>
                Duplicate resolution
                <select
                  value={conflict}
                  onChange={(e) => setConflict(e.target.value)}
                >
                  <option value="skip">Skip matches (safe default)</option>
                  <option value="update">
                    Update matched offer from this file
                  </option>
                  <option value="create">
                    Create distinct offers (existing external references are
                    skipped)
                  </option>
                </select>
              </label>
              <p className="subtle">
                Reference matches within your organization take precedence.
                Otherwise: exact customer name, title, value, currency and sent
                date. A repeated identical request returns its original result.
                Review “update” carefully: it applies the selected file values
                to matched offers.
              </p>
              <button
                disabled={
                  busy || dirty || !preview.validation.valid || !!result
                }
                onClick={() => upload(true)}
              >
                Confirm & commit {preview.total} rows
              </button>
              {dirty && (
                <p className="subtle">
                  Validate your changed mapping or format before committing.
                </p>
              )}
            </>
          )}
        </>
      )}
      {result && (
        <div className="notice" role="status">
          <h2>Import completed</h2>
          <p>
            {result.created} created · {result.updated} updated ·{" "}
            {result.skipped} skipped · {result.errors} errors
          </p>
          <Link href="/app/offers">View offers →</Link> ·{" "}
          <Link href="/app/imports">Refresh import history</Link>
        </div>
      )}
    </section>
  );
}
