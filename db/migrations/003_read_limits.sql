begin;
set local role ascivus_owner;
create view sales.offer_records with(security_invoker=true) as select o.*,o.amount::text exact_amount from sales.offers o;
revoke all on sales.offer_records from public;
grant select on sales.offer_records to ascivus_app;
create function sales_private.enforce_limit() returns trigger language plpgsql security definer set search_path='' as $$declare n int;lim int;begin
if new.organization_id is distinct from sales_private.current_org() or not sales_private.member_of(new.organization_id) then raise exception 'Organization access denied';end if;
perform 1 from sales.organizations where id=new.organization_id for update;
if tg_table_name='offers' then select count(*) into n from sales.offers where organization_id=new.organization_id;lim=10000;
elsif tg_table_name='customers' then select count(*) into n from sales.customers where organization_id=new.organization_id;lim=10000;
else select count(*) into n from sales.contacts where organization_id=new.organization_id;lim=20000;end if;
if n>=lim then raise exception 'Preview organization usage limit reached';end if;return new;end$$;
create trigger offer_limit before insert on sales.offers for each row execute function sales_private.enforce_limit();
create trigger customer_limit before insert on sales.customers for each row execute function sales_private.enforce_limit();
create trigger contact_limit before insert on sales.contacts for each row execute function sales_private.enforce_limit();
revoke all on function sales_private.enforce_limit() from public,ascivus_app;
-- Exposed procedures are invoker wrappers. Definer implementations stay in the non-exposed private schema.
alter function sales.create_organization(text,text,uuid) set schema sales_private;
alter function sales.stage_import(uuid,text,text,text,jsonb) set schema sales_private;
alter function sales.commit_import(uuid,text) set schema sales_private;
create function sales.create_organization(p_name text,p_currency text,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select sales_private.create_organization(p_name,p_currency,p_request)$$;
create function sales.stage_import(p_org uuid,p_name text,p_fingerprint text,p_mapping text,p_rows jsonb) returns uuid language sql security invoker set search_path='' as $$select sales_private.stage_import(p_org,p_name,p_fingerprint,p_mapping,p_rows)$$;
create function sales.commit_import(p_job uuid,p_conflict text) returns jsonb language sql security invoker set search_path='' as $$select sales_private.commit_import(p_job,p_conflict)$$;
revoke all on function sales.create_organization(text,text,uuid),sales.stage_import(uuid,text,text,text,jsonb),sales.commit_import(uuid,text) from public;
grant execute on function sales.create_organization(text,text,uuid),sales.stage_import(uuid,text,text,text,jsonb),sales.commit_import(uuid,text) to ascivus_app;
commit;
