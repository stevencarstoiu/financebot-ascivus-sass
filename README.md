# ASCIVUS Sales workspace — Neon Free

Internal working title. This branch (`phase-1-neon-free`) replaces the previous Supabase implementation with Neon Managed Better Auth and server-only PostgreSQL. It preserves `main`, `phase-1`, and ASCIVUS BotLab. No paid resources or production deployments are created.

## Development

Node 24 and npm; an existing isolated checkout is sufficient (do not create a worktree unless requested).

```bash
npm ci
# Configure secure environment bindings from docs/ENVIRONMENT.md.
npm run dev -- --port 3000
```

Without backend configuration, public pages and the explicitly fictional `/demo` work; sign-in reports unavailable. No fake session or fake business data is substituted for a missing backend.

Authentication uses Managed Better Auth email/password and mandatory six-digit email OTP verification. Recovery uses an email OTP; password reset must revoke existing sessions at the provider. Every sensitive application request asks the provider for the current session. The browser holds only an encrypted HttpOnly session envelope; database URLs, provider/session secrets and database connections stay server-side.

The CRM supports customers/contacts/offers, edits, archive/restore, URL search/filter/pagination, exact original-currency amounts, manual activities and audit. Imports support bounded CSV/XLSX parsing, mapping, all-row validation, duplicate options and one atomic transaction. Both dashboard views use SQL aggregates; the read-only demo never opens a database connection. Payments remain disabled.

## Database

Only apply `db/migrations/` to the positively identified Sales database. They create isolated `sales`/`sales_private` schemas and narrowly scoped roles; they do not touch Managed Auth tables or existing application schemas. Never apply historical provider migrations or create `auth.uid()` substitutes in Neon. No existing database is reset or dropped by migration tooling.

```bash
# Explicit target binding + separate migration admin credentials required; see deployment runbook.
npm run db:migrate
# Runtime role setup is a separate, explicit operator step:
node scripts/configure-runtime-role.mjs
```

`DATABASE_URL` must use the dedicated non-owner `ascivus_runtime` login (NOINHERIT, NOBYPASSRLS, no role/database creation), with membership only in `ascivus_app`. The application refuses owner/superuser/bypass/role-admin connections. Hosted URLs require `sslmode=verify-full`. Do not put migration credentials in a running Preview service.

## Checks

```bash
npm ci
npm audit --audit-level=low
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
npx playwright install --with-deps chromium
npm run test:e2e
npm run test:connected
npm run test:hosted
```

`test:integration` creates/removes only its own disposable local PostgreSQL container. `test:connected` adds a real local Better Auth server with mandatory OTP and in-memory test mail, then runs two-user REST/browser and reset-revocation tests. It does NOT claim to be a hosted Neon test. Hosted tests require explicitly isolated test identities, a verified target and a real HTTPS Preview; missing requirements return `BLOCKED / NOT RUN` with exit code 2. No runner resets a hosted database.

On the prepared cloud machine, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` for browser tests. No secret values or `.env*` files belong in Git. Local test credentials/mail are ephemeral, test-only and never shipped.

[Architecture](docs/ARCHITECTURE.md) · [Database model](docs/DATA_MODEL.md) · [Security](docs/SECURITY.md) · [Import contract](docs/IMPORT_SPEC.md) · [Test results](docs/TEST_PLAN.md) · [Environment](docs/ENVIRONMENT.md) · [Free Preview and blockers](docs/PREVIEW_DEPLOYMENT.md) · [Phase 1 status](docs/PHASE1_STATUS.md)
