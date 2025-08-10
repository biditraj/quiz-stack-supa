// backend/server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient.js';

dotenv.config();
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// In-memory minimal battle state for realtime sync
// In production you should persist in DB (challenge_battles, battle_events, battle_answers)
const activeBattles = {};

// ----------------- Simple HTTP API -----------------

// Fetch questions from Supabase (returns all or limited)
app.get('/api/questions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '0', 10);
    const query = supabase.from('questions').select('id, question_text, options, correct_answer, image_url');
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    let arr = data || [];
    if (limit > 0) arr = arr.slice(0, limit);
    res.json(arr);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Create a lightweight "battle" record in DB and return it
app.post('/api/battle/create', async (req, res) => {
  // body: { challenger, opponentEmail, questionCount, timeLimit, difficulty }
  try {
    const { challenger, opponentEmail, questionCount = 10, timeLimit = 600, difficulty = 'medium', category = null } = req.body;

    // fetch random questions
    const { data: allQuestions, error: qErr } = await supabase.from('questions').select('id, question_text, options, correct_answer');
    if (qErr) return res.status(500).json({ error: qErr.message });
    const shuffled = (allQuestions || []).sort(() => Math.random() - 0.5).slice(0, questionCount);

    // insert into challenge_battles (optional) — if table exists
    let battleRecord = null;
    try {
      const payload = {
        challenger_id: challenger?.id || null,
        challenger: challenger || null,
        opponent: null,
        opponent_id: null,
        difficulty,
        category,
        question_count: questionCount,
        time_limit: timeLimit,
        status: 'pending',
        questions: shuffled
      };
      const { data: inserted, error: insertErr } = await supabase.from('challenge_battles').insert(payload).select().single();
      if (insertErr) {
        // If table doesn't exist, return a temporary battle object
        // console.warn('Could not insert into challenge_battles:', insertErr.message);
        battleRecord = { id: `local-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
      } else {
        battleRecord = inserted;
      }
    } catch (e) {
      battleRecord = { id: `local-${Date.now()}`, questions: shuffled, question_count: questionCount, time_limit: timeLimit, status: 'pending', difficulty, created_at: new Date().toISOString() };
    }

    // Prepare in-memory battle state for realtime
    activeBattles[battleRecord.id] = {
      battle: battleRecord,
      players: {}, // userId -> {username, socketId}
      scores: {}   // userId -> score
    };

    res.json(battleRecord);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Accept/Start battle (activate)
app.post('/api/battle/:id/start', async (req, res) => {
  const { id } = req.params;
  try {
    // Update DB if present
    await supabase.from('challenge_battles').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', id);
    // Emit event via realtime if anyone connected (we'll use socket.io)
    io.to(id).emit('battleStarted', { battleId: id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Submit answer (persist to battle_answers if table exists)
app.post('/api/battle/:id/answer', async (req, res) => {
  const { id } = req.params;
  try {
    const body = req.body; // user_id, questionIndex, questionId, selectedAnswer, isCorrect, timeSpent
    // insert to battle_answers table if it exists
    await supabase.from('battle_answers').insert({
      battle_id: id,
      user_id: body.user_id,
      question_index: body.questionIndex,
      question_id: body.questionId,
      selected_answer: body.selectedAnswer,
      is_correct: !!body.isCorrect,
      time_spent: body.timeSpent || 0
    });
    // emit realtime event
    io.to(id).emit('playerAnswered', { battleId: id, userId: body.user_id, questionIndex: body.questionIndex, isCorrect: !!body.isCorrect });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Minimal results aggregator (reads battle_answers for a battle)
app.get('/api/battle/:id/results', async (req, res) => {
  const { id } = req.params;
  try {
    const { data: answers, error } = await supabase.from('battle_answers').select('*').eq('battle_id', id);
    if (error) return res.status(500).json({ error: error.message });
    // group by user_id
    const byUser = {};
    (answers || []).forEach(a => {
      if (!byUser[a.user_id]) byUser[a.user_id] = { answers: [], score: 0, time_taken: 0 };
      byUser[a.user_id].answers.push(a);
      if (a.is_correct) byUser[a.user_id].score += 1;
      byUser[a.user_id].time_taken += (a.time_spent || 0);
    });
    res.json({ byUser });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ----------------- Socket.IO realtime -----------------
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('joinBattle', ({ battleId, user }) => {
    socket.join(battleId);
    if (!activeBattles[battleId]) {
      activeBattles[battleId] = { battle: { id: battleId }, players: {}, scores: {} };
    }
    activeBattles[battleId].players[user.id] = { username: user.username || user.email || 'Anon', socketId: socket.id };
    if (!activeBattles[battleId].scores[user.id]) activeBattles[battleId].scores[user.id] = 0;

    // broadcast current state
    io.to(battleId).emit('battleUpdate', { players: activeBattles[battleId].players, scores: activeBattles[battleId].scores });
  });

  socket.on('submitAnswer', ({ battleId, userId, isCorrect }) => {
    if (!activeBattles[battleId]) return;
    if (!activeBattles[battleId].scores[userId]) activeBattles[battleId].scores[userId] = 0;
    if (isCorrect) activeBattles[battleId].scores[userId] += 1;
    io.to(battleId).emit('battleUpdate', { players: activeBattles[battleId].players, scores: activeBattles[battleId].scores });
  });

  socket.on('leaveBattle', ({ battleId, userId }) => {
    if (activeBattles[battleId]) {
      delete activeBattles[battleId].players[userId];
      delete activeBattles[battleId].scores[userId];
      io.to(battleId).emit('battleUpdate', { players: activeBattles[battleId].players, scores: activeBattles[battleId].scores });
    }
    socket.leave(battleId);
  });

  socket.on('disconnect', () => {
    // no-op cleanup for this simple demo
    console.log('Socket disconnected', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
