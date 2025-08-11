import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, battleId, data } = await req.json()
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`Simple Battle Action: ${action} for battle ${battleId} by user ${user.id}`)

    switch (action) {
      case 'accept_challenge':
        return await acceptChallenge(supabase, battleId, user.id)
      case 'submit_answer':
        return await submitAnswer(supabase, battleId, user.id, data)
      case 'complete_battle':
        return await completeBattle(supabase, battleId, user.id, data)
      default:
        throw new Error(`Invalid action: ${action}`)
    }
  } catch (error: any) {
    console.error('Simple Battle Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Accept a challenge and start the battle
async function acceptChallenge(supabase: any, battleId: string, userId: string) {
  console.log(`Accepting challenge: battleId=${battleId}, userId=${userId}`)
  
  // Get battle details
  const { data: battle, error: fetchError } = await supabase
    .from('challenge_battles')
    .select('*')
    .eq('id', battleId)
    .single()

  if (fetchError || !battle) {
    throw new Error('Battle not found')
  }

  // Verify user is the opponent
  if (battle.opponent_id !== userId) {
    throw new Error('Only the opponent can accept the challenge')
  }

  if (battle.status !== 'pending') {
    throw new Error(`Cannot accept challenge with status: ${battle.status}`)
  }

  // Accept and start battle immediately
  const startTime = new Date().toISOString()
  
  const { error: updateError } = await supabase
    .from('challenge_battles')
    .update({ 
      status: 'active',
      started_at: startTime
    })
    .eq('id', battleId)

  if (updateError) {
    throw new Error(`Failed to start battle: ${updateError.message}`)
  }

  // Create participant records for both users
  await supabase
    .from('battle_participants')
    .upsert([
      { battle_id: battleId, user_id: battle.challenger_id, score: 0, accuracy: 0, time_taken: 0 },
      { battle_id: battleId, user_id: battle.opponent_id, score: 0, accuracy: 0, time_taken: 0 }
    ])

  // Log battle start event
  await supabase
    .from('battle_events')
    .insert({
      battle_id: battleId,
      user_id: userId,
      event_type: 'started',
      data: { start_time: startTime }
    })

  console.log('Battle started successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Challenge accepted and battle started!',
      startTime: startTime,
      questions: battle.questions
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Submit an answer to a question
async function submitAnswer(supabase: any, battleId: string, userId: string, answerData: any) {
  console.log(`Submitting answer: battleId=${battleId}, userId=${userId}`)
  
  // Get current participant data
  const { data: participant, error: fetchError } = await supabase
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !participant) {
    throw new Error('Participant not found')
  }

  // Calculate new score
  const currentAnswers = participant.answers || []
  const newAnswer = {
    questionIndex: answerData.questionIndex,
    questionId: answerData.questionId,
    selectedAnswer: answerData.selectedAnswer,
    isCorrect: answerData.isCorrect,
    timeSpent: answerData.timeSpent,
    timestamp: answerData.timestamp
  }

  // Update answers array
  const updatedAnswers = [...currentAnswers, newAnswer]
  
  // Calculate new score and accuracy
  const correctAnswers = updatedAnswers.filter(a => a.isCorrect).length
  const newScore = correctAnswers * 10
  const newAccuracy = updatedAnswers.length > 0 ? correctAnswers / updatedAnswers.length : 0

  // Update participant record
  const { error: updateError } = await supabase
    .from('battle_participants')
    .update({
      answers: updatedAnswers,
      score: newScore,
      accuracy: newAccuracy
    })
    .eq('battle_id', battleId)
    .eq('user_id', userId)

  if (updateError) {
    throw new Error(`Failed to update answer: ${updateError.message}`)
  }

  // Log answer event
  await supabase
    .from('battle_events')
    .insert({
      battle_id: battleId,
      user_id: userId,
      event_type: 'answered',
      data: { 
        questionIndex: answerData.questionIndex,
        score: newScore,
        accuracy: newAccuracy
      }
    })

  console.log('Answer submitted successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Answer submitted!',
      score: newScore,
      accuracy: newAccuracy
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Complete the battle
async function completeBattle(supabase: any, battleId: string, userId: string, results: any) {
  console.log(`Completing battle: battleId=${battleId}, userId=${userId}`)
  
  // Update participant completion
  const { error: updateError } = await supabase
    .from('battle_participants')
    .update({
      completed_at: new Date().toISOString(),
      time_taken: results.timeTaken
    })
    .eq('battle_id', battleId)
    .eq('user_id', userId)

  if (updateError) {
    throw new Error(`Failed to update completion: ${updateError.message}`)
  }

  // Check if both participants have completed
  const { data: participants, error: participantsError } = await supabase
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)

  if (participantsError) {
    throw new Error(`Failed to fetch participants: ${participantsError.message}`)
  }

  // If both completed, determine winner and mark battle as complete
  if (participants && participants.length === 2 && participants.every(p => p.completed_at)) {
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

    // Update battle status
    await supabase
      .from('challenge_battles')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq('id', battleId)

    // Add to quiz attempts for leaderboard
    for (const participant of participants) {
      await supabase
        .from('quiz_attempts')
        .insert({
          user_id: participant.user_id,
          score: participant.score,
          accuracy: participant.accuracy,
          speed: Math.round(60 / (participant.time_taken / results.questionCount))
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

  console.log('Battle completion processed successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Battle completed successfully',
      allCompleted: participants && participants.length === 2 && participants.every(p => p.completed_at)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
