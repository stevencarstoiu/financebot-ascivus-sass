import Link from "next/link";
import { authenticate } from "@/app/auth/actions";
import { configured } from "@/lib/supabase";
export async function AuthPage({
  kind,
  searchParams,
}: {
  kind: string;
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const title =
    kind === "signup"
      ? "Create your workspace"
      : kind === "forgot-password"
        ? "Recover your account"
        : kind === "reset-password"
          ? "Set a new password"
          : "Welcome back";
  return (
    <main className="auth-wrap">
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
        {!configured() ? (
          <p role="alert" className="notice">
            Authentication unavailable in this environment.{" "}
            <Link href="/demo">Explore the fictional demo</Link>.
          </p>
        ) : (
          <form action={authenticate}>
            <input type="hidden" name="kind" value={kind} />
            {kind !== "reset-password" && (
              <label>
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                />
              </label>
            )}
            {kind !== "forgot-password" && (
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
            <button className="button">
              {kind === "signup"
                ? "Create account"
                : kind === "forgot-password"
                  ? "Send recovery link"
                  : kind === "reset-password"
                    ? "Update password"
                    : "Sign in"}
            </button>
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
