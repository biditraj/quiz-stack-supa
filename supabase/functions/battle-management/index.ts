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
    console.log('=== BATTLE MANAGEMENT REQUEST START ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('Supabase client created successfully')

    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader) {
      throw new Error('Authorization header missing')
    }
    
    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    const { data: user, error: authError } = await supabase.auth.getUser(token)

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }

    if (!user.user) {
      throw new Error('No user found in token')
    }

    console.log('User authenticated successfully:', user.user.id)

    const requestBody = await req.json()
    console.log('Request body parsed:', requestBody)
    const { action, battleId, data } = requestBody

    if (!action || !battleId) {
      throw new Error('Missing required fields: action, battleId')
    }

    console.log(`Processing action: ${action} for battle: ${battleId}`)

    // Enhanced table check
    console.log('Checking if challenge_battles table exists...')
    try {
      const { data: tableData, error: tableCheckError } = await supabase
        .from('challenge_battles')
        .select('id')
        .limit(1)
      
      console.log('Table check result:', { data: tableData, error: tableCheckError })
      
      if (tableCheckError) {
        console.error('Table check error:', tableCheckError)
        if (tableCheckError.code === '42P01') {
          throw new Error('TABLE_NOT_FOUND: challenge_battles table does not exist. Run manual migration.')
        }
        throw new Error(`TABLE_ERROR: ${tableCheckError.message} (Code: ${tableCheckError.code})`)
      }
      
      console.log('Table check passed successfully')
    } catch (error: any) {
      console.error('Table check exception:', error)
      if (error.message.includes('TABLE_')) {
        throw error
      }
      throw new Error(`TABLE_CHECK_FAILED: ${error.message}`)
    }

    switch (action) {
      case 'join_battle':
        return await joinBattle(supabase, battleId, user.user.id)
      case 'submit_answer':
        return await submitAnswer(supabase, battleId, user.user.id, data)
      case 'complete_battle':
        return await completeBattle(supabase, battleId, user.user.id, data)
      case 'accept_challenge':
        return await acceptChallenge(supabase, battleId, user.user.id)
      case 'start_battle':
        return await startBattle(supabase, battleId, user.user.id)
      default:
        throw new Error(`Invalid action: ${action}`)
    }
  } catch (error: any) {
    console.error('=== BATTLE MANAGEMENT ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error object:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        action: 'battle-management'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function acceptChallenge(supabase: any, battleId: string, userId: string) {
  console.log(`AcceptChallenge: battleId=${battleId}, userId=${userId}`)
  
  // First, verify the battle exists and user is the opponent
  const { data: battle, error: fetchError } = await supabase
    .from('challenge_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch battle:', fetchError)
    throw new Error(`Battle not found: ${fetchError.message}`)
  }

  if (!battle) {
    throw new Error('Battle not found')
  }

  console.log('Battle data:', battle)

  // Check if user is the opponent
  if (battle.opponent_id !== userId) {
    throw new Error('Only the opponent can accept the challenge')
  }

  if (battle.status !== 'pending') {
    throw new Error(`Cannot accept challenge with status: ${battle.status}`)
  }

  // Accept the challenge first
  const { error: acceptError } = await supabase
    .from('challenge_battles')
    .update({ 
      status: 'accepted'
    })
    .eq('id', battleId)
    .eq('status', 'pending')
    .eq('opponent_id', userId)

  if (acceptError) {
    console.error('Failed to accept challenge:', acceptError)
    throw new Error(`Failed to accept challenge: ${acceptError.message}`)
  }

  console.log('Challenge accepted successfully')

  // Create participant record for the opponent
  const { error: participantError } = await supabase
    .from('battle_participants')
    .insert({ 
      battle_id: battleId, 
      user_id: userId 
    })

  if (participantError) {
    console.error('Failed to create participant record:', participantError)
    // Don't throw here, challenge was accepted successfully
  }

  // Now automatically start the battle for both users
  const startTime = new Date().toISOString()
  console.log('Auto-starting battle with synchronized time:', startTime)
  
  // Update battle status to active
  const { error: battleError } = await supabase
    .from('challenge_battles')
    .update({ 
      status: 'active', 
      started_at: startTime
    })
    .eq('id', battleId)
    .eq('status', 'accepted')

  if (battleError) {
    console.error('Failed to start battle:', battleError)
    throw new Error(`Failed to start battle: ${battleError.message}`)
  }

  // Ensure challenger has participant record
  const { data: participants, error: participantsError } = await supabase
    .from('battle_participants')
    .select('user_id')
    .eq('battle_id', battleId)

  if (!participantsError) {
    const challengerParticipant = participants?.find(p => p.user_id === battle.challenger_id)
    if (!challengerParticipant) {
      console.log('Creating participant record for challenger...')
      await supabase
        .from('battle_participants')
        .insert({ battle_id: battleId, user_id: battle.challenger_id })
    }
  }

  // Log synchronized start event for both users
  const { error: eventError } = await supabase
    .from('battle_events')
    .insert([
      {
        battle_id: battleId,
        user_id: battle.challenger_id,
        event_type: 'started',
        data: { synchronized_start: startTime, triggered_by: userId, auto_start: true }
      },
      {
        battle_id: battleId,
        user_id: battle.opponent_id,
        event_type: 'started',
        data: { synchronized_start: startTime, triggered_by: userId, auto_start: true }
      }
    ])

  if (eventError) {
    console.error('Failed to log start events:', eventError)
    // Don't throw here, battle has started successfully
  }

  console.log('Battle auto-started successfully for both players')
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Challenge accepted and battle started automatically for both players',
      startTime: startTime,
      questions: battle.questions
    }),
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

