begin;
-- Run only through the migration administrator on the explicitly designated Sales database.
-- Fail instead of adopting another application's existing schema or roles with unsafe privileges.
do $$begin
if exists(select 1 from pg_namespace where nspname in ('sales','sales_private')) then raise exception 'Sales schema already exists: inspect migration history before continuing';end if;
if exists(select 1 from pg_roles where rolname in ('ascivus_owner','ascivus_app')) then raise exception 'Existing Sales role names require manual review; no automatic adoption';end if;
create role ascivus_owner nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role ascivus_app nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
if exists(select 1 from pg_roles where rolname in ('ascivus_owner','ascivus_app') and (rolcanlogin or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb)) then raise exception 'Unsafe existing Sales role';end if;
execute format('grant ascivus_owner to %I',current_user);
end$$;
create schema sales authorization ascivus_owner;
create schema sales_private authorization ascivus_owner;
set local role ascivus_owner;
revoke all on schema sales,sales_private from public;
grant usage on schema sales,sales_private to ascivus_app;
alter default privileges in schema sales,sales_private revoke execute on functions from public;
create table sales.profiles(user_id uuid primary key default gen_random_uuid(),auth_subject text not null unique check(length(auth_subject) between 1 and 200),display_name text not null default '' check(length(display_name)<=120),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create function sales_private.current_user_id() returns uuid language sql stable security definer set search_path='' as $$select user_id from sales.profiles where auth_subject=nullif(current_setting('sales.auth_subject',true),'')$$;
create function sales_private.current_org() returns uuid language sql stable set search_path='' as $$select nullif(current_setting('sales.organization_id',true),'')::uuid$$;
create function sales.ensure_profile(p_name text default '') returns uuid language plpgsql security definer set search_path='' as $$declare actor uuid;subject text;begin
subject=nullif(current_setting('sales.auth_subject',true),'');if subject is null or length(subject)>200 then raise exception 'Verified identity required';end if;
insert into sales.profiles(auth_subject,display_name) values(subject,left(p_name,120)) on conflict(auth_subject) do nothing;
select user_id into actor from sales.profiles where auth_subject=subject;return actor;end$$;
revoke all on function sales_private.current_user_id(),sales_private.current_org(),sales.ensure_profile(text) from public;
grant execute on function sales_private.current_user_id(),sales_private.current_org(),sales.ensure_profile(text) to ascivus_app;
create table sales.organizations(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 120),normalized_slug text not null unique,default_currency text not null default 'EUR' check(default_currency ~ '^[A-Z]{3}$'),followup_after_days int not null default 7 check(followup_after_days between 1 and 365),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table sales.organization_members(organization_id uuid references sales.organizations on delete cascade,user_id uuid references sales.profiles(user_id) on delete restrict,role text not null check(role in ('owner','admin','member')),created_at timestamptz not null default now(),primary key(organization_id,user_id));
create index member_user on sales.organization_members(user_id,organization_id);
create function sales_private.member_of(org uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from sales.organization_members where organization_id=org and user_id=sales_private.current_user_id())$$;
create function sales_private.admin_of(org uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from sales.organization_members where organization_id=org and user_id=sales_private.current_user_id() and role in ('owner','admin'))$$;
revoke all on function sales_private.member_of(uuid),sales_private.admin_of(uuid) from public;
grant execute on function sales_private.member_of(uuid),sales_private.admin_of(uuid) to ascivus_app;
create table sales.customers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references sales.organizations,customer_type text not null default 'company' check(customer_type in ('company','person')),display_name text not null check(length(trim(display_name)) between 1 and 200),normalized_name text generated always as (lower(trim(display_name))) stored,external_reference text check(length(external_reference)<=120),website text check(length(website)<=500 and (website is null or website ~ '^https?://')),notes text check(length(notes)<=4000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(id,organization_id));
create unique index customer_reference on sales.customers(organization_id,external_reference) where external_reference is not null;
create index customer_search on sales.customers(organization_id,normalized_name);
create index customer_updated on sales.customers(organization_id,updated_at desc);
create table sales.contacts(id uuid primary key default gen_random_uuid(),organization_id uuid not null references sales.organizations,customer_id uuid not null,full_name text not null check(length(trim(full_name)) between 1 and 200),email text check(length(email)<=254 and (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),phone text check(length(phone)<=60),position text check(length(position)<=120),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(id,organization_id,customer_id),foreign key(customer_id,organization_id) references sales.customers(id,organization_id));
create index contact_customer on sales.contacts(organization_id,customer_id);
create table sales.offers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references sales.organizations,customer_id uuid not null,primary_contact_id uuid,title text not null check(length(trim(title)) between 1 and 240),external_reference text check(length(external_reference)<=120),amount numeric(18,4) not null check(amount>=0),currency text not null check(currency ~ '^[A-Z]{3}$'),status text not null default 'draft' check(status in ('draft','sent','replied','won','lost')),sent_at timestamptz,first_response_at timestamptz,closed_at timestamptz,last_activity_at timestamptz,notes text check(length(notes)<=4000),source text not null default 'manual' check(source in ('manual','import')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(id,organization_id),foreign key(customer_id,organization_id) references sales.customers(id,organization_id),foreign key(primary_contact_id,organization_id,customer_id) references sales.contacts(id,organization_id,customer_id),check((status='draft' and sent_at is null and first_response_at is null and closed_at is null) or (status='sent' and sent_at is not null and first_response_at is null and closed_at is null) or (status='replied' and sent_at is not null and first_response_at is not null and closed_at is null) or (status in ('won','lost') and sent_at is not null and closed_at is not null)),check(first_response_at is null or first_response_at>=sent_at),check(closed_at is null or closed_at>=sent_at));
create unique index offer_reference on sales.offers(organization_id,external_reference) where external_reference is not null;
create index offer_status on sales.offers(organization_id,status,sent_at) where archived_at is null;
create index offer_updated on sales.offers(organization_id,updated_at desc);
create index offer_customer on sales.offers(organization_id,customer_id);
create table sales.activities(id uuid primary key default gen_random_uuid(),organization_id uuid not null references sales.organizations,offer_id uuid not null,actor_user_id uuid default sales_private.current_user_id() references sales.profiles(user_id),type text not null check(type in ('note','call_logged','email_logged','status_change','followup_logged')),occurred_at timestamptz not null default now(),description text not null check(length(trim(description)) between 1 and 2000),provider_event_id text,foreign key(offer_id,organization_id) references sales.offers(id,organization_id));
create index activity_timeline on sales.activities(organization_id,occurred_at desc);
create table sales.import_jobs(id uuid primary key default gen_random_uuid(),organization_id uuid not null references sales.organizations,initiated_by uuid not null default sales_private.current_user_id() references sales.profiles(user_id),file_name text not null check(length(file_name)<=200 and file_name !~ '[/\\]'),fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),mapping_fingerprint text not null check(mapping_fingerprint ~ '^[a-f0-9]{64}$'),mapping_version int not null default 1 check(mapping_version=1),status text not null default 'validated' check(status in ('preview','validated','committing','completed','failed','expired')),row_count int not null check(row_count between 1 and 1000),duplicate_count int not null default 0,result jsonb,created_at timestamptz not null default now(),completed_at timestamptz,expires_at timestamptz not null default now()+interval '24 hours',unique(id,organization_id));
create index import_timeline on sales.import_jobs(organization_id,created_at desc);
create table sales.import_rows(job_id uuid not null,organization_id uuid not null,row_number int not null check(row_number between 2 and 1001),data jsonb not null check(octet_length(data::text)<=16000),primary key(job_id,row_number),foreign key(job_id,organization_id) references sales.import_jobs(id,organization_id) on delete cascade);
create table sales.audit_events(id uuid primary key default gen_random_uuid(),organization_id uuid not null references sales.organizations,actor_user_id uuid references sales.profiles(user_id),entity_type text not null,entity_id uuid not null,action text not null,changed_fields text[] not null default '{}',occurred_at timestamptz not null default now());
create index audit_timeline on sales.audit_events(organization_id,occurred_at desc);
create function sales_private.guard_update() returns trigger language plpgsql set search_path='' as $$begin
if new.organization_id<>old.organization_id or new.id<>old.id then raise exception 'Immutable identity';end if;
new.created_at=old.created_at;new.updated_at=clock_timestamp();return new;end$$;
create function sales_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$declare fields text[];org uuid;begin
org=coalesce((to_jsonb(new)->>'organization_id')::uuid,new.id);
if tg_op='UPDATE' then select array_agg(key) into fields from jsonb_each(to_jsonb(new)) where value is distinct from to_jsonb(old)->key and key not in ('updated_at','notes','email','phone','description');else fields=array[]::text[];end if;
insert into sales.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields) values(org,sales_private.current_user_id(),tg_table_name,new.id,lower(tg_op),coalesce(fields,'{}'));
if tg_table_name='offers' and tg_op='UPDATE' then
if new.status<>old.status then insert into sales.activities(organization_id,offer_id,actor_user_id,type,description) values(org,new.id,sales_private.current_user_id(),'status_change',old.status||' → '||new.status);end if;end if;
return new;end$$;
create function sales_private.audit_member() returns trigger language plpgsql security definer set search_path='' as $$declare r record;begin
if tg_op='DELETE' then r=old;else r=new;end if;
insert into sales.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields) values(r.organization_id,sales_private.current_user_id(),'organization_members',r.user_id,lower(tg_op),array['role']);
return r;end$$;
create trigger member_audit after insert or update or delete on sales.organization_members for each row execute function sales_private.audit_member();
create function sales_private.activity_guard() returns trigger language plpgsql set search_path='' as $$begin
new.actor_user_id=sales_private.current_user_id();new.occurred_at=clock_timestamp();new.provider_event_id=null;
if new.type='status_change' and pg_trigger_depth()<2 then raise exception 'Status events are generated';end if;
update sales.offers set last_activity_at=new.occurred_at where id=new.offer_id and organization_id=new.organization_id;
return new;end$$;
create trigger activity_guard before insert on sales.activities for each row execute function sales_private.activity_guard();
create function sales_private.organization_guard() returns trigger language plpgsql set search_path='' as $$begin
if new.id<>old.id or new.normalized_slug<>old.normalized_slug then raise exception 'Immutable identity';end if;new.created_at=old.created_at;new.updated_at=clock_timestamp();return new;end$$;
create trigger organization_guard before update on sales.organizations for each row execute function sales_private.organization_guard();
create function sales_private.last_owner() returns trigger language plpgsql set search_path='' as $$begin
if tg_op='UPDATE' then
 if new.organization_id<>old.organization_id or new.user_id<>old.user_id then raise exception 'Immutable membership identity';end if;
 if new.role=old.role then return new;end if;
