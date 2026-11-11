# Import contract

`POST /api/imports` requires a verified session, membership, same-origin request and import entitlement. Bounded multipart Route Handler (not a raised global Server Action limit), Node runtime, maxDuration 30s. Files are parsed again on commit, so a client cannot edit a preview response and bypass validation.

CSV: UTF-8 with optional BOM; detected comma/semicolon/tab; consistent columns and CSV quoting via csv-parse. Headers unique/nonempty. XLSX: read-excel-file 9.3.15 after yauzl 3.4.0 ZIP preflight. `.xls`, `.xlsm`, invalid signatures, empty/corrupt/encrypted/formula/external/macro workbooks are rejected. Literal formula-looking CSV text is never executed and is safely escaped on export. See SECURITY for byte/row/cell/ZIP limits.

Map `customer_name`, `offer_title`, `offer_value` (required); optional `contact_name`, `contact_email`, `currency`, `offer_status`, `sent_at`, `external_reference`, `notes`. One source column per destination. Missing status defaults to draft, missing currency to organization default; this is disclosed in the UI. Email requires contact name. Dates are strict YYYY-MM-DD. Non-draft rows require sent date. Draft dates are cleared. XLSX date cells become ISO calendar dates.

Strict numeric mode allows point decimals without grouping, rejecting separator + exactly three trailing digits as ambiguous. EU mode explicitly uses period groups/comma decimal; US mode uses comma groups/point decimal. XLSX stored numeric literals use point decimals: choose US mode. No exponent, negative, currency-symbol or precision-losing JS Number coercion. Up to 14 integer and 4 fractional digits, stored numeric(18,4).

Preview shows raw first 20 rows, mappings, all-row issues and within-file duplicates. It writes no commercial data. Error CSV includes row numbers/issues, formula-safe quoting. Commit revalidates every row; any invalid row rejects the whole file.

Deduplication: unique external reference per organization first; otherwise exact active normalized customer name + title + exact amount + currency + sent timestamp. Names match conservatively by trim/lower; no fuzzy merging. Multiple exact customer candidates choose earliest stable record; review duplicates before using update. Skip is default. Update explicitly replaces matched offer values; create makes a separate offer for heuristic matches, but skips an existing unique external reference. Contacts match exact customer/name/email. No orphan customer/contact records for skipped offers.

SHA-256 file + mapping/locale/worksheet/conflict choice fingerprints and initiating user scope identify a staged job. An organization lock prevents concurrent duplicate staging. Repeated commit locks the job and returns its stored original result; retries cannot multiply records. One transaction commits up to 1,000 rows. No partial-success mode. Job status/count/result metadata is retained; staging is deleted immediately on success.

Staging TTL is 24 hours. Privileged manual maintenance (only the NEW target database):

```sql
select private.cleanup_imports();
```

Schedule that command through a separately configured privileged database scheduler. Ordinary clients cannot execute it. No automatic schedule is provisioned. Binary files never persist. Expired staging can remain physically present until maintenance runs; TTL alone does not claim deletion.

Next route accepts 5 MB; a hosting provider may cap request bodies below that (e.g. some Vercel functions). Verify target plan/runtime limits before advertising 5 MB in hosted Preview. If lower, reduce the product limit or implement a separately reviewed bounded object upload; no unavailable upload infrastructure is simulated.
