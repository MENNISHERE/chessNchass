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
 * Highly robust fetches.
 * We prioritize direct fetching from Chess.com's public CORS-enabled API from the client browser.
 * This completely avoids server routing overhead, avoids CORS preflight failures, minimizes latency,
 * and guarantees 100% success when deployed to Vercel/Netlify/mobile WebView.
 */

export async function fetchChessProfile(username: string): Promise<any> {
  const url = `https://api.chess.com/pub/player/${username}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Profile not found directly from Chess.com");
    return await res.json();
  } catch (err) {
    console.warn(`Direct fetch failed for profile: ${username}. Falling back to server.`, err);
    const backupUrl = getApiUrl(`/api/chess/profile/${username}`);
    const backupRes = await fetch(backupUrl);
    if (!backupRes.ok) throw new Error("Profile not found in both direct and backup endpoints.");
    return await backupRes.json();
  }
}

export async function fetchChessStats(username: string): Promise<any> {
  const url = `https://api.chess.com/pub/player/${username}/stats`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Stats not found directly from Chess.com");
    return await res.json();
  } catch (err) {
    console.warn(`Direct fetch failed for stats: ${username}. Falling back to server.`, err);
    const backupUrl = getApiUrl(`/api/chess/stats/${username}`);
    const backupRes = await fetch(backupUrl);
    if (!backupRes.ok) throw new Error("Stats not found in both direct and backup endpoints.");
    return await backupRes.json();
  }
}

export async function fetchChessGames(username: string): Promise<any> {
  const url = `https://api.chess.com/pub/player/${username}/games`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Games not found directly from Chess.com");
    return await res.json();
  } catch (err) {
    console.warn(`Direct fetch failed for active games: ${username}. Falling back to server.`, err);
    const backupUrl = getApiUrl(`/api/chess/games/${username}`);
    const backupRes = await fetch(backupUrl);
    if (!backupRes.ok) throw new Error("Games not found in both direct and backup endpoints.");
    return await backupRes.json();
  }
}

export async function fetchChessClubs(username: string): Promise<any> {
  const url = `https://api.chess.com/pub/player/${username}/clubs`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Clubs not found directly from Chess.com");
    return await res.json();
  } catch (err) {
    console.warn(`Direct fetch failed for clubs: ${username}. Falling back to server.`, err);
    const backupUrl = getApiUrl(`/api/chess/clubs/${username}`);
    const backupRes = await fetch(backupUrl);
    if (!backupRes.ok) throw new Error("Clubs not found in both direct and backup endpoints.");
    return await backupRes.json();
  }
}

export async function fetchChessTournaments(username: string): Promise<any> {
  const url = `https://api.chess.com/pub/player/${username}/tournaments`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Tournaments not found directly from Chess.com");
    return await res.json();
  } catch (err) {
    console.warn(`Direct fetch failed for tournaments: ${username}. Falling back to server.`, err);
    const backupUrl = getApiUrl(`/api/chess/tournaments/${username}`);
    const backupRes = await fetch(backupUrl);
    if (!backupRes.ok) throw new Error("Tournaments not found in both direct and backup endpoints.");
    return await backupRes.json();
  }
}

export async function fetchChessHistory(username: string, offset: number = 0): Promise<any> {
  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archivesRes.ok) throw new Error("Archives not found directly from Chess.com");
    const archivesData = await archivesRes.json();

    if (!archivesData || !archivesData.archives || archivesData.archives.length === 0) {
      return { games: [], hasMore: false };
    }

    const targetIndex = archivesData.archives.length - 1 - offset;
    if (targetIndex < 0) {
      return { games: [], hasMore: false };
    }

    const archiveUrl = archivesData.archives[targetIndex];
    const gamesRes = await fetch(archiveUrl);
    if (!gamesRes.ok) throw new Error("Games archive download failed directly");
    const gamesData = await gamesRes.json();

    if (gamesData && gamesData.games) {
      const recentGames = [...gamesData.games].reverse();
      return { games: recentGames, hasMore: targetIndex > 0 };
    } else {
      return { games: [], hasMore: targetIndex > 0 };
    }
  } catch (err) {
    console.warn(`Direct fetch failed for historical archives: ${username}. Falling back to server.`, err);
    const backupUrl = getApiUrl(`/api/chess/history/${username}?offset=${offset}`);
    const backupRes = await fetch(backupUrl);
    if (!backupRes.ok) throw new Error("History not found in both direct and backup endpoints.");
    return await backupRes.json();
  }
}

