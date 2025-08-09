import { supabase } from '@/integrations/supabase/client';
import type { 
  FriendRelationship, 
  ChallengeBattle, 
  BattleParticipant,
  BattleEvent,
  CreateChallengeParams,
  BattleResults,
  ApiResponse
} from '@/types/challenges';

export const challengesApi = {
  // ========== Friend Management ==========
  
  /**
   * Send a friend request to another user by email
   */
  async sendFriendRequest(receiverEmail: string): Promise<string> {
    const { data, error } = await supabase.rpc('send_friend_request', {
      receiver_email: receiverEmail
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Respond to a friend request (accept or decline)
   */
  async respondToFriendRequest(requestId: string, response: 'accepted' | 'declined'): Promise<boolean> {
    const { data, error } = await supabase.rpc('respond_to_friend_request', {
      request_id: requestId,
      response
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get current user's friends list
   */
  async getFriends(): Promise<FriendRelationship[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_relationships')
      .select(`
        *,
        requester:profiles!friend_relationships_requester_id_fkey(id, username, email),
        receiver:profiles!friend_relationships_receiver_id_fkey(id, username, email)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.user.id},receiver_id.eq.${user.user.id}`);
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Get pending friend requests (received by current user)
   */
  async getPendingRequests(): Promise<FriendRelationship[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_relationships')
      .select(`
        *,
        requester:profiles!friend_relationships_requester_id_fkey(id, username, email)
      `)
      .eq('receiver_id', user.user.id)
      .eq('status', 'pending');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Get sent friend requests (sent by current user)
   */
  async getSentRequests(): Promise<FriendRelationship[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friend_relationships')
      .select(`
        *,
        receiver:profiles!friend_relationships_receiver_id_fkey(id, username, email)
      `)
      .eq('requester_id', user.user.id)
      .eq('status', 'pending');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Cancel a sent friend request (only if still pending)
   */
  async cancelSentRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_relationships')
      .delete()
      .eq('id', requestId)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
  },

  /**
   * Remove a friend relationship
   */
  async removeFriend(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friend_relationships')
      .delete()
      .eq('id', friendshipId);
    
    if (error) throw new Error(error.message);
  },

  /**
   * Search for users by email or username
   */
  async searchUsers(query: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  // ========== Challenge Management ==========

  /**
   * Create a new challenge battle
   */
  async createChallenge(params: CreateChallengeParams): Promise<string> {
    const { data, error } = await supabase.rpc('create_challenge_battle', {
      opponent_email: params.opponentEmail,
      p_category: params.category,
      p_difficulty: params.difficulty,
      p_question_count: params.questionCount
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Check presence channel for a given opponent email
   */
  async isOpponentOnlineByEmail(opponentEmail: string): Promise<boolean> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Create a temporary presence channel to read current presence state
    // Subscribe to the shared availability channel (same name used across clients)
    const channel = supabase.channel('availability', {
      config: { presence: { key: user.user.id } },
    });

    const isOnline = await new Promise<boolean>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, 1500);

      channel.on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState() as Record<string, any[]>;
          const flat = Object.values(state).flat();
          const found = flat.some((p: any) => String(p.email || '').toLowerCase() === opponentEmail.toLowerCase());
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(found);
          }
        } catch {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(false);
          }
        }
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({
            user_id: user.user.id,
            username: user.user.user_metadata?.username || (user.user.email?.split('@')[0] ?? 'User'),
            email: user.user.email,
            status: 'available',
            online_at: new Date().toISOString(),
          });
        }
      });
    });

    try { await channel.unsubscribe(); } catch {}
    return isOnline;
  },

  /**
   * Create challenge only if opponent is currently online
   */
  async createChallengeIfOnline(params: CreateChallengeParams): Promise<string> {
    // First check DB heartbeat (most reliable)
    const threshold = new Date(Date.now() - 90_000).toISOString();
    const { data, error } = await supabase
      .from('online_users')
      .select('user_id, last_seen, profiles!inner(id, email)')
      .gt('last_seen', threshold)
      .eq('profiles.email', params.opponentEmail.toLowerCase());
    if (!error && Array.isArray(data) && data.length > 0) {
      return this.createChallenge(params);
    }

    // Fallback to presence to avoid brief heartbeat gaps
    const onlinePresence = await this.isOpponentOnlineByEmail(params.opponentEmail);
    if (!onlinePresence) {
      throw new Error('Opponent is currently offline. Try again when they are online.');
    }
    return this.createChallenge(params);
  },

  /**
   * List currently online users from heartbeat table (last 90s)
   */
  async getOnlineUsers(): Promise<Array<{ user_id: string; username: string; email: string; last_seen: string }>> {
    const threshold = new Date(Date.now() - 90_000).toISOString();
    const { data, error } = await supabase
      .from('online_users')
      .select(`
        user_id,
        last_seen,
        profile:profiles!online_users_user_id_fkey(id, username, email)
      `)
      .gt('last_seen', threshold)
      .order('last_seen', { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data as any[]) || [];
    return rows.map((r) => ({
      user_id: r.user_id,
      last_seen: r.last_seen,
      username: r.profile?.username || '',
      email: r.profile?.email || '',
    }));
  },

  /**
   * Get all challenges for current user
   */
  async getMyChallenges(): Promise<ChallengeBattle[]> {
    const { data, error } = await supabase
      .from('challenge_battles')
      .select(`
        *,
        challenger:profiles!challenge_battles_challenger_id_fkey(id, username, email),
        opponent:profiles!challenge_battles_opponent_id_fkey(id, username, email),
        participants:battle_participants(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Get a specific battle by ID
   */
  async getBattle(battleId: string): Promise<ChallengeBattle> {
    const { data, error } = await supabase
      .from('challenge_battles')
      .select(`
        *,
        challenger:profiles!challenge_battles_challenger_id_fkey(id, username, email),
        opponent:profiles!challenge_battles_opponent_id_fkey(id, username, email),
        participants:battle_participants(
          *,
          user:profiles(id, username, email)
        )
      `)
      .eq('id', battleId)
      .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get battle results with detailed information
   */
  async getBattleResults(battleId: string): Promise<BattleResults> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const battle = await this.getBattle(battleId);
    
    const myParticipant = battle.participants?.find(p => p.user_id === user.user.id);
    const opponentParticipant = battle.participants?.find(p => p.user_id !== user.user.id);
    
    if (!myParticipant || !opponentParticipant) {
      throw new Error('Battle participants not found');
    }

    const { data: events, error: eventsError } = await supabase
      .from('battle_events')
      .select('*')
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true });

    if (eventsError) throw new Error(eventsError.message);

    return {
      battle,
      myParticipant,
      opponentParticipant,
      isWinner: myParticipant.is_winner || false,
      events: events || []
    };
  },

  /**
   * Cancel a pending challenge
   */
  async cancelChallenge(battleId: string): Promise<void> {
    const { error } = await supabase
      .from('challenge_battles')
      .update({ status: 'cancelled' })
      .eq('id', battleId)
      .eq('status', 'pending');
    
    if (error) throw new Error(error.message);
  },

  // ========== Battle Actions (via Edge Functions) ==========

  /**
   * Accept a challenge and start the battle
   */
  async acceptChallenge(battleId: string): Promise<ApiResponse<any>> {
    const { data, error } = await supabase.functions.invoke('battle-management', {
      body: { action: 'accept_challenge', battleId }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Join an active battle
   */
  async joinBattle(battleId: string): Promise<ApiResponse<any>> {
    const { data, error } = await supabase.functions.invoke('battle-management', {
      body: { action: 'join_battle', battleId }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Submit an answer during battle
   */
  async submitAnswer(battleId: string, answerData: any): Promise<ApiResponse<any>> {
    const { data, error } = await supabase.functions.invoke('battle-management', {
      body: { action: 'submit_answer', battleId, data: answerData }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Complete a battle with final results
   */
  async completeBattle(battleId: string, results: any): Promise<ApiResponse<any>> {
    const { data, error } = await supabase.functions.invoke('battle-management', {
      body: { action: 'complete_battle', battleId, data: results }
    });
    if (error) throw new Error(error.message);
    return data;
  },

  // ========== Real-time Subscriptions ==========

  /**
   * Subscribe to battle events for real-time updates
   */
  subscribeToBattleEvents(battleId: string, callback: (event: any) => void) {
    return supabase
      .channel(`battle-events-${battleId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'battle_events', 
          filter: `battle_id=eq.${battleId}` 
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to battle updates (status changes, etc.)
   */
  subscribeToBattleUpdates(battleId: string, callback: (battle: any) => void) {
    return supabase
      .channel(`battle-updates-${battleId}`)
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'challenge_battles', 
          filter: `id=eq.${battleId}` 
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to participant updates (answers, completion, etc.)
   */
  subscribeToBattleParticipants(battleId: string, callback: (participant: any) => void) {
    return supabase
      .channel(`battle-participants-${battleId}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'battle_participants', 
          filter: `battle_id=eq.${battleId}` 
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to friend relationship changes
   */
  subscribeToFriendUpdates(callback: (update: any) => void) {
    return supabase
      .channel('friend-updates')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'friend_relationships' 
        },
        callback
      )
      .subscribe();
  },

  /**
   * Subscribe to new challenges received
   */
  subscribeToNewChallenges(callback: (challenge: any) => void) {
    return supabase
      .channel('new-challenges')
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'challenge_battles' 
        },
        callback
      )
      .subscribe();
  },

  // ========== Availability (Presence) ==========
  /**
   * Connect to a realtime presence channel to broadcast and observe availability
   */
  async connectAvailability(onSync?: (state: Record<string, any[]>) => void) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const channel = supabase.channel('availability', {
      config: { presence: { key: user.user.id } }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onSync?.(state as Record<string, any[]>);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          user_id: user.user.id,
          username: user.user.user_metadata?.username || (user.user.email?.split('@')[0] ?? 'User'),
          email: user.user.email,
          status: 'available',
          online_at: new Date().toISOString(),
        });
      }
    });

    return channel;
  },

  /**
   * Heartbeat to online_users table every 30s (best effort)
   */
  async startOnlineHeartbeat(): Promise<() => void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return () => {};
    let cancelled = false;

    const upsert = async () => {
      try {
        await supabase
          .from('online_users')
          .upsert({ user_id: user.user.id, last_seen: new Date().toISOString() }, { onConflict: 'user_id' });
      } catch {}
    };

    // initial write
    upsert();
    const intervalId = setInterval(() => { if (!cancelled) upsert(); }, 30000);
    return () => { cancelled = true; clearInterval(intervalId); };
  },

  /**
   * Disconnect from availability channel
   */
  async disconnectAvailability(channel: any) {
    try {
      await channel?.unsubscribe();
    } catch {}
  },

  // ========== Statistics ==========

  /**
   * Get battle statistics for current user
   */
  async getBattleStats(): Promise<any> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data: participants, error } = await supabase
      .from('battle_participants')
      .select(`
        *,
        battle:challenge_battles(status, completed_at)
      `)
      .eq('user_id', user.user.id);

    if (error) throw new Error(error.message);

    const completedBattles = participants?.filter(p => 
      p.battle?.status === 'completed' && p.completed_at
    ) || [];

    const totalBattles = completedBattles.length;
    const wins = completedBattles.filter(p => p.is_winner === true).length;
    const losses = completedBattles.filter(p => p.is_winner === false).length;
    const draws = completedBattles.filter(p => p.is_winner === null).length;

    const averageScore = totalBattles > 0 
      ? completedBattles.reduce((sum, p) => sum + (p.score || 0), 0) / totalBattles 
      : 0;

    const averageAccuracy = totalBattles > 0
      ? completedBattles.reduce((sum, p) => sum + (p.accuracy || 0), 0) / totalBattles
      : 0;

    const fastestTime = completedBattles.length > 0
      ? Math.min(...completedBattles.map(p => p.time_taken || Infinity))
      : 0;

    return {
      totalBattles,
      wins,
      losses,
      draws,
      winRate: totalBattles > 0 ? wins / totalBattles : 0,
      averageScore: Math.round(averageScore),
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      fastestTime: fastestTime === Infinity ? 0 : fastestTime
    };
  },

  /**
   * Get leaderboard for battles (top performers)
   */
  async getBattleLeaderboard(limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_battle_leaderboard', { 
      limit_count: limit 
    });
    
    if (error) {
      // Fallback if function doesn't exist
      console.warn('Battle leaderboard function not found, using fallback');
      return [];
    }
    
    return data || [];
  }
};

export default challengesApi;
