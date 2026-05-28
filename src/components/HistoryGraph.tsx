import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface HistoryGraphProps {
  currentRating: number | null;
  peakRating: number | null;
  history?: any[];
  username?: string;
  color: string;
  mode: string;
}

export default function HistoryGraph({ currentRating, peakRating, history, username, color, mode }: HistoryGraphProps) {
  const data = React.useMemo(() => {
    // If we have actual history data, build points from real games
    if (history && history.length > 0 && username) {
      const modeHistory = history.filter((g: any) => g.time_class === mode);
      
      if (modeHistory.length > 0) {
        // Take up to the last 15 games
        const recentGames = modeHistory.slice(-15);
        const points = recentGames.map((game: any, index: number) => {
          const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
          const rating = isWhite ? game.white.rating : game.black.rating;
          // Format date like 'Mon', 'Tue' or '05/26'
          const date = new Date(game.end_time * 1000);
          const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
          return { day: dayStr, rating: rating };
        });
        
        // Ensure the last point is current rating if available
        if (currentRating && points.length > 0) {
           const curPointDay = points[points.length - 1].day;
           points.push({ day: 'Now', rating: currentRating });
        }
        
        return points;
      }
    }

    // Fallback to real single-point or minimal data if history isn't loaded or available
    const cur = currentRating || 0;
    return [
       { day: 'Start', rating: cur },
       { day: 'Now', rating: cur }
    ];
  }, [currentRating, peakRating, history, username, mode]);

  const isEmptyHistory = !history || history.length === 0;

  return (
    <div className="h-64 w-full relative">
      {isEmptyHistory && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-[12px] px-4 py-2">
             <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">Loading Real History...</p>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`colorRating-${mode}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }} 
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#f4f4f5' }}
            itemStyle={{ color }}
          />
          <Area 
            type="monotone" 
            dataKey="rating" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#colorRating-${mode})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
