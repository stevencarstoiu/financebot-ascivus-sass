import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, configured } from "./supabase";
export async function identity() {
  if (!configured())
    redirect("/login?message=Authentication+unavailable+in+this+environment");
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  return { client, user };
}
export async function workspace() {
  const { client, user } = await identity();
  const selected = (await cookies()).get("sales-org")?.value;
  const { data, error } = await client
    .from("organization_members")
    .select(
      "organization_id,role,organizations(id,name,default_currency,followup_after_days)",
    )
    .eq("user_id", user.id);
  if (error)
    throw new Error("Workspace unavailable. Check database migrations.");
  if (!data?.length) redirect("/onboarding");
  const member = data.find((m) => m.organization_id === selected) || data[0];
  const { data: org, error: orgError } = await client
    .from("organizations")
    .select("*")
    .eq("id", member.organization_id)
    .single();
  if (orgError || !org) throw new Error("Organization unavailable");
  return { client, user, org, role: member.role, memberships: data };
}
export function databaseError(code?: string) {
  if (code === "23505")
    return "This reference already exists in your organization.";
  if (code === "23503")
    return "Choose related records from this organization and customer.";
  if (code === "40001") return "This record changed. Reload before saving.";
  return "Could not save. Check fields, permissions, and reload before retrying.";
}
