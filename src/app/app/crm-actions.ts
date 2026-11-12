"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workspace, databaseError } from "@/lib/workspace";
import { isEntity } from "@/lib/crm";
import { requireEntitlement } from "@/features/billing/access";
export async function saveRecord(form: FormData) {
  const { store } = await workspace();
  requireEntitlement("crm");
  const entity = String(form.get("entity"));
  if (!isEntity(entity)) throw new Error("Invalid entity");
  const id = String(form.get("id") || "");
  if (id) z.uuid().parse(id);
  let saved = "";
  try {
    saved = await store.save(
      entity,
      Object.fromEntries(form),
      id || undefined,
      String(form.get("version") || ""),
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues
            .map((i) => i.message)
            .slice(0, 3)
            .join(". ")
        : databaseError(error);
    redirect(
      "/app/" +
        entity +
        (id ? "/" + id : "/new") +
        "?message=" +
        encodeURIComponent(message),
    );
  }
  revalidatePath("/app", "layout");
  redirect("/app/" + entity + "/" + saved + "?message=Saved");
}
export async function archiveRecord(form: FormData) {
  const { store } = await workspace();
  const entity = String(form.get("entity"));
  const id = z.uuid().parse(form.get("id"));
  if (!isEntity(entity) || form.get("confirm") !== "yes")
    throw new Error("Confirmation required");
  let message = "Archive state updated";
  try {
    await store.archive(
      entity,
      id,
      String(form.get("version")),
      form.get("restore") === "yes",
    );
  } catch (e) {
    message = databaseError(e);
  }
  revalidatePath("/app", "layout");
  redirect(
    "/app/" + entity + "/" + id + "?message=" + encodeURIComponent(message),
  );
}
export async function logActivity(form: FormData) {
  const { store } = await workspace();
  const id = z.uuid().parse(form.get("offer_id"));
  let message = "Manual activity logged";
  try {
    await store.log(
      id,
      String(form.get("type")),
      String(form.get("description")),
    );
  } catch (e) {
    message = databaseError(e);
  }
  revalidatePath("/app", "layout");
  redirect("/app/offers/" + id + "?message=" + encodeURIComponent(message));
}
