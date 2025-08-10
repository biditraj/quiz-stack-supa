import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { fetchQuestions, createBattle } from '../api/challengesApi';
import { fetchQuestions as fetchQuestionsDirect } from '../api/challengesApi'; // if direct fetch needed

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const socket = io(SOCKET_URL);

export default function Battle({ user, battleId: passedBattleId }) {
  const [battleId, setBattleId] = useState(passedBattleId || null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!battleId) return;
    // join via socket
    socket.emit('joinBattle', { battleId, user });
    socket.on('battleUpdate', (state) => {
      if (!mounted.current) return;
      setScores(state.scores || {});
    });
    socket.on('playerAnswered', (data) => {
      // optional
    });
    socket.on('battleStarted', () => {
      // optional
    });
    return () => {
      socket.off('battleUpdate');
      socket.off('playerAnswered');
      socket.off('battleStarted');
    };
  }, [battleId]);

  // If no battleId passed, load questions from backend (we create a local battle via createBattle in Friends)
  useEffect(() => {
    async function load() {
      setLoading(true);
      if (battleId) {
        // fetch battle stored in backend DB? For demo, we call questions endpoint
        const qs = await fetch(`${SOCKET_URL}/api/questions`).then(r => r.json()).catch(() => []);
        if (mounted.current) {
          setQuestions(qs);
          setLoading(false);
        }
      } else {
        const qs = await fetch(`${SOCKET_URL}/api/questions`).then(r => r.json()).catch(() => []);
        if (mounted.current) {
          setQuestions(qs.slice(0, 6));
          setLoading(false);
        }
      }
    }
    load();
  }, [battleId]);

  const handleSelect = (option) => {
    const q = questions[index];
    const isCorrect = q && (option === q.correct_answer);
    // emit to socket
    if (battleId) {
      socket.emit('submitAnswer', { battleId, userId: user.id, isCorrect });
    } else {
      // update local scores
      setScores(prev => ({ ...prev, [user.id]: (prev[user.id] || 0) + (isCorrect ? 1 : 0) }));
    }
    setIndex(i => Math.min(i + 1, (questions.length - 1)));
  };

  if (loading) return <p>Loading questions...</p>;
  if (!questions || questions.length === 0) return <p>No questions found.</p>;

  const q = questions[index];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2>Battle {battleId ? `(#${battleId})` : '(local demo)'}</h2>
      <div style={{ marginBottom: 12 }}>
        <strong>Question {index + 1} / {questions.length}</strong>
        <p>{q.question_text}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {q.options && q.options.map((opt, idx) => (
            <button key={idx} onClick={() => handleSelect(opt)}>{opt}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Scores</h3>
        <pre>{JSON.stringify(scores, null, 2)}</pre>
      </div>
    </div>
  );
}
