import React, { useState } from 'react';
import Battle from './components/battle.jsx';
import Friends from './components/friends.jsx';
import Results from './components/result.jsx';
import Login from './components/login.jsx';

export default function App() {
  const [user, setUser] = useState(null); // { id, username, email }
  const [view, setView] = useState('login');
  const [activeBattleId, setActiveBattleId] = useState(null);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>Quiz Battle</h1>

      {!user && <Login onLogin={(u) => { setUser(u); setView('friends'); }} />}

      {user && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, justifyContent: 'center' }}>
            <button onClick={() => setView('friends')}>Friends</button>
            <button onClick={() => setView('battle')}>Battle</button>
            <button onClick={() => setView('results')}>Results</button>
            <button onClick={() => { setUser(null); setView('login'); }}>Logout</button>
          </div>

          {view === 'friends' && <Friends user={user} onStartBattle={(battleId) => { setActiveBattleId(battleId); setView('battle'); }} />}
          {view === 'battle' && <Battle user={user} battleId={activeBattleId} />}
          {view === 'results' && <Results />}
        </>
      )}
    </div>
  );
}
