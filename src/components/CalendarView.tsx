import React from 'react';
import { CalendarDays, Newspaper, ShieldAlert, Trophy } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { Competition } from '../types/game';
import { PageHeader } from './ui/PageHeader';

const getCompetitionLabel = (competition: Competition) => {
  if (competition === 'LEAGUE') return 'Liga Nacional';
  if (competition === 'REGIONAL') return 'Regional';
  if (competition === 'NATIONAL_CUP') return 'Copa Nacional';
  if (competition === 'CONTINENTAL') return 'Continental';
  if (competition === 'CONTINENTAL_SECONDARY') return 'Continental Secundária';
  if (competition === 'WORLD_CUP') return 'World Cup';
  return 'Olympics';
};

export function CalendarView() {
  const teams = useGameStore(state => state.teams);
  const matches = useGameStore(state => state.matches);
  const userTeamId = useGameStore(state => state.userTeamId);
  const userPlayerId = useGameStore(state => state.userPlayerId);
  const currentWeek = useGameStore(state => state.currentWeek);
  const currentYear = useGameStore(state => state.currentYear ?? 2026);
  const gameMode = useGameStore(state => state.gameMode);
  const recentRoundSummary = useGameStore(state => state.recentRoundSummary);
  const newsFeed = useGameStore(state => state.newsFeed ?? []);
  const seasonReview = useGameStore(state => state.seasonReview);

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

  const userEntityIds = new Set([userTeamId, userNationalTeam?.id].filter((value): value is string => Boolean(value)));
  const upcomingMatches = matches
    .filter(match => !match.played && (userEntityIds.has(match.homeTeamId) || userEntityIds.has(match.awayTeamId)))
    .sort((matchA, matchB) => matchA.week - matchB.week)
    .slice(0, 10);

  const injuryAlerts = userTeam.players
    .filter(player => (player.injury?.weeksRemaining ?? 0) > 0)
    .sort((playerA, playerB) => (playerB.injury?.weeksRemaining ?? 0) - (playerA.injury?.weeksRemaining ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda e Notícias"
        subtitle="Calendário da temporada, resumo da rodada e a caixa de notícias do clube."
        icon={<CalendarDays className="h-7 w-7" />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 xl:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-900/50 px-6 py-4">
            <CalendarDays className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Próximos compromissos</h2>
              <p className="text-sm text-slate-400">Semana atual {currentWeek} • temporada {currentYear}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-700/50">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map(match => {
                const home = teams.find(team => team.id === match.homeTeamId);
                const away = teams.find(team => team.id === match.awayTeamId);
                if (!home || !away) return null;
                const userOnAway = userEntityIds.has(match.awayTeamId);
                const leftTeam = userOnAway ? away : home;
                const rightTeam = userOnAway ? home : away;

                return (
                  <div key={match.id} className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                        Semana {match.week} • {getCompetitionLabel(match.competition)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-100">
                        {leftTeam.name} <span className="text-slate-500">vs</span> {rightTeam.name}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                      Seu jogo
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-8 text-center text-slate-400">Nenhum jogo futuro encontrado no momento.</div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-900/50 px-6 py-4">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Departamento Médico</h2>
              <p className="text-sm text-slate-400">Lesões simples e desfalques atuais</p>
            </div>
          </div>
          <div className="space-y-3 p-6">
            {injuryAlerts.length > 0 ? (
              injuryAlerts.map(player => (
                <div key={player.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                  <p className="font-semibold text-slate-100">{player.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {player.injury?.type} • {player.injury?.weeksRemaining} semana(s) restantes
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Sem lesionados no elenco principal.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="border-b border-slate-700 bg-slate-900/50 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-100">Resumo da rodada</h2>
            <p className="text-sm text-slate-400">Os últimos resultados e manchetes do seu caminho na temporada.</p>
          </div>
          <div className="space-y-4 p-6">
            {recentRoundSummary ? (
              <>
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Semana {recentRoundSummary.week} • {recentRoundSummary.year}
                  </p>
                  <div className="mt-3 space-y-2">
                    {recentRoundSummary.headlines.map(headline => (
                      <p key={headline} className="text-sm text-slate-300">
                        {headline}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {recentRoundSummary.userResults.map(result => (
                    <div key={result.matchId} className="rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                        {getCompetitionLabel(result.competition)}
                      </p>
                      <p className="mt-1 font-semibold text-slate-100">
                        {result.homeTeamName} {result.homeScore} x {result.awayScore} {result.awayTeamName}
                      </p>
                    </div>
                  ))}
                  {recentRoundSummary.userResults.length === 0 && (
                    <p className="text-sm text-slate-400">Seu time não entrou em campo na última semana.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Nenhum resumo disponível ainda.</p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-900/50 px-6 py-4">
            <Newspaper className="h-5 w-5 text-sky-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Caixa de Notícias</h2>
              <p className="text-sm text-slate-400">Estilo Elifoot: curta, direta e focada no que importa.</p>
            </div>
          </div>
          <div className="space-y-3 p-6">
            {newsFeed.slice(0, 8).map(item => (
              <article key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-100">{item.title}</p>
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                    S{item.week}/{item.year}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </article>
            ))}
            {newsFeed.length === 0 && <p className="text-sm text-slate-400">Nenhuma notícia publicada ainda.</p>}
          </div>
        </section>
      </div>

      {seasonReview && (
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-900/50 px-6 py-4">
            <Trophy className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-100">Fim de temporada {seasonReview.year}</h2>
              <p className="text-sm text-slate-400">Campeões, acessos e quedas mais recentes.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Campeões</p>
              <div className="mt-3 space-y-2">
                {seasonReview.leagueChampions.slice(0, 8).map(champion => (
                  <div key={`${champion.country}-${champion.division}`} className="rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-100">{champion.teamName}</p>
                    <p className="text-xs text-slate-400">
                      {champion.country} • Divisão {champion.division}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Promovidos</p>
              <div className="mt-3 space-y-2">
                {seasonReview.promoted.map(team => (
                  <div key={`${team.teamId}-up`} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-100">{team.teamName}</p>
                    <p className="text-xs text-slate-400">
                      Div {team.fromDivision} → Div {team.toDivision}
                    </p>
                  </div>
                ))}
                {seasonReview.promoted.length === 0 && <p className="text-sm text-slate-400">Nenhum acesso registrado.</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Rebaixados</p>
              <div className="mt-3 space-y-2">
                {seasonReview.relegated.map(team => (
                  <div key={`${team.teamId}-down`} className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-100">{team.teamName}</p>
                    <p className="text-xs text-slate-400">
                      Div {team.fromDivision} → Div {team.toDivision}
                    </p>
                  </div>
                ))}
                {seasonReview.relegated.length === 0 && <p className="text-sm text-slate-400">Nenhuma queda registrada.</p>}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
