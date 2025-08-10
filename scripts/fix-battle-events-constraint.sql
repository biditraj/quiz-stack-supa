-- Fix the battle_events event_type constraint to include 'started' event
-- Run this in your Supabase SQL Editor

-- First, check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.battle_events'::regclass 
AND contype = 'c';

-- Drop existing constraint if it exists
ALTER TABLE public.battle_events 
DROP CONSTRAINT IF EXISTS battle_events_event_type_check;

-- Add new constraint with 'started' event type
ALTER TABLE public.battle_events 
ADD CONSTRAINT battle_events_event_type_check 
CHECK (event_type IN ('joined', 'answered', 'completed', 'left', 'started'));

-- Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.battle_events'::regclass 
AND contype = 'c';

-- Test the constraint by trying to insert with 'started' event type
BEGIN;

INSERT INTO public.battle_events (
  battle_id,
  user_id,
  event_type,
  data
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- dummy UUID
  '00000000-0000-0000-0000-000000000001', -- dummy UUID
  'started', -- This should work now
  '{"test": true}'::jsonb
);

SELECT '✅ Event type constraint is working with "started" event' as result;

ROLLBACK;
