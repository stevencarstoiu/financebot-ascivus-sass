import "server-only";
import pg, { type PoolClient, type QueryResultRow } from "pg";
import type { Principal } from "./auth/server";
import { z } from "zod";
const { Pool } = pg;
pg.types.setTypeParser(1184, (value) => new Date(value).toISOString());
let pool: pg.Pool | undefined;
export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function database() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new AccessError(503, "Database unavailable in this environment");
  if (!pool) {
    const u = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    if (!local && u.searchParams.get("sslmode") !== "verify-full")
      throw new AccessError(503, "Database TLS must use verify-full");
    pool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}
export type Tx = {
  query: <T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ) => Promise<pg.QueryResult<T>>;
  user: { id: string; name: string };
  orgId: string | null;
};
/** The only route to application SQL. Runtime URL MUST NOT own tables or bypass RLS. */
export async function transaction<T>(
  who: Principal,
  orgId: string | null,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!who?.subject || who.subject.length > 200)
    throw new AccessError(401, "Authentication required");
  if (orgId !== null) z.uuid().parse(orgId);
  const c = await database().connect();
  try {
    await c.query("begin");
    const role = await c.query(
      "select r.rolsuper,r.rolbypassrls,r.rolcreaterole,r.rolcreatedb,pg_has_role(session_user,'ascivus_owner','MEMBER') owner from pg_roles r where r.rolname=session_user",
    );
    const flags = role.rows[0];
    if (
      !flags ||
      flags.rolsuper ||
      flags.rolbypassrls ||
      flags.rolcreaterole ||
      flags.rolcreatedb ||
      flags.owner
    )
      throw new AccessError(503, "Unsafe runtime database role");
    await c.query("set local role ascivus_app");
    await c.query("set local statement_timeout='15s'");
    await c.query("set local lock_timeout='5s'");
    await c.query(
      "select set_config('sales.auth_subject',$1,true),set_config('sales.organization_id',$2,true)",
      [who.subject, orgId || ""],
    );
    const profile = await c.query<{ id: string }>(
      "select sales.ensure_profile($1) id",
      [who.name],
    );
    const user = { id: profile.rows[0].id, name: who.name };
    if (orgId) {
      const member = await c.query(
        "select sales_private.lock_membership($1) role",
        [orgId],
      );
      if (!member.rowCount)
        throw new AccessError(403, "Organization access denied");
    }
    const result = await work({
      query: <R extends QueryResultRow>(sql: string, values?: unknown[]) =>
        c.query<R>(sql, values),
      user,
      orgId,
    });
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
export async function membership(tx: Tx, orgId: string) {
  const r = await tx.query<{ role: string }>(
    "select sales_private.lock_membership($1) role",
    [orgId],
  );
  if (!r.rowCount) throw new AccessError(403, "Organization access denied");
  return r.rows[0].role;
}
export type SqlClient = PoolClient;
