import { execFileSync } from "node:child_process";
/** Synthetic test-only OOXML workbook. Python stdlib creates the ZIP; no formula evaluation. */
export function workbook(count: number) {
  const headers = [
    "customer_name",
    "offer_title",
    "offer_value",
    "currency",
    "offer_status",
    "sent_at",
    "external_reference",
  ];
  const escape = (s: string) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const grid = [
    headers,
    ...Array.from({ length: count }, (_, i) => [
      "XLSX Synthetic " + i,
      "XLSX Offer " + i,
      "1234.50",
      "EUR",
      "draft",
      "",
      "xlsx-" + i,
    ]),
  ];
  const xml = grid
    .map(
      (r, i) =>
        `<row r="${i + 1}">${r.map((v, j) => `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${escape(v)}</t></is></c>`).join("")}</row>`,
    )
    .join("");
  const entries = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Offers" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xml}</sheetData></worksheet>`,
  };
  return execFileSync(
    "python3",
    [
      "-c",
      'import sys,json,zipfile,io\nb=io.BytesIO()\nwith zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED) as z:\n for n,v in json.load(sys.stdin).items(): z.writestr(n,v)\nsys.stdout.buffer.write(b.getvalue())',
    ],
    { input: JSON.stringify(entries) },
  );
}
