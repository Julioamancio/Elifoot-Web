import React, { useState } from 'react';
import { CalendarDays, Newspaper, ShieldAlert, Trophy } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { Competition } from '../types/game';
import { PageHeader } from './ui/PageHeader';
import { ScreenTabs } from './ui/ScreenTabs';
import { TeamFlag } from './ui/TeamFlag';

const getCompetitionLabel = (competition: Competition) => {
  if (competition === 'LEAGUE') return 'Liga Nacional';
  if (competition === 'REGIONAL') return 'Regional';
  if (competition === 'NATIONAL_CUP') return 'Copa Nacional';
  if (competition === 'CONTINENTAL') return 'Continental';
  if (competition === 'CONTINENTAL_SECONDARY') return 'Continental Secundaria';
  if (competition === 'WORLD_CUP') return 'World Cup';
  return 'Olympics';
};

type CalendarTab = 'agenda' | 'rodada' | 'news' | 'season';

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
  const [activeTab, setActiveTab] = useState<CalendarTab>('agenda');

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

  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="h-4 w-4" />, badge: upcomingMatches.length },
    { id: 'rodada', label: 'Rodada', icon: <Trophy className="h-4 w-4" /> },
    { id: 'news', label: 'Noticias', icon: <Newspaper className="h-4 w-4" />, badge: Math.min(newsFeed.length, 9) },
    { id: 'season', label: 'Temporada', icon: <ShieldAlert className="h-4 w-4" />, badge: injuryAlerts.length },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda da Temporada"
        subtitle="Tudo separado por foco para caber melhor no celular e ficar mais rapido de consultar."
        icon={<CalendarDays className="h-7 w-7" />}
      />

      <ScreenTabs items={tabs} activeTab={activeTab} onChange={tab => setActiveTab(tab as CalendarTab)} />

      {activeTab === 'agenda' && (
        <SectionCard
          title="Proximos compromissos"
          subtitle={`Semana atual ${currentWeek} • temporada ${currentYear}`}
        >
          <div className="space-y-3">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map(match => {
                const home = teams.find(team => team.id === match.homeTeamId);
                const away = teams.find(team => team.id === match.awayTeamId);
                if (!home || !away) return null;
                const userOnAway = userEntityIds.has(match.awayTeamId);
                const leftTeam = userOnAway ? away : home;
                const rightTeam = userOnAway ? home : away;

                return (
                  <div key={match.id} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Semana {match.week} • {getCompetitionLabel(match.competition)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-lg font-black text-slate-100">
                      <span className="inline-flex items-center gap-2">
                        <TeamFlag country={leftTeam.country} teamName={leftTeam.name} size="sm" />
                        <span>{leftTeam.name}</span>
                      </span>
                      <span className="text-slate-500">vs</span>
                      <span className="inline-flex items-center gap-2">
                        <TeamFlag country={rightTeam.country} teamName={rightTeam.name} size="sm" />
                        <span>{rightTeam.name}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-400">Nenhum jogo futuro encontrado no momento.</p>
            )}
          </div>
        </SectionCard>
      )}

      {activeTab === 'rodada' && (
        <SectionCard
          title="Resumo da rodada"
          subtitle="Os ultimos resultados e manchetes do seu caminho na temporada."
        >
          <div className="space-y-4">
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
                    <p className="text-sm text-slate-400">Seu time nao entrou em campo na ultima semana.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Nenhum resumo disponivel ainda.</p>
            )}
          </div>
        </SectionCard>
      )}

      {activeTab === 'news' && (
        <SectionCard
          title="Caixa de Noticias"
          subtitle="Estilo FutBoss: curta, direta e focada no que importa."
        >
          <div className="space-y-3">
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
            {newsFeed.length === 0 && <p className="text-sm text-slate-400">Nenhuma noticia publicada ainda.</p>}
          </div>
        </SectionCard>
      )}

      {activeTab === 'season' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Departamento Medico"
            subtitle="Lesoes simples e desfalques atuais."
          >
            <div className="space-y-3">
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
          </SectionCard>

          <SectionCard
            title={seasonReview ? `Fim de temporada ${seasonReview.year}` : 'Revisao de temporada'}
            subtitle="Campeoes, acessos e quedas mais recentes."
          >
            {seasonReview ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Campeoes</p>
                  <div className="space-y-2">
                    {seasonReview.leagueChampions.slice(0, 5).map(champion => (
                      <div key={`${champion.country}-${champion.division}`} className="rounded-xl border border-slate-700 bg-slate-900/30 px-4 py-3">
                        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                          <TeamFlag country={champion.country} teamName={champion.teamName} size="xs" />
                          <span>{champion.teamName}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          {champion.country} • Divisao {champion.division}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatusList title="Promovidos" items={seasonReview.promoted} tone="emerald" />
                  <StatusList title="Rebaixados" items={seasonReview.relegated} tone="rose" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">A revisao da temporada aparece quando um ciclo termina.</p>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 bg-slate-900/50 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function StatusList({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ teamId: string; teamName: string; fromDivision: number; toDivision: number }>;
  tone: 'emerald' | 'rose';
}) {
  const cardClass =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/5'
      : 'border-rose-500/20 bg-rose-500/5';
  const titleClass = tone === 'emerald' ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div>
      <p className={`mb-2 text-xs font-bold uppercase tracking-[0.2em] ${titleClass}`}>{title}</p>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map(team => (
            <div key={`${team.teamId}-${title}`} className={`rounded-xl border px-4 py-3 ${cardClass}`}>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-100">
                <TeamFlag teamName={team.teamName} size="xs" />
                <span>{team.teamName}</span>
              </p>
              <p className="text-xs text-slate-400">
                Div {team.fromDivision} → Div {team.toDivision}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">Nenhum registro.</p>
        )}
      </div>
    </div>
  );
}
