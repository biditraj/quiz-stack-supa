# Friend Challenges Setup Guide

## 🚀 Complete Implementation of 1v1 Quiz Battles

This guide will help you deploy the Friend Challenges feature for your QuizMaster application.

## 📋 Prerequisites

- Supabase project set up
- Node.js and npm/yarn installed
- QuizMaster application already running

## 🗄️ Database Setup

### Step 1: Run Migration

Apply the friend challenges migration to your Supabase database:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase Dashboard
# Copy contents from: supabase/migrations/20250110000000_friend_challenges.sql
```

### Step 2: Verify Tables Created

Ensure these tables were created in your Supabase database:
- `friend_relationships`
- `challenge_battles`
- `battle_participants`
- `battle_events`

## ⚡ Edge Function Setup

### Step 1: Deploy Battle Management Function

```bash
# Deploy the edge function
supabase functions deploy battle-management

# Or manually upload in Supabase Dashboard
# Copy contents from: supabase/functions/battle-management/index.ts
```

### Step 2: Set Environment Variables

In your Supabase project settings, ensure these environment variables are set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 🎯 Frontend Configuration

### Step 1: Install Dependencies (if needed)

All required dependencies should already be installed. If you encounter import errors:

```bash
npm install @tanstack/react-query framer-motion lucide-react
```

### Step 2: Verify File Structure

Ensure all these files exist in your project:

```
src/
├── types/
│   └── challenges.ts
├── lib/
│   └── challenges-api.ts
├── components/
│   └── challenges/
│       ├── FriendsManager.tsx
│       ├── BattleInterface.tsx
│       └── BattleResults.tsx
├── pages/
│   └── challenges/
│       └── ChallengesPage.tsx
└── App.tsx (updated)
```

### Step 3: Navigation Setup

The navbar has been updated to include the Challenges link. Users will see:
- Home
- Quiz
- **Challenges** (new)
- Leaderboard

## 🔐 Security Configuration

### Row Level Security Policies

The migration includes comprehensive RLS policies:

1. **Friend Relationships**: Users can only view/manage their own friendships
2. **Challenge Battles**: Users can only see battles they're part of
3. **Battle Participants**: Users can only see participants in their battles
4. **Battle Events**: Users can only see events from their battles

### Function Security

The database functions include security checks:
- `send_friend_request()`: Prevents duplicate requests and self-requests
- `respond_to_friend_request()`: Only allows recipients to respond
- `create_challenge_battle()`: Ensures users are friends before challenging

## 🧪 Testing the Feature

### Step 1: Create Test Users

1. Create two test accounts in your app
2. Note down their email addresses

### Step 2: Test Friend System

1. Login as User A
2. Navigate to Challenges → Friends tab
3. Send friend request to User B's email
4. Login as User B
5. Accept the friend request

### Step 3: Test Battle System

1. As User A, challenge User B from the Friends list
2. As User B, navigate to Challenges and accept the challenge
3. Both users can now participate in the real-time battle
4. Complete the quiz and view results

## 🎮 Feature Overview

### For Users:
- **Add Friends**: Send friend requests by email
- **Manage Friendships**: Accept/decline requests, view friends list
- **Create Challenges**: Challenge friends to quiz battles
- **Real-time Battles**: Live 1v1 quiz competitions
- **Battle Results**: Detailed performance comparison
- **Battle History**: Track wins, losses, and statistics

### For Admins:
- All user features
- Plus existing admin capabilities

## 📊 Real-time Features

The system includes several real-time updates:

1. **Battle Events**: Live updates when opponents answer questions
2. **Friend Requests**: Instant notifications for new requests
3. **Challenge Status**: Real-time battle state changes
4. **Progress Tracking**: See opponent's progress during battles

## 🔧 Troubleshooting

### Common Issues:

1. **Edge Function Not Working**
   - Check function deployment status in Supabase
   - Verify environment variables are set
   - Check function logs for errors

2. **Real-time Updates Not Working**
   - Ensure Supabase real-time is enabled
   - Check browser console for WebSocket errors
   - Verify RLS policies allow subscriptions

3. **Friend Requests Failing**
   - Check if users exist in profiles table
   - Verify email addresses are correct
   - Check RLS policies for friend_relationships

4. **Battle Creation Fails**
   - Ensure users are friends first
   - Check if enough questions exist in database
   - Verify category exists (if specified)

### Debug Steps:

1. Check browser console for JavaScript errors
2. Review Supabase logs in Dashboard
3. Test API endpoints directly in Supabase
4. Verify database constraints and policies

## 🚀 Performance Optimizations

The implementation includes several optimizations:

1. **Efficient Queries**: Optimized database queries with proper indexing
2. **Real-time Subscriptions**: Targeted subscriptions to minimize data transfer
3. **Caching**: React Query caching for better performance
4. **Lazy Loading**: Components load only when needed

## 📱 Mobile Responsiveness

The interface is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones

## 🎯 Hackathon Features

This implementation includes several impressive features for hackathons:

1. **Real-time Multiplayer**: Live 1v1 battles
2. **Social Features**: Friend system with requests
3. **Detailed Analytics**: Performance comparisons and statistics
4. **Beautiful UI**: Modern design with animations
5. **Scalable Architecture**: Handles multiple concurrent battles

## 🔄 Future Enhancements

Consider adding these features for even more impact:

1. **Tournament Brackets**: Multi-user tournaments
2. **Push Notifications**: Mobile notifications for challenges
3. **Voice Chat**: Audio communication during battles
4. **Spectator Mode**: Watch friends' battles
5. **Achievement System**: Badges and rewards
6. **AI Opponents**: Battle against AI when friends offline

## 📞 Support

If you encounter issues:

1. Check this documentation first
2. Review Supabase logs and console errors
3. Test individual components separately
4. Verify database schema matches migration

## 🎉 Deployment Complete!

Once deployed, users can:
- Add friends by email
- Challenge friends to quiz battles
- Participate in real-time 1v1 competitions
- View detailed battle results and statistics
- Track their performance over time

The feature is now ready for your hackathon presentation! 🏆
