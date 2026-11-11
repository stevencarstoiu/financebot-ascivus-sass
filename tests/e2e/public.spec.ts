import { test, expect } from "@playwright/test";
test("public landing, honest authentication state and route guard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good offers",
  );
  await page
    .getByRole("link", { name: "Explore the demo", exact: true })
    .click();
  await expect(
    page.getByText("DEMO — fictional data · Read-only", { exact: false }),
  ).toBeVisible();
  await page.goto("/app/offers");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("alert").filter({ hasText: "Authentication unavailable" }),
  ).toContainText("Authentication unavailable");
  await page.goto("/auth/callback?code=invalid&next=https://evil.invalid");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("status")).toContainText("invalid or expired");
});
test("demo metrics, persistent advanced mode and currency filter", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Your pipeline, in focus." }),
  ).toBeVisible();
  await expect(page.getByText("EUR 12,500.00")).toBeVisible();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Advanced analytics" }),
  ).toBeVisible();
  await expect(page.getByText("67%", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("RON");
  await page.getByRole("button", { name: "Apply demo filters" }).click();
  await expect(page).toHaveURL(/currency=RON/);
  await expect(
    page.getByRole("button", { name: "Advanced", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("RON 24,000.00")).toBeVisible();
  await expect(page.getByText("EUR 12,500.00")).toHaveCount(0);
  expect(requests.some((r) => /supabase|stripe|mistral/.test(r))).toBe(false);
  await page.screenshot({
    path: `test-results/demo-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("demo offer filters, details and keyboard navigation", async ({
  page,
}) => {
  await page.goto("/demo/offers");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("won");
  await page.getByRole("button", { name: "Filter offers" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .getByRole("link", { name: "Annual support agreement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Annual support agreement" }),
  ).toBeVisible();
  await expect(
    page.getByText("This record is fictional.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
