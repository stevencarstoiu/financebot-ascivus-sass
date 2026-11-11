begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles(user_id uuid primary key references auth.users on delete cascade,display_name text not null default '' check(length(display_name)<=120),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.organizations(id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 120),normalized_slug text not null unique,default_currency text not null default 'EUR' check(default_currency ~ '^[A-Z]{3}$'),followup_after_days int not null default 7 check(followup_after_days between 1 and 365),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.organization_members(organization_id uuid references public.organizations on delete cascade,user_id uuid references auth.users on delete restrict,role text not null check(role in ('owner','admin','member')),created_at timestamptz not null default now(),primary key(organization_id,user_id));
create index member_user on public.organization_members(user_id,organization_id);
create function private.member_of(org uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.organization_members where organization_id=org and user_id=auth.uid())$$;
create function private.admin_of(org uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.organization_members where organization_id=org and user_id=auth.uid() and role in ('owner','admin'))$$;
revoke all on function private.member_of(uuid),private.admin_of(uuid) from public;
grant execute on function private.member_of(uuid),private.admin_of(uuid) to authenticated;
create table public.customers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,customer_type text not null default 'company' check(customer_type in ('company','person')),display_name text not null check(length(trim(display_name)) between 1 and 200),normalized_name text generated always as (lower(trim(display_name))) stored,external_reference text check(length(external_reference)<=120),website text check(length(website)<=500 and (website is null or website ~ '^https?://')),notes text check(length(notes)<=4000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(id,organization_id));
create unique index customer_reference on public.customers(organization_id,external_reference) where external_reference is not null;
create index customer_search on public.customers(organization_id,normalized_name);
create index customer_updated on public.customers(organization_id,updated_at desc);
create table public.contacts(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,customer_id uuid not null,full_name text not null check(length(trim(full_name)) between 1 and 200),email text check(length(email)<=254 and (email is null or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),phone text check(length(phone)<=60),position text check(length(position)<=120),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(id,organization_id,customer_id),foreign key(customer_id,organization_id) references public.customers(id,organization_id));
create index contact_customer on public.contacts(organization_id,customer_id);
create table public.offers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,customer_id uuid not null,primary_contact_id uuid,title text not null check(length(trim(title)) between 1 and 240),external_reference text check(length(external_reference)<=120),amount numeric(18,4) not null check(amount>=0),currency text not null check(currency ~ '^[A-Z]{3}$'),status text not null default 'draft' check(status in ('draft','sent','replied','won','lost')),sent_at timestamptz,first_response_at timestamptz,closed_at timestamptz,last_activity_at timestamptz,notes text check(length(notes)<=4000),source text not null default 'manual' check(source in ('manual','import')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(id,organization_id),foreign key(customer_id,organization_id) references public.customers(id,organization_id),foreign key(primary_contact_id,organization_id,customer_id) references public.contacts(id,organization_id,customer_id),check((status='draft' and sent_at is null and first_response_at is null and closed_at is null) or (status='sent' and sent_at is not null and first_response_at is null and closed_at is null) or (status='replied' and sent_at is not null and first_response_at is not null and closed_at is null) or (status in ('won','lost') and sent_at is not null and closed_at is not null)),check(first_response_at is null or first_response_at>=sent_at),check(closed_at is null or closed_at>=sent_at));
create unique index offer_reference on public.offers(organization_id,external_reference) where external_reference is not null;
create index offer_status on public.offers(organization_id,status,sent_at) where archived_at is null;
create index offer_updated on public.offers(organization_id,updated_at desc);
create index offer_customer on public.offers(organization_id,customer_id);
create table public.activities(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,offer_id uuid not null,actor_user_id uuid default auth.uid() references auth.users,type text not null check(type in ('note','call_logged','email_logged','status_change','followup_logged')),occurred_at timestamptz not null default now(),description text not null check(length(trim(description)) between 1 and 2000),provider_event_id text,foreign key(offer_id,organization_id) references public.offers(id,organization_id));
create index activity_timeline on public.activities(organization_id,occurred_at desc);
create table public.import_jobs(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,initiated_by uuid not null default auth.uid() references auth.users,file_name text not null check(length(file_name)<=200 and file_name !~ '[/\\]'),fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),mapping_fingerprint text not null check(mapping_fingerprint ~ '^[a-f0-9]{64}$'),mapping_version int not null default 1 check(mapping_version=1),status text not null default 'validated' check(status in ('preview','validated','committing','completed','failed','expired')),row_count int not null check(row_count between 1 and 1000),duplicate_count int not null default 0,result jsonb,created_at timestamptz not null default now(),completed_at timestamptz,expires_at timestamptz not null default now()+interval '24 hours',unique(id,organization_id));
create index import_timeline on public.import_jobs(organization_id,created_at desc);
create table public.import_rows(job_id uuid not null,organization_id uuid not null,row_number int not null check(row_number between 2 and 1001),data jsonb not null check(octet_length(data::text)<=16000),primary key(job_id,row_number),foreign key(job_id,organization_id) references public.import_jobs(id,organization_id) on delete cascade);
create table public.audit_events(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations,actor_user_id uuid references auth.users,entity_type text not null,entity_id uuid not null,action text not null,changed_fields text[] not null default '{}',occurred_at timestamptz not null default now());
create index audit_timeline on public.audit_events(organization_id,occurred_at desc);
create function private.guard_update() returns trigger language plpgsql set search_path='' as $$begin
if new.organization_id<>old.organization_id or new.id<>old.id then raise exception 'Immutable identity';end if;
new.created_at=old.created_at;new.updated_at=clock_timestamp();return new;end$$;
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$declare fields text[];org uuid;begin
org=coalesce((to_jsonb(new)->>'organization_id')::uuid,new.id);
if tg_op='UPDATE' then select array_agg(key) into fields from jsonb_each(to_jsonb(new)) where value is distinct from to_jsonb(old)->key and key not in ('updated_at','notes','email','phone','description');else fields=array[]::text[];end if;
insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields) values(org,auth.uid(),tg_table_name,new.id,lower(tg_op),coalesce(fields,'{}'));
if tg_table_name='offers' and tg_op='UPDATE' then
if new.status<>old.status then insert into public.activities(organization_id,offer_id,actor_user_id,type,description) values(org,new.id,auth.uid(),'status_change',old.status||' → '||new.status);end if;end if;
return new;end$$;
create function private.audit_member() returns trigger language plpgsql security definer set search_path='' as $$declare r record;begin
if tg_op='DELETE' then r=old;else r=new;end if;
insert into public.audit_events(organization_id,actor_user_id,entity_type,entity_id,action,changed_fields) values(r.organization_id,auth.uid(),'organization_members',r.user_id,lower(tg_op),array['role']);
return r;end$$;
create trigger member_audit after insert or update or delete on public.organization_members for each row execute function private.audit_member();
create function private.activity_guard() returns trigger language plpgsql set search_path='' as $$begin
new.actor_user_id=auth.uid();new.occurred_at=clock_timestamp();new.provider_event_id=null;
if new.type='status_change' and pg_trigger_depth()<2 then raise exception 'Status events are generated';end if;
update public.offers set last_activity_at=new.occurred_at where id=new.offer_id and organization_id=new.organization_id;
return new;end$$;
create trigger activity_guard before insert on public.activities for each row execute function private.activity_guard();
create function private.organization_guard() returns trigger language plpgsql set search_path='' as $$begin
if new.id<>old.id or new.normalized_slug<>old.normalized_slug then raise exception 'Immutable identity';end if;new.created_at=old.created_at;new.updated_at=clock_timestamp();return new;end$$;
create trigger organization_guard before update on public.organizations for each row execute function private.organization_guard();
create function private.last_owner() returns trigger language plpgsql set search_path='' as $$begin
if tg_op='UPDATE' then
 if new.organization_id<>old.organization_id or new.user_id<>old.user_id then raise exception 'Immutable membership identity';end if;
 if new.role=old.role then return new;end if;
