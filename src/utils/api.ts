/**
 * Resolves the backend API Host dynamically for Web dashboards, Native Mobile environments, and external hosting (Vercel).
 */
export function getApiUrl(path: string): string {
  const currentOrigin = window.location.origin;

  // Check if we are running directly on our local dev server or our direct Cloud Run workspace origins
  const isDirectBackend =
    currentOrigin.includes("376304965448.asia-east1.run.app") ||
    currentOrigin.includes("localhost:3000") ||
    currentOrigin.includes("127.0.0.1:3000") ||
    currentOrigin.includes("0.0.0.0:3000");

  // If we are NOT running directly on the same host (e.g. deployed to Vercel, Netlify, or in a Mobile WebView context),
  // then we route all requests to our live, scalable, and secure deployment to bypass 404s.
  const backendBase = !isDirectBackend
    ? "https://ais-pre-mo5fjxhqrsqucen3q26oe3-376304965448.asia-east1.run.app"
    : "";

  return `${backendBase}${path}`;
}

/**
 * Executes a resilient, 3-stage redundant request:
 * Stage 1: Call our custom secure server-side Proxy (featuring correct User-Agent headers).
 * Stage 2: Fall back to direct Client-side fetch via Corsproxy.io.
 * Stage 3: Fall back to direct Client-side fetch via AllOrigins.
 */
async function resilientFetch(relativePath: string, directChessComUrl: string): Promise<any> {
  // --- Stage 1: Server Proxy ---
  try {
    const proxyUrl = getApiUrl(relativePath);
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.json();
    }
    console.warn(`Stage 1 Server Proxy failed for ${relativePath}. Status: ${res.status}. Falling back to Stage 2.`);
  } catch (err) {
    console.warn(`Stage 1 Server Proxy threw network error for ${relativePath}. Falling back to Stage 2.`, err);
  }

  // --- Stage 2: Corsproxy.io ---
  try {
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(directChessComUrl)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      return await res.json();
    }
    console.warn(`Stage 2 Corsproxy.io failed for ${directChessComUrl}. Status: ${res.status}. Falling back to Stage 3.`);
  } catch (err) {
    console.warn(`Stage 2 Corsproxy.io threw network error for ${directChessComUrl}. Falling back to Stage 3.`, err);
  }

  // --- Stage 3: AllOrigins ---
  try {
    const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directChessComUrl)}`;
    const res = await fetch(allOriginsUrl);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Stage 3 AllOrigins failed with status: ${res.status}`);
  } catch (err) {
    console.error(`Stage 3 AllOrigins failed as well for ${directChessComUrl}. All pipelines exhausted.`, err);
    throw new Error(`Data acquisition failed for: ${directChessComUrl}. Please ensure the username/endpoint exists.`);
  }
}

export async function fetchChessProfile(username: string): Promise<any> {
  const directUrl = `https://api.chess.com/pub/player/${username}`;
  const path = `/api/chess/profile/${username}`;
  return resilientFetch(path, directUrl);
}

export async function fetchChessStats(username: string): Promise<any> {
  const directUrl = `https://api.chess.com/pub/player/${username}/stats`;
  const path = `/api/chess/stats/${username}`;
  return resilientFetch(path, directUrl);
}

export async function fetchChessGames(username: string): Promise<any> {
  const directUrl = `https://api.chess.com/pub/player/${username}/games`;
  const path = `/api/chess/games/${username}`;
  return resilientFetch(path, directUrl);
}

export async function fetchChessClubs(username: string): Promise<any> {
  const directUrl = `https://api.chess.com/pub/player/${username}/clubs`;
  const path = `/api/chess/clubs/${username}`;
  return resilientFetch(path, directUrl).catch(() => ({ clubs: [] }));
}

export async function fetchChessTournaments(username: string): Promise<any> {
  const directUrl = `https://api.chess.com/pub/player/${username}/tournaments`;
  const path = `/api/chess/tournaments/${username}`;
  return resilientFetch(path, directUrl).catch(() => ({ finished: [], in_progress: [], registered: [] }));
}

export async function fetchChessHistory(username: string, offset: number = 0): Promise<any> {
  const path = `/api/chess/history/${username}?offset=${offset}`;
  const directUrl = `https://api.chess.com/pub/player/${username}/games/archives`;

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
    
    // Resolve games inside target archive via CORS Proxy Stage 2 / 3 fallback
    let gamesData;
    try {
      const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(archiveUrl)}`;
      const res = await fetch(corsProxyUrl);
      if (res.ok) {
        gamesData = await res.json();
      } else {
        throw new Error();
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

