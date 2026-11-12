import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { principal, authConfigured } from "./auth/server";
import { repo } from "./repository";
import { AccessError } from "./db";
export async function identity() {
  if (!authConfigured())
    redirect("/login?message=Authentication+unavailable+in+this+environment");
  const who = await principal();
  if (!who) redirect("/login");
  const store = repo(who, null);
  const context = await store.context();
  return { who, store, user: context.user };
}
export async function workspace() {
  const { who, user } = await identity();
  const selected = (await cookies()).get("sales-org")?.value;
  const memberships = (await repo(who, null).context()).memberships;
  if (!memberships.length) redirect("/onboarding");
  const member =
    memberships.find((m) => m.organization_id === selected) || memberships[0];
  const store = repo(who, member.organization_id);
  const context = await store.context();
  if (!context.org) throw new Error("Organization unavailable");
  return { ...context, org: context.org, user, store, who };
}
export async function apiWorkspace() {
  const who = await principal();
  if (!who) throw new AccessError(401, "Authentication required");
  const selected = (await cookies()).get("sales-org")?.value;
  const memberships = (await repo(who, null).context()).memberships;
  const member =
    memberships.find((m) => m.organization_id === selected) || memberships[0];
  if (!member) throw new AccessError(403, "Create an organization first");
  const store = repo(who, member.organization_id);
  const context = await store.context();
  if (!context.org) throw new AccessError(403, "Organization unavailable");
  return { ...context, org: context.org, store, who };
}
export function databaseError(error: unknown) {
  if (error instanceof AccessError) return error.message;
  const code = (error as { code?: string })?.code;
  if (code === "23505")
    return "This reference already exists in your organization.";
  if (code === "23503")
    return "Choose related records from this organization and customer.";
  return "Could not save. Check fields, permissions, and reload before retrying.";
}
