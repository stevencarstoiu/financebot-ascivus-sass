import fs from "node:fs";
import { spawnSync } from "node:child_process";
const status = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const url = status.API_URL;
if (
  !url ||
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  new URL(url).port !== "55421"
)
  throw new Error("Refusing non-local Supabase target");
const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3001",
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    status.PUBLISHABLE_KEY || status.ANON_KEY,
  LOCAL_SUPABASE_SECRET_KEY: status.SECRET_KEY || status.SERVICE_ROLE_KEY,
  LOCAL_MAIL_URL: "http://127.0.0.1:55424",
};
if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !env.LOCAL_SUPABASE_SECRET_KEY)
  throw new Error("Local test keys missing");
for (const [command, args] of [
  ["node", ["tests/integration/rest.mjs"]],
  ["npx", ["playwright", "test", "--config", "playwright.connected.config.ts"]],
]) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
