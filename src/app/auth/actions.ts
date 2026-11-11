"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db, configured } from "@/lib/supabase";
export async function authenticate(form: FormData) {
  const kind = String(form.get("kind"));
  const path = ["signup", "forgot-password", "reset-password"].includes(kind)
    ? "/" + kind
    : "/login";
  const fail = (m: string) =>
    redirect(path + "?message=" + encodeURIComponent(m));
  if (!configured()) fail("Authentication unavailable in this environment");
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) fail("Site URL is not configured");
  const requestOrigin = (await headers()).get("origin");
  if (requestOrigin && requestOrigin !== new URL(origin!).origin)
    fail("Request origin is not allowed");
  const client = await db();
  const email = z.email().safeParse(form.get("email"));
  const password = z.string().min(12).max(128).safeParse(form.get("password"));
  if (kind !== "reset-password" && !email.success)
    fail("Enter a valid email address");
  if (kind !== "forgot-password" && !password.success)
    fail("Use a password of 12–128 characters");
  if (kind === "signup") {
    const { error } = await client.auth.signUp({
      email: email.data!,
      password: password.data!,
      options: { emailRedirectTo: origin + "/auth/callback" },
    });
    if (error) fail("Unable to create account. Try again later.");
    redirect("/login?message=Check+your+email+to+confirm+your+account");
  }
  if (kind === "forgot-password") {
    await client.auth.resetPasswordForEmail(email.data!, {
      redirectTo: origin + "/auth/callback?next=/reset-password",
    });
    redirect(
      "/forgot-password?message=If+the+account+exists%2C+check+your+email+for+a+recovery+link",
    );
  }
  if (kind === "reset-password") {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) fail("Open a valid recovery link first");
    const { error } = await client.auth.updateUser({
      password: password.data!,
    });
    if (error) fail("Password could not be updated. Request a new link.");
    await client.auth.signOut();
    redirect("/login?message=Password+updated.+Please+sign+in");
  }
  const { error } = await client.auth.signInWithPassword({
    email: email.data!,
    password: password.data!,
  });
  if (error) fail("Sign-in failed. Check credentials and confirm your email.");
  redirect("/app");
}
export async function logout() {
  const client = await db();
  await client.auth.signOut();
  redirect("/login");
}
