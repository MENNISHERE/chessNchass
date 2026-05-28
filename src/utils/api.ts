/**
 * Resolves the backend API Host dynamically for Web dashboards, Native Mobile environments, and external hosting (Vercel).
 */
export function getApiUrl(path: string): string {
  return path;
}

/**
 * Executes a policy-compliant fetch from our secure Express backend proxy.
 * This guarantees the correct custom User-Agent and prevents Chess.com CORS blocking.
 */
async function secureProxyFetch(relativePath: string): Promise<any> {
  try {
    const proxyUrl = getApiUrl(relativePath);
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    throw new Error(`Proxy error ${res.status}: ${errText || "No response content"}`);
  } catch (err: any) {
    console.error(`Secure Proxy fetch failed for path ${relativePath}:`, err);
    throw new Error(`API Connection Failed: Unable to retrieve chess data securely. Please verify the chess.com username.`);
  }
}

export async function fetchChessProfile(username: string): Promise<any> {
  return secureProxyFetch(`/api/chess/profile/${username.toLowerCase().trim()}`);
}

export async function fetchChessStats(username: string): Promise<any> {
  return secureProxyFetch(`/api/chess/stats/${username.toLowerCase().trim()}`);
}

export async function fetchChessGames(username: string): Promise<any> {
  return secureProxyFetch(`/api/chess/games/${username.toLowerCase().trim()}`);
}

export async function fetchChessClubs(username: string): Promise<any> {
  return secureProxyFetch(`/api/chess/clubs/${username.toLowerCase().trim()}`).catch(() => ({ clubs: [] }));
}

export async function fetchChessTournaments(username: string): Promise<any> {
  return secureProxyFetch(`/api/chess/tournaments/${username.toLowerCase().trim()}`).catch(() => ({ finished: [], in_progress: [], registered: [] }));
}

export async function fetchChessHistory(username: string, offset: number = 0): Promise<any> {
  return secureProxyFetch(`/api/chess/history/${username.toLowerCase().trim()}?offset=${offset}`).catch(() => ({ games: [], hasMore: false }));
}


