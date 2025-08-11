# Quick Start - Simplified Battle System

## 🚀 Deploy in 3 Steps

### Step 1: Deploy Edge Function
```bash
cd supabase/functions/simple-battle-management
supabase functions deploy simple-battle-management
```

### Step 2: Fix Database Constraint
Run this in Supabase SQL Editor:
```sql
ALTER TABLE public.battle_events 
DROP CONSTRAINT IF EXISTS battle_events_event_type_check;

ALTER TABLE public.battle_events 
ADD CONSTRAINT battle_events_event_type_check 
CHECK (event_type IN ('joined', 'answered', 'completed', 'left', 'started'));
```

### Step 3: Test the System
1. Create a challenge battle
2. Accept the challenge
3. Verify battle starts automatically
4. Submit answers and see real-time updates

## ✅ What's Ready
- New edge function: `simple-battle-management`
- Updated API client: `simple-battle-api.ts`
- Updated component: `BattleInterface.tsx`
- Alternative component: `SimpleBattleInterface.tsx`

## 📚 Full Documentation
- `README.md` - Complete system overview
- `DEPLOYMENT_GUIDE.md` - Detailed deployment steps
- `IMPLEMENTATION_SUMMARY.md` - What was implemented

## 🔧 Troubleshooting
- Check Supabase Edge Functions dashboard
- Verify function is deployed and active
- Check browser console for real-time updates
- Monitor edge function logs in Supabase dashboard

---

**The system is ready to deploy!** Follow the 3 steps above to get started.
