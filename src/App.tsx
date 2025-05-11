import React, { useState } from 'react'

function App() {
  const [industry, setIndustry] = useState('')
  const [style, setStyle] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await fetch('https://fc18-2601-401-8180-2290-7c02-cc17-14d5-82ff.ngrok-free.app/webhook/LogoPilotAi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, style }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate brand')
      }

      const data = await res.json()
      setResult(data.output || 'No result generated')
    } catch (err) {
      setError('Failed to generate brand. Please try again.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4">
      {/* Header */}
      <div className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-indigo-700 mb-4">
          LogoPilotAi
        </h1>
        <p className="text-lg text-gray-600">
          Generate unique brand names and slogans with AI
        </p>
      </div>

      {/* Main Form */}
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Technology, Fitness, Food"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-1">
              Style
            </label>
            <input
              id="style"
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g., Modern, Classic, Playful"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !industry || !style}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors
              ${loading || !industry || !style 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {loading ? 'Generating...' : 'Generate Brand'}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Your Brand</h2>
            <div className="prose prose-indigo">
              <pre className="whitespace-pre-wrap text-gray-700">{result}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} LogoPilotAi. All rights reserved.
      </footer>
    </div>
  )
}

export default App 