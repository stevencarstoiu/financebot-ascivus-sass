# Import contract (Neon)

Authenticated same-origin bounded multipart POST `/api/imports`. Preview writes no commercial data. Commit reparses/revalidates the file and calls parameterized Sales procedures inside one verified actor/tenant transaction. No raw binaries are persisted.

CSV: UTF-8/BOM, comma/semicolon/tab detection, consistent quoting/columns via csv-parse. XLSX: maintained read-excel-file after ZIP preflight. Reject .xls/.xlsm, invalid signatures, corruption/encryption, formulas/macros/embedded objects/external links, DTD/entities and oversized dimensions. Limits: 5 MB input, 1,000 rows, 50 columns, 5 sheets, 2,000 ZIP entries, 20 MB expanded total, 8 MB per entry, ratio 150, 50,050 worksheet cells. Upload/body deadline and PostgreSQL statement/lock timeouts bound resource use. Hosting may impose smaller limits: verify before publishing size promises.

Required mappings: customer_name, offer_title, offer_value. Optional: contact_name/email, currency, offer_status, sent_at, external_reference, notes. Unmapped currency defaults to organization currency; status defaults to draft. Dates are strict YYYY-MM-DD. Non-draft requires sent date. Email requires contact name.

Strict number mode rejects ambiguous separator + three digits; EU explicitly uses grouped periods/comma decimal; US uses grouped commas/point decimal. XLSX numeric literals use point decimals. No exponent, negative value, fabricated conversion or JS Number coercion. Preserve up to 14 integer/four fractional digits.

Preview shows 20 rows and all-row issues/within-file duplicates. Safe downloadable issue CSV contains row numbers and messages. Dedupe: org-scoped unique external reference first; otherwise exact normalized active customer, offer title, amount, currency and sent timestamp. No fuzzy merging. Skip default; update explicit replacement; create allows separate heuristic matches but skips a colliding external reference. Contact match stays inside the chosen customer/tenant.

Organization/job locks and file+mapping+locale+sheet+conflict SHA-256 fingerprints make retries idempotent. All 1,000 rows commit or roll back together, including audit. The application stages and commits in one transaction; failed application imports leave no staged job/orphans. Directly staged DB test jobs remain retryable and expire. Metadata/history is retained; successful staging is immediately deleted.

TTL is 24h. No scheduler is created. An authorized administrator on the designated Sales database can run `select sales_private.cleanup_imports();`. Schedule explicitly using an approved free mechanism or perform manually. Do not add a paid cron/worker. Until maintenance runs, expired staging may remain physically present. Never claim TTL alone deletes it automatically.