end if;
perform 1 from public.organizations where id=old.organization_id for update;
if old.role='owner' and not exists(select 1 from public.organization_members where organization_id=old.organization_id and role='owner' and user_id<>old.user_id) then raise exception 'Last owner cannot be removed or changed';end if;
if tg_op='DELETE' then return old;else return new;end if;end$$;
create trigger last_owner before delete or update on public.organization_members for each row execute function private.last_owner();
do $$declare t text;begin
foreach t in array array['customers','contacts','offers'] loop
execute format('create trigger guard_update before update on public.%I for each row execute function private.guard_update()',t);
end loop;
foreach t in array array['organizations','customers','contacts','offers','activities','import_jobs'] loop
execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',t);
end loop;
foreach t in array array['profiles','organizations','organization_members','customers','contacts','offers','activities','import_jobs','import_rows','audit_events'] loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from anon,authenticated',t);
end loop;
end$$;
grant select,insert,update on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using(user_id=auth.uid());
create policy profile_insert on public.profiles for insert to authenticated with check(user_id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,update on public.organizations to authenticated;
create policy org_read on public.organizations for select to authenticated using(private.member_of(id));
create policy org_update on public.organizations for update to authenticated using(private.admin_of(id)) with check(private.admin_of(id));
grant select on public.organization_members to authenticated;
create policy member_read on public.organization_members for select to authenticated using(private.member_of(organization_id));
do $$declare t text;begin
foreach t in array array['customers','contacts','offers'] loop
execute format('grant select,insert,update on public.%I to authenticated',t);
execute format('create policy tenant_read on public.%I for select to authenticated using(private.member_of(organization_id))',t);
execute format('create policy tenant_insert on public.%I for insert to authenticated with check(private.member_of(organization_id))',t);
execute format('create policy tenant_update on public.%I for update to authenticated using(private.member_of(organization_id)) with check(private.member_of(organization_id))',t);
end loop;
foreach t in array array['activities','import_jobs','import_rows','audit_events'] loop
execute format('grant select on public.%I to authenticated',t);
execute format('create policy tenant_read on public.%I for select to authenticated using(private.member_of(organization_id))',t);
end loop;
end$$;
grant insert on public.activities to authenticated;
create policy activity_insert on public.activities for insert to authenticated with check(private.member_of(organization_id) and actor_user_id=auth.uid() and provider_event_id is null);
-- Only narrow, authenticated procedures may stage/commit imports or create initial ownership.
create function public.create_organization(p_name text,p_currency text,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$declare oid uuid;begin
if auth.uid() is null then raise exception 'Authentication required';end if;
if length(trim(p_name)) not between 2 and 120 or p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid organization';end if;
select id into oid from public.organizations where id=p_request;
if oid is not null then if not private.member_of(oid) then raise exception 'Unavailable request';end if;return oid;end if;
insert into public.organizations(id,name,normalized_slug,default_currency) values(p_request,trim(p_name),p_request::text,p_currency);
insert into public.organization_members(organization_id,user_id,role) values(p_request,auth.uid(),'owner');
return p_request;end$$;
revoke all on all functions in schema private from public;
revoke all on function public.create_organization(text,text,uuid) from public,anon;
grant execute on function public.create_organization(text,text,uuid) to authenticated;
commit;
