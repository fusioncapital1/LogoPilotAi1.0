import { useState } from "react";
import RepoInfoAssistant from "./RepoInfoAssistant";

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
      console.log("API Response:", data);
      setResult(data);
      setImageUrl(data.image_url);
    } catch (err) {
      setResult({ output: "Failed to generate brand. Please try again.", slogan: String(err) });
    } finally {
      setLoading(false);
    }
  };

  function getImageUrl(result) {
    if (!result) return "";
    // Handles both {image_url: "..."} and {image_url: {image_url: "..."}}
    return typeof result.image_url === "string"
      ? result.image_url
      : result.image_url?.image_url || "";
  }

  console.log("Render result:", result);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Landing/Intro Section */}
      <section className="text-center py-10 mb-8 bg-gradient-to-r from-blue-200 to-blue-100 rounded-xl shadow-md">
        <h1 className="text-5xl font-extrabold text-blue-800 mb-2 drop-shadow">LogoPilotAi</h1>
        <p className="text-xl text-blue-700 mb-4">AI-powered branding tool for generating unique brand names and logos in seconds.</p>
        <p className="text-md text-blue-600">Enter your industry and style to get started!</p>
      </section>
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lg">
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
            <div className="font-bold text-lg mb-2">{result.output || "No brand name"}</div>
            {result.slogan && <div className="italic text-gray-700 mb-2">{result.slogan}</div>}
            {result.image_url && (
              <>
                <img
                  src={result.image_url}
                  alt="Generated Logo"
                  className="mt-2 max-h-48 object-contain"
                  style={{ border: "2px solid #333", background: "#fff" }}
                />
                {/* Thumbnail/Preview */}
                <div className="mt-4 flex flex-col items-center">
                  <div className="text-sm text-gray-500 mb-1">Thumbnail Preview</div>
                  <img
                    src={result.image_url}
                    alt="Logo Thumbnail"
                    className="w-20 h-20 object-contain border border-gray-300 rounded bg-white"
                    style={{ marginBottom: 8 }}
                  />
                  <a
                    href={result.image_url}
                    download="logo-thumbnail.png"
                    className="bg-yellow-500 text-white px-3 py-1 rounded text-xs inline-block mb-2"
                    style={{ textAlign: "center" }}
                  >
                    Download Thumbnail
                  </a>
                </div>
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
                      const imgUrl = result.image_url;
                      if (!imgUrl) {
                        alert("No image to copy!");
                        return;
                      }
                      const res = await fetch(imgUrl);
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
                {/* Share on Twitter Button */}
                <div className="mt-2 flex flex-col items-center">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Check out my new AI-generated brand: ${result.output || ""} on LogoPilotAi!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-400 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm inline-block mt-2"
                    style={{ textAlign: "center" }}
                  >
                    Share on Twitter
                  </a>
                  {/* Stripe Buy Button */}
                  <button
                    className="bg-purple-700 hover:bg-black text-white px-4 py-2 rounded font-bold text-sm inline-block mt-3"
                    style={{ textAlign: "center" }}
                    onClick={async () => {
                      // Placeholder: Stripe Checkout integration will go here
                      alert("Stripe integration coming soon! This will let users buy the high-res logo.");
                    }}
                  >
                    Buy High-Res Logo
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {/* MCP Repo Info Assistant always available */}
        <RepoInfoAssistant />
      </div>
    </div>
  );
} 