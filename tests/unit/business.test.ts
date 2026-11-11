import { describe, it, expect } from "vitest";
import {
  needsFollowup,
  statusDates,
  safeNext,
  safeCsv,
  offerSchema,
} from "@/lib/validation";
import { money } from "@/lib/crm";
import { demoOffers, demoMetrics, demoNow } from "@/features/demo/data";
import { preview } from "@/features/billing/plans";
describe("business rules", () => {
  it("uses UTC calendar days and excludes responses, archive and closed statuses", () => {
    const o = { status: "sent", sent_at: "2026-11-05T23:59:59Z" };
    const now = new Date("2026-11-12T00:00:00Z");
    expect(needsFollowup(o, 7, now)).toBe(true);
    expect(needsFollowup(o, 8, now)).toBe(false);
    for (const status of ["draft", "won", "lost", "replied"])
      expect(needsFollowup({ ...o, status }, 7, now)).toBe(false);
    expect(
      needsFollowup({ ...o, first_response_at: "2026-11-06" }, 7, now),
    ).toBe(false);
    expect(needsFollowup({ ...o, archived_at: "2026-11-06" }, 7, now)).toBe(
      false,
    );
  });
  it("handles corrected statuses and required dates", () => {
    expect(statusDates("draft", "2026-01-01")).toEqual({
      sent_at: null,
      first_response_at: null,
      closed_at: null,
    });
    expect(statusDates("won", "2026-01-01", "2026-01-02").closed_at).toBe(
      "2026-01-02",
    );
    expect(
      offerSchema.safeParse({
        customer_id: "11111111-1111-4111-8111-111111111111",
        primary_contact_id: "",
        title: "Offer",
        external_reference: "",
        amount: "100",
        currency: "EUR",
        status: "sent",
        sent_at: "",
        notes: "",
      }).success,
    ).toBe(false);
  });
  it("permits only fixed callback destinations", () => {
    for (const u of [
      "https://evil.invalid",
      "//evil.invalid",
      "/app/../../../",
      "\\evil.invalid",
    ])
      expect(safeNext(u)).toBe("/app");
    expect(safeNext("/reset-password")).toBe("/reset-password");
  });
  it("neutralizes CSV formulas including whitespace and quotes", () => {
    expect(safeCsv(' =HYPERLINK("x")')).toBe('"\' =HYPERLINK(""x"")"');
    expect(safeCsv("@SUM(A1)")).toBe('"\'@SUM(A1)"');
  });
  it("formats exact decimals without Number precision loss", () => {
    expect(money("9007199254740.1234", "EUR")).toBe(
      "EUR 9,007,199,254,740.1234",
    );
  });
  it("demo metrics preserve currencies and disclosed counts", () => {
    const m = demoMetrics(demoOffers);
    expect(m.total).toBe(9);
    expect(m.followup).toBe(3);
    expect(m.values).toEqual(
      expect.arrayContaining([
        { currency: "EUR", open: "25450.0000", won: "16800.0000" },
        { currency: "RON", open: "31500.0000", won: "12000.0000" },
      ]),
    );
    expect(demoNow.toISOString()).toContain("2026-11-12");
    expect(m.counts.won).toBe(2);
  });
  it("billing has no paid entitlement or AI activation", () => {
    expect(preview.importRows).toBe(1000);
    expect(preview.entitlements).toEqual([
      "crm",
      "imports",
      "advancedDashboard",
    ]);
  });
});
