# Neon test plan and evidence

Current local gates (12 November 2026):

- `npm ci`: frozen dependency installation; must pass on this branch before publication.
- `npm audit --audit-level=low`: dependency gate. The unused Neon SDK UI/compatibility graph was removed; current patched Better Auth is a local test dependency only. No advisory suppression or integrity/TLS bypass.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: active branch code, strict generated-route validation, parser/business/crypto tests and optimized production build.
- `npm run test:integration`: actual disposable PostgreSQL 17, fresh translated migrations and 60 checks for tenant RLS, composite FKs, role grants/escalation, actor mapping, last owner, exact numerics, generated status events, append-only audit, failed audit rollback, 100/1,000-row atomic imports/idempotency, manual TTL cleanup and missing-context denial. It is NOT a hosted Neon/Auth test.
- `npm run test:connected`: the same disposable PostgreSQL plus an actual patched Better Auth server with mandatory OTP, password hashing and session revocation, in-memory test-only mail and real HTTP/cookies. Two Playwright tests cover signup/OTP/login/onboarding/CRM/manual activity/100-row CSV and XLSX/dashboard/audit/recovery, second-session rejection after password reset, two real users/organizations, guessed-ID REST/browser denial, cross-tenant FK rejection, no membership API, anonymous/direct Server Action replay/CSRF denial and mobile overflow. No mock session or fake-success backend is used. Local Auth is NOT Neon Managed Auth; hosted compatibility remains a separate required check.
- `npm run test:e2e`: six desktop/mobile public/demo production browser tests. Auth-unavailable state, safe callback fallback, separate read-only demo, real fixture metrics, filters/details, modes/persistence, keyboard and layout. Use an unconfigured backend for the unavailable-state assertion. The demo must make no provider/DB calls.
- Unit parser tests include 100/1,000-row CSV and XLSX, malicious/corrupt/huge/formula/external files, numeric ambiguity, dates, mapping and safe CSV reports. Crypto tests check confidentiality, authenticated tamper/wrong-key rejection, expiry and header-injection rejection.

Hosted: `npm run test:hosted` deliberately reports BLOCKED/NOT RUN (exit 2) without a real isolated Preview, approved target and two operator-controlled synthetic verified identities. It never drops/resets/migrates/deletes an existing database/account. Real Managed Auth OTP delivery, configured reset revocation, network/TLS, roles, migrations and hosted browser/REST must be verified separately. Never call a missing-credential test “passed” or silently skip it.

CI now runs only this migration branch on pushes, with read-only GitHub permissions, clean install/audit/lint/typecheck/unit/build/SQL/public/connected local gates. GitHub-hosted CI outcome is not assumed from writing the workflow. Local credentials and traces are ignored; do not upload sensitive traces from hosted identities.

Development fixes validated during migration: schema-creation privilege ordering, protected membership row locking without granting membership updates, Better Auth migration utility export path, explicit PostgreSQL variadic parameter typing, and cookie-parser nullability. No failing security assertion was disabled.
