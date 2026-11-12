import Link from "next/link";
import { cookies } from "next/headers";
import { authenticate } from "@/app/auth/actions";
import { authConfigured } from "@/lib/auth/server";
import { Submit } from "./submit";
export async function AuthPage({
  kind,
  searchParams,
}: {
  kind: string;
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const pending = (await cookies()).get("auth-email")?.value || "";
  const title =
    kind === "signup"
      ? "Create your workspace"
      : kind === "verify-email"
        ? "Verify your email"
        : kind === "forgot-password"
          ? "Recover your account"
          : kind === "reset-password"
            ? "Set a new password"
            : "Welcome back";
  return (
    <main id="main" className="auth-wrap">
      <Link href="/" className="wordmark">
        ASCIVUS <small>Sales workspace · working title</small>
      </Link>
      <section className="panel auth-card">
        <p className="eyebrow">YOUR NEXT CONVERSATION STARTS HERE</p>
        <h1>{title}</h1>
        <p className="muted">
          Keep offers, customers and follow-ups in one focused place.
        </p>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {!authConfigured() ? (
          <p role="alert" className="notice">
            Authentication unavailable in this environment.{" "}
            <Link href="/demo">Explore the fictional demo</Link>.
          </p>
        ) : (
          <form action={authenticate}>
            <input type="hidden" name="kind" value={kind} />
            <label>
              Email
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                maxLength={254}
                defaultValue={
                  ["verify-email", "reset-password"].includes(kind)
                    ? pending
                    : ""
                }
              />
            </label>
            {kind === "signup" && (
              <label>
                Display name
                <input
                  name="display_name"
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
            )}
            {["verify-email", "reset-password"].includes(kind) && (
              <label>
                One-time code
                <input
                  required
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                />
                <small>
                  Use the code from your email. Codes expire and attempts are
                  limited.
                </small>
              </label>
            )}
            {!["forgot-password", "verify-email"].includes(kind) && (
              <label>
                Password
                <input
                  required
                  type="password"
                  name="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete={
                    kind === "login" ? "current-password" : "new-password"
                  }
                />
                <small>At least 12 characters</small>
              </label>
            )}
            <Submit>
              {kind === "signup"
                ? "Create account"
                : kind === "verify-email"
                  ? "Verify email"
                  : kind === "forgot-password"
                    ? "Send reset code"
                    : kind === "reset-password"
                      ? "Update password"
                      : "Sign in"}
            </Submit>
          </form>
        )}
        {kind === "verify-email" && authConfigured() && (
          <form action={authenticate}>
            <input type="hidden" name="kind" value="resend" />
            <input type="hidden" name="email" value={pending} />
            <button className="secondary">Request new verification code</button>
          </form>
        )}
        <div className="inline-links">
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </section>
    </main>
  );
}
