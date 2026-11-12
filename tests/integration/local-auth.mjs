import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";
import { toNodeHandler } from "better-auth/node";
import { createServer } from "node:http";
import pg from "pg";
if (new URL(process.env.LOCAL_AUTH_DATABASE_URL).hostname !== "127.0.0.1")
  throw new Error("Local Auth refuses hosted database");
const mail = new Map();
const options = {
  database: new pg.Pool({
    connectionString: process.env.LOCAL_AUTH_DATABASE_URL,
  }),
  baseURL: "http://127.0.0.1:3002",
  secret: process.env.NEON_AUTH_COOKIE_SECRET,
  trustedOrigins: ["http://127.0.0.1:3001"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
  },
  advanced: { cookiePrefix: "neon-auth", useSecureCookies: false },
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        mail.set(email + "|" + type, otp);
      },
    }),
  ],
};
await (await getMigrations(options)).runMigrations();
const auth = betterAuth(options);
const handler = toNodeHandler(auth);
createServer((req, res) => {
  if (req.url === "/health") {
    res.end("ready");
    return;
  }
  if (req.url?.startsWith("/test-mail?")) {
    if (req.headers["x-test-mail-key"] !== process.env.LOCAL_AUTH_MAIL_KEY) {
      res.writeHead(403);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        otp:
          mail.get(
            url.searchParams.get("email") + "|" + url.searchParams.get("type"),
          ) || null,
      }),
    );
    return;
  }
  handler(req, res);
}).listen(3002, "127.0.0.1", () =>
  console.log("Local real Better Auth ready; mail is captured in memory only."),
);
