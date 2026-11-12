import pg from "pg";
import fs from "node:fs";
import { createHash } from "node:crypto";
const url = process.env.DATABASE_MIGRATION_URL;
if (!url)
  throw new Error(
    "BLOCKED: DATABASE_MIGRATION_URL is required in secure environment settings",
  );
const u = new URL(url);
const local = ["localhost", "127.0.0.1"].includes(u.hostname);
if (!local) {
  if (u.searchParams.get("sslmode") !== "verify-full")
    throw new Error("Verified TLS is required");
  if (
    !process.env.NEON_PROJECT_ID ||
    !process.env.NEON_BRANCH_ID ||
    process.env.NEON_APPROVED_TARGET !==
      `${process.env.NEON_PROJECT_ID}/${process.env.NEON_BRANCH_ID}` ||
    process.env.NEON_ALLOW_ADDITIVE_MIGRATION !== "yes"
  )
    throw new Error(
      "BLOCKED: explicitly verify and bind the designated Neon project/branch before additive migration",
    );
}
const c = new pg.Client({
  connectionString: url,
  connectionTimeoutMillis: 10000,
});
try {
  await c.connect();
  await c.query(
    "select pg_advisory_lock(hashtext('ascivus-sales-migrations-v1'))",
  );
  const files = fs
    .readdirSync("db/migrations")
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort();
  let exists = (
    await c.query(
      "select to_regclass('sales_private.schema_migrations') is not null present",
    )
  ).rows[0].present;
  if (
    !exists &&
    (
      await c.query(
        "select exists(select 1 from pg_namespace where nspname in ('sales','sales_private')) present",
      )
    ).rows[0].present
  )
    throw new Error(
      "Existing Sales schemas have no migration ledger; inspect manually. Nothing was changed.",
    );
  for (const f of files) {
    const body = fs.readFileSync("db/migrations/" + f, "utf8");
    const checksum = createHash("sha256").update(body).digest("hex");
    if (exists) {
      const applied = (
        await c.query(
          "select checksum from sales_private.schema_migrations where version=$1",
          [f],
        )
      ).rows[0];
      if (applied) {
        if (applied.checksum !== checksum)
          throw new Error("Applied migration checksum differs: " + f);
        continue;
      }
    }
    await c.query("begin");
    await c.query("set local lock_timeout='5s'");
    await c.query("set local statement_timeout='60s'");
    await c.query(body.replace(/^begin;\s*/i, "").replace(/commit;\s*$/i, ""));
    if (!exists) {
      await c.query(
        "create table sales_private.schema_migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now())",
      );
      await c.query(
        "revoke all on sales_private.schema_migrations from public,ascivus_app",
      );
      exists = true;
    }
    await c.query(
      "insert into sales_private.schema_migrations(version,checksum) values($1,$2)",
      [f, checksum],
    );
    await c.query("commit");
    console.log("Applied additive Sales migration:", f);
  }
  console.log(
    "PASS: migration ledger verified; no Auth tables or existing application tables changed.",
  );
} catch (e) {
  try {
    await c.query("rollback");
  } catch {}
  console.error("Migration blocked or failed:", e.code || e.name);
  process.exitCode = 1;
} finally {
  await c.end();
}
