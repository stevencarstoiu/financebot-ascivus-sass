begin;
set local role ascivus_owner;
create function sales.stage_import(p_org uuid,p_name text,p_fingerprint text,p_mapping text,p_rows jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare jid uuid;r jsonb; n int:=1;begin
if p_org is distinct from sales_private.current_org() or not sales_private.member_of(p_org) then raise exception 'Organization access denied';end if;
if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 or octet_length(p_rows::text)>5000000 then raise exception 'Invalid import size';end if;
perform 1 from sales.organizations where id=p_org for update;
select id into jid from sales.import_jobs where organization_id=p_org and initiated_by=sales_private.current_user_id() and fingerprint=p_fingerprint and mapping_fingerprint=p_mapping and (status='completed' or expires_at>now()) order by created_at desc limit 1;
if jid is not null then return jid;end if;
insert into sales.import_jobs(organization_id,file_name,fingerprint,mapping_fingerprint,row_count) values(p_org,p_name,p_fingerprint,p_mapping,jsonb_array_length(p_rows)) returning id into jid;
for r in select value from jsonb_array_elements(p_rows) loop n=n+1;insert into sales.import_rows(job_id,organization_id,row_number,data) values(jid,p_org,n,r);end loop;
return jid;end$$;
create function sales.commit_import(p_job uuid,p_conflict text) returns jsonb language plpgsql security definer set search_path='' as $$declare j sales.import_jobs;r record;d jsonb;cid uuid;pid uuid;oid uuid;created int:=0;updated int:=0;skipped int:=0;st text;sa timestamptz;res jsonb;begin
select * into j from sales.import_jobs where id=p_job for update;
if j.id is null or j.organization_id is distinct from sales_private.current_org() or not sales_private.member_of(j.organization_id) or j.initiated_by<>sales_private.current_user_id() then raise exception 'Import access denied';end if;
if j.status='completed' then return j.result;end if;
if j.expires_at<=now() or j.status<>'validated' then raise exception 'Import expired or invalid';end if;
if p_conflict not in ('skip','update','create') then raise exception 'Invalid conflict option';end if;
if (select count(*) from sales.import_rows where job_id=j.id)<>j.row_count then raise exception 'Incomplete staging';end if;
update sales.import_jobs set status='committing' where id=j.id;
for r in select * from sales.import_rows where job_id=j.id order by row_number loop
 d=r.data;cid=null;pid=null;oid=null;st=d->>'offer_status';sa=nullif(d->>'sent_at','')::timestamptz;
 if length(trim(d->>'customer_name')) not between 1 and 200 or length(trim(d->>'offer_title')) not between 1 and 240 or (d->>'offer_value') !~ '^[0-9]{1,14}(\.[0-9]{1,4})?$' then raise exception 'Invalid normalized row %',r.row_number;end if;
 if d->>'currency' !~ '^[A-Z]{3}$' or st not in ('draft','sent','replied','won','lost') or (st<>'draft' and sa is null) then raise exception 'Invalid currency/status/date row %',r.row_number;end if;
 select id into cid from sales.customers where organization_id=j.organization_id and normalized_name=lower(trim(d->>'customer_name')) and archived_at is null order by created_at,id limit 1;
 -- Deduplication occurs before creating commercial records.
 if nullif(d->>'external_reference','') is not null then
 select id into oid from sales.offers where organization_id=j.organization_id and external_reference=d->>'external_reference';
 elsif cid is not null then
 select id into oid from sales.offers where organization_id=j.organization_id and customer_id=cid and title=d->>'offer_title' and amount=(d->>'offer_value')::numeric and currency=d->>'currency' and sent_at is not distinct from sa and archived_at is null order by created_at,id limit 1;
 end if;
 if oid is not null and (p_conflict='skip' or (p_conflict='create' and nullif(d->>'external_reference','') is not null)) then skipped=skipped+1;continue;end if;
 if oid is not null and p_conflict='create' then oid=null;end if;
 if cid is null then insert into sales.customers(organization_id,display_name) values(j.organization_id,d->>'customer_name') returning id into cid;end if;
 if nullif(d->>'contact_name','') is not null then
 select id into pid from sales.contacts where organization_id=j.organization_id and customer_id=cid and full_name=d->>'contact_name' and email is not distinct from nullif(d->>'contact_email','') and archived_at is null order by created_at,id limit 1;
 if pid is null then insert into sales.contacts(organization_id,customer_id,full_name,email) values(j.organization_id,cid,d->>'contact_name',nullif(d->>'contact_email','')) returning id into pid;end if;end if;
 if oid is null then
 insert into sales.offers(organization_id,customer_id,primary_contact_id,title,external_reference,amount,currency,status,sent_at,first_response_at,closed_at,notes,source) values(j.organization_id,cid,pid,d->>'offer_title',nullif(d->>'external_reference',''),(d->>'offer_value')::numeric,d->>'currency',st,case when st='draft' then null else sa end,case when st='replied' then greatest(sa,now()) else null end,case when st in ('won','lost') then greatest(sa,now()) else null end,nullif(d->>'notes',''),'import');created=created+1;
 else
 update sales.offers set customer_id=cid,primary_contact_id=pid,title=d->>'offer_title',amount=(d->>'offer_value')::numeric,currency=d->>'currency',status=st,sent_at=case when st='draft' then null else sa end,first_response_at=case when st='replied' then greatest(sa,now()) else null end,closed_at=case when st in ('won','lost') then greatest(sa,now()) else null end,notes=nullif(d->>'notes','') where id=oid;updated=updated+1;
 end if;
end loop;
res=jsonb_build_object('created',created,'updated',updated,'skipped',skipped,'errors',0);
update sales.import_jobs set status='completed',completed_at=now(),duplicate_count=updated+skipped,result=res where id=j.id;
delete from sales.import_rows where job_id=j.id;
return res;end$$;
-- Scheduler/manual maintenance uses a privileged SQL connection, not the browser.
create function sales_private.cleanup_imports() returns int language plpgsql set search_path='' as $$declare n int;begin
delete from sales.import_rows where job_id in(select id from sales.import_jobs where expires_at<now());
update sales.import_jobs set status='expired' where expires_at<now() and status in ('preview','validated','failed');get diagnostics n=row_count;return n;end$$;
create function sales.dashboard_metrics(p_org uuid,p_currency text default null,p_customer uuid default null,p_from timestamptz default null,p_to timestamptz default null,p_status text default null) returns jsonb language sql stable security invoker set search_path='' as $$
with scope as(select o.* from sales.offers o where o.organization_id=p_org and o.archived_at is null and (p_currency is null or o.currency=p_currency) and (p_customer is null or o.customer_id=p_customer) and (p_from is null or o.created_at>=p_from) and (p_to is null or o.created_at<=p_to) and (p_status is null or o.status=p_status)),
counts as(select status,count(*) count from scope group by status),
values_by_currency as(select currency,coalesce(sum(amount) filter(where status in ('sent','replied')),0)::text open,coalesce(sum(amount) filter(where status='won'),0)::text won from scope group by currency),
aging as(select case when (now() at time zone 'UTC')::date-(sent_at at time zone 'UTC')::date<7 then '0–6' when (now() at time zone 'UTC')::date-(sent_at at time zone 'UTC')::date<14 then '7–13' when (now() at time zone 'UTC')::date-(sent_at at time zone 'UTC')::date<30 then '14–29' else '30+' end bucket,count(*) count from scope where status='sent' and first_response_at is null group by 1),
trend as(select to_char(created_at at time zone 'UTC','YYYY-MM') as "month",status,count(*) count from scope group by 1,2)
select jsonb_build_object('total',(select count(*) from scope),'counts',coalesce((select jsonb_object_agg(status,count) from counts),'{}'::jsonb),'followup',(select count(*) from scope where status='sent' and first_response_at is null and (now() at time zone 'UTC')::date-(sent_at at time zone 'UTC')::date>=(select followup_after_days from sales.organizations where id=p_org)),'values',coalesce((select jsonb_agg(values_by_currency order by currency) from values_by_currency),'[]'::jsonb),'aging',coalesce((select jsonb_object_agg(bucket,count) from aging),'{}'::jsonb),'trends',coalesce((select jsonb_agg(trend order by "month",status) from trend),'[]'::jsonb),'imported',(select count(*) from scope where source='import'),'waiting',(select count(*) from scope where status='sent' and first_response_at is null))$$;
revoke all on function sales.stage_import(uuid,text,text,text,jsonb),sales.commit_import(uuid,text),sales.dashboard_metrics(uuid,text,uuid,timestamptz,timestamptz,text) from public;
grant execute on function sales.stage_import(uuid,text,text,text,jsonb),sales.commit_import(uuid,text),sales.dashboard_metrics(uuid,text,uuid,timestamptz,timestamptz,text) to ascivus_app;
revoke all on function sales_private.cleanup_imports() from public,ascivus_app;
commit;
