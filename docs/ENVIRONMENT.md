# Secure environment bindings

Set real values through secure environment/provider settings, never in Git or chat:

| Variable | Purpose |
| --- | --- |
| SITE_URL | Exact application origin; local default development port is 3000, connected tests use 3001. |
| NEON_AUTH_BASE_URL | Managed Better Auth endpoint copied from the designated Neon branch, including its database/auth path. |
| NEON_AUTH_COOKIE_SECRET | Random 32+ character server secret for AES-256-GCM session-cookie encryption. Never prefix with NEXT_PUBLIC. |
| DATABASE_URL | Dedicated ascivus_runtime connection to the Sales database, verify-full TLS; pooler is supported. |
| DATABASE_MIGRATION_URL | Separate admin connection used ONLY for explicit migrations/role setup. Omit from the running service. |
| NEON_PROJECT_ID / NEON_BRANCH_ID | Explicit approved target metadata for guarded operator scripts. |
| NEON_APPROVED_TARGET | Explicit console-verified project/branch confirmation, formatted as project-id/branch-id; must match the two target metadata bindings. Not independently asserted by the script. |
| NEON_ALLOW_ADDITIVE_MIGRATION | Must be `yes` to permit a hosted additive migration. Not enabled automatically. |
| NEON_ALLOW_ROLE_SETUP | Must be `yes` for explicit creation of a dedicated runtime role; existing roles/passwords are never overwritten. |

No client-side auth SDK or public backend URL/key variables are required. Historical NEXT_PUBLIC_SUPABASE variables are ignored and should be removed from new deployment settings. Provider session tokens are never placed in JavaScript storage, HTML data or query parameters. Cookie envelope encryption does not replace provider session validation.

The environment draft contains variable requirements and additive HTTP entries for the Managed Auth hostname and official provider documentation. A saved draft does not apply/publish settings. Review/save in environment settings, then publish the environment when the product requires it. Enter actual secrets securely. Verify observed bindings and fresh connectivity before running hosted checks. Raw PostgreSQL connectivity may also need the actual database hostname allowed by the execution environment; do not disable TLS or bypass network policy.

Local integration scripts generate credentials only in child-process environments, bind to loopback, create a separately named disposable container and remove it afterward. They never read a hosted URL for destructive setup. If using an ignored local .env.local, generate values privately and do not print/dump them. Node test scripts expect process environment bindings; Next dev/build also reads ignored local configuration.
