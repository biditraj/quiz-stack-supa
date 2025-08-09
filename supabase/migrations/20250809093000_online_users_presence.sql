-- Online users heartbeat table
create table if not exists public.online_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen timestamptz not null default now()
);

alter table public.online_users enable row level security;

-- Policies: users can upsert their own heartbeat; anyone authenticated can read
drop policy if exists "Users can read online users" on public.online_users;
create policy "Users can read online users"
  on public.online_users for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own online heartbeat" on public.online_users;
create policy "Users can insert own online heartbeat"
  on public.online_users for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own online heartbeat" on public.online_users;
create policy "Users can update own online heartbeat"
  on public.online_users for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful index
create index if not exists idx_online_users_last_seen on public.online_users(last_seen desc);

-- Update create_challenge_battle to require opponent online (within last 90 seconds)
create or replace function public.create_challenge_battle(
  opponent_email text,
  p_category text default null,
  p_difficulty text default 'medium',
  p_question_count integer default 10
)
returns uuid
language plpgsql
security definer
as $$
declare
  opponent_id uuid;
  battle_id uuid;
  battle_questions jsonb;
begin
  select id into opponent_id
  from public.profiles
  where email = opponent_email;

  if opponent_id is null then
    raise exception 'Opponent not found';
  end if;

  if not exists (
    select 1 from public.friend_relationships fr
    where ((fr.requester_id = auth.uid() and fr.receiver_id = opponent_id)
        or (fr.requester_id = opponent_id and fr.receiver_id = auth.uid()))
      and fr.status = 'accepted'
  ) then
    raise exception 'You can only challenge friends';
  end if;

  -- Online check: opponent must have heartbeat within last 90 seconds
  if not exists (
    select 1 from public.online_users ou
    where ou.user_id = opponent_id
      and ou.last_seen > (now() - interval '90 seconds')
  ) then
    raise exception 'Opponent is offline. Try again when they are online.';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'question_text', q.question_text,
      'options', q.options,
      'image_url', q.image_url,
      'correct_answer', q.correct_answer
    )
  ) into battle_questions
  from (
    select * from public.questions
    where (p_category is null or category = p_category)
    order by random()
    limit p_question_count
  ) q;

  insert into public.challenge_battles (
    challenger_id, opponent_id, status, category, difficulty,
    question_count, questions
  )
  values (
    auth.uid(), opponent_id, 'pending', p_category, p_difficulty,
    p_question_count, coalesce(battle_questions, '[]'::jsonb)
  )
  returning id into battle_id;

  return battle_id;
end;
$$;


