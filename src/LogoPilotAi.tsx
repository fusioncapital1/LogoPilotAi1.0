import { useState } from "react";

export default function LogoPilotAi() {
  const [industry, setIndustry] = useState("");
  const [style, setStyle] = useState("");
  const [result, setResult] = useState<{ output?: string; slogan?: string; image_url?: string } | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    console.log("Button clicked");
    try {
      const res = await fetch("http://localhost:5678/webhook/LogoPilotAi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, style }),
      });
      console.log("Fetch sent");

      if (!res.ok) {
        const errorText = await res.text();
        setResult({ output: "Failed to generate brand.", slogan: errorText });
        return;
      }

      const data = await res.json();
      console.log(data);
      setResult(data);
      setImageUrl(data.image_url);
    } catch (err) {
      setResult({ output: "Failed to generate brand. Please try again.", slogan: String(err) });
    } finally {
      setLoading(false);
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
        disabled={loading}
      >
        {loading ? "Analyzing..." : "Generate Brand"}
      </button>

      {result && (
        <div className="bg-gray-100 p-4 mt-4 rounded shadow flex flex-col items-center">
          <div className="font-bold text-lg mb-2">{result.output}</div>
          {result.slogan && <div className="italic text-gray-700 mb-2">{result.slogan}</div>}
          {result.image_url && (
            <>
              <img src={result.image_url} alt="Generated Logo" className="mt-2 max-h-48 object-contain" />
              <div className="flex gap-2 mt-4">
                <a
                  href={result.image_url}
                  download="logo.png"
                  className="bg-green-600 text-white px-4 py-2 rounded inline-block"
                  style={{ textAlign: "center" }}
                >
                  Download Logo
                </a>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={async () => {
                    if (!result.image_url) return;
                    const res = await fetch(result.image_url);
                    const blob = await res.blob();
                    await navigator.clipboard.write([
                      new window.ClipboardItem({ [blob.type]: blob })
                    ]);
                    alert("Logo copied to clipboard!");
                  }}
                >
                  Copy Logo
                </button>
                <button
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  onClick={() => {
                    setResult(null);
                    setIndustry("");
                    setStyle("");
                    setImageUrl("");
                  }}
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 