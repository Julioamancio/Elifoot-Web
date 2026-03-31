import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { DollarSign, TrendingUp, UserPlus, UserMinus } from 'lucide-react';
import { cn } from '../lib/utils';

export function Market() {
  const { teams, userTeamId, marketPlayers, buyPlayer, sellPlayer } = useGameStore();
  const userTeam = teams.find(t => t.id === userTeamId);

  if (!userTeam) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Mercado de Transferências</h1>
          <p className="text-slate-400 mt-1">Compre e venda jogadores para fortalecer seu elenco.</p>
        </div>
        <div className="bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-emerald-500" />
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Saldo em Caixa</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(userTeam.finances)}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Market Players (Buy) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" /> Jogadores Disponíveis
          </h2>
          {marketPlayers.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-slate-400">O mercado está fechado no momento. Volte na próxima janela.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {marketPlayers.map(player => (
                <div key={player.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-200">{player.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className={cn(
                        "px-2 py-0.5 rounded font-bold text-[10px]",
                        player.position === 'GK' ? "bg-yellow-500/20 text-yellow-500" :
                        player.position === 'DEF' ? "bg-blue-500/20 text-blue-400" :
                        player.position === 'MID' ? "bg-emerald-500/20 text-emerald-400" :
                        "bg-red-500/20 text-red-400"
                      )}>
                        {player.position}
                      </span>
                      <span className="text-slate-400">Idade: {player.age}</span>
                      <span className="text-slate-400">Força: <span className="font-bold text-emerald-400">{player.overall}</span></span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-slate-300">{formatCurrency(player.value)}</span>
                    <button
                      onClick={() => buyPlayer(player.id)}
                      disabled={userTeam.finances < player.value}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors",
                        userTeam.finances >= player.value
                          ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600"
                      )}
                    >
                      <UserPlus className="w-4 h-4" /> Comprar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Players (Sell) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Seu Elenco
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {userTeam.players.map(player => (
              <div key={player.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-200">{player.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className={cn(
                      "px-2 py-0.5 rounded font-bold text-[10px]",
                      player.position === 'GK' ? "bg-yellow-500/20 text-yellow-500" :
                      player.position === 'DEF' ? "bg-blue-500/20 text-blue-400" :
                      player.position === 'MID' ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-red-500/20 text-red-400"
                    )}>
                      {player.position}
                    </span>
                    <span className="text-slate-400">Idade: {player.age}</span>
                    <span className="text-slate-400">Força: <span className="font-bold text-emerald-400">{player.overall}</span></span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-slate-300">{formatCurrency(player.value)}</span>
                  <button
                    onClick={() => sellPlayer(player.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" /> Vender
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
