import { workbook } from "../helpers/workbook";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function emailLink(email: string) {
  let id = "";
  await expect
    .poll(
      async () => {
        const res = await fetch(
          process.env.LOCAL_MAIL_URL + "/api/v1/messages",
        );
        const data = await res.json();
        const m = data.messages?.find(
          (m: { ID: string; To: { Address: string }[] }) =>
            m.To?.some((t) => t.Address === email),
        );
        id = m?.ID || "";
        return id;
      },
      { timeout: 15000 },
    )
    .not.toBe("");
  const data = await (
    await fetch(process.env.LOCAL_MAIL_URL + "/api/v1/message/" + id)
  ).json();
  const text = data.HTML || data.Text || "";
  const link = text.match(
    /https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/,
  )?.[0];
  expect(link).toBeTruthy();
  return link!.replaceAll("&amp;", "&");
}
async function signup(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.locator("input[name=password]").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?message=/);
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20000 });
}
test("confirmed signup → organization → CRM → import → dashboard → audit → logout → recovery", async ({
  page,
}) => {
  const email = `browser-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "Aa1!";
  await signup(page, email, password);
  await page
    .getByRole("textbox", { name: "Organization name" })
    .fill("Synthetic browser company");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/customers/new");
  await page
    .getByRole("textbox", { name: "Customer name", exact: true })
    .fill("Synthetic browser customer");
  await page
    .getByRole("button", { name: "Create customer", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.goto("/app/contacts/new");
  await page
    .getByRole("combobox", { name: "Customer", exact: true })
    .selectOption({ label: "Synthetic browser customer" });
  await page
    .getByRole("textbox", { name: "Full name", exact: true })
    .fill("Synthetic Contact");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("contact@example.invalid");
  await page
    .getByRole("button", { name: "Create contact", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.goto("/app/offers/new");
  await page
    .getByRole("combobox", { name: "Customer", exact: true })
    .selectOption({ label: "Synthetic browser customer" });
  await page
    .getByRole("textbox", { name: "Offer title", exact: true })
    .fill("Synthetic browser offer");
  await page.locator("input[name=amount]").fill("1200.1234");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("sent");
  await page.locator("input[name=sent_at]").fill("2026-01-01");
  await page.getByRole("button", { name: "Create offer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  const offerUrl = page.url().split("?")[0];
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Synthetic manual note");
  await page
    .getByRole("button", { name: "Record activity", exact: true })
    .click();
  await expect(
    page.locator(".timeline li").filter({ hasText: "Synthetic manual note" }),
  ).toBeVisible();
  await page.goto("/app/imports");
  const csv =
    "customer_name,offer_title,offer_value,currency,offer_status,sent_at,external_reference\n" +
    Array.from(
      { length: 100 },
      (_, i) =>
        `CSV Synthetic ${i},CSV Offer ${i},1200.50,EUR,sent,2026-01-01,browser-${i}`,
    ).join("\n");
  await expect(page.locator("input[type=file]")).toBeEnabled();
  await page.locator("input[type=file]").setInputFiles({
    name: "synthetic100.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Inspect file & preview" }).click();
  await expect(
    page.getByText("100 valid · 0 invalid", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm & commit 100 rows" }).click();
  await expect(
    page.getByRole("heading", { name: "Import completed" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("100 created");
  await page.goto("/app/imports");
  await page.locator("input[type=file]").setInputFiles({
    name: "synthetic100.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: workbook(100),
  });
  await page
    .getByRole("combobox", { name: "Number format", exact: true })
    .selectOption("us");
  await page.getByRole("button", { name: "Inspect file & preview" }).click();
  await expect(
    page.getByText("100 valid · 0 invalid", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm & commit 100 rows" }).click();
  await expect(
    page.getByRole("heading", { name: "Import completed" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("100 created");
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
  await page.goto(offerUrl);
  await page.locator("input[name=title]").fill("Edited synthetic offer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edited synthetic offer" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "I confirm this change" }).check();
  await page
    .getByRole("button", { name: "Archive record", exact: true })
    .click();
  await expect(
    page.getByText("Archived · restore below", { exact: false }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "I confirm this change" }).check();
  await page
    .getByRole("button", { name: "Restore record", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Archive state updated");
  await page.goto("/app/settings");
  await expect(page.getByText("Payments not yet enabled.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/forgot-password");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send recovery link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("If the account exists");
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/reset-password/, { timeout: 20000 });
  await page.locator("input[name=password]").fill(password + "new");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/login\?message=Password/);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.locator("input[name=password]").fill(password + "new");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.screenshot({
    path: "test-results/connected-workspace.png",
    fullPage: true,
  });
});

test("guessed tenant IDs and unauthenticated direct Server Action replay are rejected", async ({
  page,
  request,
}) => {
  const email = `browser-guard-${randomUUID()}@example.invalid`;
  await signup(page, email, randomUUID() + "Aa1!");
  await page
    .getByRole("textbox", { name: "Organization name" })
    .fill("Synthetic guarded company");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/customers/new");
  await page
    .getByRole("textbox", { name: "Customer name", exact: true })
    .fill("Guarded customer");
  const pending = page.waitForRequest(
    (r) =>
      r.method() === "POST" &&
      new URL(r.url()).pathname === "/app/customers/new",
  );
  await page
    .getByRole("button", { name: "Create customer", exact: true })
    .click();
  const action = await pending;
  await expect(page.getByRole("status")).toContainText("Saved");
  const headers = await action.allHeaders();
  const safeHeaders = Object.fromEntries(
    ["content-type", "next-action", "next-router-state-tree", "accept"]
      .filter((k) => headers[k])
      .map((k) => [k, headers[k]]),
  );
  safeHeaders.origin = "http://127.0.0.1:3001";
  const response = await request.post("/app/customers/new", {
    headers: safeHeaders,
    data: action.postDataBuffer()!,
    maxRedirects: 0,
  });
  expect(
    response.headers()["x-action-redirect"] ||
      response.headers().location ||
      "",
  ).toContain("/login");
  const importResponse = await request.post("/api/imports", {
    headers: { origin: "http://127.0.0.1:3001" },
    multipart: { action: "commit" },
    maxRedirects: 0,
  });
  expect(importResponse.headers().location || "").toContain("/login");
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  expect(new URL(url).hostname).toBe("127.0.0.1");
  expect(new URL(url).port).toBe("55421");
  const admin = createClient(url, process.env.LOCAL_SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const bEmail = `guard-b-${randomUUID()}@example.invalid`,
    bPassword = randomUUID() + "Aa1!";
  const created = await admin.auth.admin.createUser({
    email: bEmail,
    password: bPassword,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const b = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (await b.auth.signInWithPassword({ email: bEmail, password: bPassword }))
      .error,
  ).toBeNull();
  const oid = randomUUID();
  expect(
    (
      await b.rpc("create_organization", {
        p_name: "Tenant B synthetic",
        p_currency: "EUR",
        p_request: oid,
      })
    ).error,
  ).toBeNull();
  const other = await b
    .from("customers")
    .insert({
      organization_id: oid,
      display_name: "B private synthetic customer",
    })
    .select("id")
    .single();
  expect(other.error).toBeNull();
  const guessed = await page.goto("/app/customers/" + other.data!.id);
  // Next streams a notFound boundary after the shell; streamed errors may retain HTTP 200.
  expect([200, 404]).toContain(guessed?.status());
  await expect(
    page.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("B private synthetic customer", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/app/customers");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Guarded customer", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/connected-mobile-customers.png",
    fullPage: true,
  });
});
