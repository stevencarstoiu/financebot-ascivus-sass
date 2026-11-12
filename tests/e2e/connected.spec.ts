import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { workbook } from "../helpers/workbook";
const origin = process.env.SITE_URL || "http://127.0.0.1:3001";
async function otp(email: string, type: string) {
  if (process.env.HOSTED_NEON_TEST === "1") {
    const key =
      type === "email-verification"
        ? "HOSTED_VERIFICATION_OTP"
        : "HOSTED_RESET_OTP";
    const code = process.env[key];
    if (!code)
      throw new Error(
        "BLOCKED: hosted OTP must be supplied securely for the isolated test identity",
      );
    return code;
  }
  let code = "";
  await expect
    .poll(async () => {
      const r = await fetch(
        "http://127.0.0.1:3002/test-mail?" +
          new URLSearchParams({ email, type }),
        { headers: { "x-test-mail-key": process.env.LOCAL_AUTH_MAIL_KEY! } },
      );
      code = (await r.json()).otp || "";
      return code;
    })
    .not.toBe("");
  return code;
}
async function account(page: Page) {
  const email = "synthetic-" + randomUUID() + "@example.invalid";
  const password = randomUUID() + "Aa1!";
  await page.goto("/signup");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator("input[name=password]").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/verify-email/);
  await page
    .locator("input[name=otp]")
    .fill(await otp(email, "email-verification"));
  await page.getByRole("button", { name: "Verify email", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page
    .getByLabel("Organization name", { exact: true })
    .fill("Synthetic Neon organization");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  return { email, password };
}
async function post(context: BrowserContext, path: string, body: unknown) {
  return context.request.post(origin + path, {
    headers: { origin },
    data: body,
  });
}
test("real local Better Auth OTP + PostgreSQL: CRM, transactional CSV/XLSX, audit, recovery and revoked sessions", async ({
  page,
  context,
  browser,
}) => {
  const { email, password } = await account(page);
  await page.goto("/app/customers/new");
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Synthetic customer");
  await page
    .getByRole("button", { name: "Create customer", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  const customerId = new URL(page.url()).pathname.split("/").at(-1)!;
  const offer = {
    customer_id: customerId,
    primary_contact_id: "",
    title: "Manual exact offer",
    external_reference: "",
    amount: "1200.1234",
    currency: "EUR",
    status: "sent",
    sent_at: "2026-01-01",
    notes: "",
  };
  const created = await post(context, "/api/crm/offers", offer);
  expect(created.status()).toBe(200);
  const offerId = (await created.json()).id;
  await page.goto("/app/offers/" + offerId);
  await expect(page.locator("input[name=amount]")).toHaveValue("1200.1234");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Synthetic manual note");
  await page
    .getByRole("button", { name: "Record activity", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Manual activity logged");
  await expect(page.locator(".timeline")).toContainText(
    "Synthetic manual note",
  );
  for (const xlsx of [false, true]) {
    await page.goto("/app/imports");
    const input = page.locator("input[type=file]");
    await expect(input).toBeEnabled();
    const csv =
      "customer_name,offer_title,offer_value,currency,offer_status,sent_at,external_reference\n" +
      Array.from(
        { length: 100 },
        (_, i) =>
          `CSV Synthetic ${i},Offer ${i},1200.50,EUR,sent,2026-01-01,csv-${i}`,
      ).join("\n");
    await input.setInputFiles({
      name: xlsx ? "synthetic.xlsx" : "synthetic.csv",
      mimeType: xlsx
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv",
      buffer: xlsx ? workbook(100) : Buffer.from(csv),
    });
    if (xlsx)
      await page
        .getByRole("combobox", { name: "Number format", exact: true })
        .selectOption("us");
    await page.getByRole("button", { name: "Inspect file & preview" }).click();
    await expect(
      page.getByText("100 valid · 0 invalid", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirm & commit 100 rows" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Import completed" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("100 created");
  }
  await page.goto("/app");
  await expect(page.getByText("201", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Value by original currency" }),
  ).toBeVisible();
  await page.goto("/app/activity?tab=audit");
  await expect(
    page.getByText("Import · Updated", { exact: true }).first(),
  ).toBeVisible();
  // Save a second live session to prove reset revokes it at the provider, not just locally.
  const second = await browser.newContext();
  const p2 = await second.newPage();
  await p2.goto(origin + "/login");
  await p2.getByLabel("Email", { exact: true }).fill(email);
  await p2.locator("input[name=password]").fill(password);
  await p2.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(p2).toHaveURL(/\/app$/);
  await page.goto("/app/settings");
  await expect(page.getByText("Payments not yet enabled.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset code" }).click();
  await expect(page).toHaveURL(/reset-password/);
  await page
    .locator("input[name=otp]")
    .fill(await otp(email, "forget-password"));
  await page.locator("input[name=password]").fill(password + "new");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/login\?message=Password/);
  const revoked = await second.request.get(origin + "/api/crm/customers");
  expect(revoked.status()).toBe(401);
  await second.close();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator("input[name=password]").fill(password + "new");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
});
test("two real users/organizations: REST, browser, direct action and CSRF isolation", async ({
  browser,
  request,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  await account(pa);
  await account(pb);
  const customer = {
    display_name: "Synthetic private customer",
    customer_type: "company",
    external_reference: "",
    website: "",
    notes: "",
  };
  const made = await post(b, "/api/crm/customers", customer);
  expect(made.status()).toBe(200);
  const bid = (await made.json()).id;
  expect(
    (await a.request.get(origin + "/api/crm/customers/" + bid)).status(),
  ).toBe(404);
  const other = await b.request.get(origin + "/api/crm/customers/" + bid);
  const row = await other.json();
  expect(
    (
      await post(a, "/api/crm/customers/" + bid, {
        ...customer,
        version: row.updated_at,
      })
    ).status(),
  ).toBe(409);
  const forged = await post(a, "/api/crm/contacts", {
    customer_id: bid,
    full_name: "Forged",
    email: "",
    phone: "",
    position: "",
  });
  expect(forged.status()).toBeGreaterThanOrEqual(400);
  expect(
    (await a.request.get(origin + "/api/crm/organization_members")).status(),
  ).toBe(404);
  expect((await request.get(origin + "/api/crm/customers")).status()).toBe(401);
  expect(
    (
      await a.request.post(origin + "/api/crm/customers", {
        headers: { origin: "https://evil.invalid" },
        data: customer,
      })
    ).status(),
  ).toBe(403);
  await pa.goto("/app/customers/" + bid);
  await expect(
    pa.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();
  await expect(
    pa.getByText("Synthetic private customer", { exact: true }),
  ).toHaveCount(0);
  await pa.goto("/app/customers/new");
  await pa
    .getByLabel("Customer name", { exact: true })
    .fill("Action guard synthetic");
  const pending = pa.waitForRequest(
    (r) =>
      r.method() === "POST" &&
      new URL(r.url()).pathname === "/app/customers/new",
  );
  await pa
    .getByRole("button", { name: "Create customer", exact: true })
    .click();
  const captured = await pending;
  await expect(pa.getByRole("status")).toHaveText("Saved");
  const h = await captured.allHeaders();
  const safe = Object.fromEntries(
    ["content-type", "next-action", "next-router-state-tree", "accept"]
      .filter((k) => h[k])
      .map((k) => [k, h[k]]),
  );
  const replay = await request.post(origin + "/app/customers/new", {
    headers: { ...safe, origin },
    data: captured.postDataBuffer()!,
    maxRedirects: 0,
  });
  expect(
    replay.headers()["x-action-redirect"] || replay.headers().location || "",
  ).toContain("/login");
  await pa.setViewportSize({ width: 390, height: 844 });
  await pa.goto("/app/customers");
  expect(
    await pa.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await a.close();
  await b.close();
});
