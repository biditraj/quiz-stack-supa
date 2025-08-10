import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handle = () => {
    if (!name || !email) return alert('Enter name & email');
    // For demo we create a simple local "user"
    const user = { id: `u-${Date.now()}`, username: name, email };
    onLogin(user);
  };

  return (
    <div style={{ maxWidth: 420, margin: '24px auto' }}>
      <div>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
      </div>
      <button onClick={handle} style={{ marginTop: 12 }}>Login</button>
    </div>
  );
}
