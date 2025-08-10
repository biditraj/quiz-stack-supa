import React, { useEffect, useState } from 'react';
import { getBattleResults } from './api/challengesApi';

export default function Results({ battleId }) {
  const [results, setResults] = useState(null);

  useEffect(() => {
    async function load() {
      if (!battleId) return;
      const res = await getBattleResults(battleId);
      setResults(res);
    }
    load();
  }, [battleId]);

  if (!results) return <p>Load a battle to see results (use Friends → create battle)</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2>Results</h2>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}
