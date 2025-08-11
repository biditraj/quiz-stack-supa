-- Test script to check if all required database tables and functions exist
-- Run this in your Supabase SQL Editor to verify the schema

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('friend_relationships', 'online_users') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('friend_relationships', 'online_users');

-- Check friend_relationships table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'friend_relationships'
ORDER BY ordinal_position;

-- Check online_users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'online_users'
ORDER BY ordinal_position;

-- Check if the friend management functions exist
SELECT 
  routine_name,
  CASE WHEN routine_name = 'send_friend_request' THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'send_friend_request';

SELECT 
  routine_name,
  CASE WHEN routine_name = 'respond_to_friend_request' THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'respond_to_friend_request';

SELECT 
  routine_name,
  CASE WHEN routine_name = 'get_user_friends' THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_friends';

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
AND tablename IN ('friend_relationships', 'online_users');

-- Test if we can insert a sample friend relationship (this will fail if tables don't exist)
-- This is just a test, we'll rollback
BEGIN;

-- Try to insert a test friend relationship
INSERT INTO public.friend_relationships (
  requester_id,
  receiver_id,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- dummy UUID
  '00000000-0000-0000-0000-000000000001', -- dummy UUID
  'pending'
);

-- If we get here, the table exists and we can insert
SELECT '✅ friend_relationships table is working' as result;

-- Clean up
ROLLBACK;

-- Test online_users table
BEGIN;

-- Try to insert a test online user
INSERT INTO public.online_users (
  user_id,
  username,
  email,
  last_seen
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- dummy UUID
  'testuser',
  'test@example.com',
  NOW()
);

-- If we get here, the table exists and we can insert
SELECT '✅ online_users table is working' as result;

-- Clean up
ROLLBACK;
