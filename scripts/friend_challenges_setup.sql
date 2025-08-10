-- Friend Challenges System - Complete Setup Script
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Friend relationships table
CREATE TABLE IF NOT EXISTS public.friend_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, receiver_id)
);

-- 2) Challenge battles table
CREATE TABLE IF NOT EXISTS public.challenge_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired')),
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_count INTEGER NOT NULL DEFAULT 10,
  time_limit INTEGER NOT NULL DEFAULT 600, -- 10 minutes in seconds
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 3) Battle participants table (for tracking individual performance)
CREATE TABLE IF NOT EXISTS public.battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.challenge_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0, -- seconds
  completed_at TIMESTAMPTZ,
  is_winner BOOLEAN DEFAULT NULL,
  UNIQUE(battle_id, user_id)
);

-- 4) Real-time battle events (for live updates)
CREATE TABLE IF NOT EXISTS public.battle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.challenge_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('joined', 'answered', 'completed', 'left')),
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.friend_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their friend relationships" ON public.friend_relationships;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friend_relationships;
DROP POLICY IF EXISTS "Users can update friend relationships" ON public.friend_relationships;

DROP POLICY IF EXISTS "Users can view their battles" ON public.challenge_battles;
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenge_battles;
DROP POLICY IF EXISTS "Users can update their battles" ON public.challenge_battles;

DROP POLICY IF EXISTS "Users can view battle participants" ON public.battle_participants;
DROP POLICY IF EXISTS "Users can insert their participation" ON public.battle_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.battle_participants;

DROP POLICY IF EXISTS "Users can view battle events" ON public.battle_events;
DROP POLICY IF EXISTS "Users can create battle events" ON public.battle_events;

-- RLS Policies for friend_relationships
CREATE POLICY "Users can view their friend relationships" ON public.friend_relationships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" ON public.friend_relationships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend relationships" ON public.friend_relationships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- RLS Policies for challenge_battles
CREATE POLICY "Users can view their battles" ON public.challenge_battles
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create challenges" ON public.challenge_battles
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update their battles" ON public.challenge_battles
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- RLS Policies for battle_participants
CREATE POLICY "Users can view battle participants" ON public.battle_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_battles cb 
      WHERE cb.id = battle_id AND (cb.challenger_id = auth.uid() OR cb.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their participation" ON public.battle_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.battle_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for battle_events
CREATE POLICY "Users can view battle events" ON public.battle_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenge_battles cb 
      WHERE cb.id = battle_id AND (cb.challenger_id = auth.uid() OR cb.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can create battle events" ON public.battle_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.send_friend_request(TEXT);
DROP FUNCTION IF EXISTS public.respond_to_friend_request(UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_challenge_battle(TEXT, TEXT, TEXT, INTEGER);

-- Functions for friend system
CREATE OR REPLACE FUNCTION public.send_friend_request(receiver_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receiver_profile_id UUID;
  request_id UUID;
BEGIN
  -- Find receiver profile
  SELECT id INTO receiver_profile_id 
  FROM public.profiles 
  WHERE email = receiver_email;
  
  IF receiver_profile_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', receiver_email;
  END IF;
  
  IF receiver_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;
  
  -- Check if relationship already exists
  IF EXISTS (
    SELECT 1 FROM public.friend_relationships 
    WHERE (requester_id = auth.uid() AND receiver_id = receiver_profile_id)
       OR (requester_id = receiver_profile_id AND receiver_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Friend relationship already exists';
  END IF;
  
  -- Create friend request
  INSERT INTO public.friend_relationships (requester_id, receiver_id, status)
  VALUES (auth.uid(), receiver_profile_id, 'pending')
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$;

-- Function to accept/decline friend requests
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(request_id UUID, response TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response. Must be accepted or declined';
  END IF;
  
  UPDATE public.friend_relationships 
  SET status = response, updated_at = NOW()
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Function to create challenge battle
CREATE OR REPLACE FUNCTION public.create_challenge_battle(
  opponent_email TEXT,
  p_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT 'medium',
  p_question_count INTEGER DEFAULT 10
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  opponent_id UUID;
  battle_id UUID;
  battle_questions JSONB;
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
    ORDER BY RANDOM() 
    LIMIT p_question_count
  ) q;
  
  -- Create battle
  INSERT INTO public.challenge_battles (
    challenger_id, opponent_id, category, difficulty, 
    question_count, questions
  )
  VALUES (
    auth.uid(), opponent_id, p_category, p_difficulty, 
    p_question_count, battle_questions
  )
  RETURNING id INTO battle_id;
  
  RETURN battle_id;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_relationships_requester ON public.friend_relationships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_relationships_receiver ON public.friend_relationships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_relationships_status ON public.friend_relationships(status);

CREATE INDEX IF NOT EXISTS idx_challenge_battles_challenger ON public.challenge_battles(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenge_battles_opponent ON public.challenge_battles(opponent_id);
CREATE INDEX IF NOT EXISTS idx_challenge_battles_status ON public.challenge_battles(status);

CREATE INDEX IF NOT EXISTS idx_battle_participants_battle ON public.battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_user ON public.battle_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_battle_events_battle ON public.battle_events(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_events_user ON public.battle_events(user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.friend_relationships TO anon, authenticated;
GRANT ALL ON public.challenge_battles TO anon, authenticated;
GRANT ALL ON public.battle_participants TO anon, authenticated;
GRANT ALL ON public.battle_events TO anon, authenticated;

-- Test the friend request function
SELECT 'Friend challenges setup completed successfully!' as result;
