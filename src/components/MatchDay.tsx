import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, FastForward, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MatchSimulation } from './MatchSimulation';
import { simulateMatch } from '../game/engine';
import { MatchEvent } from '../types/game';

export function MatchDay() {
  const { teams, matches, currentWeek, playWeek, userTeamId, isGameOver } = useGameStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<{
    match: any,
    homeTeam: any,
    awayTeam: any,
    events: MatchEvent[]
  } | null>(null);

  const userTeam = teams.find(t => t.id === userTeamId);
  const currentMatches = matches.filter(m => m.week === currentWeek);
  const previousMatches = matches.filter(m => m.week === currentWeek - 1);

  const handlePlayWeek = () => {
    if (!userTeam) return;
    
    const startersCount = userTeam.players.filter(p => p.isStarter).length;
    if (startersCount !== 11) {
      alert(`Você precisa escalar exatamente 11 jogadores. Atualmente tem ${startersCount}.`);
      return;
    }

    const userMatch = currentMatches.find(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId);
    
    if (userMatch) {
      const home = teams.find(t => t.id === userMatch.homeTeamId)!;
      const away = teams.find(t => t.id === userMatch.awayTeamId)!;
      const result = simulateMatch(home, away);
      
      setActiveSimulation({
        match: userMatch,
        homeTeam: home,
        awayTeam: away,
        events: result.events
      });
    } else {
      setIsSimulating(true);
      setShowResults(false);
      
      setTimeout(() => {
        playWeek();
        setIsSimulating(false);
        setShowResults(true);
      }, 1500);
    }
  };

  const handleSimulationComplete = (result: { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }) => {
    setActiveSimulation(null);
    setIsSimulating(true);
    setShowResults(false);
    
    setTimeout(() => {
      playWeek(result);
      setIsSimulating(false);
      setShowResults(true);
    }, 500);
  };

  if (isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <h1 className="text-4xl font-black text-emerald-500">FIM DE TEMPORADA</h1>
        <p className="text-xl text-slate-300">O campeonato terminou. Verifique a classificação final.</p>
        <button 
          onClick={() => useGameStore.getState().resetGame()}
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
        >
          Iniciar Nova Carreira
        </button>
      </div>
    );
  }

  if (activeSimulation) {
    return (
      <MatchSimulation 
        match={activeSimulation.match}
        homeTeam={activeSimulation.homeTeam}
        awayTeam={activeSimulation.awayTeam}
        events={activeSimulation.events}
        onComplete={handleSimulationComplete}
      />
    );
  }

  const displayMatches = showResults ? previousMatches : currentMatches;
  const displayWeek = showResults ? currentWeek - 1 : currentWeek;

  // Group matches by competition
  const matchesByComp = displayMatches.reduce((acc, match) => {
    if (!acc[match.competition]) acc[match.competition] = [];
    acc[match.competition].push(match);
    return acc;
  }, {} as Record<string, typeof displayMatches>);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Rodada {displayWeek}</h1>
          <p className="text-slate-400 mt-1">
            {showResults ? 'Resultados da rodada.' : 'Próximos confrontos.'}
          </p>
        </div>
        
        {!showResults && (
          <button
            onClick={handlePlayWeek}
            disabled={isSimulating}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all",
              isSimulating 
                ? "bg-slate-700 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 shadow-lg shadow-emerald-900/20"
            )}
          >
            {isSimulating ? (
              <><FastForward className="w-5 h-5 animate-pulse" /> Simulando...</>
            ) : (
              <><Play className="w-5 h-5" /> Jogar Rodada</>
            )}
          </button>
        )}
        
        {showResults && (
          <button
            onClick={() => setShowResults(false)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
          >
            <CheckCircle2 className="w-5 h-5" /> Avançar
          </button>
        )}
      </header>

      {Object.entries(matchesByComp).map(([comp, compMatches]) => (
        <div key={comp} className="space-y-4">
          <h2 className="text-xl font-bold text-slate-300 border-b border-slate-700 pb-2">
            {comp === 'LEAGUE' ? 'Campeonato Nacional' : 
             comp === 'REGIONAL' ? 'Campeonato Regional' : 
             comp === 'NATIONAL_CUP' ? 'Copa Nacional' :
             comp === 'CONTINENTAL' ? 'Copa Continental' :
             'Copa Continental Secundária'}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compMatches.map(match => {
              const home = teams.find(t => t.id === match.homeTeamId);
              const away = teams.find(t => t.id === match.awayTeamId);
              const isUserMatch = home?.id === userTeamId || away?.id === userTeamId;

              if (!home || !away) return null;

              return (
                <div 
                  key={match.id} 
                  className={cn(
                    "bg-slate-800 p-6 rounded-2xl border transition-all duration-300",
                    isUserMatch ? "border-emerald-500/50 shadow-lg shadow-emerald-900/10" : "border-slate-700",
                    isSimulating && isUserMatch ? "animate-pulse border-emerald-400" : ""
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-right">
                      <p className={cn("font-bold text-lg", isUserMatch && home.id === userTeamId ? "text-emerald-400" : "text-slate-200")}>
                        {home.name}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 px-4 py-2 bg-slate-900 rounded-lg border border-slate-700 min-w-[80px] text-center">
                      {match.played || showResults ? (
                        <span className="font-mono font-black text-xl text-white">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-slate-500">VS</span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <p className={cn("font-bold text-lg", isUserMatch && away.id === userTeamId ? "text-emerald-400" : "text-slate-200")}>
                        {away.name}
                      </p>
                    </div>
                  </div>

                  {(match.played || showResults) && match.events.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 text-sm">
                      {match.events.map((event, idx) => {
                        const team = teams.find(t => t.id === event.teamId);
                        const player = team?.players.find(p => p.id === event.playerId);
                        const isHome = event.teamId === home.id;
                        
                        const getEventIcon = () => {
                          if (event.type === 'GOAL') return <span className="text-emerald-400">⚽</span>;
                          if (event.type === 'YELLOW_CARD') return <span className="text-yellow-500">🟨</span>;
                          if (event.type === 'RED_CARD') return <span className="text-red-500">🟥</span>;
                          if (event.type === 'SUBSTITUTION') return <span className="text-blue-400">🔄</span>;
                          if (event.type === 'OFFSIDE') return <span className="text-orange-400">🚩</span>;
                          return null;
                        };

                        return (
                          <div key={idx} className={cn("flex items-center gap-2 mb-1", isHome ? "justify-start" : "justify-end")}>
                            {isHome && <span className="text-emerald-400 font-mono text-xs">{event.minute}'</span>}
                            {isHome && getEventIcon()}
                            <span className="text-slate-300">{player?.name}</span>
                            {!isHome && getEventIcon()}
                            {!isHome && <span className="text-emerald-400 font-mono text-xs">{event.minute}'</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
