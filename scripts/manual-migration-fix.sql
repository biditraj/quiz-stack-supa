-- MANUAL MIGRATION FIX FOR FRIEND CHALLENGES
-- Run this in your Supabase SQL Editor to fix the edge function error

-- 1. Friend relationships table
CREATE TABLE IF NOT EXISTS public.friend_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- 2. Challenge battles table
CREATE TABLE IF NOT EXISTS public.challenge_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'active', 'completed', 'cancelled')),
  category TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_count INTEGER NOT NULL DEFAULT 10,
  time_limit INTEGER NOT NULL DEFAULT 600, -- 10 minutes in seconds
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 3. Battle participants table (for tracking individual performance)
CREATE TABLE IF NOT EXISTS public.battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.challenge_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  accuracy DECIMAL DEFAULT 0.0,
  time_taken INTEGER DEFAULT 0, -- in seconds
  answers JSONB DEFAULT '[]'::jsonb,
  is_winner BOOLEAN DEFAULT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(battle_id, user_id)
);

-- 4. Battle events table (for real-time tracking)
CREATE TABLE IF NOT EXISTS public.battle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.challenge_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('joined', 'answered', 'completed', 'left')),
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Online users table for heartbeat tracking
CREATE TABLE IF NOT EXISTS public.online_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.friend_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_relationships
DROP POLICY IF EXISTS "Users can view own relationships" ON public.friend_relationships;
CREATE POLICY "Users can view own relationships" ON public.friend_relationships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_relationships;
CREATE POLICY "Users can send friend requests" ON public.friend_relationships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can respond to requests" ON public.friend_relationships;
CREATE POLICY "Users can respond to requests" ON public.friend_relationships
  FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "Requester can delete pending requests" ON public.friend_relationships;
CREATE POLICY "Requester can delete pending requests" ON public.friend_relationships
  FOR DELETE USING (status = 'pending' AND requester_id = auth.uid());

-- RLS Policies for challenge_battles
DROP POLICY IF EXISTS "Users can view their battles" ON public.challenge_battles;
CREATE POLICY "Users can view their battles" ON public.challenge_battles
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

DROP POLICY IF EXISTS "Users can create battles" ON public.challenge_battles;
CREATE POLICY "Users can create battles" ON public.challenge_battles
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "Users can update their battles" ON public.challenge_battles;
CREATE POLICY "Users can update their battles" ON public.challenge_battles
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- RLS Policies for battle_participants
DROP POLICY IF EXISTS "Users can view battle participants" ON public.battle_participants;
CREATE POLICY "Users can view battle participants" ON public.battle_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_battles cb 
      WHERE cb.id = battle_id AND (cb.challenger_id = auth.uid() OR cb.opponent_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their participation" ON public.battle_participants;
CREATE POLICY "Users can insert their participation" ON public.battle_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their participation" ON public.battle_participants;
CREATE POLICY "Users can update their participation" ON public.battle_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for battle_events
DROP POLICY IF EXISTS "Users can view battle events" ON public.battle_events;
CREATE POLICY "Users can view battle events" ON public.battle_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_battles cb 
      WHERE cb.id = battle_id AND (cb.challenger_id = auth.uid() OR cb.opponent_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert battle events" ON public.battle_events;
CREATE POLICY "Users can insert battle events" ON public.battle_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for online_users
DROP POLICY IF EXISTS "Authenticated users can view online users" ON public.online_users;
CREATE POLICY "Authenticated users can view online users" ON public.online_users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can upsert their own online status" ON public.online_users;
CREATE POLICY "Users can upsert their own online status" ON public.online_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own online status update" ON public.online_users;
CREATE POLICY "Users can upsert their own online status update" ON public.online_users
  FOR UPDATE USING (auth.uid() = user_id);

-- Create challenge battle function
CREATE OR REPLACE FUNCTION public.create_challenge_battle(
  opponent_email text,
  p_category text default null,
  p_difficulty text default 'medium',
  p_question_count integer default 10
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  opponent_id uuid;
  battle_id uuid;
  battle_questions jsonb;
  is_opponent_online boolean;
BEGIN
  -- Find opponent
  SELECT id INTO opponent_id
  FROM public.profiles
  WHERE email = opponent_email;

  IF opponent_id IS NULL THEN
    RAISE EXCEPTION 'Opponent not found';
  END IF;

  -- Check if users are friends
  IF NOT EXISTS (
    SELECT 1 FROM public.friend_relationships
    WHERE ((requester_id = auth.uid() AND receiver_id = opponent_id)
           OR (requester_id = opponent_id AND receiver_id = auth.uid()))
    AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'You can only challenge friends';
  END IF;

  -- Check if opponent is online via heartbeat (last 90 seconds)
  SELECT EXISTS (
    SELECT 1 FROM public.online_users
    WHERE user_id = opponent_id AND last_seen > (NOW() - INTERVAL '90 seconds')
  ) INTO is_opponent_online;

  IF NOT is_opponent_online THEN
    RAISE EXCEPTION 'Opponent is offline. Try again when they are online.';
  END IF;

  -- Get random questions for the battle
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'type', q.type,
      'question_text', q.question_text,
      'options', q.options,
      'image_url', q.image_url,
      'correct_answer', q.correct_answer
    )
  ) INTO battle_questions
  FROM (
    SELECT * FROM public.questions
    WHERE (p_category IS NULL OR category = p_category)
    ORDER BY random()
    LIMIT p_question_count
  ) q;

  -- Create battle
  INSERT INTO public.challenge_battles (
    challenger_id, opponent_id, status, category, difficulty,
    question_count, questions
  )
  VALUES (
    auth.uid(), opponent_id, 'pending', p_category, p_difficulty,
    p_question_count, COALESCE(battle_questions, '[]'::jsonb)
  )
  RETURNING id INTO battle_id;

  RETURN battle_id;
END;
$$;
