# Free-only Preview — NOT DEPLOYED

No hosted migration, account/plan change, infrastructure purchase, automatic paid overage or production deployment was performed. Git publication is separate from an actual Preview deployment.

## Approved scope

Only Git branch `phase-1-neon-free` in `stevencarstoiu/financebot-ascivus-sass`. Keep `main`, `phase-1` and BotLab untouched. The existing user-designated Neon Free project, branch and region must be positively confirmed in the console and bound in secure settings; provider target configuration is not hardcoded in Git. Managed Better Auth base URL and all secrets stay in secure environment settings, not this document.

## Verified Neon published Free limits

Source reviewed 12 November 2026: official [Neon plans](https://neon.com/docs/introduction/plans), fetched from the official [website source](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md), document revision updated 2026-11-11.

Published Free plan: $0/month; 100 CU-hours/project/month, up to 2 CU, scale-to-zero after five minutes (cannot disable), 1 GB Postgres storage/project and 20 GB account total, 5 GB network transfer/project/month, 10 branches/project, up to 60k Managed Better Auth MAU/project. Compute/transfer exhaustion suspends compute; storage-increasing operations fail at storage caps; no paid upgrade is enabled by this implementation. Avoid artificial keep-alive polling and paid plan changes. The existing account's actual plan/usage was reported by the user and has NOT been independently checked via provider credentials. Published allowances are not a guarantee of account eligibility or perpetual pricing.

## Render preparation and verification blocker

`deploy/render-free.yaml` is a **candidate**, explicitly `plan: free`, branch-specific, manual deployment only. No disks, managed databases, worker, cron, preview clones or paid fallback are declared. The health endpoint is liveness only and does not wake Neon. Runtime heap/pool limits and one build worker reduce resource demand.

**Render limits are NOT VERIFIED in this environment.** The official `https://render.com/docs/free` request is explicitly blocked by outbound policy; no Render credential/account binding exists. Do NOT apply the candidate or claim a verified $0 Preview until that check is complete. Review current Free runtime RAM/CPU, idle spin-down/cold start, shared free instance-hours, build minutes, egress limits, workspace eligibility and behavior at quota exhaustion. Confirm the account will suspend/fail at limits, not enable paid instances/automatic overages. Do not add a card, upgrade a plan or enable automatic paid usage. If a $0 configuration cannot be confirmed, stop; there is no paid fallback.

Additive environment network entries for the Auth host, neon.com and render.com were saved as a draft. Review/save and publish that environment configuration; saving a draft alone did not apply outbound permissions. After a real settings change, retry the official docs and Auth endpoint with fresh requests. Do not bypass the proxy/TLS policy.

## Operator runbook (not executed against hosted Neon)

1. Inspect the actual Neon console project/branch/region, Free plan and existing schemas. Confirm this is the authorized non-production Sales target, not any BotLab/production database. Obtain separate admin and intended runtime URLs securely, requiring verify-full TLS.
2. Set secure `DATABASE_MIGRATION_URL`, intended `DATABASE_URL`, NEON_PROJECT_ID, NEON_BRANCH_ID, NEON_APPROVED_TARGET (exact project/branch string) and explicit NEON_ALLOW_ADDITIVE_MIGRATION=yes. Run `npm run db:migrate`. It refuses unknown existing Sales schemas, checks migration versions/checksums, takes a lock, and applies only additive Sales schemas/roles in transactions. No reset/drop/truncate/data replacement commands exist in this tool.
3. Set NEON_ALLOW_ROLE_SETUP=yes only after target confirmation, then run `node scripts/configure-runtime-role.mjs`. It creates only `ascivus_runtime`, refuses an existing role rather than rotating/replacing it, and grants only ascivus_app membership. Existing runtime roles require manual privilege review, not automatic broad ALTER ROLE. Verify with the application role guard.
4. In the free Preview service, set ONLY SITE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET and the restricted runtime DATABASE_URL. Never supply migration/admin credentials to the running app. Configure Managed Auth allowed origins for the exact HTTPS Preview. Preserve mandatory OTP verification, attempts/expiry/rate limits and reset session revocation. Use designated test recipients only.
5. After current Render Free limits/account controls are verified, manually create/import only the Free service using the candidate and this Git branch. No automatic paid upgrade or production deployment. Use only the actual URL returned by the provider, then set SITE_URL/allowed origin exactly and rebuild if needed. Verify `/api/health` separately from a real authenticated workflow.
6. Run hosted-isolated tests using a real HTTPS Preview and two preverified synthetic test identities owned by the operator. Secure variables: HOSTED_PREVIEW_URL, HOSTED_TEST_EMAIL_A/B, HOSTED_TEST_PASSWORD_A/B, NEON_PROJECT_ID, NEON_BRANCH_ID, NEON_APPROVED_TARGET and NEON_HOSTED_TEST_ISOLATED=yes. `npm run test:hosted` refuses missing/unapproved targets and never resets/migrates a hosted database. It creates only new clearly synthetic organizations/records. Real OTP delivery and reset-revocation still require explicit hosted acceptance with approved mailboxes.
7. Check two-tenant CRUD/FKs/imports/audit, server actions/REST/origin denial, session revocation, currency totals, responsive/keyboard UI, actual request/body/memory limits, cleanup/retention and provider usage caps. Do not advertise production security/scale/compliance from local tests.

Manual staging maintenance: using an approved administrator only, `select sales_private.cleanup_imports();`. No paid scheduler or worker is created. Legal/privacy text remains a draft. No live payments, AI or outreach are enabled.
