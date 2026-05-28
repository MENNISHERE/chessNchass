/**
 * Resolves the backend API Host dynamically for Web dashboards, Native Mobile environments, and external hosting (Vercel).
 */
export function getApiUrl(path: string): string {
  return path;
}

/**
 * Executes a resilient, 3-stage redundant request:
 * Stage 1: Call our custom secure server-side Proxy (featuring correct User-Agent headers).
 * Stage 2: Fall back to direct Client-side fetch via Corsproxy.io.
 * Stage 3: Fall back to direct Client-side fetch via AllOrigins.
 */
async function resilientFetch(relativePath: string, directChessComUrl: string): Promise<any> {
  // --- Stage 1: Direct Native Fetch ---
  // Chess.com actually supports CORS natively. Let's try hitting them directly first to bypass Vercel server timeouts.
  try {
    const res = await fetch(directChessComUrl);
    if (res.ok) {
      return await res.json();
    }
    console.warn(`Stage 1 Direct Fetch failed for ${directChessComUrl}. Status: ${res.status}. Falling back to Proxy.`);
  } catch (err) {
    console.warn(`Stage 1 Direct Fetch threw network error for ${directChessComUrl}. Falling back to Proxy.`, err);
  }

  // --- Stage 2: Server Proxy ---
  try {
    const proxyUrl = getApiUrl(relativePath);
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.json();
    }
    console.warn(`Stage 2 Server Proxy failed for ${relativePath}. Status: ${res.status}. Falling back to Corsproxy.io.`);
  } catch (err) {
    console.warn(`Stage 2 Server Proxy threw network error for ${relativePath}. Falling back to Corsproxy.io.`, err);
  }

  // --- Stage 3: Corsproxy.io ---
  try {
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(directChessComUrl)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      return await res.json();
    }
    console.warn(`Stage 3 Corsproxy.io failed for ${directChessComUrl}. Status: ${res.status}. Falling back to AllOrigins.`);
  } catch (err) {
    console.warn(`Stage 3 Corsproxy.io threw network error for ${directChessComUrl}. Falling back to AllOrigins.`, err);
  }

  // --- Stage 4: AllOrigins ---
  try {
    const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directChessComUrl)}`;
    const res = await fetch(allOriginsUrl);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Stage 4 AllOrigins failed with status: ${res.status}`);
  } catch (err) {
    console.error(`All fetch pipelines exhausted for ${directChessComUrl}.`, err);
    throw new Error(`Data acquisition failed for: ${directChessComUrl}. Please ensure the username exists.`);
  }
}

export async function fetchChessProfile(username: string): Promise<any> {
  const safeUser = username.toLowerCase().trim();
  const directUrl = `https://api.chess.com/pub/player/${safeUser}`;
  const path = `/api/chess/profile/${safeUser}`;
  return resilientFetch(path, directUrl);
}

export async function fetchChessStats(username: string): Promise<any> {
  const safeUser = username.toLowerCase().trim();
  const directUrl = `https://api.chess.com/pub/player/${safeUser}/stats`;
  const path = `/api/chess/stats/${safeUser}`;
  return resilientFetch(path, directUrl);
}

export async function fetchChessGames(username: string): Promise<any> {
  const safeUser = username.toLowerCase().trim();
  const directUrl = `https://api.chess.com/pub/player/${safeUser}/games`;
  const path = `/api/chess/games/${safeUser}`;
  return resilientFetch(path, directUrl);
}

export async function fetchChessClubs(username: string): Promise<any> {
  const safeUser = username.toLowerCase().trim();
  const directUrl = `https://api.chess.com/pub/player/${safeUser}/clubs`;
  const path = `/api/chess/clubs/${safeUser}`;
  return resilientFetch(path, directUrl).catch(() => ({ clubs: [] }));
}

export async function fetchChessTournaments(username: string): Promise<any> {
  const safeUser = username.toLowerCase().trim();
  const directUrl = `https://api.chess.com/pub/player/${safeUser}/tournaments`;
  const path = `/api/chess/tournaments/${safeUser}`;
  return resilientFetch(path, directUrl).catch(() => ({ finished: [], in_progress: [], registered: [] }));
}

export async function fetchChessHistory(username: string, offset: number = 0): Promise<any> {
  const safeUser = username.toLowerCase().trim();
  const path = `/api/chess/history/${safeUser}?offset=${offset}`;
  const directUrl = `https://api.chess.com/pub/player/${safeUser}/games/archives`;

  try {
    // Attempt archive selection through resilient fetching
    const archivesData = await resilientFetch(path, directUrl);

    // If archivesData has a 'games' array, it means Stage 1 (Server Proxy) succeeded and bypassed archives processing
    if (archivesData && Array.isArray(archivesData.games)) {
      return archivesData;
    }

    // Direct browser fallback from archives array
    if (!archivesData || !archivesData.archives || archivesData.archives.length === 0) {
      return { games: [], hasMore: false };
    }

    const targetIndex = archivesData.archives.length - 1 - offset;
    if (targetIndex < 0) {
      return { games: [], hasMore: false };
    }

    const archiveUrl = archivesData.archives[targetIndex];
    
    // Resolve games inside target archive via resilient fetching approach
    let gamesData;
    try {
      const res = await fetch(archiveUrl);
      if (res.ok) {
        gamesData = await res.json();
      } else {
        throw new Error("Direct archive fetch failed");
      }
    } catch {
      try {
        const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(archiveUrl)}`;
        const res = await fetch(corsProxyUrl);
        if (res.ok) {
          gamesData = await res.json();
        } else {
          throw new Error("CORS proxy failed");
        }
      } catch {
        const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(archiveUrl)}`;
        const res = await fetch(allOriginsUrl);
        if (res.ok) {
          gamesData = await res.json();
        } else {
          throw new Error("Failed to load historical games archive");
        }
      }
    }

    if (gamesData && gamesData.games) {
      const recentGames = [...gamesData.games].reverse();
      return { games: recentGames, hasMore: targetIndex > 0 };
    } else {
      return { games: [], hasMore: targetIndex > 0 };
    }
  } catch (err) {
    console.warn(`Resilient fetch failed for historical archives of ${username}. Attempting backup raw endpoint.`, err);
    try {
      const backupRes = await fetch(getApiUrl(path));
      if (backupRes.ok) return await backupRes.json();
    } catch {}
    return { games: [], hasMore: false };
  }
}

