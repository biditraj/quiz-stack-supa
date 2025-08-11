-- Remove Battle System Migration
-- This migration removes all battle-related functionality while keeping friend management

-- Drop battle-related functions
DROP FUNCTION IF EXISTS public.create_challenge_battle(text, text, text, integer);
DROP FUNCTION IF EXISTS public.get_battle_leaderboard(integer);

-- Drop battle-related tables (in reverse dependency order)
DROP TABLE IF EXISTS public.battle_events CASCADE;
DROP TABLE IF EXISTS public.battle_participants CASCADE;
DROP TABLE IF EXISTS public.challenge_battles CASCADE;

-- Keep only friend management tables and functions
-- friend_relationships table remains
-- send_friend_request function remains
-- respond_to_friend_request function remains
-- get_user_friends function remains

-- Verify friend management still works
DO $$
BEGIN
  -- Test that friend functions still exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_friend_request') THEN
    RAISE EXCEPTION 'send_friend_request function was accidentally removed';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'respond_to_friend_request') THEN
    RAISE EXCEPTION 'respond_to_friend_request function was accidentally removed';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_friends') THEN
    RAISE EXCEPTION 'get_user_friends function was accidentally removed';
  END IF;
  
  -- Test that friend_relationships table still exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_relationships') THEN
    RAISE EXCEPTION 'friend_relationships table was accidentally removed';
  END IF;
  
  RAISE NOTICE '✅ Battle system removed successfully. Friend management preserved.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Failed to remove battle system: %', SQLERRM;
END $$;
