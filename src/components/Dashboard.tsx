import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Calendar,
  DollarSign,
  LogOut,
  Newspaper,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PageHeader } from './ui/PageHeader';
import { ConfirmModal } from './ui/ConfirmModal';
import { ScreenTabs } from './ui/ScreenTabs';
import { TeamFlag } from './ui/TeamFlag';

type DashboardTab = 'overview' | 'squad' | 'season' | 'finance' | 'news';

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
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

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
  const topScorers = userTeam.players
    .filter(player => player.goals > 0)
    .sort((playerA, playerB) => playerB.goals - playerA.goals)
    .slice(0, 5);
  const urgentItems = useMemo(
    () => [
      ...(injuredPlayers.length > 0
        ? [
            {
              id: 'injuries',
              title: `${injuredPlayers.length} lesionado(s) no elenco`,
              body: 'Vale revisar o plantel antes da próxima rodada.',
              tone: 'amber' as const,
            },
          ]
        : []),
      ...(recentRoundSummary?.headlines.slice(0, 2).map((headline, index) => ({
        id: `headline-${index}`,
        title: 'Resumo da rodada',
        body: headline,
        tone: 'sky' as const,
      })) ?? []),
      ...(newsFeed.slice(0, 2).map(item => ({
        id: item.id,
        title: item.title,
        body: item.body,
        tone: 'emerald' as const,
      })) ?? []),
    ],
    [injuredPlayers.length, newsFeed, recentRoundSummary],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);

  const tabs = [
    { id: 'overview', label: 'Visao Geral', icon: <Activity className="h-4 w-4" /> },
    { id: 'squad', label: 'Elenco', icon: <Users className="h-4 w-4" />, badge: topScorers.length },
    { id: 'season', label: 'Temporada', icon: <Calendar className="h-4 w-4" /> },
    { id: 'finance', label: 'Financas', icon: <Wallet className="h-4 w-4" /> },
    { id: 'news', label: 'Noticias', icon: <Newspaper className="h-4 w-4" />, badge: Math.min(newsFeed.length, 9) },
  ] as const;

  const summaryCards = (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard icon={<Trophy className="h-6 w-6" />} tone="emerald" label="Pontos (Liga)" value={leagueStats.points} />
      <StatCard
        icon={<DollarSign className="h-6 w-6" />}
        tone="yellow"
        label="Financas"
        value={formatCurrency(userTeam.finances)}
      />
      <StatCard icon={<Users className="h-6 w-6" />} tone="blue" label="Forca Titular" value={startersOverall} />
      <StatCard icon={<Calendar className="h-6 w-6" />} tone="orange" label="Semana" value={currentWeek} />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central da Carreira"
        subtitle={gameMode === 'player' ? `Bem-vindo de volta, ${userPlayer?.name}.` : 'Tudo o que importa da sua carreira em um so lugar.'}
        icon={<Activity className="h-7 w-7" />}
      />

      <ScreenTabs items={tabs} activeTab={activeTab} onChange={tab => setActiveTab(tab as DashboardTab)} />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {gameMode === 'player' && userPlayer ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard icon={<Activity className="h-6 w-6" />} tone="blue" label="Seu Overall" value={userPlayer.overall} />
              <StatCard icon={<Trophy className="h-6 w-6" />} tone="emerald" label="Gols" value={userPlayer.goals} />
              <StatCard icon={<Users className="h-6 w-6" />} tone="yellow" label="Assistencias" value={userPlayer.assists} />
              <StatCard icon={<Calendar className="h-6 w-6" />} tone="purple" label="Partidas" value={userPlayer.matchesPlayed} />
            </div>
          ) : null}

          {summaryCards}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard
              title="Proximo Jogo"
              subtitle="Leitura imediata do compromisso mais importante da sua carreira."
              badge={nextMatch && relevantTeam ? 'Ao vivo na agenda' : undefined}
            >
              {nextMatch && relevantTeam ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 p-5">
                    <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      <span>{isRelevantTeamHome ? 'Casa' : 'Fora'}</span>
                      <span>Semana {currentWeek}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <div className="text-right">
                        <p className="flex items-center justify-end gap-2 text-lg font-black text-emerald-400">
                          <TeamFlag country={relevantTeam.country} teamName={relevantTeam.name} size="sm" />
                          <span>{relevantTeam.name}</span>
                        </p>
                        <p className="text-sm text-slate-400">Seu lado</p>
                      </div>
                      <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-black text-slate-300">
                        VS
                      </div>
                      <div>
                        <p className="flex items-center gap-2 text-lg font-black text-slate-100">
                          {nextOpponent ? (
                            <>
                              <TeamFlag country={nextOpponent.country} teamName={nextOpponent.name} size="sm" />
                              <span>{nextOpponent.name}</span>
                            </>
                          ) : (
                            <span>A definir</span>
                          )}
                        </p>
                        <p className="text-sm text-slate-400">Adversario</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Fim da temporada.</p>
              )}
            </SectionCard>

            <SectionCard title="Alertas Urgentes" subtitle="Tudo o que merece sua atencao sem descer a tela demais.">
              <div className="space-y-3">
                {urgentItems.length > 0 ? (
                  urgentItems.map(item => (
                    <UrgentItem key={item.id} title={item.title} body={item.body} tone={item.tone} />
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Nenhum alerta urgente agora. Seu clube esta em ordem.</p>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'squad' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Artilheiros do Time" subtitle="Os nomes mais decisivos do seu elenco.">
            <div className="space-y-3">
              {topScorers.length > 0 ? (
                topScorers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-100">{index + 1}. {player.name}</p>
                      <p className="text-xs text-slate-400">{player.position} • OVR {player.overall}</p>
                    </div>
                    <span className="text-lg font-black text-emerald-400">{player.goals}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Nenhum gol marcado ainda.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Situacao do Plantel" subtitle="Visao rapida de titulares, reservas e disponibilidade.">
            <div className="grid grid-cols-2 gap-4">
              <MiniMetric label="Titulares definidos" value={`${userTeam.players.filter(player => player.isStarter).length}/11`} />
              <MiniMetric label="Reservas" value={userTeam.players.filter(player => !player.isStarter).length} />
              <MiniMetric label="Lesionados" value={injuredPlayers.length} accent="amber" />
              <MiniMetric label="Forca media" value={startersOverall} accent="emerald" />
            </div>
            <div className="mt-4 space-y-3">
              {injuredPlayers.length > 0 ? (
                injuredPlayers.slice(0, 5).map(player => (
                  <div key={player.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="font-semibold text-slate-100">{player.name}</p>
                    <p className="text-sm text-slate-400">
                      {player.injury?.type} • {player.injury?.weeksRemaining} semana(s)
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Elenco principal sem lesionados no momento.</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'season' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Resumo da Rodada" subtitle="Leitura rapida do que acabou de acontecer.">
            <div className="space-y-4">
              {recentRoundSummary ? (
                <>
                  {recentRoundSummary.headlines.map(headline => (
                    <p key={headline} className="text-sm text-slate-300">{headline}</p>
                  ))}
                  <div className="space-y-3">
                    {recentRoundSummary.userResults.map(result => (
                      <div key={result.matchId} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                        <p className="font-semibold text-slate-100">
                          {result.homeTeamName} {result.homeScore} x {result.awayScore} {result.awayTeamName}
                        </p>
                      </div>
                    ))}
                    {recentRoundSummary.userResults.length === 0 && (
                      <p className="text-sm text-slate-400">Seu time nao jogou na ultima semana.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">A rodada ainda nao foi concluida.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Panorama da Temporada" subtitle="Indicadores que situam seu momento no campeonato.">
            <div className="grid grid-cols-2 gap-4">
              <MiniMetric label="Pontos" value={leagueStats.points} accent="emerald" />
              <MiniMetric label="Jogos" value={leagueStats.played} />
              <MiniMetric label="Vitorias" value={leagueStats.wins} />
              <MiniMetric label="Saldo" value={leagueStats.goalsFor - leagueStats.goalsAgainst} />
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Resumo Financeiro" subtitle="Leitura limpa do caixa atual sem entrar nas telas longas.">
            <div className="grid grid-cols-2 gap-4">
              <MiniMetric label="Saldo" value={formatCurrency(userTeam.finances)} accent="emerald" />
              <MiniMetric label="Semana atual" value={currentWeek} />
              <MiniMetric label="Pontos da liga" value={leagueStats.points} />
              <MiniMetric label="Forca titular" value={startersOverall} />
            </div>
          </SectionCard>

          <SectionCard title="Sinal Financeiro" subtitle="Use a aba Financas do menu lateral para aprofundar receitas, estadio e mercado.">
            <p className="text-sm leading-6 text-slate-400">
              Esta visao foi mantida enxuta para o celular. Os detalhes de patrocinios, receitas comerciais, estadio e custos continuam intactos nas telas proprias do jogo.
            </p>
          </SectionCard>
        </div>
      )}

      {activeTab === 'news' && (
        <SectionCard title="Noticias do Clube" subtitle="Caixa de mensagens no ritmo do FutBoss.">
          <div className="space-y-3">
            {newsFeed.slice(0, 8).map(item => (
              <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.body}</p>
              </div>
            ))}
            {newsFeed.length === 0 && <p className="text-sm text-slate-400">Nenhuma noticia publicada ainda.</p>}
          </div>
        </SectionCard>
      )}

      {gameMode === 'manager' && (
        <div className="rounded-2xl border border-rose-500/20 bg-slate-800 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Encerrar carreira no clube</h2>
              <p className="mt-1 text-sm text-slate-400">
                Use esta opcao quando quiser se aposentar do comando e voltar ao menu principal.
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
        description="Voce vai encerrar a carreira como tecnico e voltar ao menu principal. Use esta opcao so quando realmente quiser finalizar esse caminho."
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

function SectionCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
      <div className="flex flex-col gap-3 border-b border-slate-700 bg-slate-900/50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {badge ? (
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-bold text-slate-300">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function UrgentItem({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: 'amber' | 'emerald' | 'sky';
}) {
  const toneClasses = {
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    sky: 'border-sky-500/20 bg-sky-500/5 text-sky-300',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClasses[tone]}`}>
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4" />
        <p className="font-bold">{title}</p>
      </div>
      <p className="text-sm text-slate-300">{body}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  accent = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'slate' | 'emerald' | 'amber';
}) {
  const accentClass =
    accent === 'emerald' ? 'text-emerald-400' : accent === 'amber' ? 'text-amber-400' : 'text-slate-100';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${accentClass}`}>{value}</p>
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
    <div className={`flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-5 ${className}`}>
      <div className={`rounded-xl p-3 ${toneClasses[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="truncate text-xl font-black text-slate-100">{value}</p>
      </div>
    </div>
  );
}
