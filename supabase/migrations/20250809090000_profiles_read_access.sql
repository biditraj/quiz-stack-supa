-- Allow authenticated users to view basic profile info so friend names/emails can be displayed
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);


