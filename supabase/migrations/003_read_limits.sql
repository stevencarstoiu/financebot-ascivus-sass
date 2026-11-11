begin;
create view public.offer_records with(security_invoker=true) as select o.*,o.amount::text exact_amount from public.offers o;
revoke all on public.offer_records from public,anon;
grant select on public.offer_records to authenticated;
create function private.enforce_limit() returns trigger language plpgsql security definer set search_path='' as $$declare n int;lim int;begin
if not private.member_of(new.organization_id) then raise exception 'Organization access denied';end if;
perform 1 from public.organizations where id=new.organization_id for update;
if tg_table_name='offers' then select count(*) into n from public.offers where organization_id=new.organization_id;lim=10000;
elsif tg_table_name='customers' then select count(*) into n from public.customers where organization_id=new.organization_id;lim=10000;
else select count(*) into n from public.contacts where organization_id=new.organization_id;lim=20000;end if;
if n>=lim then raise exception 'Preview organization usage limit reached';end if;return new;end$$;
create trigger offer_limit before insert on public.offers for each row execute function private.enforce_limit();
create trigger customer_limit before insert on public.customers for each row execute function private.enforce_limit();
create trigger contact_limit before insert on public.contacts for each row execute function private.enforce_limit();
revoke all on function private.enforce_limit() from public,anon,authenticated;
-- Exposed procedures are invoker wrappers. Definer implementation stays out of PostgREST.
alter function public.create_organization(text,text,uuid) set schema private;
alter function public.stage_import(uuid,text,text,text,jsonb) set schema private;
alter function public.commit_import(uuid,text) set schema private;
create function public.create_organization(p_name text,p_currency text,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select private.create_organization(p_name,p_currency,p_request)$$;
create function public.stage_import(p_org uuid,p_name text,p_fingerprint text,p_mapping text,p_rows jsonb) returns uuid language sql security invoker set search_path='' as $$select private.stage_import(p_org,p_name,p_fingerprint,p_mapping,p_rows)$$;
create function public.commit_import(p_job uuid,p_conflict text) returns jsonb language sql security invoker set search_path='' as $$select private.commit_import(p_job,p_conflict)$$;
revoke all on function public.create_organization(text,text,uuid),public.stage_import(uuid,text,text,text,jsonb),public.commit_import(uuid,text) from public,anon;
grant execute on function public.create_organization(text,text,uuid),public.stage_import(uuid,text,text,text,jsonb),public.commit_import(uuid,text) to authenticated;
commit;
