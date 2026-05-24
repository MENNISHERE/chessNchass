import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Target, 
  Trophy, 
  Globe, 
  User, 
  Timer, 
  Flame, 
  Zap, 
  Swords, 
  Sparkles, 
  Bot, 
  Send, 
  Skull, 
  ArrowLeftRight,
  TrendingUp,
  BrainCircuit,
  MessageSquare
} from "lucide-react";
import { ProfileData, StatsData } from "../types";
import { getApiUrl, fetchChessProfile, fetchChessStats } from "../utils/api";

export default function Compare() {
  const [loading, setLoading] = useState(true);
  const [player1Profile, setPlayer1Profile] = useState<ProfileData | null>(null);
  const [player1Stats, setPlayer1Stats] = useState<StatsData | null>(null);
  
  const [player2Profile, setPlayer2Profile] = useState<ProfileData | null>(null);
  const [player2Stats, setPlayer2Stats] = useState<StatsData | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Chat/Analysis State
  const [aiMessage, setAiMessage] = useState<string>("");
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [userInput, setUserInput] = useState("");

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
  
  useEffect(() => {
    let isMounted = true;
    async function fetchAllData() {
      try {
        setLoading(true);
        const [p1Profile, p1Stats, p2Profile, p2Stats] = await Promise.all([
          fetchChessProfile("MENN-HERE"),
          fetchChessStats("MENN-HERE"),
          fetchChessProfile("noman1119"),
          fetchChessStats("noman1119")
        ]);

        if (!p1Profile || !p1Stats || !p2Profile || !p2Stats) {
          throw new Error("Unable to fetch Chess.com comparison data.");
        }

        if (isMounted) {
          setPlayer1Profile(p1Profile);
          setPlayer1Stats(p1Stats);
          setPlayer2Profile(p2Profile);
          setPlayer2Stats(p2Stats);
          setLoading(false);
          
          // Trigger initial automated comparison
          triggerAiComparison(p1Stats, p2Stats, "Compare both of them cleanly and point out their key ratings differences.");
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Something went wrong loaded metrics.");
          setLoading(false);
        }
      }
    }

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const triggerAiComparison = async (stats1: StatsData, stats2: StatsData, customIntent?: string) => {
    setLoadingCoach(true);
    try {
      const res = await fetch(getApiUrl("/api/coach/compare"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1Stats: stats1,
          player2Stats: stats2,
          intent: customIntent || "Analyze our relative stats, and give us a fun breakdown in Hinglish."
        })
      });

      if (!res.ok) throw new Error("AI Coach compare error");
      const data = await res.json();
      setAiMessage(data.analysis || "Try asking again!");
    } catch (err) {
      setAiMessage("Kuch issue ho gaya, comparison model responded with an error. Dubara try karo!");
    } finally {
      setLoadingCoach(false);
    }
  };

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !player1Stats || !player2Stats) return;
    triggerAiComparison(player1Stats, player2Stats, userInput);
    setUserInput("");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-16 w-16 bg-indigo-500/10 border border-indigo-500/30 items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Swords className="h-6 w-6 animate-pulse" />
            </span>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 animate-pulse">Synchronizing Comparison Matrices...</p>
        </div>
      </div>
    );
  }

  if (error || !player1Stats || !player2Stats) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent p-4 text-center text-neutral-400">
        <div className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8">
          <Skull className="mx-auto mb-4 h-10 w-10 text-rose-500/80" />
          <h2 className="text-xl font-display font-medium tracking-tight text-white mb-2">Comparison Blocked</h2>
          <p className="mt-2 font-sans text-sm text-neutral-500">{error || "Data load failed."}</p>
        </div>
      </div>
    );
  }

  // Value helpers
  const r1 = player1Stats.chess_rapid?.last?.rating || 0;
  const r2 = player2Stats.chess_rapid?.last?.rating || 0;
  const rDiff = Math.abs(r1 - r2);
  const rapidWinner = r1 > r2 ? "Menn" : r1 < r2 ? "Noman" : "Equal";

  const b1 = player1Stats.chess_blitz?.last?.rating || 0;
  const b2 = player2Stats.chess_blitz?.last?.rating || 0;

  const bul1 = player1Stats.chess_bullet?.last?.rating || 0;
  const bul2 = player2Stats.chess_bullet?.last?.rating || 0;

  const t1 = player1Stats.tactics?.highest?.rating || 0;
  const t2 = player2Stats.tactics?.highest?.rating || 0;

  return (
    <div className="min-h-screen text-neutral-300 selection:bg-white selection:text-black">
      <div className="mx-auto flex max-w-6xl flex-col xl:flex-row xl:items-start gap-8 p-6 md:p-12 relative z-10">
        
        {/* Left Aside Navigation Panel */}
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
                className="flex flex-col items-center justify-center py-2.5 px-3 rounded-[16px] border border-transparent bg-transparent text-neutral-400 hover:text-white hover:bg-white/5 text-[11px] font-medium font-sans tracking-wide transition-all"
              >
                Menn
              </Link>
              <Link
                to="/noman"
                className="flex flex-col items-center justify-center py-2.5 px-3 rounded-[16px] border border-transparent bg-transparent text-neutral-400 hover:text-white hover:bg-white/5 text-[11px] font-medium font-sans tracking-wide transition-all"
              >
                Noman
              </Link>
              <Link
                to="/compare"
                className="flex flex-col items-center justify-center py-2.5 px-3 rounded-[16px] border bg-indigo-500/10 border-indigo-500/20 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)] text-[11px] font-medium font-sans tracking-wide transition-all"
              >
                Compare
              </Link>
            </div>
            {isInstallable && (
              <button
                onClick={handleInstallApp}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[16px] border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-300 text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              >
                <Trophy className="h-3 w-3 animate-pulse text-amber-400 fill-amber-400" />
                Install Mobile App
              </button>
            )}
          </nav>

          {/* Fast Summary Box */}
          <div className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-2xl p-6 relative overflow-hidden">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-neutral-500 mb-3">Matchup Standby</p>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="text-[10px] font-mono uppercase text-neutral-500">Rapid Advantage</p>
                <p className="text-sm font-sans font-medium text-white mt-1">
                  {rapidWinner === "Equal" ? "Both neck and neck" : `${rapidWinner} is +${rDiff} Elo ahead`}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
                <p className="text-[10px] font-mono uppercase text-neutral-500">Tactics Mastery</p>
                <p className="text-sm font-sans font-medium text-white mt-1">
                  {t1 > t2 ? `Menn leads tactics (+${t1 - t2})` : t2 > t1 ? `Noman leads tactics (+${t2 - t1})` : "Identical puzzle prowess"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content Column */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Glowing VS Matchup Header */}
          <section className="rounded-[24px] border border-white/5 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl p-8 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 w-full">
              
              {/* Menn (Left) */}
              <div className="flex flex-col items-center text-center md:items-start md:text-left gap-4 flex-1">
                {player1Profile?.avatar ? (
                  <img
                    src={player1Profile.avatar}
                    alt="Menn"
                    className="h-20 w-20 rounded-full border border-white/10 ring-[3px] ring-white/5 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500">
                    <User className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-display font-medium text-white">Menn</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-mono text-indigo-300">
                      Rapid {r1}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Followers: {player1Profile?.followers || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* VS Divider badge */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#07080d] shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                  <span className="font-display font-bold text-sm tracking-widest text-[#a5b4fc]">vs</span>
                </div>
              </div>

              {/* Noman (Right) */}
              <div className="flex flex-col items-center text-center md:items-end md:text-right gap-4 flex-1">
                {player2Profile?.avatar ? (
                  <img
                    src={player2Profile.avatar}
                    alt="Noman"
                    className="h-20 w-20 rounded-full border border-white/10 ring-[3px] ring-white/5 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500">
                    <User className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-display font-medium text-white">Noman</h3>
                  <div className="mt-1 flex items-center justify-center md:justify-end gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-mono text-indigo-300">
                      Rapid {r2}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Followers: {player2Profile?.followers || 0}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Visual Matrix Performance Side-by-Side */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Primary Rapid Stat Comparing */}
            <div className="rounded-[24px] border border-white/5 bg-white/[0.02] p-6 flex flex-col justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Rapid Elo Comparison</p>
                <h3 className="text-xs font-sans text-neutral-400 mt-1">Our primary metric of evaluation</h3>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Menn</p>
                  <p className="text-3xl font-display font-semibold text-white mt-1">{r1 || "N/A"}</p>
                </div>
                <div className="text-center pb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-indigo-400">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 mt-1 block">Diff: {rDiff}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Noman</p>
                  <p className="text-3xl font-display font-semibold text-white mt-1">{r2 || "N/A"}</p>
                </div>
              </div>
              {/* Simple progress metric visualizer */}
              <div className="mt-5 h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-1000" 
                  style={{ width: `${(r1 / (r1 + r2 || 1)) * 100}%` }}
                />
                <div 
                  className="bg-indigo-300 h-full transition-all duration-1000" 
                  style={{ width: `${(r2 / (r1 + r2 || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Overall Record Performance Compare */}
            <div className="rounded-[24px] border border-white/5 bg-white/[0.02] p-6 flex flex-col justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Rapid Record Stats</p>
                <h3 className="text-xs font-sans text-neutral-400 mt-1">Wins/Losses comparison</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/[0.01] border border-white/5 p-3">
                  <p className="text-[10px] font-mono text-neutral-500">Menn Record</p>
                  <p className="text-md font-sans text-white/90 font-medium mt-1">
                    W {player1Stats.chess_rapid?.record?.win || 0} &bull; L {player1Stats.chess_rapid?.record?.loss || 0}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.01] border border-white/5 p-3 text-right">
                  <p className="text-[10px] font-mono text-neutral-500">Noman Record</p>
                  <p className="text-md font-sans text-white/90 font-medium mt-1">
                    W {player2Stats.chess_rapid?.record?.win || 0} &bull; L {player2Stats.chess_rapid?.record?.loss || 0}
                  </p>
                </div>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 mt-4 text-center">
                Draws: Menn ({player1Stats.chess_rapid?.record?.draw || 0}) vs Noman ({player2Stats.chess_rapid?.record?.draw || 0})
              </p>
            </div>

          </section>

          {/* Breakdown stat bar stack */}
          <section className="rounded-[24px] border border-white/5 bg-white/[0.02] p-8 flex flex-col gap-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-white/90">Attribute Comparison Radar</h3>
            <div className="space-y-4">
              
              {/* Rapid */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-mono text-neutral-400">
                  <span>Menn ({r1})</span>
                  <span className="text-white uppercase tracking-wider text-[10px]">Rapid Chess</span>
                  <span>Noman ({r2})</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full" style={{ width: `${(r1 / 4000) * 100}%` }} />
                  <div className="flex-1 bg-transparent" />
                  <div className="bg-gradient-to-l from-violet-500 to-violet-400 h-full" style={{ width: `${(r2 / 4000) * 100}%` }} />
                </div>
              </div>

              {/* Blitz */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-mono text-neutral-400">
                  <span>Menn ({b1})</span>
                  <span className="text-white uppercase tracking-wider text-[10px]">Blitz Chess</span>
                  <span>Noman ({b2})</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full" style={{ width: `${(b1 / 4000) * 100}%` }} />
                  <div className="flex-1 bg-transparent" />
                  <div className="bg-gradient-to-l from-violet-500 to-violet-400 h-full" style={{ width: `${(b2 / 4000) * 100}%` }} />
                </div>
              </div>

              {/* Bullet */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-mono text-neutral-400">
                  <span>Menn ({bul1})</span>
                  <span className="text-white uppercase tracking-wider text-[10px]">Bullet Speed</span>
                  <span>Noman ({bul2})</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full" style={{ width: `${(bul1 / 4000) * 100}%` }} />
                  <div className="flex-1 bg-transparent" />
                  <div className="bg-gradient-to-l from-violet-500 to-violet-400 h-full" style={{ width: `${(bul2 / 4000) * 100}%` }} />
                </div>
              </div>

              {/* High tactics */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1 font-mono text-neutral-400">
                  <span>Menn ({t1})</span>
                  <span className="text-white uppercase tracking-wider text-[10px]">Highest Tactics Prowess</span>
                  <span>Noman ({t2})</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full" style={{ width: `${(t1 / 4000) * 100}%` }} />
                  <div className="flex-1 bg-transparent" />
                  <div className="bg-gradient-to-l from-violet-500 to-violet-400 h-full" style={{ width: `${(t2 / 4000) * 100}%` }} />
                </div>
              </div>

            </div>
          </section>

          {/* Dedicated Matchup AI Coach Analysis Panel */}
          <section className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-blue-500/20 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[13px] font-sans font-medium text-white tracking-wide">Matchup AI Coach</h3>
                <p className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 mt-0.5">Dual-Player Analysis Engine</p>
              </div>
            </div>

            <div className="p-6 h-[260px] overflow-y-auto custom-scrollbar space-y-4" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()}>
              {loadingCoach ? (
                <div className="flex gap-3 flex-row">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    <Bot size={16} />
                  </div>
                  <div className="flex max-w-[80%] items-center rounded-[18px] rounded-tl-[4px] bg-blue-500/5 border border-blue-500/10 p-4">
                    <div className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 flex-row">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                    <Bot size={16} />
                  </div>
                  <div className="bg-blue-500/5 text-blue-50 border border-blue-500/10 p-4 rounded-[18px] rounded-tl-[4px] text-[13px] leading-relaxed tracking-wide font-sans prose prose-invert prose-p:my-1 prose-ul:my-1 max-w-none prose-strong:text-indigo-300">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: aiMessage
                          .replace(/\n\n/g, "<br/><br/>")
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 p-5">
              <form onSubmit={handleSendQuery} className="flex gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask Coach to compare tactics, roast, or predict the next winner..."
                  className="flex-1 rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-white outline-none placeholder:text-neutral-500 focus:border-indigo-500/30 transition-all"
                  disabled={loadingCoach}
                />
                <button
                  type="submit"
                  disabled={loadingCoach || !userInput.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </section>

        </main>

      </div>
    </div>
  );
}
