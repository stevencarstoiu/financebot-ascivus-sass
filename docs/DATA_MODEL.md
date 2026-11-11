# Data model

All exposed tables enable RLS. UUID tenant identity is anchored in `organization_members`, never editable user metadata. Organization IDs and entity IDs cannot change on CRM updates. Audit rows are append-only for ordinary users. Schema source: `supabase/migrations/`.

| Table | Purpose / invariants |
| --- | --- |
| profiles | Auth user FK, bounded display name; only the user can read/write their profile. |
| organizations | Name, unique stable UUID slug, ISO currency, configurable 1–365 day follow-up threshold. Settings owner/admin only. |
| organization_members | Composite primary key, owner/admin/member model; no ordinary insert/update/delete grants. Initial owner created atomically; last-owner trigger protects privileged future maintenance too. |
| customers | Company/person, normalized name, optional unique org reference, URL, notes, archive. |
| contacts | Customer relationship using (customer_id, organization_id); contact identity also includes customer_id for offer FKs. |
| offers | Exact numeric(18,4), ISO currency, statuses/dates, source, archive, customer/contact composite FKs. Primary contact must belong to both organization and customer. |
| activities | Append-only manual logs or generated status changes; actual actor/time overwritten by trigger. No fabricated provider event IDs. |
| import_jobs | Safe filename, SHA-256 file/mapping fingerprints, initiating user, bounded rows, lifecycle, result, 24h expiry. |
| import_rows | Bounded normalized JSON staging; job/tenant composite FK; ordinary API cannot insert/update/delete. |
| audit_events | Real actor, entity, operation, changed field names, wall-clock timestamp; no contact bodies/tokens/upload contents. |

`offer_records` is a security-invoker view containing `exact_amount` as text; do not use JS Number for totals or edits. SQL totals remain exact. Formatting preserves significant source decimal places, including currencies with a different display minor-unit convention.

Status invariants: draft clears sent/response/closed dates; sent requires sent date and no response/closed date; replied requires first response; won/lost require closed date. Response/closure cannot precede sent date. The application records current time for manually confirmed responses/closures (or a future sent time to preserve ordering); this is manual state, not a provider-delivery timestamp. Manual corrections remain audited. Changing a replied offer to closed preserves known first response.

Follow-up is derived: active + sent + no first response + UTC calendar date difference >= organization threshold (default 7). Closed offers never qualify. UTC is the documented day boundary; no mixed local-time thresholds. Open potential = sent + replied. Won value is explicitly manually confirmed. Conversion = won / (won + lost); zero closed denominator displays no rate.

Indexes cover membership user lookup; organization/customer name and updated time; offers organization/status/sent date, customer and updated time; timeline and import org/date; external references. The disposable integration test exercises 1,101 offers with real RLS. This is not a 10k-user scalability certification.
