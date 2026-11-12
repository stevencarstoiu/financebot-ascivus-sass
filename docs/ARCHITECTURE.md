# Neon architecture

Next.js 16 App Router, React, strict TypeScript, native Node PostgreSQL (`pg`), maintained bounded CSV/XLSX parsers and Zod. This branch has no Supabase/PostgREST packages, SDK calls, provider-specific JWT assumptions or client-accessible database path.

## Request flow

1. Server Components/Actions call `principal()`; REST calls the same auth boundary through `apiWorkspace()`.
2. A bounded, no-store request to Managed Better Auth `/get-session?disableCookieCache=true` verifies the opaque session with the provider. Email must be verified, user/session IDs must match, session must not be expired. The signed/encrypted local cookie is never an authorization cache.
3. Better Auth subject strings map to independent UUID profiles in Sales tables. Name/email metadata never grants permissions.
4. `transaction()` checks the runtime DB role, begins a transaction, SET LOCAL ROLE ascivus_app, applies bounded timeouts and parameterized transaction-local identity/organization context. It establishes the profile and rechecks/locks membership before sensitive SQL. COMMIT/ROLLBACK clears context before pool reuse.
5. Repository operations use fixed/allowlisted SQL identifiers and bound parameters, explicit tenant predicates, RLS, composite keys, constraints and transaction-bound audit triggers.

All repository modules are server-only. A 3-connection pool and short idle timeout suit a sleeping free backend. PostgreSQL numeric values stay strings; timestamps normalize to ISO strings. No ORM, PostgREST bridge, Data API, Redis, paid AI, Stripe SDK, mailbox or queue is required.

## Managed Auth adapter

`src/lib/auth/server.ts` implements only the documented Better Auth endpoints used here: signup, email/password signin, OTP verification/resend/reset, signout and session check. It mirrors the official Neon server proxy's Origin, Cookie and `x-neon-auth-proxy` header contract. Session-token Set-Cookie values are encrypted into a host-only AES-GCM HttpOnly/SameSite=Lax cookie, Secure in production, capped at seven days or upstream expiry. Cookies and secrets never enter client components. Verification always returns to the provider, so reset/revocation takes effect without a local session-cache TTL.

The published Neon SDK was reviewed but omitted: its unused UI/compatibility dependency tree pulled vulnerable packages and a legacy auth dependency. A narrow protocol adapter avoids shipping that graph. Local tests use current patched Better Auth 1.7.21 as an ACTUAL auth server; production delegates to the existing Neon Managed Auth endpoint. Hosted interoperability remains a separate gate until credentials/network are available.

## Business modules

Parameterized repository CRUD, history and aggregates replace every former provider query. CRM mutations share validation across Server Actions and authenticated REST. Import staging and commit execute within ONE application transaction, with DB job locks and fingerprint idempotency. No partial orphan writes or success placeholders. Audit trigger privileges remain unavailable to ordinary runtime requests. Fictional demo imports no repository/auth client and never touches tenant data. Basic/Advanced preference is browser-local non-sensitive state, independent of entitlements. Billing is informational and inactive.

## Bounded lists
CRM pages use 25 rows; option searches return 30 matches; customer filter menus cap at 1,000; related panels and history show bounded recent rows; CSV export caps at 1,000 active offers. Full record selection uses tenant-scoped search rather than assuming the first menu page contains all records. UTC is the follow-up day boundary. These are documented product bounds, not scale claims.
