import React, { useState } from 'react';
import { createBattle } from './api/challengesApi';

export default function Friends({ user, onStartBattle }) {
  const [battleId, setBattleId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const startDemoBattle = async () => {
    // create a battle (backend will pick questions)
    const payload = { challenger: user, opponentEmail: null, questionCount: 6, timeLimit: 300 };
    const battle = await createBattle(payload);
    // battle.id returned (or local id)
    onStartBattle(battle.id);
  };

  const handleJoinBattle = (e) => {
    e.preventDefault();
    if (!battleId.trim()) return;
    setIsJoining(true);
    onStartBattle(battleId.trim());
    setIsJoining(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Create New Battle</h2>
        <p>Start a new battle and invite friends to join you!</p>
        <button 
          onClick={startDemoBattle}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Create Quick Battle
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px'
      }}>
        <h2>Join Existing Battle</h2>
        <p>Enter a battle ID to join an existing game</p>
        <form onSubmit={handleJoinBattle} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={battleId}
            onChange={(e) => setBattleId(e.target.value)}
            placeholder="Enter Battle ID"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
          <button 
            type="submit"
            disabled={!battleId.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: battleId.trim() ? 1 : 0.6
            }}
          >
            {isJoining ? 'Joining...' : 'Join Battle'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
        <p>How to play with a friend:</p>
        <ol>
          <li>One player creates a battle and shares the Battle ID</li>
          <li>Other players enter the Battle ID and click "Join Battle"</li>
          <li>Once all players have joined, the battle begins!</li>
        </ol>
      </div>
    </div>
  );
}
