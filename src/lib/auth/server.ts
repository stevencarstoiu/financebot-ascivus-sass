import "server-only";
import { cookies } from "next/headers";
import { parseString } from "set-cookie-parser";
import { z } from "zod";
import { sealSession, openSession } from "./session-cookie";
export type Principal = { subject: string; name: string; sessionId: string };
export function authConfigured() {
  return !!(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.SITE_URL
  );
}
function config() {
  if (!authConfigured())
    throw new Error("Authentication unavailable in this environment");
  const base = new URL(process.env.NEON_AUTH_BASE_URL!);
  const local =
    ["127.0.0.1", "localhost"].includes(base.hostname) &&
    process.env.NODE_ENV !== "production";
  if (
    !local &&
    (base.protocol !== "https:" || !base.hostname.endsWith(".neon.tech"))
  )
    throw new Error("Managed Auth must use its Neon HTTPS endpoint");
  if (process.env.NEON_AUTH_COOKIE_SECRET!.length < 32)
    throw new Error("Cookie secret is too short");
  return {
    base: base.toString().replace(/\/$/, ""),
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    origin: new URL(process.env.SITE_URL!).origin,
  };
}
const sessionName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-sales-session"
    : "sales-session";
async function upstream(path: string, body?: Record<string, unknown>) {
  const c = config();
  const jar = await cookies();
  const cookie = openSession(jar.get(sessionName())?.value, c.secret);
  return fetch(c.base + "/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: c.origin,
      "x-neon-auth-proxy": "nextjs",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
}
/** A deliberately narrow HTTP adapter to Managed Better Auth, not an auth database or session cache. */
async function post(path: string, body: Record<string, unknown>) {
  try {
    const response = await upstream(path, body);
    if (!response.ok) return { data: null, error: { status: response.status } };
    const jar = await cookies();
    const c = config();
    for (const line of response.headers.getSetCookie()) {
      const cookie = parseString(line);
      if (!cookie) continue;
      if (
        !/^(?:__Secure-|__Host-)?(?:neon-auth|better-auth)\.session_token$/.test(
          cookie.name,
        )
      )
        continue;
      if (
        (cookie.maxAge !== undefined && cookie.maxAge <= 0) ||
        !cookie.value
      ) {
        jar.set(sessionName(), "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          expires: new Date(0),
        });
        continue;
      }
      const expires = Math.min(
        cookie.expires?.getTime() ||
          (cookie.maxAge
            ? Date.now() + cookie.maxAge * 1000
            : Date.now() + 7 * 86400000),
        Date.now() + 7 * 86400000,
      );
      jar.set(
        sessionName(),
        sealSession(cookie.name + "=" + cookie.value, c.secret, expires),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: new Date(expires),
        },
      );
    }
    return {
      data: (await response.json().catch(() => null)) as unknown,
      error: null,
    };
  } catch {
    return { data: null, error: { status: 503 } };
  }
}
export function auth() {
  return {
    signUp: {
      email: (v: { email: string; password: string; name: string }) =>
        post("sign-up/email", v),
    },
    signIn: {
      email: (v: { email: string; password: string }) =>
        post("sign-in/email", v),
    },
    emailOtp: {
      verifyEmail: (v: { email: string; otp: string }) =>
        post("email-otp/verify-email", v),
      sendVerificationOtp: (v: {
        email: string;
        type: "forget-password" | "email-verification";
      }) => post("email-otp/send-verification-otp", v),
      resetPassword: (v: { email: string; otp: string; password: string }) =>
        post("email-otp/reset-password", v),
    },
    signOut: async () => {
      const result = await post("sign-out", {});
      (await cookies()).set(sessionName(), "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      return result;
    },
  };
}
const sessionSchema = z.object({
  user: z.object({
    id: z.string().min(1).max(200),
    name: z.string(),
    emailVerified: z.literal(true),
  }),
  session: z.object({
    id: z.string().min(1),
    userId: z.string(),
    expiresAt: z.string(),
  }),
});
/** Always ask Managed Auth, so revoked/expired/reset sessions cannot use a local cache. */
export async function principal(): Promise<Principal | null> {
  if (!authConfigured()) return null;
  const c = config();
  if (!openSession((await cookies()).get(sessionName())?.value, c.secret))
    return null;
  const response = await upstream("get-session?disableCookieCache=true");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Authentication service unavailable");
  const data = sessionSchema.safeParse(await response.json());
  if (!data.success) return null;
  const { user, session } = data.data;
  if (
    session.userId !== user.id ||
    !Number.isFinite(Date.parse(session.expiresAt)) ||
    Date.parse(session.expiresAt) <= Date.now()
  )
    return null;
  return { subject: user.id, name: user.name, sessionId: session.id };
}
