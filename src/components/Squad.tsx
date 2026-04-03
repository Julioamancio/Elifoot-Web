import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  FileSignature,
  FilterX,
  Search,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getPlayerContractStatus, getPlayerRetirementRisk } from '../game/playerLifecycle';
import { cn } from '../lib/utils';
import { Position } from '../types/game';

export function Squad() {
  const {
    teams,
    userTeamId,
    toggleStarter,
    gameMode,
    currentYear = 2026,
    renewPlayerContract,
    releasePlayer,
    promoteAcademyPlayer,
  } = useGameStore();
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'stats'>('roster');

  const userTeam = teams.find(team => team.id === userTeamId);
  if (!userTeam) return null;

  const startersCount = userTeam.players.filter(player => player.isStarter).length;
  const academyPlayers = [...(userTeam.academyPlayers ?? [])].sort(
    (playerA, playerB) => (playerB.potential ?? playerB.overall) - (playerA.potential ?? playerA.overall),
  );

  const getPositionBadge = (position: string) => {
    switch (position) {
      case 'GK':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DEF':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'MID':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ATK':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const filteredPlayers = userTeam.players.filter(player => {
    const matchesPosition = positionFilter ? player.position === positionFilter : true;
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  const sortedPlayers = [...filteredPlayers].sort((playerA, playerB) => {
    const posOrder = { GK: 1, DEF: 2, MID: 3, ATK: 4 };
    if (posOrder[playerA.position] !== posOrder[playerB.position]) {
      return posOrder[playerA.position] - posOrder[playerB.position];
    }
    return playerB.overall - playerA.overall;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Plantel</h1>
          <p className="text-slate-400 mt-1">Gerencie contratos, base, idade e o elenco principal.</p>
        </div>
        <div
          className={cn(
            'px-4 py-2 rounded-lg border font-medium text-sm flex items-center gap-2',
            startersCount === 11
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          )}
        >
          <span>Titulares Selecionados:</span>
          <span className="text-lg font-bold">{startersCount}/11</span>
        </div>
      </header>

      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('roster')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'roster'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700',
          )}
        >
          <Users className="w-4 h-4" />
          Elenco
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'stats'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700',
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Estatisticas
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-400 mr-2">Posicao:</span>
          {(['GK', 'DEF', 'MID', 'ATK'] as Position[]).map(position => {
            const isActive = positionFilter === position;
            return (
              <button
                key={position}
                onClick={() => setPositionFilter(isActive ? null : position)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-bold border transition-all shadow-sm',
                  isActive
                    ? 'bg-emerald-500 text-emerald-950 border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white',
                )}
              >
                {position}
              </button>
            );
          })}

          <button
            onClick={() => setPositionFilter(null)}
            disabled={!positionFilter}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold border transition-all shadow-sm',
              positionFilter
                ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                : 'bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed',
            )}
          >
            <FilterX className="w-4 h-4" /> Limpar
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'roster' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium w-16">Titular</th>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Pos</th>
                  <th className="px-6 py-4 font-medium text-center">Idade</th>
                  <th className="px-6 py-4 font-medium text-center">Overall</th>
                  <th className="px-6 py-4 font-medium text-center">Energia</th>
                  <th className="px-6 py-4 font-medium text-center">Contrato</th>
                  <th className="px-6 py-4 font-medium text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedPlayers.map(player => {
                  const retirementRisk = getPlayerRetirementRisk(player);
                  return (
                    <React.Fragment key={player.id}>
                      <tr
                        className={cn(
                          'hover:bg-slate-700/30 transition-colors cursor-pointer',
                          player.isStarter ? 'bg-slate-700/10' : '',
                          expandedPlayerId === player.id ? 'bg-slate-700/40' : '',
                        )}
                        onClick={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
                      >
                        <td className="px-6 py-3">
                          <button
                            className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={gameMode === 'player'}
                            onClick={event => {
                              event.stopPropagation();
                              if (gameMode !== 'player') toggleStarter(player.id);
                            }}
                          >
                            {player.isStarter ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-200">
                          <div className="flex flex-col gap-1">
                            <span>{player.name}</span>
                            <div className="flex flex-wrap gap-1">
                              {player.injury && player.injury.weeksRemaining > 0 && (
                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                  Lesionado {player.injury.weeksRemaining}s
                                </span>
                              )}
                              {player.contract?.requestedSalaryIncrease && (
                                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                                  Pede aumento
                                </span>
                              )}
                              {player.contract?.requestedTransfer && (
                                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                                  Quer sair
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn('px-2 py-1 rounded text-xs font-bold border', getPositionBadge(player.position))}>
                            {player.position}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center text-slate-400">{player.age}</td>
                        <td className="px-6 py-3 text-center font-mono font-bold text-slate-200">{player.overall}</td>
                        <td className="px-6 py-3 text-center text-slate-300">{player.energy}%</td>
                        <td className="px-6 py-3 text-center text-slate-400">{getPlayerContractStatus(player, currentYear)}</td>
                        <td className="px-6 py-3 text-center text-slate-500">
                          {expandedPlayerId === player.id ? (
                            <ChevronUp className="w-5 h-5 mx-auto" />
                          ) : (
                            <ChevronDown className="w-5 h-5 mx-auto" />
                          )}
                        </td>
                      </tr>
                      {expandedPlayerId === player.id && (
                        <tr className="bg-slate-900/40 border-b border-slate-700/50">
                          <td colSpan={8} className="px-6 py-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
                              <InfoCard label="Jogos" value={player.matchesPlayed} />
                              <InfoCard label="Gols" value={player.goals} tone="emerald" />
                              <InfoCard label="Assistencias" value={player.assists} tone="blue" />
                              <InfoCard label="Valor" value={formatCurrency(player.value)} />
                              <InfoCard label="Salario" value={`${formatCurrency(player.salary)}/mes`} />
                              <InfoCard label="Contrato" value={`${player.contract?.endYear ?? currentYear}`} icon={<FileSignature className="w-4 h-4 text-emerald-400" />} />
                              <InfoCard label="Risco" value={retirementRisk.label} icon={<ShieldAlert className="w-4 h-4 text-rose-400" />} />
                              <InfoCard label="Potencial" value={player.potential ?? player.overall} icon={<TrendingUp className="w-4 h-4 text-sky-400" />} />
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                              <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Contrato</p>
                                <div className="space-y-2 text-sm text-slate-300">
                                  <p>Inicio: {player.contract?.startYear ?? currentYear}</p>
                                  <p>Fim: {player.contract?.endYear ?? currentYear}</p>
                                  <p>Role: {player.contract?.role ?? 'STARTER'}</p>
                                  <p>Renovacao: {player.contract?.renewalPreference ?? 'NEUTRAL'}</p>
                                  <p>Clausula: {formatCurrency(player.contract?.releaseClause ?? player.value)}</p>
                                  <p>Status salarial: {player.contract?.requestedSalaryIncrease ? 'pede reajuste' : 'estavel'}</p>
                                  <p>Status de mercado: {player.contract?.requestedTransfer ? 'aberto a saida' : 'sem pedido'}</p>
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">Metas</p>
                                <div className="space-y-2 text-sm text-slate-300">
                                  {(player.contract?.performanceGoals ?? []).map(goal => (
                                    <p key={`${goal.metric}-${goal.target}`}>{goal.description}</p>
                                  ))}
                                  {player.injury && player.injury.weeksRemaining > 0 && (
                                    <p className="font-medium text-amber-400">
                                      Lesao atual: {player.injury.type} · {player.injury.weeksRemaining} semana(s)
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {gameMode !== 'player' && (
                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  onClick={event => {
                                    event.stopPropagation();
                                    renewPlayerContract(player.id);
                                  }}
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
                                >
                                  Renovar
                                </button>
                                <button
                                  onClick={event => {
                                    event.stopPropagation();
                                    releasePlayer(player.id);
                                  }}
                                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500 transition-colors"
                                >
                                  Liberar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Pos</th>
                  <th className="px-6 py-4 font-medium text-center">Jogos</th>
                  <th className="px-6 py-4 font-medium text-center">Gols</th>
                  <th className="px-6 py-4 font-medium text-center">Assist.</th>
                  <th className="px-6 py-4 font-medium text-center">Media</th>
                  <th className="px-6 py-4 font-medium text-center">Clean</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedPlayers.map(player => (
                  <tr key={player.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-200">{player.name}</td>
                    <td className="px-6 py-3">
                      <span className={cn('px-2 py-1 rounded text-xs font-bold border', getPositionBadge(player.position))}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-slate-300">{player.matchesPlayed}</td>
                    <td className="px-6 py-3 text-center font-bold text-emerald-400">{player.goals}</td>
                    <td className="px-6 py-3 text-center font-bold text-blue-400">{player.assists}</td>
                    <td className="px-6 py-3 text-center text-slate-300">{player.averageRating?.toFixed(2) ?? '0.00'}</td>
                    <td className="px-6 py-3 text-center text-slate-300">{player.cleanSheets ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Academia / Base</h2>
            <p className="text-sm text-slate-400">Prospectos de 15 a 18 anos e regens gerados para manter a carreira viva.</p>
          </div>
          <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
            {academyPlayers.length} prospectos
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
          {academyPlayers.length > 0 ? (
            academyPlayers.map(player => (
              <div key={player.id} className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-100">{player.name}</p>
                    <p className="text-sm text-slate-400">
                      {player.position} · {player.age} anos · potencial {player.potential ?? player.overall}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-400">Base</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-center">
                    <p className="text-slate-500">Overall</p>
                    <p className="font-bold text-slate-100">{player.overall}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-center">
                    <p className="text-slate-500">Contrato</p>
                    <p className="font-bold text-slate-100">{player.contract?.endYear ?? currentYear}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-center">
                    <p className="text-slate-500">Valor</p>
                    <p className="font-bold text-slate-100">{formatCurrency(player.value)}</p>
                  </div>
                </div>
                {gameMode !== 'player' && (
                  <button
                    onClick={() => promoteAcademyPlayer(player.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Promover ao elenco
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">Nenhum prospecto disponivel no momento.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
  tone = 'slate',
  icon,
}: {
  label: string;
  value: string | number;
  tone?: 'slate' | 'emerald' | 'blue';
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-400' : tone === 'blue' ? 'text-blue-400' : 'text-slate-200';

  return (
    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center">
      <div className="mb-1 flex items-center justify-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-sm font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
