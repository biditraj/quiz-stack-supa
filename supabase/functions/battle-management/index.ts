import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabase.auth.getUser(token)

    if (!user.user) {
      throw new Error('Unauthorized')
    }

    const { action, battleId, data } = await req.json()

    switch (action) {
      case 'join_battle':
        return await joinBattle(supabase, battleId, user.user.id)
      case 'submit_answer':
        return await submitAnswer(supabase, battleId, user.user.id, data)
      case 'complete_battle':
        return await completeBattle(supabase, battleId, user.user.id, data)
      case 'accept_challenge':
        return await acceptChallenge(supabase, battleId, user.user.id)
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function acceptChallenge(supabase: any, battleId: string, userId: string) {
  // Update battle status to active and add started timestamp
  const { error: battleError } = await supabase
    .from('challenge_battles')
    .update({ 
      status: 'active', 
      started_at: new Date().toISOString() 
    })
    .eq('id', battleId)
    .eq('status', 'pending')
    .eq('opponent_id', userId)

  if (battleError) throw new Error(`Failed to accept challenge: ${battleError.message}`)

  // Ensure a participant record exists for the accepting user only (RLS safe)
  const { data: existing } = await supabase
    .from('battle_participants')
    .select('id')
    .eq('battle_id', battleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const { error: insertErr } = await supabase
      .from('battle_participants')
      .insert({ battle_id: battleId, user_id: userId })
    if (insertErr) throw new Error(`Failed to create participant: ${insertErr.message}`)
  }

  // Log event
  await supabase
    .from('battle_events')
    .insert({
      battle_id: battleId,
      user_id: userId,
      event_type: 'joined',
      data: { action: 'accepted_challenge' }
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Challenge accepted and battle started' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function joinBattle(supabase: any, battleId: string, userId: string) {
  // Check if user is part of this battle
  const { data: battle } = await supabase
    .from('challenge_battles')
    .select('challenger_id, opponent_id, status')
    .eq('id', battleId)
    .single()

  if (!battle) throw new Error('Battle not found')

  if (battle.challenger_id !== userId && battle.opponent_id !== userId) {
    throw new Error('You are not part of this battle')
  }

  if (battle.status !== 'active') {
    throw new Error('Battle is not active')
  }

  // Ensure a participant record exists for the joining user (RLS safe)
  const { data: existing } = await supabase
    .from('battle_participants')
    .select('id')
    .eq('battle_id', battleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const { error: insertErr } = await supabase
      .from('battle_participants')
      .insert({ battle_id: battleId, user_id: userId })
    if (insertErr) throw new Error(`Failed to create participant: ${insertErr.message}`)
  }

  // Log join event
  await supabase
    .from('battle_events')
    .insert({
      battle_id: battleId,
      user_id: userId,
      event_type: 'joined',
      data: { action: 'joined_active_battle' }
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Joined battle successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function submitAnswer(supabase: any, battleId: string, userId: string, answerData: any) {
  // Get current participant data
  const { data: participant } = await supabase
    .from('battle_participants')
    .select('answers')
    .eq('battle_id', battleId)
    .eq('user_id', userId)
    .single()

  if (!participant) throw new Error('Participant not found')

  const currentAnswers = participant.answers || []
  const updatedAnswers = [...currentAnswers, answerData]

  // Update participant answers
  const { error: updateError } = await supabase
    .from('battle_participants')
    .update({ answers: updatedAnswers })
    .eq('battle_id', battleId)
    .eq('user_id', userId)

  if (updateError) throw new Error(`Failed to submit answer: ${updateError.message}`)

  // Log event
  await supabase
    .from('battle_events')
    .insert({
      battle_id: battleId,
      user_id: userId,
      event_type: 'answered',
      data: { 
        question_index: answerData.questionIndex,
        is_correct: answerData.isCorrect
      }
    })

  return new Response(
    JSON.stringify({ success: true, message: 'Answer submitted successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function completeBattle(supabase: any, battleId: string, userId: string, results: any) {
  // Update participant with final results
  const { error: updateError } = await supabase
    .from('battle_participants')
    .update({
      score: results.score,
      accuracy: results.accuracy,
      time_taken: results.timeTaken,
      completed_at: new Date().toISOString()
    })
    .eq('battle_id', battleId)
    .eq('user_id', userId)

  if (updateError) throw new Error(`Failed to complete battle: ${updateError.message}`)

  // Check if both players completed
  const { data: participants } = await supabase
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)
    .not('completed_at', 'is', null)

  if (participants && participants.length === 2) {
    // Determine winner (higher score wins, then higher accuracy, then faster time)
    const winner = participants.reduce((prev, current) => {
      if (prev.score !== current.score) {
        return prev.score > current.score ? prev : current
      }
      if (prev.accuracy !== current.accuracy) {
        return prev.accuracy > current.accuracy ? prev : current
      }
      return prev.time_taken < current.time_taken ? prev : current
    })

    // Update battle as completed
    await supabase
      .from('challenge_battles')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', battleId)

    // Mark winner
    await supabase
      .from('battle_participants')
      .update({ is_winner: true })
      .eq('battle_id', battleId)
      .eq('user_id', winner.user_id)

    await supabase
      .from('battle_participants')
      .update({ is_winner: false })
      .eq('battle_id', battleId)
      .neq('user_id', winner.user_id)

    // Add completed quiz attempt to regular quiz_attempts for leaderboard
    for (const participant of participants) {
      await supabase
        .from('quiz_attempts')
        .insert({
          user_id: participant.user_id,
          score: participant.score,
          accuracy: participant.accuracy,
          speed: Math.round(60 / (participant.time_taken / results.questionCount)) // questions per minute
        })
    }
  }

  // Log completion event
  await supabase
    .from('battle_events')
    .insert({
      battle_id: battleId,
      user_id: userId,
      event_type: 'completed',
      data: results
    })

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Battle completed successfully',
      allCompleted: participants && participants.length === 2
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
