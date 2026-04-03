import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  FileSignature,
  ShieldAlert,
  TrendingUp,
  Trophy,
  User,
  XCircle,
  Zap,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getPlayerContractStatus, getPlayerRetirementRisk } from '../game/playerLifecycle';
import { PageHeader } from './ui/PageHeader';

export function PlayerDashboard() {
  const teams = useGameStore(state => state.teams);
  const userPlayerId = useGameStore(state => state.userPlayerId);
  const trainPlayer = useGameStore(state => state.trainPlayer);
  const renewPlayerContract = useGameStore(state => state.renewPlayerContract);
  const requestPlayerTransfer = useGameStore(state => state.requestPlayerTransfer);
  const retireUserPlayer = useGameStore(state => state.retireUserPlayer);
  const currentYear = useGameStore(state => state.currentYear ?? 2026);
  const [trainResult, setTrainResult] = useState<{ success: boolean; improved: boolean; message: string } | null>(null);

  const userClub = teams.find(team => team.division > 0 && team.players.some(player => player.id === userPlayerId));
  const userNationalTeam = teams.find(team => team.division === 0 && team.players.some(player => player.id === userPlayerId));
  const player = userClub?.players.find(currentPlayer => currentPlayer.id === userPlayerId);

  if (!player || !userClub) return null;

  const retirementRisk = getPlayerRetirementRisk(player);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  const handleTrain = () => {
    const result = trainPlayer();
    if (result) {
      setTrainResult(result);
      setTimeout(() => setTrainResult(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu Jogador"
        subtitle={`${player.name} • ${userClub.name}${userNationalTeam ? ` • ${userNationalTeam.name}` : ''}`}
        icon={<User className="h-7 w-7" />}
      />

      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        <span>Idade: {player.age}</span>
        <span>Nacionalidade: {player.nationality}</span>
        <span>Posição: {player.position}</span>
        <span>Contrato: {player.contract?.endYear ?? currentYear}</span>
        <span>Risco de aposentadoria: {retirementRisk.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Activity className="h-6 w-6" />} tone="emerald" label="Overall" value={player.overall} />
        <Metric icon={<Zap className="h-6 w-6" />} tone="yellow" label="Energia" value={`${player.energy}%`} />
        <Metric icon={<TrendingUp className="h-6 w-6" />} tone="blue" label="Valor de Mercado" value={formatCurrency(player.value)} />
        <Metric icon={<FileSignature className="h-6 w-6" />} tone="purple" label="Contrato" value={getPlayerContractStatus(player, currentYear)} />
        <Metric icon={<ShieldAlert className="h-6 w-6" />} tone="rose" label="Aposentadoria" value={retirementRisk.label} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-200">Contrato atual</h3>
          <div className="grid grid-cols-2 gap-4">
            <MiniCard label="Início" value={player.contract?.startYear ?? currentYear} />
            <MiniCard label="Fim" value={player.contract?.endYear ?? currentYear} />
            <MiniCard label="Salário" value={formatCurrency(player.contract?.salary ?? player.salary)} accent />
            <MiniCard label="Cláusula" value={formatCurrency(player.contract?.releaseClause ?? player.value)} />
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>Bônus anual: {formatCurrency(player.contract?.bonus ?? 0)}</p>
            <p>Preferência de renovação: {player.contract?.renewalPreference ?? 'NEUTRAL'}</p>
            <p>Papel no elenco: {player.contract?.role ?? 'STARTER'}</p>
          </div>
          <div className="mt-4 space-y-2">
            {(player.contract?.performanceGoals ?? []).map(goal => (
              <div
                key={`${goal.metric}-${goal.target}`}
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300"
              >
                {goal.description}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-200">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Estatísticas da carreira
          </h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat label="Partidas" value={player.careerMatches || 0} />
            <Stat label="Gols" value={player.careerGoals || 0} />
            <Stat label="Assistências" value={player.careerAssists || 0} />
            <Stat label="Clean sheets" value={player.cleanSheets || 0} />
            <Stat label="Títulos" value={player.titlesWon || 0} />
            <Stat label="Potencial" value={player.potential || player.overall} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
          <Zap className="h-8 w-8 text-yellow-400" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-slate-200">Decisões de carreira</h3>
        <p className="mx-auto mb-6 max-w-2xl text-slate-400">
          Cuide do seu contrato, busque um novo clube e acompanhe o risco de aposentadoria conforme a idade avançar.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleTrain}
            disabled={player.energy < 20}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Treinar (-20 energia)
          </button>
          <button
            onClick={() => renewPlayerContract(player.id)}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition-colors hover:bg-emerald-500"
          >
            Renovar contrato
          </button>
          <button
            onClick={() => requestPlayerTransfer()}
            className="rounded-xl bg-slate-700 px-5 py-3 font-bold text-white transition-colors hover:bg-slate-600"
          >
            Pedir transferência
          </button>
          {player.age >= 35 && (
            <button
              onClick={() => retireUserPlayer()}
              className="rounded-xl bg-rose-600 px-5 py-3 font-bold text-white transition-colors hover:bg-rose-500"
            >
              Aposentar agora
            </button>
          )}
        </div>

        {trainResult && (
          <div
            className={`mx-auto mt-6 flex max-w-md items-center gap-3 rounded-xl border p-4 text-left ${
              trainResult.improved
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : trainResult.success
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {trainResult.improved ? (
              <TrendingUp className="h-6 w-6 shrink-0" />
            ) : trainResult.success ? (
              <CheckCircle2 className="h-6 w-6 shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 shrink-0" />
            )}
            <p className="font-medium">{trainResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'emerald' | 'yellow' | 'blue' | 'purple' | 'rose';
}) {
  const toneClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    rose: 'bg-rose-500/20 text-rose-400',
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-6">
      <div className={`rounded-xl p-3 ${toneClasses[tone]}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function MiniCard({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${accent ? 'text-emerald-400' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
      <p className="mb-1 text-sm font-medium text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}
