import { Bot, Send, User } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ProfileData, StatsData } from "../types";
import { getApiUrl } from "../utils/api";

interface AICoachProps {
  profile: ProfileData | null;
  stats: StatsData | null;
}

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

export default function AICoach({ profile, stats }: AICoachProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "ai",
      content: "Bhai kya haal hai? Stats toh dekh liye mainey. Koi help chahiye ya bas timepass karne aaya hai?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !profile || !stats || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ]);
    setLoading(true);

    try {
      const res = await fetch(getApiUrl("/api/coach/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, stats, intent: userMessage }),
      });

      if (!res.ok) {
        try {
          const errData = await res.json();
          throw new Error(errData.error || "Network error");
        } catch (e: any) {
          throw new Error(e.message === "Network error" ? e.message : (e.message || "Network error"));
        }
      }
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: data.analysis },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: err.message === "Network error" ? "Oops, connection drop ho gaya boss. API check karle apna." : err.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-xl flex-1 min-h-[400px] max-h-[600px] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-blue-500/20 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-blue-400">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-[13px] font-sans font-medium text-white tracking-wide">AI Analyst</h3>
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">Tactical Assessor</p>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                m.role === "user"
                  ? "bg-white text-black shadow-sm"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
              }`}
            >
              {m.role === "user" ? <User size={16} strokeWidth={2} /> : <Bot size={16} />}
            </div>
            <div
              className={`max-w-[80%] rounded-[18px] p-4 text-[13px] leading-relaxed tracking-wide font-sans ${
                m.role === "user"
                  ? "bg-white text-black rounded-tr-[4px] font-medium"
                  : "bg-blue-500/5 text-blue-50 border border-blue-500/10 rounded-tl-[4px] prose prose-invert prose-p:my-1 prose-ul:my-1 max-w-none prose-strong:text-white"
              }`}
            >
              {/* Basic formatting support */}
              {m.role === "ai" ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: m.content
                      .replace(/\n\n/g, "<br/><br/>")
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>"),
                  }}
                />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && (
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
        )}
      </div>

      <div className="border-t border-white/5 p-5">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-full bg-white/[0.02] p-1 border border-white/10 focus-within:border-white/30 transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Coach..."
            className="flex-1 bg-transparent px-4 py-2 text-[13px] font-sans tracking-wide text-white outline-none placeholder:text-neutral-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-neutral-200 disabled:opacity-50 disabled:hover:bg-white shrink-0 shadow-sm"
          >
            <Send className="h-4 w-4 ml-0.5" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
