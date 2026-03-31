import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Trophy, Users, Activity, Calendar, DollarSign } from 'lucide-react';

export function Dashboard() {
  const { teams, userTeamId, userPlayerId, currentWeek, matches, gameMode } = useGameStore();
  const userTeam = teams.find(t => t.id === userTeamId);
  const userNationalTeam = gameMode === 'player' ? teams.find(t => t.division === 0 && t.players.some(p => p.id === userPlayerId)) : null;

  if (!userTeam) return null;

  const nextMatch = matches.find(m => 
    ((m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id) || 
    (userNationalTeam && (m.homeTeamId === userNationalTeam.id || m.awayTeamId === userNationalTeam.id))) && 
    !m.played
  );
  
  const isNationalMatch = nextMatch && userNationalTeam && (nextMatch.homeTeamId === userNationalTeam.id || nextMatch.awayTeamId === userNationalTeam.id);
  const relevantTeam = isNationalMatch ? userNationalTeam : userTeam;
  
  const nextOpponentId = nextMatch?.homeTeamId === relevantTeam.id ? nextMatch?.awayTeamId : nextMatch?.homeTeamId;
  const nextOpponent = teams.find(t => t.id === nextOpponentId);

  const teamOverall = Math.round(userTeam.players.reduce((sum, p) => sum + p.overall, 0) / userTeam.players.length);
  const startersOverall = Math.round(userTeam.players.filter(p => p.isStarter).reduce((sum, p) => sum + p.overall, 0) / 11) || 0;

  const leagueStats = userTeam.stats.LEAGUE;
  const userPlayer = gameMode === 'player' ? userTeam.players.find(p => p.id === userPlayerId) : null;

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Visão Geral</h1>
        <p className="text-slate-400 mt-1">
          {gameMode === 'player' ? `Bem-vindo de volta, ${userPlayer?.name}.` : 'Bem-vindo de volta, treinador.'}
        </p>
      </header>

      {gameMode === 'player' && userPlayer && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Seu Overall</p>
              <p className="text-2xl font-bold text-slate-100">{userPlayer.overall}</p>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Gols</p>
              <p className="text-2xl font-bold text-slate-100">{userPlayer.goals}</p>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Assistências</p>
              <p className="text-2xl font-bold text-slate-100">{userPlayer.assists}</p>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Partidas</p>
              <p className="text-2xl font-bold text-slate-100">{userPlayer.matchesPlayed}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Pontos (Liga)</p>
            <p className="text-2xl font-bold text-slate-100">{leagueStats.points}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Finanças</p>
            <p className="text-xl font-bold text-slate-100">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(userTeam.finances)}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Força Titular</p>
            <p className="text-2xl font-bold text-slate-100">{startersOverall}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4 hidden lg:flex">
          <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Semana</p>
            <p className="text-2xl font-bold text-slate-100">{currentWeek}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Próximo Jogo</h2>
            {nextMatch && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700">
                {nextMatch.competition === 'LEAGUE' ? `Nacional Div ${relevantTeam.division}` :
                 nextMatch.competition === 'REGIONAL' ? (relevantTeam.continent === 'SA' ? `Estadual (${relevantTeam.state})` : `Regional (${relevantTeam.country})`) :
                 nextMatch.competition === 'NATIONAL_CUP' ? (relevantTeam.continent === 'SA' ? 'Copa do Brasil' : `Copa (${relevantTeam.country})`) :
                 nextMatch.competition === 'CONTINENTAL' ? (relevantTeam.continent === 'SA' ? 'Libertadores' : 'Champions') :
                 nextMatch.competition === 'WORLD_CUP' ? 'Copa do Mundo' :
                 (relevantTeam.continent === 'SA' ? 'Sul-Americana' : 'Europa League')}
              </span>
            )}
          </div>
          <div className="p-6">
            {nextMatch ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="flex items-center gap-8 w-full justify-center">
                  <div className="text-right flex-1">
                    <p className="text-lg font-bold text-slate-200">{nextMatch.homeTeamId === relevantTeam.id ? relevantTeam.name : nextOpponent?.name}</p>
                    <p className="text-sm text-slate-400">Casa</p>
                  </div>
                  <div className="px-4 py-2 bg-slate-900 rounded-lg text-slate-400 font-mono font-bold">
                    VS
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-lg font-bold text-slate-200">{nextMatch.awayTeamId === relevantTeam.id ? relevantTeam.name : nextOpponent?.name}</p>
                    <p className="text-sm text-slate-400">Fora</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">Fim da temporada.</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100">Artilheiros do Time</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Jogador</th>
                  <th className="px-6 py-3 font-medium">Pos</th>
                  <th className="px-6 py-3 font-medium text-right">Gols</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {userTeam.players
                  .filter(p => p.goals > 0)
                  .sort((a, b) => b.goals - a.goals)
                  .slice(0, 5)
                  .map(player => (
                    <tr key={player.id} className="hover:bg-slate-700/20">
                      <td className="px-6 py-3 font-medium text-slate-200">{player.name}</td>
                      <td className="px-6 py-3 text-slate-400">{player.position}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400">{player.goals}</td>
                    </tr>
                  ))}
                {userTeam.players.filter(p => p.goals > 0).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      Nenhum gol marcado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
