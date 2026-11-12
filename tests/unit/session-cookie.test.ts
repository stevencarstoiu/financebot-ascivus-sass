import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { sealSession, openSession } from "@/lib/auth/session-cookie";
describe("Managed Auth cookie envelope", () => {
  const secret = randomBytes(32).toString("hex");
  const token = "neon-auth.session_token=synthetic-opaque-provider-token";
  it("encrypts the opaque token and validates authenticated encryption", () => {
    const sealed = sealSession(token, secret, Date.now() + 10000);
    expect(sealed).not.toContain("synthetic");
    expect(openSession(sealed, secret)).toBe(token);
    expect(openSession(sealed, randomBytes(32).toString("hex"))).toBeNull();
    expect(openSession(sealed.slice(0, -3) + "abc", secret)).toBeNull();
  });
  it("fails closed for expiry, malformed input and header injection", () => {
    expect(openSession(sealSession(token, secret, 1), secret)).toBeNull();
    expect(openSession("untrusted", secret)).toBeNull();
    expect(
      openSession(
        sealSession(
          token + "\r\nAuthorization: forged",
          secret,
          Date.now() + 10000,
        ),
        secret,
      ),
    ).toBeNull();
    expect(() => sealSession(token, "short", Date.now() + 1)).toThrow();
  });
});
