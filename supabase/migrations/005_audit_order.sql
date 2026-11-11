begin;
-- Transaction timestamps would tie every row in a large import. Preserve real event order.
alter table public.audit_events alter column occurred_at set default clock_timestamp();
commit;
