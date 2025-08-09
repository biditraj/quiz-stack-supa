-- Admin bootstrap: whitelist emails and allow self-promotion via secure function

create table if not exists public.admin_emails (
  email text primary key
);

-- Function to grant admin role if email is whitelisted
create or replace function public.grant_admin_if_whitelisted(_user_id uuid, _email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_whitelisted boolean;
begin
  select exists(select 1 from public.admin_emails where email = _email) into is_whitelisted;
  if is_whitelisted then
    insert into public.user_roles (user_id, role)
    values (_user_id, 'admin')
    on conflict (user_id, role) do nothing;
    return true;
  end if;
  return false;
end;
$$;

-- Update the signup trigger to auto-assign admin role if whitelisted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'user_' || substr(new.id::text, 1, 8)),
    new.email
  )
  on conflict (id) do nothing;

  -- default user role
  begin
    insert into public.user_roles (user_id, role)
    values (new.id, 'user')
    on conflict (user_id, role) do nothing;
  exception when undefined_table then null; end;

  -- admin if email whitelisted
  begin
    perform public.grant_admin_if_whitelisted(new.id, new.email);
  exception when undefined_function then null; end;

  return new;
end;
$$;


