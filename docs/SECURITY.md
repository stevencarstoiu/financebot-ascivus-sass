# Security and release gates

Threats addressed: unauthenticated access, guessed IDs, tenant substitution, membership/actor escalation, cross-tenant relationships, mutable audit, stale edits, unsafe import archives/formulas, ambiguous numeric coercion, callback open redirects, CSRF and sensitive-cache leakage.

## Boundaries

- Verified `auth.getUser()` and a real membership on every operation. No authorization from organization headers, selected cookie alone or editable JWT user metadata.
- RLS per operation; UPDATE has USING and WITH CHECK plus SELECT. No normal hard-delete grants. Explicit minimal grants also protect PostgREST directly.
- Composite foreign keys prevent linking another tenant's customer/contact, or the wrong customer's contact. Before-update triggers reject identity/tenant changes, including when a user belongs to both organizations.
- Membership writes are unavailable through ordinary REST. Initial organization and ownership creation is atomic/idempotent. Admin-only settings enforced in server and DB.
- Exposed RPCs are invoker wrappers. Necessary definer implementations live in non-exposed `private`, pin an empty search_path, revoke PUBLIC/anon execution, verify identity/membership/initiator, and qualify all object names. Trigger helpers are not generally callable.
- Audit writes use a narrow definer trigger; ordinary roles cannot insert/update/delete audit. Record content is not copied; changed field names omit notes/email/phone/description. Wall-clock event times preserve large-import order. Retention is privileged maintenance only.
- HttpOnly, SameSite=Lax session cookies; Secure in production. Proxy propagates refresh cookies. Personal routes are dynamic and no-store. There is no service-role key in application or browser code.
- Callback paths are fixed allowlisted relative destinations; invalid links fail closed. PKCE code exchange, explicit origin check on import and auth actions, plus Next's Server Action origin protections. Recovery responds generically to avoid account enumeration.
- Password minimum 12; Supabase email confirmation must remain enabled. Provider limits configured for the local mail catcher are **test settings**, not hosted abuse protection.
- CSP, no framing, nosniff, referrer/permissions headers. Inline scripts remain necessary for this implementation; CSP is not a substitute for React escaping. `unsafe-eval` is development-only for React tooling. Strengthen to nonce-based CSP before a stricter deployment policy requires it.

## Imports

5 MB input, 1k rows, 50 columns, 5 sheets, 2k ZIP entries, 20 MB total expanded, 8 MB per entry, compression ratio 150, 50,050 worksheet cells. ZIP metadata and actual decompressed bytes are bounded. Reject encrypted ZIP, formulas, DTD/entities, macros, external relationships/links/embedded objects, huge worksheet dimensions. XLSX package `read-excel-file` only sees guarded input. Never evaluate formulas. React escapes preview text; CSV exports neutralize leading formula characters and quote fields.

An explicit duplicate option is required; default skip. DB transaction locks the job, derives actor/tenant, validates constraints, and rolls back customer/contact/offer/audit writes together. No fake success response. Failed commit leaves a validated retryable job; errors reveal no raw SQL. Per-organization caps are enforced in DB, including direct REST/imports.

## Remaining release gates

Hosted disposable two-user/Auth/REST/browser verification and actual Preview remain NOT RUN. Local PostgreSQL and real local Supabase results are distinct in TEST_PLAN. Hosted SMTP delivery, OAuth (not in scope), session rotation under hosted CDN, password breach protection, domain restrictions, provider/WAF rate limits, backups/restore, alerting, retention schedules and legal notices require operator configuration/review. No distributed app-side rate limiter is claimed. Supabase Auth limits and hosted WAF protections must be configured before public signup. Do not expose the local Docker stack publicly.

Staging cleanup after 24h needs privileged scheduling (manual command documented in IMPORT_SPEC). No automatic scheduler is claimed. Audit is append-only for normal users, not cryptographically tamper-proof against DB administrators. No compliance certification or penetration-test claim. GitHub/Vercel/Supabase hosted credentials must belong to the new target only. No Stripe/AI/email-provider calls, production migrations or payments have been activated.
