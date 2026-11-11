# Architecture

A single Next.js 16 App Router application, Node 24, React, strict TypeScript. `src/proxy.ts` refreshes Supabase cookies; it is not the authorization boundary. Every server page/action/route independently obtains a verified user and membership using `src/lib/workspace.ts`. User-scoped Supabase clients exercise RLS; there is no service-role client in application code.

`src/lib/database.types.ts` is generated from the actual disposable schema; `database.ts` adds exact decimal string write types and nullable RPC filter arguments that the generator cannot represent. Zod validates incoming forms and import mapping. Dynamic CRM operations use a small typed union only after entity allowlisting and Zod validation.

Data flow: browser → Server Component/Action or bounded Route Handler → verified identity/membership → PostgreSQL RLS/constraints/triggers → readable server result. Commercial audit and status activities are generated transactionally in SQL. Normal mutations use `updated_at` optimistic concurrency. Organization switching uses a same-site HttpOnly cookie whose value is always checked against membership; it never grants access.

The import route re-parses and validates the file on every preview/commit. Preview is ephemeral and writes no commercial data. Explicit commit stages normalized rows via a narrow authenticated procedure, then commits atomically with job locking/idempotency. Completed staging is immediately deleted. No raw uploaded binary is persisted.

Dashboard aggregates run in PostgreSQL under invoker security, grouping exact numerics by currency and returning totals as text. Priority/recent tables are bounded, and CRM lists paginate at 25 rows. Relation pickers search all active records with bounded 30-result responses; customer/contact foreign keys enforce correctness even for forged requests.

Demo imports only deterministic in-memory fixtures, never Supabase. No payment, AI or communications SDK is loaded. Billing has a typed provisional preview catalog, entitlement check and provider contract, with DB-enforced organization usage caps. Future communications can attach verified provider event identifiers through a separately reviewed adapter; ordinary manual logs cannot forge one. No speculative AI adapter or empty queue system is included.

UI uses independent CSS design tokens, responsive grids, native labelled forms, keyboard focus, a skip link, explicit loading/error/empty states and Basic/Advanced browser-local preference. Charts are accessible labelled HTML bars and tables, avoiding a chart dependency.

Current limitations: no invitations or team management; exports intentionally cap at 1,000 active offers; list filter dropdowns cap customer options at 1,000 (record editing has full search); activity/detail side panels show recent bounded history. No historical status-series reconstruction: charts explicitly describe current-status creation cohorts.
