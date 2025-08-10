-- Test script to check if all required database tables and functions exist
-- Run this in your Supabase SQL Editor to verify the schema

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('challenge_battles', 'friend_relationships', 'battle_participants', 'battle_events', 'online_users') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('challenge_battles', 'friend_relationships', 'battle_participants', 'battle_events', 'online_users');

-- Check challenge_battles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'challenge_battles'
ORDER BY ordinal_position;

-- Check if the create_challenge_battle function exists
SELECT 
  routine_name,
  CASE WHEN routine_name = 'create_challenge_battle' THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_challenge_battle';

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('challenge_battles', 'friend_relationships', 'battle_participants', 'battle_events', 'online_users');

-- Test if we can insert a sample battle (this will fail if tables don't exist)
-- This is just a test, we'll rollback
BEGIN;

-- Try to insert a test battle
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
  '00000000-0000-0000-0000-000000000000', -- dummy UUID
  '00000000-0000-0000-0000-000000000001', -- dummy UUID
  'pending',
  'test',
  'medium',
  5,
  300,
  '[]'::jsonb
);

-- If we get here, the table exists and we can insert
SELECT '✅ challenge_battles table is working' as result;

-- Clean up
ROLLBACK;
