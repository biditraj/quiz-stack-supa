# Simplified Battle System - Deployment Guide

## Overview
This guide will help you deploy and test the new simplified real-time battle system that replaces the complex battle management with a streamlined, single-endpoint solution.

## Prerequisites
- Supabase project set up and running
- Node.js and npm/bun installed
- Access to Supabase dashboard

## Step 1: Database Setup

### Apply the new migration
Run this SQL in your Supabase SQL Editor:

```sql
-- Fix battle_events constraint to include 'started' event type
ALTER TABLE public.battle_events 
DROP CONSTRAINT IF EXISTS battle_events_event_type_check;

ALTER TABLE public.battle_events 
ADD CONSTRAINT battle_events_event_type_check 
CHECK (event_type IN ('joined', 'answered', 'completed', 'left', 'started'));
```

### Verify database schema
Run this to check if all required tables exist:

```sql
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
```

## Step 2: Deploy Edge Function

### Deploy the simple-battle-management function
```bash
cd supabase/functions/simple-battle-management
supabase functions deploy simple-battle-management
```

### Verify function deployment
Check your Supabase dashboard → Edge Functions to see if `simple-battle-management` is listed and active.

## Step 3: Update Frontend Components

### Option A: Use the new SimpleBattleInterface (Recommended)
The new `SimpleBattleInterface.tsx` is already created and ready to use. Update your routing to use it:

```tsx
// In your routing configuration, replace:
import BattleInterface from '@/components/challenges/BattleInterface';

// With:
import SimpleBattleInterface from '@/components/challenges/SimpleBattleInterface';
```

### Option B: Update existing BattleInterface
If you prefer to keep the existing component name, update `BattleInterface.tsx` to use the new API:

```tsx
// Replace this import:
import { challengesApi } from '@/lib/challenges-api';

// With:
import { simpleBattleApi } from '@/lib/simple-battle-api';
```

Then update all API calls throughout the component.

## Step 4: Test the System

### 1. Create a test challenge
- Navigate to the challenges page
- Send a friend request to another user
- Accept the friend request
- Create a challenge battle

### 2. Test challenge acceptance
- Have the opponent accept the challenge
- Verify the battle status changes to 'active'
- Check that both participants are created

### 3. Test real-time updates
- Open the battle interface in two browser tabs/windows
- Submit answers in one tab
- Verify the other tab shows real-time updates

### 4. Test battle completion
- Complete all questions
- Verify final scores are calculated
- Check that battle status changes to 'completed'

## Step 5: Verify Real-time Functionality

### Check Supabase real-time subscriptions
In your browser console, you should see:
- Battle status updates
- Opponent answer submissions
- Score updates

### Monitor edge function logs
In Supabase dashboard → Edge Functions → Logs, check for:
- Successful function calls
- No error messages
- Proper authentication

## Troubleshooting

### Common Issues

#### 1. "started event type not allowed" error
**Solution**: Make sure you've applied the database migration from Step 1.

#### 2. Edge function not found
**Solution**: Verify the function is deployed and check the function URL in your API calls.

#### 3. Real-time updates not working
**Solution**: Check that Supabase real-time is enabled and your client is properly subscribed.

#### 4. Authentication errors
**Solution**: Verify your Supabase service role key is set correctly in the edge function.

### Debug Commands

#### Test edge function directly
```bash
curl -X POST https://your-project.supabase.co/functions/v1/simple-battle-management \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"test","battleId":"test","data":{}}'
```

#### Check database constraints
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.battle_events'::regclass;
```

## Performance Monitoring

### Key Metrics to Watch
- Edge function response times
- Real-time subscription latency
- Database query performance
- Client-side update frequency

### Optimization Tips
- The system polls every 2 seconds when active
- Real-time subscriptions are lightweight
- Edge functions handle authentication efficiently

## Rollback Plan

If you need to revert to the old system:

1. **Database**: The new tables are additive, so no data loss
2. **Edge Function**: Simply stop using the new function
3. **Frontend**: Revert component imports to the old API

## Next Steps

After successful deployment:

1. **Monitor performance** for the first few days
2. **Gather user feedback** on the new system
3. **Consider optimizations** based on usage patterns
4. **Plan future enhancements** as outlined in the README

## Support

If you encounter issues:
1. Check the Supabase logs first
2. Verify all migrations are applied
3. Test with the provided test scripts
4. Check the comprehensive README.md for system details

---

**Note**: This new system is designed to be more maintainable and performant than the previous complex battle system. The single endpoint approach reduces complexity while maintaining all functionality.
