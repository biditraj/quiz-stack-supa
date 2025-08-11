-- Fix battle_events constraint to include 'started' event type
-- This is needed for the new simplified battle system

-- Drop the existing constraint
ALTER TABLE public.battle_events 
DROP CONSTRAINT IF EXISTS battle_events_event_type_check;

-- Add the new constraint with all required event types
ALTER TABLE public.battle_events 
ADD CONSTRAINT battle_events_event_type_check 
CHECK (event_type IN ('joined', 'answered', 'completed', 'left', 'started'));

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT battle_events_event_type_check ON public.battle_events IS 
'Ensures event_type is one of: joined, answered, completed, left, started';

-- Verify the constraint was added correctly
DO $$
BEGIN
  -- Test that we can insert a 'started' event
  INSERT INTO public.battle_events (
    battle_id, 
    user_id, 
    event_type, 
    data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', -- dummy UUID
    '00000000-0000-0000-0000-000000000001', -- dummy UUID
    'started',
    '{}'::jsonb
  );
  
  -- Clean up test data
  DELETE FROM public.battle_events 
  WHERE battle_id = '00000000-0000-0000-0000-000000000000';
  
  RAISE NOTICE '✅ battle_events constraint updated successfully - started event type now allowed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Failed to update battle_events constraint: %', SQLERRM;
END $$;
