import { supabase } from '@/integrations/supabase/client';

export interface SimpleBattleAction {
  action: 'accept_challenge' | 'submit_answer' | 'complete_battle';
  battleId: string;
  data?: any;
}

export interface SimpleBattleResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

export const simpleBattleApi = {
  // Accept a challenge and start battle
  async acceptChallenge(battleId: string): Promise<SimpleBattleResponse> {
    try {
      const response = await fetch('/functions/v1/simple-battle-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'accept_challenge',
          battleId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept challenge');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Accept challenge error:', error);
      throw new Error(error.message || 'Failed to accept challenge');
    }
  },

  // Submit an answer
  async submitAnswer(battleId: string, answerData: {
    questionIndex: number;
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    timestamp: number;
  }): Promise<SimpleBattleResponse> {
    try {
      const response = await fetch('/functions/v1/simple-battle-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'submit_answer',
          battleId,
          data: answerData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit answer');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Submit answer error:', error);
      throw new Error(error.message || 'Failed to submit answer');
    }
  },

  // Complete battle
  async completeBattle(battleId: string, results: {
    score: number;
    accuracy: number;
    timeTaken: number;
    questionCount: number;
  }): Promise<SimpleBattleResponse> {
    try {
      const response = await fetch('/functions/v1/simple-battle-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'complete_battle',
          battleId,
          data: results,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete battle');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Complete battle error:', error);
      throw new Error(error.message || 'Failed to complete battle');
    }
  },

  // Get battle data
  async getBattle(battleId: string) {
    try {
      const { data, error } = await supabase
        .from('challenge_battles')
        .select(`
          *,
          challenger:profiles!challenge_battles_challenger_id_fkey(username, avatar_url),
          opponent:profiles!challenge_battles_opponent_id_fkey(username, avatar_url),
          questions:questions(*),
          participants:battle_participants(*)
        `)
        .eq('id', battleId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Get battle error:', error);
      throw new Error(error.message || 'Failed to get battle');
    }
  },

  // Get real-time battle updates
  subscribeToBattle(battleId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`simple-battle-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_battles',
          filter: `id=eq.${battleId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_participants',
          filter: `battle_id=eq.${battleId}`,
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_events',
          filter: `battle_id=eq.${battleId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
