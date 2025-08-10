// wrappers for simple APIs that hit the backend
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function fetchQuestions(limit = 0) {
  const url = `${API_BASE}/api/questions${limit ? `?limit=${limit}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch questions');
  return res.json();
}

export async function createBattle(payload) {
  const res = await fetch(`${API_BASE}/api/battle/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create battle');
  return res.json();
}

export async function startBattle(battleId) {
  const res = await fetch(`${API_BASE}/api/battle/${battleId}/start`, { method: 'POST' });
  return res.json();
}

export async function submitAnswer(battleId, answerPayload) {
  const res = await fetch(`${API_BASE}/api/battle/${battleId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answerPayload)
  });
  return res.json();
}

export async function getBattleResults(battleId) {
  const res = await fetch(`${API_BASE}/api/battle/${battleId}/results`);
  return res.json();
}
