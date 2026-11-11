import { workbook } from "../helpers/workbook";
import { describe, it, expect } from "vitest";
import {
  parseFile,
  parseAmount,
  parseDate,
  defaultMapping,
  validateRows,
  guardWorkbook,
} from "@/features/imports/parser";
import { execFileSync } from "node:child_process";
const headers =
  "customer_name,offer_title,offer_value,currency,offer_status,sent_at,external_reference";
function xlsx(kind = "valid") {
  return execFileSync("python3", [
    "-c",
    String.raw`import io,zipfile,sys
b=io.BytesIO()
with zipfile.ZipFile(b,'w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
 z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
 z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Offers" sheetId="1" r:id="rId1"/></sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
 formula='<f>HYPERLINK("https://example.invalid")</f>' if sys.argv[1]=='formula' else ''
 row='999999999' if sys.argv[1]=='huge' else '2'
 z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>customer_name</t></is></c><c r="B1" t="inlineStr"><is><t>offer_title</t></is></c><c r="C1" t="inlineStr"><is><t>offer_value</t></is></c></row><row r="'+row+'"><c r="A'+row+'" t="inlineStr"><is><t>Fictional</t></is></c><c r="B'+row+'" t="inlineStr"><is><t>Offer</t></is></c><c r="C'+row+'">'+formula+'<v>1200.50</v></c></row></sheetData></worksheet>')
 if sys.argv[1]=='external': z.writestr('xl/externalLinks/externalLink1.xml','<link/>')
 if sys.argv[1]=='macro': z.writestr('xl/vbaProject.bin','bad')
 if sys.argv[1]=='bomb': z.writestr('xl/bomb.xml','A'*1000000)
sys.stdout.buffer.write(b.getvalue())`,
    kind,
  ]);
}
describe("bounded import", () => {
  it.each([100, 1000])("validates all %i CSV rows with BOM", async (count) => {
    const file = Buffer.from(
      "\uFEFF" +
        headers +
        "\n" +
        Array.from(
          { length: count },
          (_, i) =>
            `Synthetic ${i},Offer ${i},1234.56,EUR,sent,2026-01-01,ref-${i}`,
        ).join("\n"),
    );
    const [sheet] = await parseFile("offers.csv", file);
    const v = validateRows(
      sheet,
      defaultMapping(sheet.headers),
      "strict",
      "EUR",
    );
    expect(v.valid).toBe(true);
    expect(v.rows).toHaveLength(count);
  });
  it("supports semicolon / EU and tab files", async () => {
    const [s] = await parseFile(
      "eu.csv",
      Buffer.from(
        "customer_name;offer_title;offer_value\nFiction;Offer;1.234,56",
      ),
    );
    expect(
      validateRows(s, defaultMapping(s.headers), "eu", "RON").rows[0].data
        ?.offer_value,
    ).toBe("1234.56");
    const [tab] = await parseFile(
      "x.csv",
      Buffer.from("customer_name\toffer_title\toffer_value\nA\tB\t100"),
    );
    expect(tab.headers).toHaveLength(3);
  });
  it("rejects ambiguity, negative, exponent and wrong locale", () => {
    for (const n of ["1.234", "1,234", "-1", "1e3", "=SUM(A1)", "NaN"])
      expect(() => parseAmount(n, "strict")).toThrow();
    expect(parseAmount("1.234,56", "eu")).toBe("1234.56");
    expect(parseAmount("1,234.56", "us")).toBe("1234.56");
    expect(() => parseAmount("1,234.56", "eu")).toThrow();
    expect(() => parseDate("2026-02-30")).toThrow();
    expect(() => parseDate("12/11/2026")).toThrow();
  });
  it("handles quoted newlines without formula execution", async () => {
    const [s] = await parseFile(
      "x.csv",
      Buffer.from(
        'customer_name,offer_title,offer_value\n"=danger\nquoted",Offer,12',
      ),
    );
    expect(s.rows[0][0]).toBe("=danger\nquoted");
  });
  it("marks duplicates and invalid rows, rejects bad mapping", async () => {
    const [s] = await parseFile(
      "x.csv",
      Buffer.from(
        headers +
          "\nA,B,12,EUR,sent,2026-01-01,ref\nA,B,12,EUR,sent,2026-01-01,ref\nA,B,-1,EUR,sent,,bad",
      ),
    );
    const m = defaultMapping(s.headers);
    const v = validateRows(s, m, "strict", "EUR");
    expect(v.valid).toBe(false);
    expect(v.duplicateCount).toBe(1);
    expect(v.rows[2].issues.length).toBeGreaterThan(0);
    expect(() =>
      validateRows(s, { ...m, offer_value: 90 }, "strict", "EUR"),
    ).toThrow();
    expect(() => validateRows(s, {}, "strict", "EUR")).toThrow();
  });
  it.each([
    ["empty.csv", Buffer.alloc(0)],
    ["bad.csv", Buffer.from('a,b\n"broken')],
    ["zero.csv", Buffer.from("a,b\n")],
    ["bad.xls", Buffer.from("abcde")],
    ["bad.xlsx", Buffer.from("PK00000000")],
    ["big.csv", Buffer.alloc(5 * 1024 * 1024 + 1)],
    ["rows.csv", Buffer.from("a\n" + Array(1001).fill("b").join("\n"))],
  ])("rejects invalid file %s", async (name, b) => {
    await expect(parseFile(name, b)).rejects.toThrow();
  });
  it("reads a real XLSX file with literal values", async () => {
    const [s] = await parseFile("valid.xlsx", xlsx());
    const v = validateRows(s, defaultMapping(s.headers), "us", "EUR");
    expect(v.valid).toBe(true);
    expect(v.rows[0].data?.offer_value).toBe("1200.50");
  });
  it.each(["formula", "external", "macro", "huge", "bomb"])(
    "rejects unsafe XLSX %s",
    async (kind) => {
      await expect(guardWorkbook(xlsx(kind))).rejects.toThrow();
    },
  );
  it("rejects corrupt ZIP", async () => {
    await expect(guardWorkbook(Buffer.from("notzip"))).rejects.toThrow();
  });
});

it.each([100, 1000])("validates all %i XLSX rows", async (count) => {
  const [sheet] = await parseFile("synthetic.xlsx", workbook(count));
  const v = validateRows(sheet, defaultMapping(sheet.headers), "us", "EUR");
  expect(v.valid).toBe(true);
  expect(v.rows).toHaveLength(count);
});
