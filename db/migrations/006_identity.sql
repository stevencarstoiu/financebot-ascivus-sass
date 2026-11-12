begin;
set local role ascivus_owner;
alter function sales.ensure_profile(text) set schema sales_private;
create function sales.ensure_profile(p_name text default '') returns uuid language sql security invoker set search_path='' as $$select sales_private.ensure_profile(p_name)$$;
revoke all on function sales.ensure_profile(text) from public;
grant execute on function sales.ensure_profile(text) to ascivus_app;
create function sales_private.profile_guard() returns trigger language plpgsql set search_path='' as $$begin
if new.user_id<>old.user_id or new.auth_subject<>old.auth_subject then raise exception 'Immutable authentication identity';end if;
new.created_at=old.created_at;new.updated_at=clock_timestamp();return new;end$$;
create trigger profile_guard before update on sales.profiles for each row execute function sales_private.profile_guard();
revoke all on function sales_private.profile_guard() from public,ascivus_app;
create function sales_private.lock_membership(p_org uuid) returns text language plpgsql security definer set search_path='' as $$declare r text;begin
if p_org is distinct from sales_private.current_org() then raise exception 'Organization context required';end if;
select role into r from sales.organization_members where organization_id=p_org and user_id=sales_private.current_user_id() for share;
if r is null then raise exception 'Organization access denied' using errcode='42501';end if;return r;end$$;
revoke all on function sales_private.lock_membership(uuid) from public;
grant execute on function sales_private.lock_membership(uuid) to ascivus_app;
commit;
