"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { identity } from "@/lib/workspace";
import { currency } from "@/lib/validation";
export async function createOrganization(form: FormData) {
  const { store } = await identity();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      currency,
      request: z.uuid(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/onboarding?message=Check+name+and+currency");
  let data = "";
  try {
    data = await store.createOrganization(
      parsed.data.name,
      parsed.data.currency,
      parsed.data.request,
    );
  } catch {
    redirect(
      "/onboarding?message=Could+not+create+organization.+Check+database+setup.",
    );
  }
  (await cookies()).set("sales-org", data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/app");
}
