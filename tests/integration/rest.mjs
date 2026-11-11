import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "127.0.0.1");
assert.equal(new URL(url).port, "55421");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.LOCAL_SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const users = [];
async function account() {
  const email = `sales-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "aA1!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(error);
  users.push(data.user.id);
  const client = createClient(url, key, { auth: { persistSession: false } });
  assert.ifError(
    (await client.auth.signInWithPassword({ email, password })).error,
  );
  const oid = randomUUID();
  assert.ifError(
    (
      await client.rpc("create_organization", {
        p_name: "Synthetic REST organization",
        p_currency: "EUR",
        p_request: oid,
      })
    ).error,
  );
  return { client, oid, uid: data.user.id };
}
// Retained only inside this disposable stack; destroyed by next local reset.
const a = await account(),
  b = await account();
const bc = await b.client
  .from("customers")
  .insert({ organization_id: b.oid, display_name: "B synthetic customer" })
  .select()
  .single();
assert.ifError(bc.error);
const ac = await a.client
  .from("customers")
  .insert({ organization_id: a.oid, display_name: "A synthetic customer" })
  .select()
  .single();
assert.ifError(ac.error);
assert.deepEqual(
  (await a.client.from("customers").select("*").eq("id", bc.data.id)).data,
  [],
);
assert.deepEqual(
  (
    await a.client
      .from("customers")
      .update({ display_name: "Forged" })
      .eq("id", bc.data.id)
      .select()
  ).data,
  [],
);
assert.ok(
  (await a.client.from("customers").delete().eq("id", bc.data.id)).error,
);
assert.ok(
  (
    await a.client
      .from("contacts")
      .insert({
        organization_id: a.oid,
        customer_id: bc.data.id,
        full_name: "Cross tenant",
      })
  ).error,
);
assert.ok(
  (
    await a.client
      .from("organization_members")
      .insert({ organization_id: b.oid, user_id: a.uid, role: "owner" })
  ).error,
);
assert.ok(
  (
    await a.client
      .from("organization_members")
      .update({ role: "admin" })
      .eq("user_id", a.uid)
  ).error,
);
assert.ok(
  (
    await a.client
      .from("customers")
      .update({ organization_id: b.oid })
      .eq("id", ac.data.id)
  ).error,
);
assert.ok(
  (await a.client.from("audit_events").delete().eq("organization_id", a.oid))
    .error,
);
assert.ok(
  (
    await a.client.rpc("stage_import", {
      p_org: b.oid,
      p_name: "forged.csv",
      p_fingerprint: "a".repeat(64),
      p_mapping: "b".repeat(64),
      p_rows: [{}],
    })
  ).error,
);
const anonymous = createClient(url, key, { auth: { persistSession: false } });
assert.ok((await anonymous.from("customers").select("*")).error);
assert.equal(
  (await a.client.rpc("dashboard_metrics", { p_org: b.oid })).data.total,
  0,
);
console.log(
  "PASS: real local Supabase Auth + REST: two users, tenant reads/mutations/FKs/imports, membership escalation, audit and anonymous denial.",
);
