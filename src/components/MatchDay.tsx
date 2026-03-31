import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, FastForward, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MatchSimulation } from './MatchSimulation';
import { simulateMatch } from '../game/engine';
import { MatchEvent } from '../types/game';

export function MatchDay() {
  const { teams, matches, currentWeek, playWeek, userTeamId, userPlayerId, isGameOver, gameMode } = useGameStore();
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<{
    match: any,
    homeTeam: any,
    awayTeam: any,
    events: MatchEvent[]
  } | null>(null);

  const userTeam = teams.find(t => t.id === userTeamId);
  const userNationalTeam = gameMode === 'player' ? teams.find(t => t.division === 0 && t.players.some(p => p.id === userPlayerId)) : null;
  
  const currentMatches = matches.filter(m => m.week === currentWeek);
  const previousMatches = matches.filter(m => m.week === currentWeek - 1);

  const handlePlayWeek = () => {
    if (!userTeam) return;
    
    if (gameMode === 'manager') {
      const startersCount = userTeam.players.filter(p => p.isStarter).length;
      if (startersCount !== 11) {
        alert(`Você precisa escalar exatamente 11 jogadores. Atualmente tem ${startersCount}.`);
        return;
      }
    }

    const userMatch = currentMatches.find(m => 
      m.homeTeamId === userTeamId || 
      m.awayTeamId === userTeamId || 
      (userNationalTeam && (m.homeTeamId === userNationalTeam.id || m.awayTeamId === userNationalTeam.id))
    );
    
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
    const { jobOffers, acceptJobOffer, acceptPlayerOffer, gameMode, managerReputation, userPlayerId } = useGameStore.getState();
    const offers = jobOffers.map(id => teams.find(t => t.id === id)).filter(Boolean);
    const userPlayer = userTeam?.players.find(p => p.id === userPlayerId);

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
        <h1 className="text-4xl font-black text-emerald-500">FIM DE TEMPORADA</h1>
        <p className="text-xl text-slate-300">O campeonato terminou. Verifique a classificação final.</p>
        
        {gameMode === 'manager' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Sua Reputação: {Math.round(managerReputation)}/100</h2>
            <p className="text-slate-400 mb-6">Com base no seu desempenho, você recebeu as seguintes propostas de trabalho:</p>
            
            {offers.length > 0 ? (
              <div className="space-y-4">
                {offers.map(team => team && (
                  <div key={team.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
                    <div className="text-left">
                      <p className="font-bold text-lg text-slate-200">{team.name}</p>
                      <p className="text-sm text-slate-400">Divisão {team.division} - {team.country}</p>
                    </div>
                    <button 
                      onClick={() => {
                        acceptJobOffer(team.id);
                        useGameStore.getState().nextSeason();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all"
                    >
                      Aceitar Proposta
                    </button>
                  </div>
                ))}
                <div className="pt-4 mt-4 border-t border-slate-700">
                  <button 
                    onClick={() => useGameStore.getState().nextSeason()}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all w-full"
                  >
                    Continuar no {userTeam?.name} (Nova Temporada)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-500 italic">Nenhuma proposta recebida no momento.</p>
                <button 
                  onClick={() => useGameStore.getState().nextSeason()}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
                >
                  Continuar no {userTeam?.name} (Nova Temporada)
                </button>
              </div>
            )}
          </div>
        )}

        {gameMode === 'player' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Seu Overall: {userPlayer?.overall}</h2>
            <p className="text-slate-400 mb-6">Com base no seu desempenho, você recebeu as seguintes propostas de transferência:</p>
            
            {offers.length > 0 ? (
              <div className="space-y-4">
                {offers.map(team => team && (
                  <div key={team.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
                    <div className="text-left">
                      <p className="font-bold text-lg text-slate-200">{team.name}</p>
                      <p className="text-sm text-slate-400">Divisão {team.division} - {team.country}</p>
                    </div>
                    <button 
                      onClick={() => {
                        acceptPlayerOffer(team.id);
                        useGameStore.getState().nextSeason();
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all"
                    >
                      Assinar Contrato
                    </button>
                  </div>
                ))}
                <div className="pt-4 mt-4 border-t border-slate-700">
                  <button 
                    onClick={() => useGameStore.getState().nextSeason()}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all w-full"
                  >
                    Continuar no {userTeam?.name} (Nova Temporada)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-500 italic">Nenhuma proposta recebida no momento.</p>
                <button 
                  onClick={() => useGameStore.getState().nextSeason()}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
                >
                  Continuar no {userTeam?.name} (Nova Temporada)
                </button>
              </div>
            )}
          </div>
        )}
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
             comp === 'WORLD_CUP' ? 'Copa do Mundo' :
             'Copa Continental Secundária'}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {compMatches.map(match => {
              const home = teams.find(t => t.id === match.homeTeamId);
              const away = teams.find(t => t.id === match.awayTeamId);
              const isUserMatch = home?.id === userTeamId || away?.id === userTeamId || 
                                  (userNationalTeam && (home?.id === userNationalTeam.id || away?.id === userNationalTeam.id));
              const isHomeUser = home?.id === userTeamId || (userNationalTeam && home?.id === userNationalTeam.id);
              const isAwayUser = away?.id === userTeamId || (userNationalTeam && away?.id === userNationalTeam.id);

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
                      <p className={cn("font-bold text-lg", isHomeUser ? "text-emerald-400" : "text-slate-200")}>
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
                      <p className={cn("font-bold text-lg", isAwayUser ? "text-emerald-400" : "text-slate-200")}>
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
