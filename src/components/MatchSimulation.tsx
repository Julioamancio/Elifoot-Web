import React, { useState, useEffect, useRef } from 'react';
import { Match, Team, MatchEvent } from '../types/game';
import { Play, FastForward, Pause, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchSimulationProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  onComplete: (result: { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }) => void;
}

interface PlayerDot {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isHome: boolean;
  position: string;
}

export function MatchSimulation({ match, homeTeam, awayTeam, events, onComplete }: MatchSimulationProps) {
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 10x
  const [isPlaying, setIsPlaying] = useState(true);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<MatchEvent | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const minuteRef = useRef(0);
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  const [players, setPlayers] = useState<PlayerDot[]>([]);

  // Initialize players
  useEffect(() => {
    const initPlayers: PlayerDot[] = [];
    
    // Home team (left side)
    const homeStarters = homeTeam.players.filter(p => p.isStarter);
    homeStarters.forEach((p, i) => {
      initPlayers.push({
        id: p.id,
        x: 25 + Math.random() * 20,
        y: 10 + (i * 80 / 11) + Math.random() * 10,
        targetX: 25 + Math.random() * 20,
        targetY: 10 + (i * 80 / 11) + Math.random() * 10,
        isHome: true,
        position: p.position
      });
    });

    // Away team (right side)
    const awayStarters = awayTeam.players.filter(p => p.isStarter);
    awayStarters.forEach((p, i) => {
      initPlayers.push({
        id: p.id,
        x: 75 - Math.random() * 20,
        y: 10 + (i * 80 / 11) + Math.random() * 10,
        targetX: 75 - Math.random() * 20,
        targetY: 10 + (i * 80 / 11) + Math.random() * 10,
        isHome: false,
        position: p.position
      });
    });

    setPlayers(initPlayers);
  }, [homeTeam, awayTeam]);

  // Animation loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      if (!isPlaying || isFinished) {
        lastTime = time;
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      const deltaTime = time - lastTime;
      lastTime = time;

      // Update minute
      const minuteIncrement = (deltaTime / 100) * speed;
      minuteRef.current += minuteIncrement;
      
      if (minuteRef.current >= 90) {
        minuteRef.current = 90;
        setMinute(90);
        setIsFinished(true);
        setIsPlaying(false);
      } else {
        setMinute(Math.floor(minuteRef.current));
      }

      // Check events
      const currentMin = Math.floor(minuteRef.current);
      const evs = events.filter(e => e.minute === currentMin);
      
      const newEvent = evs.find(e => !processedEventsRef.current.has(e.id));
      
      if (newEvent) {
        processedEventsRef.current.add(newEvent.id);
        setCurrentEvent(newEvent);
        if (newEvent.type === 'GOAL') {
          if (newEvent.teamId === homeTeam.id) setHomeScore(s => s + 1);
          if (newEvent.teamId === awayTeam.id) setAwayScore(s => s + 1);
        }
        
        // Pause briefly for event if not fast forwarding too much
        if (speed < 10) {
          setIsPlaying(false);
          setTimeout(() => {
            setCurrentEvent(null);
            setIsPlaying(true);
          }, 1500 / speed);
        }
      }

      // Update player positions
      setPlayers(prev => prev.map(p => {
        let { x, y, targetX, targetY } = p;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 1) {
          // Assign new target
          targetX = p.isHome ? 10 + Math.random() * 40 : 50 + Math.random() * 40;
          targetY = 10 + Math.random() * 80;
          
          // If there's a goal event happening soon, move towards the goal
          const upcomingGoal = events.find(e => e.type === 'GOAL' && e.minute >= minuteRef.current && e.minute < minuteRef.current + 2);
          if (upcomingGoal) {
            if (upcomingGoal.teamId === homeTeam.id && p.isHome) {
              targetX = 85 + Math.random() * 10; // Move to right goal
              targetY = 40 + Math.random() * 20;
            } else if (upcomingGoal.teamId === awayTeam.id && !p.isHome) {
              targetX = 5 + Math.random() * 10; // Move to left goal
              targetY = 40 + Math.random() * 20;
            }
          }
        } else {
          // Move
          const speedFactor = 0.05 * speed;
          x += dx * speedFactor;
          y += dy * speedFactor;
        }
        
        return { ...p, x, y, targetX, targetY };
      }));

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isFinished, speed, currentEvent, events, homeTeam.id, awayTeam.id]);

  const handleComplete = () => {
    const finalHomeScore = events.filter(e => e.type === 'GOAL' && e.teamId === homeTeam.id).length;
    const finalAwayScore = events.filter(e => e.type === 'GOAL' && e.teamId === awayTeam.id).length;
    
    onComplete({
      matchId: match.id,
      homeScore: finalHomeScore,
      awayScore: finalAwayScore,
      events
    });
  };

  const getEventMessage = (ev: MatchEvent) => {
    const team = ev.teamId === homeTeam.id ? homeTeam : awayTeam;
    const player = team.players.find(p => p.id === ev.playerId);
    if (!player) return '';

    switch (ev.type) {
      case 'GOAL': return `⚽ GOL do ${team.name}! (${player.name})`;
      case 'YELLOW_CARD': return `🟨 Cartão Amarelo para ${player.name}`;
      case 'RED_CARD': return `🟥 Cartão Vermelho para ${player.name}`;
      case 'SUBSTITUTION': return `🔄 Substituição no ${team.name}`;
      case 'OFFSIDE': return `🚩 Impedimento de ${player.name}`;
      default: return '';
    }
  };

  const getTeamColor = (team: Team) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    let hash = 0;
    for (let i = 0; i < team.name.length; i++) {
      hash = team.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const homeColor = getTeamColor(homeTeam);
  const awayColor = getTeamColor(awayTeam);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <div className="flex-1 text-right">
          <h2 className="text-2xl font-bold text-slate-100">{homeTeam.name}</h2>
          <div className="w-4 h-4 rounded-full inline-block mt-2" style={{ backgroundColor: homeColor }} />
        </div>
        
        <div className="px-8 text-center">
          <div className="text-4xl font-black font-mono text-white mb-2">
            {homeScore} - {awayScore}
          </div>
          <div className="text-emerald-400 font-mono font-bold text-xl">
            {minute}'
          </div>
        </div>
        
        <div className="flex-1 text-left">
          <h2 className="text-2xl font-bold text-slate-100">{awayTeam.name}</h2>
          <div className="w-4 h-4 rounded-full inline-block mt-2" style={{ backgroundColor: awayColor }} />
        </div>
      </div>

      {/* 2D Field */}
      <div className="relative w-full aspect-[2/1] bg-green-700 rounded-lg overflow-hidden border-4 border-slate-800 shadow-2xl">
        {/* Field Markings */}
        <div className="absolute inset-0 border-2 border-white/30 m-4" />
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
        
        {/* Penalty Areas */}
        <div className="absolute top-1/4 left-4 bottom-1/4 w-32 border-2 border-white/30 border-l-0" />
        <div className="absolute top-1/4 right-4 bottom-1/4 w-32 border-2 border-white/30 border-r-0" />
        
        {/* Goal Areas */}
        <div className="absolute top-[35%] left-4 bottom-[35%] w-12 border-2 border-white/30 border-l-0" />
        <div className="absolute top-[35%] right-4 bottom-[35%] w-12 border-2 border-white/30 border-r-0" />

        {/* Players */}
        {players.map(p => (
          <div
            key={p.id}
            className="absolute w-3 h-3 rounded-full shadow-md transition-all duration-100 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              backgroundColor: p.isHome ? homeColor : awayColor,
              border: '1px solid rgba(255,255,255,0.5)'
            }}
          />
        ))}

        {/* Event Overlay */}
        {currentEvent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
            <div className="bg-slate-900/90 px-8 py-4 rounded-2xl border border-slate-700 text-2xl font-bold text-white shadow-2xl animate-in zoom-in-95 duration-200">
              {getEventMessage(currentEvent)}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isFinished}
            className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSpeed(1)}
            className={cn("px-4 py-2 rounded-lg font-bold transition-colors", speed === 1 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600")}
          >
            1x
          </button>
          <button
            onClick={() => setSpeed(2)}
            className={cn("px-4 py-2 rounded-lg font-bold transition-colors", speed === 2 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600")}
          >
            2x
          </button>
          <button
            onClick={() => setSpeed(10)}
            className={cn("px-4 py-2 rounded-lg font-bold transition-colors", speed === 10 ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600")}
          >
            10x
          </button>
        </div>

        {isFinished && (
          <button
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 animate-in fade-in slide-in-from-right-4"
          >
            <CheckCircle2 className="w-5 h-5" />
            Concluir Rodada
          </button>
        )}
      </div>
    </div>
  );
}
