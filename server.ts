import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Helper for Chess.com API calls with a clean, policy-compliant User-Agent header
  async function fetchWithUserAgent(url: string) {
    return fetch(url, {
      headers: {
        "User-Agent": "chessNchass/1.0 (contact: pro679715@gmail.com; user: noman1119)"
      }
    });
  }

  app.use(express.json());

  // Chess.com Proxy Routes
  
  // 1. Fetch user profile
  app.get("/api/chess/profile/:username", async (req, res) => {
    const rawUsername = req.params.username;
    const username = rawUsername.toLowerCase().trim();
    try {
      const url = `https://api.chess.com/pub/player/${username}`;
      const response = await fetchWithUserAgent(url);
      if (!response.ok) {
        console.error(`GCP Cloud Run Server Chess.com Profile API error for ${username}: Profile not found. Status code: ${response.status}`);
        throw new Error("Profile not found");
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`GCP Cloud Run Server Chess.com Profile fetch exception for ${username}: ${error.message}`);
      res.status(404).json({ error: "Profile not found" });
    }
  });

  // 2. Fetch user stats
  app.get("/api/chess/stats/:username", async (req, res) => {
    const rawUsername = req.params.username;
    const username = rawUsername.toLowerCase().trim();
    try {
      const url = `https://api.chess.com/pub/player/${username}/stats`;
      const response = await fetchWithUserAgent(url);
      if (!response.ok) {
        console.error(`GCP Cloud Run Server Chess.com Stats API error for ${username}: Stats not found. Status code: ${response.status}`);
        throw new Error("Stats not found");
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`GCP Cloud Run Server Chess.com Stats fetch exception for ${username}: ${error.message}`);
      res.status(404).json({ error: "Stats not found" });
    }
  });

  // 3. Fetch active games
  app.get("/api/chess/games/:username", async (req, res) => {
    const rawUsername = req.params.username;
    const username = rawUsername.toLowerCase().trim();
    try {
      const url = `https://api.chess.com/pub/player/${username}/games`;
      const response = await fetchWithUserAgent(url);
      if (!response.ok) {
        console.error(`GCP Cloud Run Server Chess.com Games API error for ${username}: Games not found. Status code: ${response.status}`);
        throw new Error("Games not found");
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`GCP Cloud Run Server Chess.com Games fetch exception for ${username}: ${error.message}`);
      res.status(404).json({ error: "Games not found" });
    }
  });

  // 4. Fetch clubs
  app.get("/api/chess/clubs/:username", async (req, res) => {
    const rawUsername = req.params.username;
    const username = rawUsername.toLowerCase().trim();
    try {
      const url = `https://api.chess.com/pub/player/${username}/clubs`;
      const response = await fetchWithUserAgent(url);
      if (!response.ok) {
        console.error(`GCP Cloud Run Server Chess.com Clubs API error for ${username}: Clubs not found. Status code: ${response.status}`);
        throw new Error("Clubs not found");
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`GCP Cloud Run Server Chess.com Clubs fetch exception for ${username}: ${error.message}`);
      res.status(404).json({ error: "Clubs not found" });
    }
  });

  // 5. Fetch tournaments
  app.get("/api/chess/tournaments/:username", async (req, res) => {
    const rawUsername = req.params.username;
    const username = rawUsername.toLowerCase().trim();
    try {
      const url = `https://api.chess.com/pub/player/${username}/tournaments`;
      const response = await fetchWithUserAgent(url);
      if (!response.ok) {
        console.error(`GCP Cloud Run Server Chess.com Tournaments API error for ${username}: Tournaments not found. Status code: ${response.status}`);
        throw new Error("Tournaments not found");
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`GCP Cloud Run Server Chess.com Tournaments fetch exception for ${username}: ${error.message}`);
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
      const archivesRes = await fetchWithUserAgent(archivesUrl);
      if (!archivesRes.ok) {
        console.error(`GCP Cloud Run Server Chess.com Archives API error for ${username}: Archives not found. Status code: ${archivesRes.status}`);
        throw new Error("Archives not found");
      }
      const archivesData = await archivesRes.json();
      
      if (!archivesData || !archivesData.archives || archivesData.archives.length === 0) {
         return res.json({ games: [], hasMore: false });
      }

      const targetIndex = archivesData.archives.length - 1 - offset;
      if (targetIndex < 0) {
         return res.json({ games: [], hasMore: false });
      }

      const archiveUrl = archivesData.archives[targetIndex];
      const gamesRes = await fetchWithUserAgent(archiveUrl);
      if (!gamesRes.ok) {
        console.error(`GCP Cloud Run Server Chess.com Historical Games Archive download failed for ${username} at index ${targetIndex}. Status code: ${gamesRes.status}`);
        throw new Error("Games not found");
      }
      const gamesData = await gamesRes.json();
      
      if (gamesData && gamesData.games) {
          const recentGames = gamesData.games.reverse();
          res.json({ games: recentGames, hasMore: targetIndex > 0 });
      } else {
          res.json({ games: [], hasMore: targetIndex > 0 });
      }
    } catch (error: any) {
      console.error(`GCP Cloud Run Server Chess.com History fetch exception for ${username}: ${error.message}`);
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate AI analysis." });
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate AI comparison analysis." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
