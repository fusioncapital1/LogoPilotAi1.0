import { useState } from "react";
import { fetchRepoInfo } from "./utils/mcp";

export default function RepoInfoAssistant() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    setLoading(true);
    setError("");
    setInfo(null);
    try {
      const data = await fetchRepoInfo(owner, repo);
      setInfo(data);
    } catch (err) {
      setError("Failed to fetch repo info.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#f1f5f9", padding: 16, borderRadius: 8, marginTop: 24 }}>
      <h3 style={{ fontWeight: "bold", marginBottom: 8 }}>Repo Info Assistant</h3>
      <input
        style={{ marginRight: 8, padding: 4 }}
        placeholder="owner"
        value={owner}
        onChange={e => setOwner(e.target.value)}
      />
      <input
        style={{ marginRight: 8, padding: 4 }}
        placeholder="repo"
        value={repo}
        onChange={e => setRepo(e.target.value)}
      />
      <button onClick={handleFetch} disabled={loading || !owner || !repo}>
        {loading ? "Fetching..." : "Fetch Repo Info"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      {info && (
        <pre style={{ marginTop: 8, background: "#fff", padding: 8, borderRadius: 4, maxHeight: 200, overflow: "auto" }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      )}
    </div>
  );
} 