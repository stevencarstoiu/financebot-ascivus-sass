"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { workspace } from "@/lib/workspace";
import { currency } from "@/lib/validation";
export async function settings(form: FormData) {
  const { client, org, user, role } = await workspace();
  const kind = form.get("kind");
  let errorMessage = "";
  if (kind === "organization") {
    if (!["owner", "admin"].includes(role))
      throw new Error("Owner or admin required");
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(120),
        default_currency: currency,
        followup_after_days: z.coerce.number().int().min(1).max(365),
      })
      .safeParse(Object.fromEntries(form));
    if (!parsed.success) errorMessage = "Check organization settings";
    else {
      const { data, error } = await client
        .from("organizations")
        .update(parsed.data)
        .eq("id", org.id)
        .eq("updated_at", String(form.get("version")))
        .select("id")
        .maybeSingle();
      if (error || !data)
        errorMessage =
          "Settings changed or unavailable. Reload before retrying.";
    }
  } else if (kind === "profile") {
    const parsed = z
      .string()
      .trim()
      .max(120)
      .safeParse(form.get("display_name"));
    if (!parsed.success) errorMessage = "Display name is too long";
    else {
      const { error } = await client.from("profiles").upsert({
        user_id: user.id,
        display_name: parsed.data,
        updated_at: new Date().toISOString(),
      });
      if (error) errorMessage = "Could not update profile";
    }
  } else if (kind === "switch") {
    const id = z.uuid().parse(form.get("organization_id"));
    const { data } = await client
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", id)
      .eq("user_id", user.id)
      .single();
    if (!data) throw new Error("Organization access denied");
    (await cookies()).set("sales-org", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  revalidatePath("/app", "layout");
  redirect(
    "/app/settings?message=" +
      encodeURIComponent(errorMessage || "Settings saved"),
  );
}
