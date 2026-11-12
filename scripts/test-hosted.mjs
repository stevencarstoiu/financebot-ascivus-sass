import { spawnSync } from "node:child_process";
// Never resets, migrates, drops schemas, deletes accounts, or creates infrastructure.
const required = [
  "HOSTED_PREVIEW_URL",
  "HOSTED_TEST_EMAIL_A",
  "HOSTED_TEST_PASSWORD_A",
  "HOSTED_TEST_EMAIL_B",
  "HOSTED_TEST_PASSWORD_B",
  "NEON_PROJECT_ID",
  "NEON_BRANCH_ID",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length || process.env.NEON_HOSTED_TEST_ISOLATED !== "yes") {
  console.error(
    "BLOCKED / NOT RUN: isolated hosted test prerequisites:",
    missing.join(", "),
    "and NEON_HOSTED_TEST_ISOLATED=yes",
  );
  process.exit(2);
}
if (
  !process.env.NEON_PROJECT_ID ||
  !process.env.NEON_BRANCH_ID ||
  process.env.NEON_APPROVED_TARGET !==
    `${process.env.NEON_PROJECT_ID}/${process.env.NEON_BRANCH_ID}`
)
  throw new Error("Refusing an unapproved hosted branch");
const url = new URL(process.env.HOSTED_PREVIEW_URL);
if (url.protocol !== "https:") throw new Error("Hosted Preview must use HTTPS");
const result = spawnSync(
  "npx",
  ["playwright", "test", "--config", "playwright.hosted.config.ts"],
  { env: process.env, stdio: "inherit" },
);
process.exit(result.error || result.signal ? 1 : (result.status ?? 1));
