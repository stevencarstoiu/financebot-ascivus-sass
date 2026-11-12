# Phase 1 — Neon Free status

Work is exclusive to `phase-1-neon-free`, based on existing remote commit `1b7a96a769c0abf67ab47e403f965280b6b34f7f`. `main`, `phase-1`, BotLab and unrelated checkouts are preserved. Exact publication commit/push evidence is reported in the final handoff after the gates pass.

| Module | Status | Evidence / limits |
| --- | --- | --- |
| Provider replacement | DONE locally | No Supabase/PostgREST dependency, client, auth.uid stub or active migration remains. Server-only Managed Better Auth protocol adapter + parameterized pg repository. |
| Auth / onboarding | DONE locally; hosted BLOCKED | Actual local Better Auth OTP/password/reset/revocation browser journey. Managed endpoint is supplied, but secure DB/cookie bindings and outbound access have not been observed. |
| Organization / RBAC / tenant isolation | DONE locally | Independent opaque-subject mapping, constrained runtime role, per-operation verified context, RLS, composite keys, private helpers and last-owner protection; 60 SQL checks plus two-user REST/browser. |
| CRM | DONE locally | Customers/contacts/offers, search/filter/page, edit/archive/restore, exact values, stale-write conditions and manual activities. Existing UI retained. |
| CSV/XLSX imports | DONE locally | Bounded parser/mapping/preview/dedupe, atomic app transaction, DB idempotency/locks/history/error reports. 100/1,000-row parser/SQL; 100-row CSV and XLSX browser commits. |
| Dashboards | DONE locally | SQL aggregates by original currency, derived follow-up, Basic/Advanced and persisted preference, real priority/history/filter queries. |
| Audit / history | DONE locally | No runtime audit insert/edit/delete/truncate or trigger/RLS alteration; transactional actor/status/member/import events, redaction, failed-write rollback checks. Not administrator-proof. |
| Fictional demo | DONE locally | Isolated memory fixtures, read-only, no database/auth connection; responsive browser smoke checks retained. |
| Billing-ready | DONE, inactive | Typed preview entitlement catalog and DB caps retained. No Stripe/customer/paid AI/outreach is enabled. |
| CI / hosted / $0 Preview | PARTIAL / BLOCKED | Local CI/test tooling and hosted-isolated harness prepared. Neon published Free limits verified from official source. Render docs/account limits and actual hosted deployment not verified; candidate plan-free config must not be applied yet. |

## Known external blockers

No actual DATABASE_URL (restricted runtime), DATABASE_MIGRATION_URL (separate admin) or NEON_AUTH_COOKIE_SECRET is currently bound in the running environment. The supplied Managed Auth URL is not a credential; it alone cannot perform database or authenticated acceptance tests. Environment metadata currently shows no ready variable/secret bindings. No hosted migration or destructive command has been run.

Auth and official Render documentation requests received outbound-policy 403. Additive domains/variable names were saved to the environment draft, not silently applied. The user must securely fill settings, review/save and publish the environment as required, then fresh connectivity/role checks can resume. PostgreSQL network permissions depend on the actual DB hostname, still unavailable without the binding.

Preview: NOT DEPLOYED. No Render account credential/authorization is configured, current Render Free limits cannot yet be verified, and no provider returned a Preview URL. No paid fallback, paid overages, automatic upgrade, production deployment or real customer email was attempted. See PREVIEW_DEPLOYMENT for exact $0 gates and operator steps.

## Validation boundaries

Final local validation PASS: npm ci, audit (0 known vulnerabilities), lint, typecheck, 31 unit tests, optimized production build, 60 SQL checks, additive migration checksum/repeatability, six desktop/mobile public tests and two actual local Auth/browser tests. Hosted-isolated tests remain BLOCKED / NOT RUN, not passed. Local SQL tests do not assert independent provider identity attestation; server-verified context is trusted and its private DB credential must remain protected.

No Supabase/business data export is assumed. Any future approved record move needs a verified identity map and a separate data-transfer run; never touch BotLab sessions/customer data. Imported staging cleanup is manual/explicitly scheduled after 24h; no automatic cleanup claim. Legal notices remain drafts; hosted abuse limits, backups/retention/monitoring, upload size/memory ceilings and real-email delivery require operator verification. Current bounded export/history/filter limits remain documented in ARCHITECTURE and IMPORT_SPEC.
