import {
  Activity,
  Calendar,
  Crosshair,
  Flame,
  Globe,
  LineChart,
  Star,
  Target,
  Timer,
  Trophy,
  User,
  Zap,
  TrendingDown,
  Swords,
  BrainCircuit,
  Award,
  Users,
  Medal
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { ParsedDashboardData, ProfileData, StatsData, ClubData, TournamentData, GameHistoryData } from "../types";
import AICoach from "./AICoach";
import HistoryGraph from "./HistoryGraph";
import StatCard from "./StatCard";
import { Link } from "react-router-dom";
import { 
  getApiUrl,
  fetchChessProfile,
  fetchChessStats,
  fetchChessGames,
  fetchChessClubs,
  fetchChessTournaments,
  fetchChessHistory
} from "../utils/api";

export default function Dashboard({ username }: { username: string }) {
  const displayName = username.toLowerCase() === "noman1119" ? "Noman" : "Menn";
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [tournaments, setTournaments] = useState<{finished: TournamentData[], in_progress: TournamentData[], registered: TournamentData[]}>({ finished: [], in_progress: [], registered: [] });
  const [history, setHistory] = useState<GameHistoryData[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [visibleHistory, setVisibleHistory] = useState(5);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedDashboardData>({
    username: displayName,
    last_updated: null as any,
    ratings: {
      bullet: { current: null, peak: null },
      blitz: { current: null, peak: null },
      rapid: { current: null, peak: null },
    },
    live_game: {
      is_active: false,
      opponent: null,
      opponent_rating: null,
      current_fen: null,
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [graphMode, setGraphMode] = useState<"bullet" | "blitz" | "rapid">("rapid");

  // Native PWA Mobile App Support
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforePrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const aggregatedStats = useMemo(() => {
    if (!stats) return null;
    let w = 0, l = 0, d = 0;
    const modes = ['chess_bullet', 'chess_blitz', 'chess_rapid', 'chess_daily'] as const;
    modes.forEach(key => {
      const r = stats[key as keyof StatsData]?.record;
      if (r) { w += r.win; l += r.loss; d += r.draw; }
    });
    const total = w + l + d;
    const winRate = total ? Math.round((w / total) * 100) : 0;
    const lossRate = total ? Math.round((l / total) * 100) : 0;
    const drawRate = total ? Math.round((d / total) * 100) : 0;
    
    return { 
      w, l, d, total, winRate, lossRate, drawRate,
      tacticsHighest: stats.tactics?.highest?.rating || "N/A",
      puzzleRushBest: stats.puzzle_rush?.best?.score || "N/A",
      fide: stats.fide || "N/A"
    };
  }, [stats]);

  const dayProgress = useMemo(() => {
    if (!history) return null;
    
    const now = new Date();
    // Use start of today in local time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todaysGames = history.filter(game => (game.end_time * 1000) >= startOfToday);

    let w = 0, l = 0, d = 0;
    const modeChanges: Record<string, {first: number | null, last: number | null}> = {};
    const modesPlayed = new Set<string>();

    // Process from oldest to newest (history is newest first)
    [...todaysGames].reverse().forEach(game => {
      const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
      const myResult = isWhite ? game.white.result : game.black.result;
      const myRating = isWhite ? game.white.rating : game.black.rating;
      
      if (myResult === "win") w++;
      else if (["checkmated", "timeout", "resigned", "lose", "abandoned"].includes(myResult)) l++;
      else d++;

      if (!modeChanges[game.time_class]) {
        modeChanges[game.time_class] = { first: myRating, last: myRating };
      } else {
        modeChanges[game.time_class].last = myRating;
      }
      modesPlayed.add(game.time_class);
    });

    let estimatedEloChange = 0;
    const beforeTodayGames = history.filter(game => (game.end_time * 1000) < startOfToday);
    
    modesPlayed.forEach(mode => {
      const priorGamesInMode = beforeTodayGames.filter(g => g.time_class === mode);
      let startingRating;
      if (priorGamesInMode.length > 0) {
         // The first in priorGamesInMode is the most recent game BEFORE today
         const priorGame = priorGamesInMode[0];
         const isWhite = priorGame.white.username.toLowerCase() === username.toLowerCase();
         startingRating = isWhite ? priorGame.white.rating : priorGame.black.rating;
      } else {
         startingRating = modeChanges[mode].first; // fallback if no prior games loaded
      }
      
      const finalRating = modeChanges[mode].last;
      if (startingRating !== null && finalRating !== null) {
         estimatedEloChange += (finalRating - startingRating);
      }
    });

    return {
      total: todaysGames.length,
      w,
      l,
      d,
      eloChange: estimatedEloChange
    };
  }, [history]);

  useEffect(() => {
    let isMounted = true;

    async function fetchData(isInitial = false) {
      try {
        if (isInitial) setLoading(true);
        const [profileData, statsData, gamesData, clubsData, tournData, historyData] = await Promise.all([
          fetchChessProfile(username),
          fetchChessStats(username),
          fetchChessGames(username),
          fetchChessClubs(username).catch(() => ({ clubs: [] })),
          fetchChessTournaments(username).catch(() => ({ finished: [], in_progress: [], registered: [] })),
          fetchChessHistory(username, 0).catch(() => ({ games: [], hasMore: false }))
        ]);

        if (!profileData || !statsData || !gamesData) throw new Error("Failed to fetch primary Chess.com data");

        if (!isMounted) return;

        setProfile(profileData);
        setStats(statsData);
        setClubs(clubsData.clubs || []);
        setTournaments({
          finished: tournData.finished || [],
          in_progress: tournData.in_progress || [],
          registered: tournData.registered || []
        });
        setHistory(historyData.games || []);
        setHasMoreHistory(historyData.hasMore ?? false);
        setHistoryOffset(0);

        // Map raw data to the requested standardized output format
        let liveGameActive = false;
        let opponent = null;
        let opponentRating = null;
        let currentFen = null;

        if (gamesData?.games?.length > 0) {
          const game = gamesData.games[0]; // Let's take the first active game
          liveGameActive = true;
          // Figure out which one is the player
          const isWhite = game.white.includes(username.toLowerCase());
          opponent = isWhite ? game.black : game.white;
          // Extract username assuming url like https://api.chess.com/pub/player/username
          opponent = opponent.split("/").pop();
          opponentRating = null; // Unreliable from this small endpoint unless deeply parsed, leave null
          currentFen = game.fen;
        }

        const structuredFormat: ParsedDashboardData = {
          username: profileData.username,
          last_updated: new Date().toISOString(),
          ratings: {
            bullet: {
              current: statsData.chess_bullet?.last?.rating || null,
              peak: statsData.chess_bullet?.best?.rating || null,
            },
            blitz: {
              current: statsData.chess_blitz?.last?.rating || null,
              peak: statsData.chess_blitz?.best?.rating || null,
            },
            rapid: {
              current: statsData.chess_rapid?.last?.rating || null,
              peak: statsData.chess_rapid?.best?.rating || null,
            },
          },
          live_game: {
            is_active: liveGameActive,
            opponent: opponent,
            opponent_rating: opponentRating,
            current_fen: currentFen,
          },
        };

        setParsedData(structuredFormat);
      } catch (err: any) {
        if (isMounted) setError(err.message || "An unknown error occurred.");
      } finally {
        if (isMounted && isInitial) setLoading(false);
      }
    }

    fetchData(true);

    // Poll every 10 seconds for real-time ratings
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [username]);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent p-4 text-center text-neutral-400">
        <div className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8">
          <Activity className="mx-auto mb-4 h-10 w-10 text-white/80" />
          <h2 className="text-xl font-display font-medium tracking-tight text-white mb-2">System Failure</h2>
          <p className="mt-2 font-sans text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-neutral-300 selection:bg-white selection:text-black">
      <div className="mx-auto flex max-w-6xl flex-col xl:flex-row xl:items-start gap-8 p-6 md:p-12">
        
        {/* Left Column - Profile & Navigation */}
        <aside className="flex flex-col gap-6 xl:w-80 shrink-0">
          {/* Navigation Protocol Tabs */}
          <nav className="flex flex-col gap-2 rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-neutral-500">Active Protocols</p>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                title="Real-time Active - Click to sync manually"
                className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/20 text-emerald-400 font-sans text-[8px] font-bold tracking-wider hover:bg-emerald-500/20 active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] group"
              >
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                </span>
                <span className="group-hover:text-emerald-300 transition-colors uppercase">LIVE</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Link
                to="/"
                className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-[16px] border text-[11px] font-medium font-sans tracking-wide transition-all ${
                  username.toLowerCase() !== "noman1119"
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : "bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Menn
              </Link>
              <Link
                to="/noman"
                className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-[16px] border text-[11px] font-medium font-sans tracking-wide transition-all ${
                  username.toLowerCase() === "noman1119"
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : "bg-transparent border-transparent text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Noman
              </Link>
              <Link
                to="/compare"
                className="flex flex-col items-center justify-center py-2.5 px-3 rounded-[16px] border border-transparent bg-transparent text-neutral-400 hover:text-white hover:bg-white/5 text-[11px] font-medium font-sans tracking-wide transition-all"
              >
                Compare
              </Link>
            </div>
            {isInstallable && (
              <button
                onClick={handleInstallApp}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[16px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-300 text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              >
                <Star className="h-3 w-3 animate-pulse text-amber-400 fill-amber-400" />
                Install Mobile App
              </button>
            )}
          </nav>

          <div className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-8 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 blur-[80px] rounded-full pointer-events-none -mx-10 -my-10"></div>
            
            <div className="flex flex-col items-center gap-5 text-center w-full relative z-10">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={displayName}
                  className="h-28 w-28 rounded-full border border-white/10 ring-[4px] ring-white/5 object-cover transition-transform hover:scale-105 cursor-pointer duration-500"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 ring-[4px] ring-white/5 cursor-pointer transition-transform hover:scale-105 duration-500">
                  <User className="h-10 w-10" strokeWidth={1.5} />
                </div>
              )}
              
              <div className="w-full mt-2">
                <h2 className="text-[26px] font-display font-medium text-white tracking-tight">{displayName}</h2>
                
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {profile?.league && (
                    <span className="inline-flex items-center justify-center gap-1.5 rounded-full border min-w-[80px] border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 font-sans text-[11px] font-medium tracking-wide text-amber-200/90 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                      <Trophy className="h-3.5 w-3.5 text-amber-400" />
                      {profile.league}
                    </span>
                  )}
                  {profile?.country && (
                    <span className="inline-flex items-center justify-center gap-1.5 rounded-full border min-w-[80px] border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 font-sans text-[11px] font-medium tracking-wide text-blue-200/90 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      <Globe className="h-3.5 w-3.5 text-blue-400" />
                      {profile.country.split("/").pop()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-6 relative z-10">
              <div className="text-center">
                <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-neutral-500">Following</p>
                <p className="mt-1.5 font-display text-2xl font-medium text-white">{profile?.followers}</p>
              </div>
              <div className="relative text-center">
                <div className="absolute inset-y-0 left-0 w-px bg-white/5"></div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-neutral-500">Elo</p>
                <p className="mt-1.5 flex items-center justify-center gap-1 font-display text-2xl font-bold tracking-tight text-white">
                  {parsedData.ratings.rapid.current || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Clubs section */}
          {clubs.length > 0 && (
            <div className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Users className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-mono font-medium uppercase tracking-widest text-white/90">Affiliations ({clubs.length})</h3>
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()}>
                {clubs.slice(0, 5).map(club => (
                  <a key={club.url} href={club.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[16px] border border-white/5 bg-white/[0.01] p-3 transition-colors hover:bg-white/[0.04]">
                    {club.icon ? (
                      <img src={club.icon} alt={club.name} className="h-8 w-8 rounded-full border border-white/10 object-cover opacity-80 hover:opacity-100 transition duration-300" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Users className="h-4 w-4 text-indigo-400/70" />
                      </div>
                    )}
                    <span className="text-[11px] font-sans font-medium tracking-wide text-neutral-300 truncate">{club.name}</span>
                  </a>
                ))}
                {clubs.length > 5 && (
                  <div className="text-center font-medium text-xs font-sans text-neutral-500 mt-2">
                    + {clubs.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
          
        </aside>

        {/* Right Column - Dash Content */}
        <main className="flex-1 flex flex-col gap-8">
          
          {/* Ratings Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              title="Rapid"
              icon={<Timer className="h-4 w-4" />}
              data={parsedData.ratings.rapid}
              theme="indigo"
            />
            <StatCard 
              title="Blitz"
              icon={<Flame className="h-4 w-4" />}
              data={parsedData.ratings.blitz}
              theme="orange"
            />
            <StatCard 
              title="Bullet"
              icon={<Zap className="h-4 w-4" />}
              data={parsedData.ratings.bullet}
              theme="emerald"
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* History Graph */}
            <section className="lg:col-span-2 rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col">
               <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                 <div className="flex items-center gap-3">
                   <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-sm">
                      <LineChart className="h-4 w-4" />
                   </div>
                   <div>
                      <h3 className="text-[13px] font-sans font-medium text-white tracking-wide">Performance Trajectory</h3>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">7-Day Log</p>
                   </div>
                 </div>
                 
                 <div className="flex bg-white/5 rounded-full p-1 border border-white/10 backdrop-blur-md">
                   {(['bullet', 'blitz', 'rapid'] as const).map(m => (
                     <button
                       key={m}
                       onClick={() => setGraphMode(m)}
                       className={`capitalize px-4 py-1.5 text-[11px] font-sans font-medium tracking-wide rounded-full transition-all ${
                         graphMode === m 
                         ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                         : 'text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent'
                       }`}
                     >
                       {m}
                     </button>
                   ))}
                 </div>
               </div>
               
               <HistoryGraph 
                 currentRating={parsedData.ratings[graphMode].current} 
                 peakRating={parsedData.ratings[graphMode].peak}
                 mode={graphMode}
                 color="#a78bfa" 
               />
            </section>

            {/* AI Coach */}
            <section className="lg:col-span-3 flex">
              <AICoach profile={profile} stats={stats} />
            </section>

          </div>

          {/* Day Progress Tracker */}
          {dayProgress && (
             <section className="flex flex-col md:flex-row justify-between items-center bg-white/[0.02] border border-white/5 rounded-[24px] p-6 md:p-8 relative overflow-hidden backdrop-blur-xl group hover:bg-white/[0.04] transition-all duration-300 shadow-xl">
                <div className="absolute top-0 right-0 h-64 w-64 bg-white/5 blur-[100px] rounded-full pointer-events-none -mx-10 -my-10"></div>
                
                <div className="flex items-center gap-5 z-10 w-full md:w-auto">
                   <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-blue-500/20 bg-blue-500/10 text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                      <Timer className="h-6 w-6" strokeWidth={1.5} />
                   </div>
                   <div className="flex flex-col">
                      <h3 className="font-display text-[15px] font-medium tracking-wide text-white">Today's Protocol</h3>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-1">24H Operational Log</p>
                   </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-6 md:gap-12 w-full md:w-auto mt-6 md:mt-0 z-10 justify-start md:justify-end">
                   <div className="flex flex-col">
                      <span className="font-mono text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-1.5">Net ELO +/-</span>
                      <span className={`text-4xl font-display font-medium tracking-tight leading-none ${dayProgress.eloChange > 0 ? 'text-emerald-400' : dayProgress.eloChange < 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
                        {dayProgress.eloChange > 0 ? '+' : ''}{dayProgress.eloChange}
                      </span>
                   </div>
                   
                   <div className="flex flex-col">
                      <span className="font-mono text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-1.5">Match Volume</span>
                      <span className="text-4xl font-display font-medium tracking-tight leading-none text-white">{dayProgress.total}</span>
                   </div>

                   <div className="flex flex-col">
                      <span className="font-mono text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-1.5">Win / Loss</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-display font-medium tracking-tight leading-none text-emerald-400">{dayProgress.w}</span>
                        <span className="text-lg font-light font-sans text-neutral-600">/</span>
                        <span className="text-4xl font-display font-medium tracking-tight leading-none text-rose-400">{dayProgress.l}</span>
                      </div>
                   </div>
                </div>
             </section>
          )}

          {/* Extended Telemetry */}
          {aggregatedStats && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="flex flex-col justify-between rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:bg-white/[0.03] transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Swords className="h-4 w-4" />
                  </div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-medium text-neutral-400">Total Play Record</h3>
                </div>
                <div className="mt-4 text-neutral-100">
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-3xl font-display font-medium tracking-tight leading-none">{aggregatedStats.winRate}%</span>
                    <span className="font-mono text-[9px] text-neutral-500 mb-1 py-[1px] uppercase tracking-widest">Global Win Rate</span>
                  </div>
                  <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/5 mb-3 border border-white/5">
                     <div style={{ width: `${aggregatedStats.winRate}%` }} className="bg-emerald-500"></div>
                     <div style={{ width: `${aggregatedStats.drawRate}%` }} className="bg-neutral-500"></div>
                     <div style={{ width: `${aggregatedStats.lossRate}%` }} className="bg-rose-500"></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono font-medium tracking-widest uppercase mt-1">
                    <span className="text-emerald-400">{aggregatedStats.w} W</span>
                    <span className="text-neutral-500">{aggregatedStats.d} D</span>
                    <span className="text-rose-400">{aggregatedStats.l} L</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:bg-white/[0.03] transition-all">
                 <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-medium text-neutral-400">Highest Tactics</h3>
                </div>
                <div className="flex flex-col mt-4">
                  <span className="text-4xl font-display font-medium text-white tracking-tight leading-none">{aggregatedStats.tacticsHighest}</span>
                  <span className="font-sans text-[11px] text-neutral-500 tracking-wide mt-2">Tactics Peak Rating</span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:bg-white/[0.03] transition-all">
                 <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-medium text-neutral-400">Best Puzzle Rush</h3>
                </div>
                <div className="flex flex-col mt-4">
                  <span className="text-4xl font-display font-medium text-white tracking-tight leading-none">{aggregatedStats.puzzleRushBest}</span>
                  <span className="font-sans text-[11px] text-neutral-500 tracking-wide mt-2">Highest Score</span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 hover:bg-white/[0.03] transition-all">
                 <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Award className="h-4 w-4" />
                  </div>
                  <h3 className="font-mono text-[10px] uppercase tracking-widest font-medium text-neutral-400">FIDE Standard</h3>
                </div>
                <div className="flex flex-col mt-4">
                  <span className="text-4xl font-display font-medium text-white tracking-tight leading-none">{aggregatedStats.fide}</span>
                  <span className="font-sans text-[11px] text-neutral-500 tracking-wide mt-2">Global Organization</span>
                </div>
              </div>
              
            </section>
          )}

          {/* Additional features grid (tournaments and history) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tournaments */}
            {(tournaments.finished.length > 0 || tournaments.in_progress.length > 0) && (
              <section className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Medal className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-sans font-medium text-white tracking-wide">Recent Tournaments</h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">Official Competitions</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {[...tournaments.in_progress, ...tournaments.finished].slice(0, 3).map((t, i) => (
                    <a key={t.id || i} href={t.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-3 rounded-[16px] border border-white/5 bg-white/[0.01] p-4 hover:bg-white/[0.04] transition-all duration-300">
                       <div className="flex justify-between items-start mb-1">
                         <span className={`text-[10px] font-mono font-medium uppercase tracking-widest px-2.5 py-1 rounded-full ${t.status === 'finished' ? 'border border-white/5 bg-white/[0.02] text-neutral-400' : 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'}`}>
                           {t.status}
                         </span>
                         {t.placement && (
                           <span className="text-sm font-display font-medium text-white flex items-center gap-1.5">
                             <Trophy className="h-3.5 w-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors" /> #{t.placement}
                           </span>
                         )}
                       </div>
                       <div className="flex justify-between text-[11px] font-mono font-medium uppercase tracking-widest text-neutral-500 mt-1">
                         <span><span className="text-emerald-400">{t.wins}</span> W</span>
                         <span><span className="text-neutral-500">{t.draws}</span> D</span>
                         <span><span className="text-rose-400">{t.losses}</span> L</span>
                       </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Game History */}
            {history.length > 0 && (
              <section className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 flex flex-col">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-sans font-medium text-white tracking-wide">Match History</h3>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">Recent Games</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()}>
                  {history.slice(0, visibleHistory).map((game, i) => {
                    const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
                    const result = isWhite ? game.white.result : game.black.result;
                    const opponent = isWhite ? game.black : game.white;
                    let resultClass = "border border-neutral-500/20 bg-neutral-500/10 text-neutral-300";
                    let resultText = "Draw";
                    
                    if (result === "win") {
                      resultClass = "bg-emerald-500/10 text-emerald-400 uppercase font-semibold border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                      resultText = "Won";
                    } else if (["checkmated", "timeout", "resigned", "lose", "abandoned"].includes(result)) {
                      resultClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                      resultText = "Lost";
                    }
                    
                    return (
                      <a key={game.url || i} href={game.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.01] p-3 transition-colors hover:bg-white/[0.04]">
                         <div className="flex items-center gap-3">
                            <span className={`flex h-7 w-12 items-center justify-center rounded-full text-[9px] font-mono uppercase tracking-widest ${resultClass}`}>
                               {resultText}
                            </span>
                            <div className="flex flex-col">
                               <span className="text-[13px] font-sans font-medium tracking-wide text-white">vs {opponent.username}</span>
                               <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase mt-0.5">{game.time_class} &bull; {new Date(game.end_time * 1000).toLocaleDateString()}</span>
                            </div>
                         </div>
                         <div className="text-right flex flex-col">
                            <span className="text-[13px] font-display font-medium text-white xl:block hidden">
                               {isWhite ? game.white.rating : game.black.rating}
                            </span>
                         </div>
                      </a>
                    );
                  })}
                </div>
                
                {(hasMoreHistory || visibleHistory < history.length) && (
                  <button 
                    onClick={async () => {
                      if (visibleHistory < history.length) {
                        setVisibleHistory(prev => prev + 5);
                        return;
                      }
                      if (!hasMoreHistory) return;
                      
                      setLoadingMoreHistory(true);
                      try {
                        const nextOffset = historyOffset + 1;
                        const data = await fetchChessHistory(username, nextOffset);
                        setHistory(prev => [...prev, ...(data.games || [])]);
                        setHistoryOffset(nextOffset);
                        setHasMoreHistory(data.hasMore);
                        setVisibleHistory(prev => prev + 5);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoadingMoreHistory(false);
                      }
                    }}
                    disabled={loadingMoreHistory}
                    className="mt-5 w-full rounded-full border border-white/10 bg-white/5 py-3.5 text-[10px] font-mono uppercase font-medium tracking-widest text-white transition-colors hover:bg-white/10 disabled:opacity-50 flex justify-center gap-2 items-center"
                  >
                    {loadingMoreHistory ? (
                      <>
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Loading...
                      </>
                    ) : (
                      "Load Insights"
                    )}
                  </button>
                )}
              </section>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
