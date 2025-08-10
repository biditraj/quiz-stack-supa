-- Ensure challenge_battles has a default status
alter table if exists public.challenge_battles
  alter column status set default 'pending';

-- Update create_challenge_battle to set status explicitly
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
  -- Find opponent
  select id into opponent_id 
  from public.profiles 
  where email = opponent_email;

  if opponent_id is null then
    raise exception 'Opponent not found';
  end if;

  -- Check if users are friends
  if not exists (
    select 1 from public.friend_relationships 
    where ((requester_id = auth.uid() and receiver_id = opponent_id) 
           or (requester_id = opponent_id and receiver_id = auth.uid()))
      and status = 'accepted'
  ) then
    raise exception 'You can only challenge friends';
  end if;

  -- Get random questions for the battle
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

  -- Create battle with explicit 'pending' status
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


