# BotLab reuse map
Read-only reference: `stevencarstoiu/trading-sass`, branch `phase-3-billing-and-trials`, inspected commit `cf0b0b0231d86fe90a5e6935a5c7cafe9ad83bba`.

| Reference path (under ascivus-botlab/) | Decision |
| --- | --- |
| src/lib/supabase/server.ts | Adapt cookie-based SSR client; use publishable key convention. |
| src/middleware.ts | Adapt refresh/cookie propagation into Next 16 `src/proxy.ts`. |
| src/components/interface-mode.tsx | Adapt persisted basic/advanced view; remove trading types. |
| src/lib/billing/plans.ts, access.ts | Reuse typed catalog/entitlement pattern; new preview-only plan. |
| src/components/auth-form.tsx, auth-page.tsx | Reference auth UX only; implement new forms and safe callbacks. |
| src/app/globals.css, dashboard layout | Reference shell structure; new independent Sales design. |
| tests/sql/run-local.sh, .github/workflows/botlab-ci.yml | Adapt disposable PostgreSQL validation and CI approach. |
| src/lib/validation.ts | Reference Zod boundary validation; new sales schemas. |

No source files copied verbatim. Excluded: trading engines, simulators, bot routes, migrations, trial logic, pricing IDs, Stripe calls, service-role clients, AI calls, secrets and customer data. Source checkout remains read-only in `/tmp/ascivus-source`; no source settings or deployment touched.

Guidance reviewed: current Next official GitHub `docs/01-app/03-api-reference/03-file-conventions/proxy.mdx` (proxy convention); Supabase SSR README and package source; read-excel-file official README. Direct nextjs.org/supabase.com docs returned network-policy 403. Versions are pinned in package.json/lockfile; npm audit results recorded separately.

Installed-version Next guides also reviewed in `node_modules/next/dist/docs/`: proxy, route handlers, server actions and authentication/DAL guidance, after `next dev` generated the root AGENTS.md notice. Authorization lives in the DAL/actions/routes, never only the layout or proxy.
