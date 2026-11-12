"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workspace, databaseError } from "@/lib/workspace";
import { repo } from "@/lib/repository";
export async function settings(form: FormData) {
  const { store, who } = await workspace();
  const kind = form.get("kind");
  let message = "Settings saved";
  try {
    if (kind === "organization")
      await store.saveOrganization(
        Object.fromEntries(form),
        String(form.get("version")),
      );
    else if (kind === "profile")
      await store.saveProfile(String(form.get("display_name") || ""));
    else if (kind === "switch") {
      const id = z.uuid().parse(form.get("organization_id"));
      await repo(who, id).context();
      (await cookies()).set("sales-org", id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    } else throw new Error("Invalid setting");
  } catch (e) {
    message = databaseError(e);
  }
  revalidatePath("/app", "layout");
  redirect("/app/settings?message=" + encodeURIComponent(message));
}
