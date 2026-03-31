import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { User, Activity, Zap, TrendingUp, Trophy, CheckCircle2, XCircle } from 'lucide-react';

export function PlayerDashboard() {
  const { teams, userPlayerId, trainPlayer } = useGameStore();
  const [trainResult, setTrainResult] = useState<{ success: boolean, improved: boolean, message: string } | null>(null);
  
  const userTeam = teams.find(t => t.players.some(p => p.id === userPlayerId));
  const player = userTeam?.players.find(p => p.id === userPlayerId);

  if (!player || !userTeam) return null;

  const handleTrain = () => {
    const result = trainPlayer();
    if (result) {
      setTrainResult(result);
      setTimeout(() => setTrainResult(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Meu Jogador</h2>
          <p className="text-slate-400">{player.name} • {userTeam.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Força (Overall)</p>
            <p className="text-2xl font-bold text-slate-100">{player.overall}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Energia</p>
            <p className="text-2xl font-bold text-slate-100">{player.energy}%</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Gols na Temporada</p>
            <p className="text-2xl font-bold text-slate-100">{player.goals}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Valor de Mercado</p>
            <p className="text-xl font-bold text-slate-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(player.value)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center mt-8">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-200 mb-2">Treinamento Individual</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Gaste energia para treinar e tentar melhorar seus atributos. O treino consome 20% de energia.
        </p>
        <button
          onClick={handleTrain}
          disabled={player.energy < 20}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
        >
          <Zap className="w-5 h-5" />
          Treinar (-20 Energia)
        </button>

        {trainResult && (
          <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 max-w-md mx-auto text-left animate-in fade-in slide-in-from-bottom-4 ${
            trainResult.improved 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : trainResult.success 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {trainResult.improved ? (
              <TrendingUp className="w-6 h-6 shrink-0" />
            ) : trainResult.success ? (
              <CheckCircle2 className="w-6 h-6 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 shrink-0" />
            )}
            <p className="font-medium">{trainResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
