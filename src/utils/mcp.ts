// Utility to fetch repo info using mcp.config.json
export async function fetchRepoInfo(owner: string, repo: string) {
  const config = await fetch('/mcp.config.json').then(res => res.json());
  const url = config.mcpServers.gitmcp.url
    .replace('{owner}', owner)
    .replace('{repo}', repo);
  return fetch(url).then(res => res.json());
} 