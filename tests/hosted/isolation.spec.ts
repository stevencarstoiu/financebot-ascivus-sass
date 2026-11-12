import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function workspace(page: Page, suffix: "A" | "B") {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env["HOSTED_TEST_EMAIL_" + suffix]!);
  await page
    .locator("input[name=password]")
    .fill(process.env["HOSTED_TEST_PASSWORD_" + suffix]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(?:app|onboarding)/);
  await page.goto("/onboarding");
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Synthetic isolated hosted " + randomUUID());
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
}
test("hosted two verified identities: isolated new organizations, REST/browser denial and no anonymous access", async ({
  browser,
  request,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  try {
    const pa = await a.newPage(),
      pb = await b.newPage();
    await workspace(pa, "A");
    await workspace(pb, "B");
    const origin = process.env.HOSTED_PREVIEW_URL!;
    const body = {
      display_name: "Synthetic hosted test record",
      customer_type: "company",
      external_reference: randomUUID(),
      website: "",
      notes: "Synthetic isolated test only",
    };
    const created = await b.request.post(origin + "/api/crm/customers", {
      headers: { origin: new URL(origin).origin },
      data: body,
    });
    expect(created.status()).toBe(200);
    const id = (await created.json()).id;
    expect(
      (await a.request.get(origin + "/api/crm/customers/" + id)).status(),
    ).toBe(404);
    expect((await request.get(origin + "/api/crm/customers")).status()).toBe(
      401,
    );
    await pa.goto("/app/customers/" + id);
    await expect(
      pa.getByRole("heading", { name: "This page could not be found." }),
    ).toBeVisible();
    await expect(pa.getByText(body.display_name, { exact: true })).toHaveCount(
      0,
    );
    const row = await (
      await b.request.get(origin + "/api/crm/customers/" + id)
    ).json();
    expect(
      (
        await a.request.post(origin + "/api/crm/customers/" + id, {
          headers: { origin: new URL(origin).origin },
          data: { ...body, version: row.updated_at },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    console.log(
      "PASS: hosted-isolated test. Only newly created synthetic organizations/records were written; no destructive cleanup.",
    );
  } finally {
    await a.close();
    await b.close();
  }
});
