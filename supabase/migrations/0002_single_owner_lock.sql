-- Money OS is single-owner: once the owner exists, refuse any further sign-ups at the database level.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.block_extra_users()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Sign-ups are closed: Money OS has a single owner.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke all on function private.block_extra_users() from public, anon, authenticated;

create trigger money_os_single_owner
  before insert on auth.users
  for each row execute function private.block_extra_users();
