import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();

// Configure high-performance CORS middleware for outer platforms (Vercel, Mobile, etc.)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// In-memory caching layer to prevent Chess.com rate limit blocks (429/403) and Vercel execution timeouts (504)
const cacheStore = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 120 * 1000; // 2 minutes (120,000ms) caching duration

async function fetchWithUserAgentAndCache(url: string): Promise<any> {
  const cached = cacheStore.get(url);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[Cache Hit] Chess.com endpoint served from memory: ${url}`);
    return cached.data;
  }

  console.log(`[Cache Miss] Querying direct Chess.com endpoint: ${url}`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "chessNchass/1.0 (contact: pro679715@gmail.com; user: noman1119)"
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream Chess.com failure: ${response.status} for ${url}`);
  }

  const data = await response.json();
  cacheStore.set(url, { data, expiry: Date.now() + CACHE_TTL_MS });
  return data;
}

app.use(express.json());

// Chess.com Proxy Routes with automated Caching support

// 1. Fetch user profile
app.get("/api/chess/profile/:username", async (req, res) => {
  const rawUsername = req.params.username;
  const username = rawUsername.toLowerCase().trim();
  try {
    const url = `https://api.chess.com/pub/player/${username}`;
    const data = await fetchWithUserAgentAndCache(url);
    res.json(data);
  } catch (error: any) {
    console.error(`Chess.com Profile fetch error for ${username}: ${error.message}`);
    res.status(404).json({ error: "Profile not found" });
  }
});

// 2. Fetch user stats
app.get("/api/chess/stats/:username", async (req, res) => {
  const rawUsername = req.params.username;
  const username = rawUsername.toLowerCase().trim();
  try {
    const url = `https://api.chess.com/pub/player/${username}/stats`;
    const data = await fetchWithUserAgentAndCache(url);
    res.json(data);
  } catch (error: any) {
    console.error(`Chess.com Stats fetch error for ${username}: ${error.message}`);
    res.status(404).json({ error: "Stats not found" });
  }
});

// 3. Fetch active games
app.get("/api/chess/games/:username", async (req, res) => {
  const rawUsername = req.params.username;
  const username = rawUsername.toLowerCase().trim();
  try {
    const url = `https://api.chess.com/pub/player/${username}/games`;
    const data = await fetchWithUserAgentAndCache(url);
    res.json(data);
  } catch (error: any) {
    console.error(`Chess.com Games fetch error for ${username}: ${error.message}`);
    res.status(404).json({ error: "Games not found" });
  }
});

// 4. Fetch clubs
app.get("/api/chess/clubs/:username", async (req, res) => {
  const rawUsername = req.params.username;
  const username = rawUsername.toLowerCase().trim();
  try {
    const url = `https://api.chess.com/pub/player/${username}/clubs`;
    const data = await fetchWithUserAgentAndCache(url);
    res.json(data);
  } catch (error: any) {
    console.error(`Chess.com Clubs fetch error for ${username}: ${error.message}`);
    res.status(404).json({ error: "Clubs not found" });
  }
});

// 5. Fetch tournaments
app.get("/api/chess/tournaments/:username", async (req, res) => {
  const rawUsername = req.params.username;
  const username = rawUsername.toLowerCase().trim();
  try {
    const url = `https://api.chess.com/pub/player/${username}/tournaments`;
    const data = await fetchWithUserAgentAndCache(url);
    res.json(data);
  } catch (error: any) {
    console.error(`Chess.com Tournaments fetch error for ${username}: ${error.message}`);
    res.status(404).json({ error: "Tournaments not found" });
  }
});

// 6. Fetch game history with offset support
app.get("/api/chess/history/:username", async (req, res) => {
  const rawUsername = req.params.username;
  const username = rawUsername.toLowerCase().trim();
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const archivesUrl = `https://api.chess.com/pub/player/${username}/games/archives`;
    const archivesData = await fetchWithUserAgentAndCache(archivesUrl);
    
    if (!archivesData || !archivesData.archives || archivesData.archives.length === 0) {
       return res.json({ games: [], hasMore: false });
    }

    const targetIndex = archivesData.archives.length - 1 - offset;
    if (targetIndex < 0) {
       return res.json({ games: [], hasMore: false });
    }

    const archiveUrl = archivesData.archives[targetIndex];
    const gamesData = await fetchWithUserAgentAndCache(archiveUrl);
    
    if (gamesData && gamesData.games) {
        const recentGames = gamesData.games.reverse();
        res.json({ games: recentGames, hasMore: targetIndex > 0 });
    } else {
        res.json({ games: [], hasMore: targetIndex > 0 });
    }
  } catch (error: any) {
    console.error(`Chess.com History fetch error for ${username}: ${error.message}`);
    res.status(404).json({ error: "History not found" });
  }
});

