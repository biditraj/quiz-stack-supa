-- Allow requesters to cancel their own pending friend requests
drop policy if exists "Requester can delete pending requests" on public.friend_relationships;
create policy "Requester can delete pending requests"
  on public.friend_relationships
  for delete
  to authenticated
  using (
    status = 'pending' and requester_id = auth.uid()
  );


