import pg from "pg";
// Run manually using separate administrator credentials, after positive target identification.
if (
  process.env.NEON_ALLOW_ROLE_SETUP !== "yes" ||
  !process.env.DATABASE_MIGRATION_URL ||
  !process.env.DATABASE_URL
)
  throw new Error(
    "BLOCKED: explicit target role setup and both secure connection bindings are required",
  );
const admin = new URL(process.env.DATABASE_MIGRATION_URL),
  runtime = new URL(process.env.DATABASE_URL);
if (
  admin.hostname.replace("-pooler", "") !==
    runtime.hostname.replace("-pooler", "") ||
  admin.pathname !== runtime.pathname
)
  throw new Error("Runtime/admin database targets do not match");
if (
  decodeURIComponent(runtime.username) !== "ascivus_runtime" ||
  !runtime.password
)
  throw new Error(
    "Choose the dedicated ascivus_runtime role with a secure password in DATABASE_URL",
  );
if (
  !["localhost", "127.0.0.1"].includes(admin.hostname) &&
  (!process.env.NEON_PROJECT_ID ||
    !process.env.NEON_BRANCH_ID ||
    process.env.NEON_APPROVED_TARGET !==
      `${process.env.NEON_PROJECT_ID}/${process.env.NEON_BRANCH_ID}` ||
    admin.searchParams.get("sslmode") !== "verify-full" ||
    runtime.searchParams.get("sslmode") !== "verify-full")
)
  throw new Error(
    "Explicit approved Neon target and verified TLS are required",
  );
const c = new pg.Client({ connectionString: admin.toString() });
try {
  await c.connect();
  await c.query("begin");
  if (
    (
      await c.query(
        "select exists(select 1 from pg_roles where rolname='ascivus_runtime') present",
      )
    ).rows[0].present
  )
    throw new Error(
      "Role exists; refusing to rotate credentials or change an existing account automatically",
    );
  const ddl = (
    await c.query(
      "select format('create role ascivus_runtime login noinherit nosuperuser nobypassrls nocreatedb nocreaterole password %L',$1::text) sql",
      [decodeURIComponent(runtime.password)],
    )
  ).rows[0].sql;
  await c.query(ddl);
  await c.query("grant ascivus_app to ascivus_runtime");
  await c.query("commit");
  console.log(
    "Dedicated least-privileged runtime role created. No secret values printed.",
  );
} catch (e) {
  await c.query("rollback");
  console.error("Role setup blocked or failed:", e.code || e.name);
  process.exitCode = 1;
} finally {
  await c.end();
}
