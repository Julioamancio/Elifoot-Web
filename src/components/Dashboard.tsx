import React, { useState } from 'react';
import { Trophy, Users, Activity, Calendar, DollarSign, LogOut } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PageHeader } from './ui/PageHeader';
import { ConfirmModal } from './ui/ConfirmModal';

export function Dashboard() {
  const teams = useGameStore(state => state.teams);
  const userTeamId = useGameStore(state => state.userTeamId);
  const userPlayerId = useGameStore(state => state.userPlayerId);
  const currentWeek = useGameStore(state => state.currentWeek);
  const matches = useGameStore(state => state.matches);
  const gameMode = useGameStore(state => state.gameMode);
  const recentRoundSummary = useGameStore(state => state.recentRoundSummary);
  const newsFeed = useGameStore(state => state.newsFeed ?? []);
  const resetGame = useGameStore(state => state.resetGame);
  const [isRetireModalOpen, setIsRetireModalOpen] = useState(false);

  const userTeam = teams.find(team => team.id === userTeamId);
  const userNationalTeam =
    gameMode === 'player'
      ? teams.find(
          team =>
            team.division === 0 &&
            (team.players.some(player => player.id === userPlayerId) ||
              Object.values(team.competitionSquads ?? {}).some(players =>
                players?.some(player => player.id === userPlayerId),
              )),
        )
      : null;

  if (!userTeam) return null;

  const nextMatch = matches.find(
    match =>
      ((match.homeTeamId === userTeam.id || match.awayTeamId === userTeam.id) ||
        (userNationalTeam &&
          (match.homeTeamId === userNationalTeam.id || match.awayTeamId === userNationalTeam.id))) &&
      !match.played,
  );

  const isNationalMatch =
    Boolean(nextMatch) &&
    Boolean(userNationalTeam) &&
    (nextMatch?.homeTeamId === userNationalTeam?.id || nextMatch?.awayTeamId === userNationalTeam?.id);
  const relevantTeam = isNationalMatch ? userNationalTeam : userTeam;

  const nextOpponentId =
    nextMatch && relevantTeam
      ? nextMatch.homeTeamId === relevantTeam.id
        ? nextMatch.awayTeamId
        : nextMatch.homeTeamId
      : null;
  const nextOpponent = teams.find(team => team.id === nextOpponentId);
  const isRelevantTeamHome = nextMatch && relevantTeam ? nextMatch.homeTeamId === relevantTeam.id : false;

  const startersOverall =
    Math.round(
      userTeam.players.filter(player => player.isStarter).reduce((sum, player) => sum + player.overall, 0) / 11,
    ) || 0;

  const leagueStats = userTeam.stats.LEAGUE;
  const userPlayer = gameMode === 'player' ? userTeam.players.find(player => player.id === userPlayerId) : null;
  const injuredPlayers = userTeam.players.filter(player => (player.injury?.weeksRemaining ?? 0) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        subtitle={gameMode === 'player' ? `Bem-vindo de volta, ${userPlayer?.name}.` : 'Bem-vindo de volta, treinador.'}
        icon={<Activity className="h-7 w-7" />}
      />

      {gameMode === 'player' && userPlayer && (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Activity className="h-6 w-6" />} tone="blue" label="Seu Overall" value={userPlayer.overall} />
          <StatCard icon={<Trophy className="h-6 w-6" />} tone="emerald" label="Gols" value={userPlayer.goals} />
          <StatCard icon={<Users className="h-6 w-6" />} tone="yellow" label="Assistências" value={userPlayer.assists} />
          <StatCard icon={<Calendar className="h-6 w-6" />} tone="purple" label="Partidas" value={userPlayer.matchesPlayed} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Trophy className="h-6 w-6" />} tone="emerald" label="Pontos (Liga)" value={leagueStats.points} />
        <StatCard
          icon={<DollarSign className="h-6 w-6" />}
          tone="yellow"
          label="Finanças"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(userTeam.finances)}
        />
        <StatCard icon={<Users className="h-6 w-6" />} tone="blue" label="Força Titular" value={startersOverall} />
        <StatCard icon={<Calendar className="h-6 w-6" />} tone="orange" label="Semana" value={currentWeek} className="hidden lg:flex" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-100">Próximo Jogo</h2>
            {nextMatch && relevantTeam && (
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                {nextMatch.competition === 'LEAGUE'
                  ? `Nacional Div ${relevantTeam.division}`
                  : nextMatch.competition === 'REGIONAL'
                    ? relevantTeam.continent === 'SA'
                      ? `Estadual (${relevantTeam.state})`
                      : `Regional (${relevantTeam.country})`
                    : nextMatch.competition === 'NATIONAL_CUP'
                      ? relevantTeam.continent === 'SA'
                        ? 'Copa do Brasil'
                        : `Copa (${relevantTeam.country})`
                      : nextMatch.competition === 'CONTINENTAL'
                        ? relevantTeam.continent === 'SA'
                          ? 'Libertadores'
                          : 'Champions'
                        : nextMatch.competition === 'WORLD_CUP'
                          ? 'Copa do Mundo'
                          : nextMatch.competition === 'OLYMPICS'
                            ? 'Olimpíadas'
                            : relevantTeam.continent === 'SA'
                              ? 'Sul-Americana'
                              : 'Europa League'}
              </span>
            )}
          </div>
          <div className="p-6">
            {nextMatch && relevantTeam ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="flex w-full items-center justify-center gap-8">
                  <div className="flex-1 text-right">
                    <p className="text-lg font-bold text-emerald-400">{relevantTeam.name}</p>
                    <p className="text-sm text-slate-400">{isRelevantTeamHome ? 'Seu time • Casa' : 'Seu time • Fora'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900 px-4 py-2 font-mono font-bold text-slate-400">VS</div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-slate-200">{nextOpponent?.name}</p>
                    <p className="text-sm text-slate-400">{isRelevantTeamHome ? 'Adversário • Fora' : 'Adversário • Casa'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-slate-400">Fim da temporada.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="border-b border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-100">Artilheiros do Time</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Jogador</th>
                  <th className="px-6 py-3 font-medium">Pos</th>
                  <th className="px-6 py-3 text-right font-medium">Gols</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {userTeam.players
                  .filter(player => player.goals > 0)
                  .sort((playerA, playerB) => playerB.goals - playerA.goals)
                  .slice(0, 5)
                  .map(player => (
                    <tr key={player.id} className="hover:bg-slate-700/20">
                      <td className="px-6 py-3 font-medium text-slate-200">{player.name}</td>
                      <td className="px-6 py-3 text-slate-400">{player.position}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400">{player.goals}</td>
                    </tr>
                  ))}
                {userTeam.players.filter(player => player.goals > 0).length === 0 && (
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-700 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Resumo da Rodada</h2>
              <p className="mt-1 text-sm text-slate-400">Leitura rápida do que acabou de acontecer.</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
              Semana {recentRoundSummary?.week ?? currentWeek}
            </span>
          </div>
          <div className="space-y-4 p-6">
            {recentRoundSummary ? (
              <>
                {recentRoundSummary.headlines.map(headline => (
                  <p key={headline} className="text-sm text-slate-300">
                    {headline}
                  </p>
                ))}
                <div className="space-y-3">
                  {recentRoundSummary.userResults.map(result => (
                    <div key={result.matchId} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">
                        {result.homeTeamName} {result.homeScore} x {result.awayScore} {result.awayTeamName}
                      </p>
                    </div>
                  ))}
                  {recentRoundSummary.userResults.length === 0 && (
                    <p className="text-sm text-slate-400">Seu time não jogou na última semana.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">A rodada ainda não foi concluída.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-700 p-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Notícias do Clube</h2>
                <p className="mt-1 text-sm text-slate-400">Caixa de mensagens no ritmo do FutBoss.</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
              {injuredPlayers.length} lesionado(s)
            </span>
          </div>
          <div className="space-y-3 p-6">
            {newsFeed.slice(0, 5).map(item => (
              <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.body}</p>
              </div>
            ))}
            {newsFeed.length === 0 && <p className="text-sm text-slate-400">Nenhuma notícia publicada ainda.</p>}
          </div>
        </div>
      </div>

      {gameMode === 'manager' && (
        <div className="rounded-2xl border border-rose-500/20 bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Encerrar carreira no clube</h2>
              <p className="mt-1 text-sm text-slate-400">
                Use esta opção quando quiser se aposentar do comando e voltar ao menu principal.
              </p>
            </div>
            <button
              onClick={() => setIsRetireModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-400 transition-colors hover:bg-rose-500/20"
            >
              <LogOut className="h-4 w-4" />
              Aposentar
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={isRetireModalOpen}
        title="Aposentar do cargo?"
        description="Você vai encerrar a carreira como técnico e voltar ao menu principal. Use esta opção só quando realmente quiser finalizar esse caminho."
        confirmLabel="Confirmar aposentadoria"
        onCancel={() => setIsRetireModalOpen(false)}
        onConfirm={() => {
          setIsRetireModalOpen(false);
          resetGame();
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  className = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'emerald' | 'yellow' | 'blue' | 'orange' | 'purple';
  className?: string;
}) {
  const toneClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
    orange: 'bg-orange-500/20 text-orange-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-6 ${className}`}>
      <div className={`rounded-xl p-3 ${toneClasses[tone]}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}
