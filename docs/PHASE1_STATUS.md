# Phase 1 status

Implementation target: `/workspace/ascivus-sales-saas`, local Git branch `phase-1`. Source and original selected checkout remain unchanged. Working title only; no final brand published.

**Local workspace implemented and functionally verified. Preview: NOT DEPLOYED.** Publication target: the EXISTING `https://github.com/stevencarstoiu/financebot-ascivus-sass` repository, branch `phase-1`. The publication commit descends from existing `main`; no new repository is created and `main` is not pushed. Final push status and exact SHA are reported after verification. Separate hosted Supabase and Vercel credentials remain absent.

| # | Required feature | Status | Evidence / limit |
| --- | --- | --- | --- |
| 1 | Isolated project / existing Git target | DONE locally | Isolated sibling checkout and pinned lockfile. Publication branch is based on the existing financebot repository main; the original completed local commit is retained on local/completed-phase-1. |
| 2 | Authentication | DONE (local) | Real local Supabase signup, mail-catcher confirmation, login/logout, generic recovery, reset and new-password login through browser. Hosted delivery NOT RUN. |
| 3 | Organizations / isolation | DONE (local) | Atomic ownership, role model, all-table RLS, composite FKs, invoker view/RPCs, owner protection. SQL and two real authenticated REST identities verified. Hosted checks NOT RUN. |
| 4 | Mini CRM | DONE (local) | Customer/contact/offer create/edit/archive/restore, search/pagination/filters/sort, searchable relationships, stale-edit condition, manual activity. Full connected browser journey verified. |
| 5 | CSV/XLSX import | DONE (local) | Bounded parsing/mapping/preview/validation, explicit duplicate modes, atomic DB commit/idempotency/history/report, cleanup command. 100/1,000 rows of each format in parser tests; real 100-row CSV + 100-row XLSX browser imports. Automatic TTL scheduler not provisioned. |
| 6 | Real dashboards | DONE (local) | SQL aggregates, exact amounts by currency, priority rule, modes/persistence, advanced filters, age/cohort/closed conversion, bounded CSV export. Synthetic and real browser assertions. |
| 7 | Audit / commercial timeline | DONE (local) | Separate append-only tables; actor attribution and status events; DB boundary triggers for records/imports/membership; wall-clock ordering. Rollback/immutability verified. |
| 8 | Fictional demo | DONE | In-memory read-only `/demo`, offers/details/filters/modes, explicit fiction labels; browser verifies zero Supabase/payment/AI requests. |
| 9 | Billing-ready interfaces | DONE (inactive) | Typed preview plan, feature entitlement resolution, DB usage caps, BillingProvider boundary, honest settings; no checkout, trial billing, webhooks or Stripe calls. |
| 10 | Tests, CI, security, Preview | PARTIAL | Local lint/typecheck/unit/SQL/build/browser/Auth/REST verified; CI definition committed. GitHub-hosted CI and hosted Preview NOT RUN/BLOCKED. |

## Verification record

- Frozen clean install: `npm ci` **PASS** (413 packages); lint, strict typecheck, all 29 unit tests and production build **PASS** afterward.
- Unit: **29 PASS**, 2 files, including 100/1,000-row CSV and XLSX and malicious archive cases.
- PostgreSQL: **52 PASS assertions/denials**, full migrations on disposable PostgreSQL 17; 100-row + 1,000-row transactions; exact decimals, FK/RLS/role/audit/rollback/idempotency/TTL maintenance. Representative indexed priority query at 1,101 offers: approximately 0.08 ms in this local run, not a performance guarantee.
- Connected: real local Supabase Auth/REST two-identity checks **PASS**; **2 browser tests PASS** through saved `npm run test:connected` with documented cloud proxy health workaround. Full CSV/XLSX + recovery journey, direct unauthenticated Server Action replay/import rejection, guessed tenant ID data denial and mobile record-list layout.
- Public/demo: **6 browser tests PASS**, desktop/mobile against the final optimized production build.
- `npm audit`: **0 known vulnerabilities** after transitive minimatch override; all direct dependencies pinned.
- Lint, strict typecheck and optimized production build **PASS** after clean install. Source secret-pattern scan **PASS**. Hosted readiness remains unverified.

## Important fixes from tests

Metrics SQL reserved alias; generic trigger field access; callback redirect used internal bind host; tied audit timestamps; last-owner update behavior; pre-hydration file input readiness; exact numeric/nullable RPC generated types; correct streamed notFound assertions. No test assertions disabled. A streamed notFound response can retain status 200; tests assert the notFound boundary, no record form and no other tenant's content.

## Remaining release/operational gates

- Provision/designate a separate non-production Supabase and Vercel Preview; configure target-only variables and exact auth redirects; run hosted acceptance/isolation. Git publication uses only the existing financebot repository. See PREVIEW_DEPLOYMENT.
- Configure hosted test-only SMTP delivery, provider/WAF abuse limits, refresh/caching checks, staging cleanup scheduler, backups/retention/monitoring and legal review. Local relaxed mail rates are test-only. No paid infrastructure or production action authorized by this delivery.
- Verify hosting's actual body limit; it may be below application 5 MB. Never advertise unsupported limits.
- Audit is append-only for ordinary users, not tamper-proof against privileged DB operators. No legal/security/production-scale certification.
- UI filter dropdowns show at most 1,000 customers; record relationship pickers search all records (30 results at a time). Details/timelines show bounded recent related records. Export caps at 1,000 active offers. UTC defines calendar-day follow-up. These bounds are intentional and documented; richer export/history navigation remains future work.
- Team invitations/management, live payments, AI/mailbox integrations and automatic outreach are explicitly out of Phase 1 scope.

Major locations: `supabase/migrations/`; `src/app/app/`; `src/app/auth/`; `src/features/imports/` and `src/app/api/imports/`; `src/features/dashboard/`; `src/features/demo/`; `src/features/billing/`; `tests/unit/`, `tests/integration/`, `tests/e2e/`; `.github/workflows/ci.yml`.
