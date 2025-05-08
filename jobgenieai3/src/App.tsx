import React, { useState } from 'react';

function App() {
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('');
  const [applications, setApplications] = useState<any[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplications([
      ...applications,
      { company, position, status, id: Date.now() },
    ]);
    setCompany('');
    setPosition('');
    setStatus('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #fff 100%)', padding: 32 }}>
      <header style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 48, color: '#2563eb', fontWeight: 800 }}>JobGenieAI</h1>
        <p style={{ fontSize: 20, color: '#374151' }}>Your smart job application tracker</p>
      </header>
      <main style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Add Application</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="text"
            placeholder="Company Name"
            value={company}
            onChange={e => setCompany(e.target.value)}
            required
            style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />
          <input
            type="text"
            placeholder="Position"
            value={position}
            onChange={e => setPosition(e.target.value)}
            required
            style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />
          <input
            type="text"
            placeholder="Status (e.g. Applied, Interview)"
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />
          <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: 12, borderRadius: 8, fontWeight: 700, border: 'none' }}>
            Add Application
          </button>
        </form>
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Applications</h3>
          {applications.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No applications yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {applications.map(app => (
                <li key={app.id} style={{ background: '#f3f4f6', marginBottom: 8, padding: 12, borderRadius: 8 }}>
                  <strong>{app.company}</strong> - {app.position} <span style={{ color: '#2563eb' }}>({app.status})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <footer style={{ textAlign: 'center', marginTop: 48, color: '#9ca3af' }}>
        &copy; {new Date().getFullYear()} JobGenieAI. All rights reserved.
      </footer>
    </div>
  );
}

export default App; 