// 7. AI Coach Endpoint
app.post("/api/coach/analyze", async (req, res) => {
  try {
    const { profile, stats, intent } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API Key missing." });
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are an advanced AI Chess Coach embedded in a dashboard.
      
      CRITICAL DIRECTIVE:
      Always focus on Rapid chess ratings and performance analysis as the primary game mode. The user specifically values and prioritizes Rapid chess. Evaluate and prioritize Rapid feedback, stats, and training tips first.
      
      TONE/BEHAVIOR INSTRUCTIONS:
      "Hai hasao mujhe jab main bakwaas karun — roast karo, mazak karo, freely. Lekin jab kaam shuru ho toh comedian ki jacket utaro aur kaam wala banda ban jao — seedha, focused, no forced jokes. Casual mein stand-up comedian, kaam mein CEO assistant. Aur Hinglish mein baat karo — na full English banno na full Urdu maulvi."
      
      The player's username is ${profile?.username || 'the player'}. 
      Their stats are: 
      Rapid (Primary Focus) - Current: ${stats?.chess_rapid?.last?.rating || 'N/A'}, Peak: ${stats?.chess_rapid?.best?.rating || 'N/A'}
      Blitz - Current: ${stats?.chess_blitz?.last?.rating || 'N/A'}, Peak: ${stats?.chess_blitz?.best?.rating || 'N/A'}
      Bullet - Current: ${stats?.chess_bullet?.last?.rating || 'N/A'}, Peak: ${stats?.chess_bullet?.best?.rating || 'N/A'}
      
      User's Intent/Query: ${intent || 'Analyze my current standings and tell me what to improve.'}
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt
    });
    
    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error(error);
    const isHighDemand = error?.status === 503 || String(error?.message).includes("experiencing high demand") || String(error?.message).includes("503");
    const status = isHighDemand ? 503 : 500;
    const message = isHighDemand 
       ? "Bhai chill maar, AI server pe bohut rush hai abhi. Gemini model thak gaya hai. Thodi der baad try kar." 
       : "Failed to generate AI analysis.";
    res.status(status).json({ error: message });
  }
});

// 8. AI Coach Compare Endpoint
app.post("/api/coach/compare", async (req, res) => {
  try {
    const { player1Stats, player2Stats, intent } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API Key missing." });
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are an advanced AI Chess Coach embedded in a chess matchup/comparison dashboard.
      
      CRITICAL DIRECTIVE:
      Compare both players: "Menn" (Chess.com: MENN-HERE) and "Noman" (Chess.com: noman1119) equally. Do not list their usernames, use their real names "Menn" and "Noman" instead in your analysis.
      Always focus on Rapid chess ratings, wins/losses, and overall performance as the primary game mode. The user specifically values and prioritizes Rapid chess. Evaluate and compare their Rapid standby first, then check Blitz and Bullet, and provide a direct comparison.
      
      TONE/BEHAVIOR INSTRUCTIONS:
      "Hai hasao mujhe jab main bakwaas karun — roast karo, mazak karo, freely. Lekin jab kaam shuru ho toh comedian ki jacket utaro aur kaam wala banda ban jao — seedha, focused, no forced jokes. Casual mein stand-up comedian, kaam mein CEO assistant. Aur Hinglish mein baat karo — na full English banno na full Urdu maulvi."
      
      Menn's stats:
      Rapid - Current: ${player1Stats?.chess_rapid?.last?.rating || "N/A"}, Peak: ${player1Stats?.chess_rapid?.best?.rating || "N/A"}, Record: Win ${player1Stats?.chess_rapid?.record?.win || "0"}, Loss ${player1Stats?.chess_rapid?.record?.loss || "0"}, Draw ${player1Stats?.chess_rapid?.record?.draw || "0"}
      Blitz - Current: ${player1Stats?.chess_blitz?.last?.rating || "N/A"}, Peak: ${player1Stats?.chess_blitz?.best?.rating || "N/A"}
      Bullet - Current: ${player1Stats?.chess_bullet?.last?.rating || "N/A"}, Peak: ${player1Stats?.chess_bullet?.best?.rating || "N/A"}
      Tactics Peak: ${player1Stats?.tactics?.highest?.rating || "N/A"}
      Puzzle Rush Peak: ${player1Stats?.puzzle_rush?.best?.score || "N/A"}

      Noman's stats:
      Rapid - Current: ${player2Stats?.chess_rapid?.last?.rating || "N/A"}, Peak: ${player2Stats?.chess_rapid?.best?.rating || "N/A"}, Record: Win ${player2Stats?.chess_rapid?.record?.win || "0"}, Loss ${player2Stats?.chess_rapid?.record?.loss || "0"}, Draw ${player2Stats?.chess_rapid?.record?.draw || "0"}
      Blitz - Current: ${player2Stats?.chess_blitz?.last?.rating || "N/A"}, Peak: ${player2Stats?.chess_blitz?.best?.rating || "N/A"}
      Bullet - Current: ${player2Stats?.chess_bullet?.last?.rating || "N/A"}, Peak: ${player2Stats?.chess_bullet?.best?.rating || "N/A"}
      Tactics Peak: ${player2Stats?.tactics?.highest?.rating || "N/A"}
      Puzzle Rush Peak: ${player2Stats?.puzzle_rush?.best?.score || "N/A"}

      User's Intent/Query: ${intent || 'Perform a deep, hilarious yet highly technical comparison of both players, comparing their strengths and weaknesses.'}
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt
    });
    
    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error(error);
    const isHighDemand = error?.status === 503 || String(error?.message).includes("experiencing high demand") || String(error?.message).includes("503");
    const status = isHighDemand ? 503 : 500;
    const message = isHighDemand 
       ? "Bhai chill maar, AI server pe bohut rush hai abhi. Gemini model thak gaya hai. Thodi der baad try kar." 
       : "Failed to generate AI comparison analysis.";
    res.status(status).json({ error: message });
  }
});

export default app;
