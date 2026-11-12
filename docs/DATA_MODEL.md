# PostgreSQL data model

Apply only `db/migrations/001_sales.sql` through `006_identity.sql`, in lexical order. All new application objects use `sales` and `sales_private`; existing Managed Auth schemas/tables are neither referenced as foreign keys nor changed.

`profiles.user_id` is an internal UUID. `auth_subject` is a unique opaque provider subject (up to 200 characters), established from a provider-verified session and immutable through runtime grants/triggers. Every membership/actor FK references this internal mapping. There is no assumed auth.users table, UUID provider subject, auth.uid() function or editable JWT authorization metadata.

Organization membership is the single source of tenant/RBAC authority. Creator ownership is atomic and idempotent. Only owners/admins update organization settings; ordinary members may manage CRM. No runtime membership insert/update/delete grants; future invitations remain out of scope. The last-owner trigger rejects deletion/demotion while permitting legitimate privileged maintenance. Membership reads/locks are scoped to the verified actor; locks prevent concurrent revocation during sensitive operations.

Customers, contacts, offers, activities, import jobs/rows and audit retain the previous business fields and UUIDs. Composite customer/tenant and contact/customer/tenant foreign keys prevent guessed-ID linking. Tenant/entity identity is immutable. Exact numeric(18,4), nonnegative amounts, ISO currency constraints, status/date invariants and updated_at concurrency protection remain enforced. No currency conversions or floating-point totals.

Every application table has RLS and explicit per-operation grants. Tenant-table policies additionally require the selected transaction organization context. Read views use security_invoker. Necessary owner functions are in the private schema, qualify names, pin search_path, revoke PUBLIC execution and verify actor/tenant/initiator. Only narrow invoker wrappers are exposed to the application role. Schema owner is NOLOGIN; runtime has neither ownership nor bypass/admin capabilities.

Needs follow-up is derived using UTC calendar days: active sent offer, no first response, age >= organization threshold (default 7). Open potential = sent + replied; won = manually confirmed. Totals group by original currency, conversion = won / (won + lost), no denominator displays no rate. Activity means manual logging, not product-sent messages.

Audit contains actor, organization, entity, operation, changed field names and wall-clock ordering. Sensitive contact/upload contents are not copied. Application-role inserts/updates/deletes/truncation and trigger/RLS alteration are denied. Audit is tamper-resistant for application users, not against database administrators.

Migration tooling uses checksummed version records, a lock, atomic additive changes and fail-closed schema adoption checks. It never drops/reset an existing database. Applying a migration twice verifies its checksum. Historical provider schema/data is not copied automatically: any authorized data move needs an explicit verified identity mapping and separate review; do not export BotLab credentials, auth sessions or unrelated customer data.
