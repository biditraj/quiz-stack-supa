import { supabase } from '@/integrations/supabase/client';
import type { 
  FriendRelationship, 
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
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friend_relationships')
      .delete()
      .eq('id', requestId)
      .eq('requester_id', user.user.id)
      .eq('status', 'pending');
    
    if (error) throw new Error(error.message);
  },

  /**
   * Remove a friend (delete the friendship)
   */
  async removeFriend(friendshipId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friend_relationships')
      .delete()
      .eq('id', friendshipId)
      .or(`requester_id.eq.${user.user.id},receiver_id.eq.${user.user.id}`);
    
    if (error) throw new Error(error.message);
  },

  /**
   * Search for users by username or email
   */
  async searchUsers(query: string): Promise<any[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', user.user.id)
      .limit(10);
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  // ========== Online Presence ==========

  /**
   * Get list of online users
   */
  async getOnlineUsers(): Promise<Array<{ user_id: string; username: string; email: string; last_seen: string }>> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('online_users')
      .select('user_id, username, email, last_seen')
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // 5 minutes ago
      .neq('user_id', user.user.id)
      .order('last_seen', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Subscribe to friend updates
   */
  subscribeToFriendUpdates(callback: (update: any) => void) {
    const { data: user } = supabase.auth.getUser();
    if (!user.user) return null;

    return supabase
      .channel('friend_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_relationships',
          filter: `requester_id=eq.${user.user.id} OR receiver_id=eq.${user.user.id}`
        },
        callback
      )
      .subscribe();
  },

  /**
   * Connect to availability/presence channel
   */
  async connectAvailability(onSync?: (state: Record<string, any[]>) => void) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const channel = supabase.channel(`online_users:${user.user.id}`, {
      config: {
        presence: {
          key: user.user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        if (onSync) {
          onSync(channel.presenceState());
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.user.id, username: user.user.user_metadata?.username, email: user.user.email });
        }
      });

    return channel;
  },

  /**
   * Start online heartbeat for server-side online check
   */
  async startOnlineHeartbeat(): Promise<() => void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return () => {};

    const upsert = async () => {
      const { error } = await supabase
        .from('online_users')
        .upsert({
          user_id: user.user.id,
          username: user.user.user_metadata?.username || 'Anonymous',
          email: user.user.email || '',
          last_seen: new Date().toISOString()
        });
      if (error) console.error('Heartbeat error:', error);
    };

    // Initial update
    await upsert();
    
    // Update every 30 seconds
    const interval = setInterval(upsert, 30000);
    
    return () => clearInterval(interval);
  },

  /**
   * Disconnect from availability channel
   */
  async disconnectAvailability(channel: any) {
    if (channel) {
      await channel.unsubscribe();
    }
  }
};

export default challengesApi;
