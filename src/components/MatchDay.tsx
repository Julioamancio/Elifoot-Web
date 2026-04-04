import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Play, FastForward, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MatchSimulation } from './MatchSimulation';
import { simulateMatch } from '../game/engine';
import { Match, MatchEvent } from '../types/game';
import { TeamFlag } from './ui/TeamFlag';

export function MatchDay() {
  const teams = useGameStore(state => state.teams);
  const matches = useGameStore(state => state.matches);
  const currentWeek = useGameStore(state => state.currentWeek);
  const playWeek = useGameStore(state => state.playWeek);
  const userTeamId = useGameStore(state => state.userTeamId);
  const userPlayerId = useGameStore(state => state.userPlayerId);
  const isGameOver = useGameStore(state => state.isGameOver);
  const gameMode = useGameStore(state => state.gameMode);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pendingUserSimulations, setPendingUserSimulations] = useState<Array<{
    match: Match,
    homeTeam: any,
    awayTeam: any,
    result: { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }
  }>>([]);
  const [completedUserResults, setCompletedUserResults] = useState<
    Array<{ matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }>
  >([]);
  const [activeSimulation, setActiveSimulation] = useState<{
    match: Match,
    homeTeam: any,
    awayTeam: any,
    result: { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }
  } | null>(null);

  const userTeam = teams.find(t => t.id === userTeamId);
  const userNationalTeam = gameMode === 'player'
    ? teams.find(
        t =>
          t.division === 0 &&
          (t.players.some(p => p.id === userPlayerId) ||
            Object.values(t.competitionSquads ?? {}).some(players => players?.some(player => player.id === userPlayerId))),
      )
    : null;
  
  const currentMatches = matches.filter(m => m.week === currentWeek);
  const previousMatches = matches.filter(m => m.week === currentWeek - 1);
  const userEntityIds = new Set([userTeamId, userNationalTeam?.id].filter((value): value is string => Boolean(value)));
  const hasResolvedTeams = (match: Match) =>
    teams.some(team => team.id === match.homeTeamId) && teams.some(team => team.id === match.awayTeamId);
  const currentUserMatches = currentMatches.filter(
    match => userEntityIds.has(match.homeTeamId) || userEntityIds.has(match.awayTeamId),
  );
  const playableCurrentUserMatches = currentUserMatches.filter(hasResolvedTeams);

  const prepareTeamForSimulation = (team: any) => {
    const players = team.players.map((player: any) => ({ ...player }));
    const availablePlayers = players.filter((player: any) => !(player.injury?.weeksRemaining > 0));
    const selectedIds = new Set<string>();

    players.forEach((player: any) => {
      if (player.injury?.weeksRemaining > 0) {
        player.isStarter = false;
      }
    });

    const preferredStarters = availablePlayers.filter((player: any) => player.isStarter);
    const pick = (position: string, limit: number) => {
      preferredStarters
        .filter((player: any) => player.position === position && !selectedIds.has(player.id))
        .sort((playerA: any, playerB: any) => playerB.overall - playerA.overall)
        .slice(0, limit)
        .forEach((player: any) => selectedIds.add(player.id));

      availablePlayers
        .filter((player: any) => player.position === position && !selectedIds.has(player.id))
        .sort((playerA: any, playerB: any) => playerB.overall - playerA.overall)
        .slice(0, Math.max(0, limit - [...selectedIds].filter(id => availablePlayers.find((player: any) => player.id === id)?.position === position).length))
        .forEach((player: any) => selectedIds.add(player.id));
    };

    pick('GK', 1);
    pick('DEF', 4);
    pick('MID', 4);
    pick('ATK', 2);

    availablePlayers
      .filter((player: any) => !selectedIds.has(player.id))
      .sort((playerA: any, playerB: any) => playerB.overall - playerA.overall)
      .forEach((player: any) => {
        if (selectedIds.size < 11) {
          selectedIds.add(player.id);
        }
      });

    players.forEach((player: any) => {
      player.isStarter = selectedIds.has(player.id);
    });

    return { ...team, players };
  };

  const buildSimulationForMatch = (match: Match) => {
    const homeSource = teams.find(t => t.id === match.homeTeamId);
    const awaySource = teams.find(t => t.id === match.awayTeamId);
    if (!homeSource || !awaySource) {
      return null;
    }

    const home = prepareTeamForSimulation(homeSource);
    const away = prepareTeamForSimulation(awaySource);
    const simulationResult = simulateMatch(home, away, {
      competition: match.competition,
      isKnockout: Boolean(match.isKnockout),
    });

    return {
      match,
      homeTeam: home,
      awayTeam: away,
      result: {
        matchId: match.id,
        homeScore: simulationResult.homeScore,
        awayScore: simulationResult.awayScore,
        events: simulationResult.events,
      },
    };
  };

  const handlePlayWeek = () => {
    if (!userTeam) return;
    
    if (gameMode === 'manager') {
      const startersCount = userTeam.players.filter(p => p.isStarter).length;
      if (startersCount !== 11) {
        alert(`Você precisa escalar exatamente 11 jogadores. Atualmente tem ${startersCount}.`);
        return;
      }
    }

    if (playableCurrentUserMatches.length > 0) {
      const simulations = playableCurrentUserMatches
        .map(buildSimulationForMatch)
        .filter((simulation): simulation is NonNullable<ReturnType<typeof buildSimulationForMatch>> => Boolean(simulation));
      if (simulations.length === 0) {
        setIsSimulating(true);
        setShowResults(false);

        setTimeout(() => {
          playWeek();
          setIsSimulating(false);
          setShowResults(true);
        }, 1500);
        return;
      }
      setCompletedUserResults([]);
      setPendingUserSimulations(simulations.slice(1));
      setActiveSimulation(simulations[0]);
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
    const updatedResults = [...completedUserResults, result];
    const [nextSimulation, ...remainingSimulations] = pendingUserSimulations;

    setCompletedUserResults(updatedResults);

    if (nextSimulation) {
      setPendingUserSimulations(remainingSimulations);
      setActiveSimulation(nextSimulation);
      return;
    }

    setPendingUserSimulations([]);
    setIsSimulating(true);
    setShowResults(false);
    
    setTimeout(() => {
      playWeek(updatedResults);
      setActiveSimulation(null);
      setCompletedUserResults([]);
      setIsSimulating(false);
      setShowResults(false);
    }, 500);
  };

  if (isGameOver) {
    const { jobOffers, acceptJobOffer, acceptPlayerOffer, gameMode, managerReputation, userPlayerId, seasonReview } = useGameStore.getState();
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
                      <p className="flex items-center gap-2 font-bold text-lg text-slate-200">
                        <TeamFlag country={team.country} teamName={team.name} size="xs" />
                        <span>{team.name}</span>
                      </p>
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
                    className="flex w-full items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
                  >
                    {userTeam ? <TeamFlag country={userTeam.country} teamName={userTeam.name} size="xs" className="border-white/20 bg-white/10" /> : null}
                    <span>Continuar no {userTeam?.name} (Nova Temporada)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-500 italic">Nenhuma proposta recebida no momento.</p>
                <button 
                  onClick={() => useGameStore.getState().nextSeason()}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
                >
                  {userTeam ? <TeamFlag country={userTeam.country} teamName={userTeam.name} size="xs" className="border-white/20 bg-white/10" /> : null}
                  <span>Continuar no {userTeam?.name} (Nova Temporada)</span>
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
                      <p className="flex items-center gap-2 font-bold text-lg text-slate-200">
                        <TeamFlag country={team.country} teamName={team.name} size="xs" />
                        <span>{team.name}</span>
                      </p>
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
                    className="flex w-full items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
                  >
                    {userTeam ? <TeamFlag country={userTeam.country} teamName={userTeam.name} size="xs" className="border-white/20 bg-white/10" /> : null}
                    <span>Continuar no {userTeam?.name} (Nova Temporada)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-slate-500 italic">Nenhuma proposta recebida no momento.</p>
                <button 
                  onClick={() => useGameStore.getState().nextSeason()}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all"
                >
                  {userTeam ? <TeamFlag country={userTeam.country} teamName={userTeam.name} size="xs" className="border-white/20 bg-white/10" /> : null}
                  <span>Continuar no {userTeam?.name} (Nova Temporada)</span>
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
        key={activeSimulation.match.id}
        match={activeSimulation.match}
        homeTeam={activeSimulation.homeTeam}
        awayTeam={activeSimulation.awayTeam}
        result={activeSimulation.result}
        completeLabel={pendingUserSimulations.length > 0 ? 'Próximo Jogo' : 'Concluir Rodada'}
        sequenceLabel={`Jogo ${completedUserResults.length + 1} de ${playableCurrentUserMatches.length} da sua semana`}
        onComplete={handleSimulationComplete}
      />
    );
  }

  const roundMatches = showResults ? previousMatches : currentMatches;
  const displayMatches = roundMatches.filter(
    match => (userEntityIds.has(match.homeTeamId) || userEntityIds.has(match.awayTeamId)) && hasResolvedTeams(match),
  );
  const displayWeek = showResults ? currentWeek - 1 : currentWeek;
  const hiddenMatchesCount = roundMatches.length - displayMatches.length;

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
          {hiddenMatchesCount > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {hiddenMatchesCount} jogo(s) sem participação do seu time ficam em segundo plano e são simulados automaticamente.
            </p>
          )}
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

      {displayMatches.length === 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-slate-100">
            {showResults ? 'Nenhum resultado do seu time nesta semana.' : 'Nenhum jogo seu nesta semana.'}
          </h2>
          <p className="mt-2 text-slate-400">
            {showResults
              ? 'As outras competições já foram atualizadas em segundo plano.'
              : 'Ao avançar a rodada, as outras competições serão simuladas automaticamente sem abrir a visualização delas.'}
          </p>
        </div>
      )}

      {Object.entries(matchesByComp).map(([comp, compMatches]) => (
        <div key={comp} className="space-y-4">
          <h2 className="text-xl font-bold text-slate-300 border-b border-slate-700 pb-2">
            {comp === 'LEAGUE' ? 'Campeonato Nacional' : 
             comp === 'REGIONAL' ? 'Campeonato Regional' : 
             comp === 'NATIONAL_CUP' ? 'Copa Nacional' :
             comp === 'CONTINENTAL' ? 'Copa Continental' :
             comp === 'WORLD_CUP' ? 'Copa do Mundo' :
             comp === 'OLYMPICS' ? 'Olimpíadas' :
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

              const shouldFlipTeams = Boolean(isAwayUser);
              const leftTeam = shouldFlipTeams ? away : home;
              const rightTeam = shouldFlipTeams ? home : away;
              const leftIsUser = shouldFlipTeams ? isAwayUser : isHomeUser;
              const rightIsUser = shouldFlipTeams ? isHomeUser : isAwayUser;
              const displayScore = shouldFlipTeams
                ? `${match.awayScore} - ${match.homeScore}`
                : `${match.homeScore} - ${match.awayScore}`;

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
                      <p className={cn("flex items-center justify-end gap-2 font-bold text-lg", leftIsUser ? "text-emerald-400" : "text-slate-200")}>
                        <TeamFlag country={leftTeam.country} teamName={leftTeam.name} size="sm" />
                        <span>{leftTeam.name}</span>
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 px-4 py-2 bg-slate-900 rounded-lg border border-slate-700 min-w-[80px] text-center">
                      {match.played || showResults ? (
                        <span className="font-mono font-black text-xl text-white">
                          {displayScore}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-slate-500">VS</span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <p className={cn("flex items-center gap-2 font-bold text-lg", rightIsUser ? "text-emerald-400" : "text-slate-200")}>
                        <TeamFlag country={rightTeam.country} teamName={rightTeam.name} size="sm" />
                        <span>{rightTeam.name}</span>
                      </p>
                    </div>
                  </div>

                  {(match.played || showResults) && match.events.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 text-sm">
                      {match.events.map((event, idx) => {
                        const team = teams.find(t => t.id === event.teamId);
                        const squad = team?.competitionSquads?.[match.competition] ?? team?.players ?? [];
                        const player = squad.find(p => p.id === event.playerId);
                        const isLeft = event.teamId === leftTeam.id;
                        
                        const getEventIcon = () => {
                          if (event.type === 'GOAL') return <span className="text-emerald-400">⚽</span>;
                          if (event.type === 'YELLOW_CARD') return <span className="text-yellow-500">🟨</span>;
                          if (event.type === 'RED_CARD') return <span className="text-red-500">🟥</span>;
                          if (event.type === 'SUBSTITUTION') return <span className="text-blue-400">🔄</span>;
                          if (event.type === 'OFFSIDE') return <span className="text-orange-400">🚩</span>;
                          return null;
                        };

                        return (
                          <div key={idx} className={cn("flex items-center gap-2 mb-1", isLeft ? "justify-start" : "justify-end")}>
                            {isLeft && <span className="text-emerald-400 font-mono text-xs">{event.minute}'</span>}
                            {isLeft && getEventIcon()}
                            <span className="text-slate-300">{player?.name}</span>
                            {event.reason && <span className="text-slate-500 text-xs">({event.reason})</span>}
                            {!isLeft && getEventIcon()}
                            {!isLeft && <span className="text-emerald-400 font-mono text-xs">{event.minute}'</span>}
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
