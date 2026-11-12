"use server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { z } from "zod";
import { auth, authConfigured } from "@/lib/auth/server";
export async function authenticate(form: FormData) {
  const kind = String(form.get("kind"));
  const path = [
    "signup",
    "verify-email",
    "forgot-password",
    "reset-password",
  ].includes(kind)
    ? "/" + kind
    : "/login";
  const fail = (m: string): never =>
    redirect(path + "?message=" + encodeURIComponent(m));
  if (!authConfigured()) fail("Authentication unavailable in this environment");
  if ((await headers()).get("origin") !== new URL(process.env.SITE_URL!).origin)
    fail("Request origin is not allowed");
  const email = z.email().safeParse(form.get("email"));
  const password = z.string().min(12).max(128).safeParse(form.get("password"));
  const otp = z
    .string()
    .regex(/^\d{6}$/)
    .safeParse(form.get("otp"));
  if (!email.success) fail("Enter a valid email address");
  const client = auth();
  if (kind === "signup") {
    if (!password.success) fail("Use a password of 12–128 characters");
    const { error } = await client.signUp.email({
      email: email.data!,
      password: password.data!,
      name: String(form.get("display_name") || "Sales user").slice(0, 120),
    });
    if (error) fail("Unable to create account. Try again later.");
    (await cookies()).set("auth-email", email.data!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    redirect(
      "/verify-email?message=Check+your+email+for+the+verification+code",
    );
  }
  if (kind === "verify-email") {
    if (!otp.success) fail("Enter the six-digit verification code");
    const { error } = await client.emailOtp.verifyEmail({
      email: email.data!,
      otp: otp.data!,
    });
    if (error) fail("Code invalid or expired. Request a new code.");
    redirect("/login?message=Email+verified.+Please+sign+in");
  }
  if (kind === "forgot-password") {
    await client.emailOtp.sendVerificationOtp({
      email: email.data!,
      type: "forget-password",
    });
    (await cookies()).set("auth-email", email.data!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    redirect(
      "/reset-password?message=If+the+account+exists%2C+check+your+email+for+the+reset+code",
    );
  }
  if (kind === "reset-password") {
    if (!password.success || !otp.success)
      fail("Enter the reset code and a password of 12–128 characters");
    const { error } = await client.emailOtp.resetPassword({
      email: email.data!,
      otp: otp.data!,
      password: password.data!,
    });
    if (error) fail("Code invalid or expired. Request a new reset code.");
    await client.signOut();
    redirect(
      "/login?message=Password+updated.+All+previous+sessions+must+sign+in+again",
    );
  }
  if (kind === "resend") {
    await client.emailOtp.sendVerificationOtp({
      email: email.data!,
      type: "email-verification",
    });
    redirect(
      "/verify-email?message=If+eligible%2C+a+new+code+has+been+requested",
    );
  }
  if (!password.success) fail("Use a password of 12–128 characters");
  const { error } = await client.signIn.email({
    email: email.data!,
    password: password.data!,
  });
  if (error) fail("Sign-in failed. Check credentials and verify your email.");
  redirect("/app");
}
export async function logout() {
  await auth().signOut();
  redirect("/login");
}
