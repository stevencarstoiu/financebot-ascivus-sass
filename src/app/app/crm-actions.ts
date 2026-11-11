"use server";
import type { Database, CrmUpdate } from "@/lib/database";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workspace, databaseError } from "@/lib/workspace";
import {
  customerSchema,
  contactSchema,
  offerSchema,
  statusDates,
} from "@/lib/validation";
import { isEntity } from "@/lib/crm";
import { requireEntitlement } from "@/features/billing/access";
export async function saveRecord(form: FormData) {
  const { client, org } = await workspace();
  requireEntitlement("crm");
  const entity = String(form.get("entity"));
  if (!isEntity(entity)) throw new Error("Invalid entity");
  const id = String(form.get("id") || "");
  const path = "/app/" + entity + (id ? "/" + id : "/new");
  const fail = (message: string) =>
    redirect(path + "?message=" + encodeURIComponent(message));
  if (id && !z.uuid().safeParse(id).success) fail("Invalid record");
  const schema =
    entity === "customers"
      ? customerSchema
      : entity === "contacts"
        ? contactSchema
        : offerSchema;
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    fail(
      parsed.error.issues
        .map((i) => i.message)
        .slice(0, 3)
        .join(". "),
    );
  let payload: Record<string, unknown> = { ...parsed.data };
  if (entity === "offers") {
    const v = offerSchema.parse(Object.fromEntries(form));
    payload = { ...v, ...statusDates(v.status, v.sent_at) };
    if (id) {
      const { data: old } = await client
        .from("offers")
        .select("status,first_response_at,closed_at")
        .eq("id", id)
        .eq("organization_id", org.id)
        .single();
      if (!old) return fail("Record unavailable");
      if (["won", "lost"].includes(v.status))
        payload.first_response_at = old.first_response_at;
      if (old.status === v.status) {
        payload.first_response_at = old.first_response_at;
        payload.closed_at = old.closed_at;
      }
    }
  }
  let result;
  if (id) {
    const version = String(form.get("version") || "");
    if (!version) fail("Reload this record before saving");
    result = await client
      .from(entity)
      .update(payload as CrmUpdate)
      .eq("id", id)
      .eq("organization_id", org.id)
      .eq("updated_at", version)
      .select("id")
      .maybeSingle();
    if (!result.error && !result.data)
      fail("This record changed. Reload before saving.");
  } else {
    const values = { ...payload, organization_id: org.id };
    const inserted =
      entity === "customers"
        ? client
            .from("customers")
            .insert(
              values as Database["public"]["Tables"]["customers"]["Insert"],
            )
        : entity === "contacts"
          ? client
              .from("contacts")
              .insert(
                values as Database["public"]["Tables"]["contacts"]["Insert"],
              )
          : client
              .from("offers")
              .insert(
                values as Database["public"]["Tables"]["offers"]["Insert"],
              );
    result = await inserted.select("id").single();
  }
  if (result.error) fail(databaseError(result.error.code));
  revalidatePath("/app", "layout");
  redirect("/app/" + entity + "/" + result.data!.id + "?message=Saved");
}
export async function archiveRecord(form: FormData) {
  const { client, org } = await workspace();
  const entity = String(form.get("entity"));
  const id = String(form.get("id"));
  if (
    !isEntity(entity) ||
    !z.uuid().safeParse(id).success ||
    form.get("confirm") !== "yes"
  )
    throw new Error("Confirmation required");
  const { data, error } = await client
    .from(entity)
    .update({
      archived_at:
        form.get("restore") === "yes" ? null : new Date().toISOString(),
    })
    .eq("organization_id", org.id)
    .eq("id", id)
    .eq("updated_at", String(form.get("version")))
    .select("id")
    .maybeSingle();
  revalidatePath("/app", "layout");
  redirect(
    "/app/" +
      entity +
      "/" +
      id +
      "?message=" +
      encodeURIComponent(
        error
          ? databaseError(error.code)
          : data
            ? "Archive state updated"
            : "Record changed. Reload before retrying.",
      ),
  );
}
export async function logActivity(form: FormData) {
  const { client, org } = await workspace();
  const value = z
    .object({
      offer_id: z.uuid(),
      type: z.enum(["note", "call_logged", "email_logged", "followup_logged"]),
      description: z.string().trim().min(1).max(2000),
    })
    .safeParse(Object.fromEntries(form));
  if (!value.success) throw new Error("Invalid activity");
  const { error } = await client
    .from("activities")
    .insert({ ...value.data, organization_id: org.id });
  revalidatePath("/app", "layout");
  redirect(
    "/app/offers/" +
      value.data.offer_id +
      "?message=" +
      encodeURIComponent(
        error ? "Could not record activity" : "Manual activity logged",
      ),
  );
}
