-- Fix the challenge_battles status constraint to include 'accepted' status
-- Run this in your Supabase SQL Editor

-- First, check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.challenge_battles'::regclass 
AND contype = 'c';

-- Drop existing constraint if it exists
ALTER TABLE public.challenge_battles 
DROP CONSTRAINT IF EXISTS challenge_battles_status_check;

-- Add new constraint with 'accepted' status
ALTER TABLE public.challenge_battles 
ADD CONSTRAINT challenge_battles_status_check 
CHECK (status IN ('pending', 'accepted', 'active', 'completed', 'cancelled'));

-- Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.challenge_battles'::regclass 
AND contype = 'c';

-- Test the constraint by trying to insert with 'accepted' status
BEGIN;

INSERT INTO public.challenge_battles (
  challenger_id,
  opponent_id,
  status,
  category,
  difficulty,
  question_count,
  time_limit,
  questions
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'accepted', -- This should work now
  'test',
  'medium',
  5,
  300,
  '[]'::jsonb
);

SELECT '✅ Status constraint is working with "accepted" status' as result;

ROLLBACK;
