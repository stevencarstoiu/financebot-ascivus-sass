# Validation evidence and reproducibility

Validation date: 12 November 2026 (Europe/Bucharest). Source reference commit recorded in BOTLAB_REUSE_MAP. All application code targets the new sibling checkout.

## Checks

- `npm run lint`: ESLint/Next/TypeScript rules.
- `npm run typecheck`: strict TypeScript, generated local Supabase schema plus exact decimal boundary types.
- `npm test`: Vitest business and parser tests. 100/1,000-row CSV and XLSX, malformed/empty/huge/macro/formula/external/corrupt archives, locale ambiguity, invalid dates, duplicate mapping, exact money, callback allowlist, synthetic metrics, billing inactivity and follow-up exclusions.
- `npm run build`: optimized Next.js 16 webpack build, no Supabase credentials required for public/demo.
- `npm run test:integration`: real disposable PostgreSQL 17, mock **only auth.uid/identity context**, real RLS/constraints/grants/SQL. Two tenants plus ordinary-member identity, forbidden reads/updates/deletes/references/imports, membership escalation, last owner, actor attribution, immutable audit, invoker views, exact totals, 100 and 1,000-row atomic import/idempotency, complete rollback/no orphan. Container removed on exit. Do not describe this alone as real Supabase Auth.
- `npm run test:e2e`: six desktop/mobile Chromium tests against production build. Public/auth-unavailable route guard, callback failure/open-redirect rejection, demo filter and detail navigation, Basic/Advanced persistence, zero Supabase/Stripe/Mistral requests from demo, keyboard skip link, responsive overflow check and screenshots.
- `npm run test:connected`: fresh/reset **local-only** Supabase, two actual confirmed users for REST/RLS checks, then real browser signup + confirmation via local mail catcher, organization, customer/contact/offer, manual activity, 100-row CSV and 100-row XLSX import, metrics, audit, edit/archive/restore, billing-disabled state, logout, recovery email + reset and login. This runner hard-refuses hosted URLs and only resets the fixed disposable project ID.
- `npm audit --audit-level=moderate`: locked dependency audit. Reviewed parser packages and pinned all direct versions; minimatch override addresses transitive advisory. No verification bypasses.

Final clean install, lint, typecheck, 29 unit tests, 52 SQL assertions/denials, optimized build, six public/demo browser tests and zero-vulnerability audit PASS; connected Auth/REST and two browser tests PASS with the documented local workaround. See PHASE1_STATUS for release limits. CI defines all local gates and an isolated connected job; GitHub-hosted execution has not been verified; publication now targets the existing financebot repository phase-1 branch. Local results do not establish GitHub Actions outcomes.

## Repairs identified during validation

Reserved SQL alias in metrics; generic audit trigger record-field access across table types; callback redirect pointing to internal bind address; tied audit timestamps obscuring import completion after large imports; Playwright selectors colliding with Next route announcer or including option text; generated-schema type gaps for nullable SQL args/exact numeric strings. Repaired and relevant checks rerun. A pre-hydration file input race was fixed by disabling uploads until the client is ready; browser automation also waits for the enabled control. Stable-source regression passed. No failing required check is ignored.

## Environment distinctions

Chromium download CDN is denied by current outbound policy. Tests use the already installed `/usr/bin/chromium` through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; no TLS or package integrity checks disabled. Local Supabase CLI Auth health probe is incorrectly sent through the cloud proxy; `ASCIVUS_LOCAL_PROXY_HEALTH=1` keeps the stack running, then independent local HTTP readiness, Auth sessions, REST and browser tests must pass. Standard CI retains standard health startup. Supabase CLI needs permission to write its user config in this executor; project runtime files stay in the target checkout.

## Not verified

Hosted Supabase isolation/delivery, actual Vercel Preview, provider upload limits and WAF rules, real external SMTP delivery, live payments/AI/communication (deliberately absent), production security/scale/compliance and GitHub CI execution. Synthetic test data never enters any source/production project. Test traces can include disposable local sessions; keep outputs ignored and do not publish them as production diagnostics.
