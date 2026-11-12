begin;
set local role ascivus_owner;
-- Transaction timestamps would tie every row in a large import. Preserve real event order.
alter table sales.audit_events alter column occurred_at set default clock_timestamp();
commit;