end if;
perform 1 from sales.organizations where id=old.organization_id for update;
if old.role='owner' and not exists(select 1 from sales.organization_members where organization_id=old.organization_id and role='owner' and user_id<>old.user_id) then raise exception 'Last owner cannot be removed or changed';end if;
if tg_op='DELETE' then return old;else return new;end if;end$$;
create trigger last_owner before delete or update on sales.organization_members for each row execute function sales_private.last_owner();
do $$declare t text;begin
foreach t in array array['customers','contacts','offers'] loop
execute format('create trigger guard_update before update on sales.%I for each row execute function sales_private.guard_update()',t);
end loop;
foreach t in array array['organizations','customers','contacts','offers','activities','import_jobs'] loop
execute format('create trigger audit_change after insert or update on sales.%I for each row execute function sales_private.audit_change()',t);
end loop;
foreach t in array array['profiles','organizations','organization_members','customers','contacts','offers','activities','import_jobs','import_rows','audit_events'] loop
execute format('alter table sales.%I enable row level security',t);
execute format('revoke all on sales.%I from public,ascivus_app',t);
end loop;
end$$;
grant select on sales.profiles to ascivus_app;
grant update(display_name) on sales.profiles to ascivus_app;
create policy profile_read on sales.profiles for select to ascivus_app using(user_id=sales_private.current_user_id());
create policy profile_update on sales.profiles for update to ascivus_app using(user_id=sales_private.current_user_id()) with check(user_id=sales_private.current_user_id());
grant select,update on sales.organizations to ascivus_app;
create policy org_read on sales.organizations for select to ascivus_app using(sales_private.member_of(id));
create policy org_update on sales.organizations for update to ascivus_app using(sales_private.admin_of(id)) with check(sales_private.admin_of(id));
grant select on sales.organization_members to ascivus_app;
create policy member_read on sales.organization_members for select to ascivus_app using(user_id=sales_private.current_user_id());
do $$declare t text;begin
foreach t in array array['customers','contacts','offers'] loop
execute format('grant select,insert,update on sales.%I to ascivus_app',t);
execute format('create policy tenant_read on sales.%I for select to ascivus_app using(sales_private.member_of(organization_id) and organization_id=sales_private.current_org())',t);
execute format('create policy tenant_insert on sales.%I for insert to ascivus_app with check(sales_private.member_of(organization_id) and organization_id=sales_private.current_org())',t);
execute format('create policy tenant_update on sales.%I for update to ascivus_app using(sales_private.member_of(organization_id) and organization_id=sales_private.current_org()) with check(sales_private.member_of(organization_id) and organization_id=sales_private.current_org())',t);
end loop;
foreach t in array array['activities','import_jobs','import_rows','audit_events'] loop
execute format('grant select on sales.%I to ascivus_app',t);
execute format('create policy tenant_read on sales.%I for select to ascivus_app using(sales_private.member_of(organization_id) and organization_id=sales_private.current_org())',t);
end loop;
end$$;
grant insert on sales.activities to ascivus_app;
create policy activity_insert on sales.activities for insert to ascivus_app with check(sales_private.member_of(organization_id) and organization_id=sales_private.current_org() and actor_user_id=sales_private.current_user_id() and provider_event_id is null);
-- Only narrow, ascivus_app procedures may stage/commit imports or create initial ownership.
create function sales.create_organization(p_name text,p_currency text,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$declare oid uuid;begin
if sales_private.current_user_id() is null then raise exception 'Authentication required';end if;
if length(trim(p_name)) not between 2 and 120 or p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid organization';end if;
select id into oid from sales.organizations where id=p_request;
if oid is not null then if not sales_private.member_of(oid) then raise exception 'Unavailable request';end if;return oid;end if;
insert into sales.organizations(id,name,normalized_slug,default_currency) values(p_request,trim(p_name),p_request::text,p_currency);
insert into sales.organization_members(organization_id,user_id,role) values(p_request,sales_private.current_user_id(),'owner');
return p_request;end$$;
revoke all on all functions in schema sales_private from public;
revoke all on function sales.create_organization(text,text,uuid) from public;
grant execute on function sales.create_organization(text,text,uuid) to ascivus_app;

commit;
