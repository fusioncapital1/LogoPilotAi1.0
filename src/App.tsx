import React, { useState } from "react";

interface ResultType {
  output: string;
  slogan?: string;
  image_url?: string;
}

export default function App() {
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("");
  const [result, setResult] = useState<ResultType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-preview:generateContent?key=AIzaSyBmXFeJC8FmU9udqVD9dTI3kXrI2UJ7Y_Q",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer sk-vndON3LhPKuysTkW9tavWINRofd9xmJ17pgKeKDCSV8H",
          },
          body: JSON.stringify({ industry, style }),
        }
      );
      if (!res.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await res.json();
      if (!data.output || !data.image_url) {
        throw new Error("No result generated");
      }
      setResult(data);
    } catch (err) {
      setError("Failed to generate brand. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-2 text-indigo-700">LogoPilotAi</h1>
      <p className="mb-6 text-lg text-gray-700 text-center max-w-xl">
        Generate unique brand names and slogans with AI.
      </p>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md flex flex-col gap-4"
      >
        <input
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Industry (e.g. Fitness, Finance)"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Style (e.g. Modern, Elegant)"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
          disabled={loading || !industry || !style}
        >
          {loading ? "Generating..." : "Generate Brand"}
        </button>
      </form>
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mt-6 w-full max-w-md text-red-700 shadow">
          {error}
        </div>
      )}
      {result && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-6 w-full max-w-md shadow flex flex-col items-center">
          <div className="mb-2 font-bold text-lg">{result.output}</div>
          {result.slogan && (
            <div className="mb-2 italic text-gray-700">{result.slogan}</div>
          )}
          {result.image_url && (
            <img
              src={result.image_url}
              alt="Generated Logo"
              className="mt-2 max-h-48 object-contain"
            />
          )}
        </div>
      )}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} LogoPilotAi. All rights reserved.
      </footer>
    </div>
  );
}