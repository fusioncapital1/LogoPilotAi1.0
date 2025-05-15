import { useState } from "react";

export default function LogoPilotAi() {
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("");
  const [result, setResult] = useState<{ output?: string; slogan?: string; image_url?: string } | null>(null);

  const handleGenerate = async () => {
    try {
      const res = await fetch("http://localhost:5678/webhook/LogoPilotAi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, style }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setResult({ output: "Failed to generate brand.", slogan: errorText });
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ output: "Failed to generate brand. Please try again.", slogan: String(err) });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">LogoPilotAi</h1>
      <p className="mb-4 text-lg text-gray-700">Create stunning AI-generated brands and logos instantly.</p>
      <input
        className="border p-2 w-full mb-2 rounded"
        placeholder="Enter your industry (e.g. Fitness, Finance)"
        value={industry}
        onChange={(e) => setIndustry(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-4 rounded"
        placeholder="Preferred style (e.g. Modern, Elegant)"
        value={style}
        onChange={(e) => setStyle(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleGenerate}
      >
        Generate Brand
      </button>

      {result && (
        <div className="bg-gray-100 p-4 mt-4 rounded shadow flex flex-col items-center">
          <div className="font-bold text-lg mb-2">{result.output}</div>
          {result.slogan && <div className="italic text-gray-700 mb-2">{result.slogan}</div>}
          {result.image_url && (
            <img src={result.image_url} alt="Generated Logo" className="mt-2 max-h-48 object-contain" />
          )}
        </div>
      )}
    </div>
  );
} 