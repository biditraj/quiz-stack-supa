-- Allow authenticated users to insert their own participant row
drop policy if exists "Users can insert their participation" on public.battle_participants;
create policy "Users can insert their participation"
  on public.battle_participants for insert
  to authenticated
  with check (auth.uid() = user_id);


