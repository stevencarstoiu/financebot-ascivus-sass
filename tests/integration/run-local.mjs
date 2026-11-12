import { spawnSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
const name = "ascivus-neon-test-" + process.pid;
const adminPassword = randomUUID();
const runtimePassword = randomUUID();
const dockerEnv = { ...process.env, POSTGRES_PASSWORD: adminPassword };
for (const k of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete dockerEnv[k];
function docker(args, input) {
  const r = spawnSync(
    "docker",
    ["--host=unix:///var/run/docker.sock", ...args],
    { env: dockerEnv, input, encoding: "utf8" },
  );
  if (r.status !== 0)
    throw new Error("Disposable Docker operation failed: " + r.stderr);
  return r.stdout.trim();
}
let authServer;
try {
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "-e",
    "POSTGRES_PASSWORD",
    "-p",
    "127.0.0.1::5432",
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const r = spawnSync(
      "docker",
      [
        "--host=unix:///var/run/docker.sock",
        "exec",
        name,
        "pg_isready",
        "-U",
        "postgres",
      ],
      { env: dockerEnv, stdio: "ignore" },
    );
    if (r.status === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("Database not ready");
  const migrationPort = docker(["port", name, "5432/tcp"]).split(":").at(-1);
  const migrationAdminUrl = `postgresql://postgres:${adminPassword}@127.0.0.1:${migrationPort}/postgres`;
  for (let pass = 0; pass < 2; pass++) {
    const migrated = spawnSync("node", ["scripts/migrate.mjs"], {
      env: { ...process.env, DATABASE_MIGRATION_URL: migrationAdminUrl },
      encoding: "utf8",
    });
    if (migrated.status !== 0)
      throw new Error(
        "Additive migration/repeatability failed: " + migrated.stderr,
      );
  }
  console.log(
    "PASS: additive migration runner and checksummed repeat are safe on a fresh disposable database.",
  );
  docker(
    ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
    "create role ascivus_anonymous nologin;",
  );
  const sql = spawnSync(
    "docker",
    [
      "--host=unix:///var/run/docker.sock",
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      env: dockerEnv,
      input: fs.readFileSync("tests/integration/isolation.sql"),
      encoding: "utf8",
    },
  );
  if (sql.status !== 0) {
    console.error(sql.stdout.slice(-3000));
    console.error(sql.stderr);
    process.exitCode = 1;
  } else
    console.log(
      "PASS: PostgreSQL migration/RLS/role/audit/import regressions (" +
        (sql.stderr.match(/NOTICE:  PASS/g) || []).length +
        " checks).",
    );
  if (sql.status === 0 && process.argv.includes("--connected")) {
    const port = docker(["port", name, "5432/tcp"]).split(":").at(-1);
    const adminUrl = `postgresql://postgres:${adminPassword}@127.0.0.1:${port}/postgres`;
    const configured = spawnSync(
      "node",
      ["scripts/configure-runtime-role.mjs"],
      {
        env: {
          ...process.env,
          NEON_ALLOW_ROLE_SETUP: "yes",
          DATABASE_MIGRATION_URL: adminUrl,
          DATABASE_URL: `postgresql://ascivus_runtime:${runtimePassword}@127.0.0.1:${port}/postgres`,
        },
        encoding: "utf8",
      },
    );
    if (configured.status !== 0)
      throw new Error(
        "Dedicated runtime role setup failed: " + configured.stderr,
      );
    const env = {
      ...process.env,
      DATABASE_URL: `postgresql://ascivus_runtime:${runtimePassword}@127.0.0.1:${port}/postgres`,
      LOCAL_AUTH_DATABASE_URL: adminUrl,
      NEON_AUTH_BASE_URL: "http://127.0.0.1:3002/api/auth",
      NEON_AUTH_COOKIE_SECRET: randomUUID() + randomUUID(),
      SITE_URL: "http://127.0.0.1:3001",
      LOCAL_AUTH_MAIL_KEY: randomUUID(),
    };
    authServer = spawn("node", ["tests/integration/local-auth.mjs"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    authServer.stdout.on("data", (b) => process.stdout.write(b));
    authServer.stderr.on("data", () => {});
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 20000;
      const timer = setInterval(async () => {
        try {
          const r = await fetch("http://127.0.0.1:3002/health");
          if (r.ok) {
            clearInterval(timer);
            resolve();
          }
        } catch {}
        if (Date.now() > deadline) {
          clearInterval(timer);
          reject(new Error("Local Better Auth server failed"));
        }
      }, 250);
    });
    const result = spawnSync(
      "npx",
      ["playwright", "test", "--config", "playwright.connected.config.ts"],
      { env, stdio: "inherit" },
    );
    if (result.status !== 0) process.exitCode = result.status || 1;
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  authServer?.kill();
  try {
    docker(["rm", "-f", name]);
  } catch {}
}
