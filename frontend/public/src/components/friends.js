import React from 'react';
import { createBattle } from '../api/challengesApi';

export default function Friends({ user, onStartBattle }) {
  const startDemoBattle = async () => {
    // create a battle (backend will pick questions)
    const payload = { challenger: user, opponentEmail: null, questionCount: 6, timeLimit: 300 };
    const battle = await createBattle(payload);
    // battle.id returned (or local id)
    onStartBattle(battle.id);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <h2>Friends (demo)</h2>
      <p>This demo uses a simplified friends view. Click below to create a quick battle.</p>
      <button onClick={startDemoBattle}>Create Quick Battle</button>
      <div style={{ marginTop: 16 }}>
        <p>Note: For full friend management connect your users & friend_relationships table.</p>
      </div>
    </div>
  );
}