async function startBattle(supabase: any, battleId: string, userId: string) {
  console.log(`StartBattle: battleId=${battleId}, userId=${userId}`)
  
  // First, verify the battle exists and user is part of it
  const { data: battle, error: fetchError } = await supabase
    .from('challenge_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (fetchError) {
    console.error('Failed to fetch battle:', fetchError)
    throw new Error(`Battle not found: ${fetchError.message}`)
  }

  if (!battle) {
    throw new Error('Battle not found')
  }

  console.log('Battle data:', battle)

  // Check if user is part of this battle
  if (battle.challenger_id !== userId && battle.opponent_id !== userId) {
    throw new Error('You are not part of this battle')
  }

  if (battle.status !== 'accepted') {
    throw new Error(`Cannot start battle with status: ${battle.status}. Battle must be accepted first.`)
  }

  // Check if both users have participant records (both are ready)
  const { data: participants, error: participantsError } = await supabase
    .from('battle_participants')
    .select('user_id')
    .eq('battle_id', battleId)

  if (participantsError) {
    console.error('Failed to check participants:', participantsError)
    throw new Error(`Failed to check participants: ${participantsError.message}`)
  }

  console.log('Current participants:', participants)

  // Ensure both challenger and opponent have participant records
  const challengerParticipant = participants?.find(p => p.user_id === battle.challenger_id)
  const opponentParticipant = participants?.find(p => p.user_id === battle.opponent_id)

  if (!challengerParticipant) {
    console.log('Creating participant record for challenger...')
    const { error: insertError } = await supabase
      .from('battle_participants')
      .insert({ battle_id: battleId, user_id: battle.challenger_id })
    if (insertError) {
      console.error('Failed to create challenger participant:', insertError)
      throw new Error(`Failed to create challenger participant: ${insertError.message}`)
    }
  }

  if (!opponentParticipant) {
    console.log('Creating participant record for opponent...')
    const { error: insertError } = await supabase
      .from('battle_participants')
      .insert({ battle_id: battleId, user_id: battle.opponent_id })
    if (insertError) {
      console.error('Failed to create opponent participant:', insertError)
      throw new Error(`Failed to create opponent participant: ${insertError.message}`)
    }
  }

  // Now start the battle - update status to active with synchronized start time
  const startTime = new Date().toISOString()
  console.log('Starting battle with synchronized time:', startTime)
  
  const { error: battleError } = await supabase
    .from('challenge_battles')
    .update({ 
      status: 'active', 
      started_at: startTime
    })
    .eq('id', battleId)
    .eq('status', 'accepted')

  if (battleError) {
    console.error('Failed to start battle:', battleError)
    throw new Error(`Failed to start battle: ${battleError.message}`)
  }

  // Log synchronized start event for both users
  const { error: eventError } = await supabase
    .from('battle_events')
    .insert([
      {
        battle_id: battleId,
        user_id: battle.challenger_id,
        event_type: 'started',
        data: { synchronized_start: startTime, triggered_by: userId }
      },
      {
        battle_id: battleId,
        user_id: battle.opponent_id,
        event_type: 'started',
        data: { synchronized_start: startTime, triggered_by: userId }
      }
    ])

  if (eventError) {
    console.error('Failed to log start events:', eventError)
    // Don't throw here, battle has started successfully
  }

  console.log('Battle started successfully with synchronized timing')
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Battle started successfully for both players',
      startTime: startTime,
      questions: battle.questions
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
