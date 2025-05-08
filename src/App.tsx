import React, { useState } from 'react'
import { auth } from './firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'

function App() {
  const [user, setUser] = useState(() => auth.currentUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')

  auth.onAuthStateChanged((u) => setUser(u))

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #fff 100%)', padding: 0, fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      {/* Mission Statement Banner */}
      <div style={{ background: '#2563eb', color: '#fff', padding: '22px 0', textAlign: 'center', fontWeight: 800, fontSize: 28, letterSpacing: 1, boxShadow: '0 2px 8px #0002' }}>
        🚀 LogoPilotAi: Instantly generate unique brands and logos with AI-driven creativity.
      </div>
      {/* How to Use Section */}
      <div style={{ background: '#e0e7ff', color: '#222', padding: '14px 0', textAlign: 'center', fontSize: 18, fontWeight: 500, borderBottom: '1px solid #c7d2fe' }}>
        <span style={{ color: '#2563eb', fontWeight: 700 }}>How to use:</span> Enter your industry and preferred style, and let LogoPilotAi create your brand and slogan!
      </div>
      <div style={{ maxWidth: 420, margin: '40px auto', background: '#fff', borderRadius: 20, boxShadow: '0 8px 32px #0002', padding: 36, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontSize: 44, color: '#2563eb', fontWeight: 900, marginBottom: 18, letterSpacing: 1 }}>LogoPilotAi</h1>
        {!user ? (
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#2563eb' }}>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: 14, borderRadius: 10, border: '1.5px solid #c7d2fe', fontSize: 18 }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: 14, borderRadius: 10, border: '1.5px solid #c7d2fe', fontSize: 18 }}
            />
            {error && <div style={{ color: 'red', fontWeight: 600 }}>{error}</div>}
            <button type="submit" style={{ background: 'linear-gradient(90deg, #2563eb 60%, #38bdf8 100%)', color: '#fff', padding: '12px 32px', borderRadius: 10, fontWeight: 800, border: 'none', fontSize: 18, cursor: 'pointer' }}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: '#e5e7eb', color: '#222', padding: '12px 32px', borderRadius: 10, fontWeight: 700, border: 'none', fontSize: 16, cursor: 'pointer' }}>
              {isSignUp ? 'Already have an account? Sign In' : 'Don\'t have an account? Sign Up'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#2563eb' }}>Welcome, {user.email}</h2>
            <button onClick={handleSignOut} style={{ background: '#ef4444', color: '#fff', padding: '12px 32px', borderRadius: 10, fontWeight: 800, border: 'none', fontSize: 18, cursor: 'pointer' }}>
              Sign Out
            </button>
            <div style={{ marginTop: 32, color: '#222' }}>
              <h3 style={{ fontWeight: 700 }}>Your Dashboard will go here.</h3>
              <p>More features coming soon!</p>
            </div>
          </div>
        )}
      </div>
      <footer style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af', fontSize: 16, fontWeight: 500 }}>
        &copy; {new Date().getFullYear()} LogoPilotAi. All rights reserved.
      </footer>
    </div>
  )
}

export default App 