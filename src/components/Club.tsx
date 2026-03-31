import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Building2, Plus, Store, UtensilsCrossed, AlertCircle } from 'lucide-react';

export function Club() {
  const { teams, userTeamId, upgradeStadium } = useGameStore();
  const userTeam = teams.find(t => t.id === userTeamId);

  if (!userTeam) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-emerald-400" />
          Clube e Estádio
        </h2>
        <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
          <span className="text-slate-400 text-sm mr-2">Saldo:</span>
          <span className="text-emerald-400 font-bold">{formatCurrency(userTeam.finances)}</span>
        </div>
      </div>

      {!userTeam.stadium ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-200 mb-2">Sem Estádio Próprio</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Seu clube atualmente aluga um estádio para jogar. Construa seu próprio estádio para gerar renda com bilheteria, alimentação e produtos oficiais.
          </p>
          <button
            onClick={() => upgradeStadium('build')}
            disabled={userTeam.finances < 5000000}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Construir Estádio ({formatCurrency(5000000)})
          </button>
          {userTeam.finances < 5000000 && (
            <p className="text-red-400 text-sm mt-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" /> Fundos insuficientes
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stadium Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -z-10"></div>
              <h3 className="text-xl font-bold text-slate-100 mb-1">{userTeam.stadium.name}</h3>
              <p className="text-slate-400 text-sm mb-6">Estádio Oficial</p>
              
              <div className="space-y-4">
                <div>
                  <div className="text-slate-400 text-xs uppercase font-bold mb-1">Capacidade</div>
                  <div className="text-2xl font-bold text-slate-200">{userTeam.stadium.capacity.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-500">lugares</span></div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase font-bold mb-1">Preço do Ingresso</div>
                  <div className="text-xl font-bold text-emerald-400">{formatCurrency(userTeam.stadium.ticketPrice)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrades */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Capacity Upgrade */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Expandir Arquibancada</h4>
                  <p className="text-xs text-slate-400">+5.000 lugares</p>
                </div>
              </div>
              <div className="mt-auto pt-4">
                <button
                  onClick={() => upgradeStadium('capacity')}
                  disabled={userTeam.finances < 2000000}
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Expandir ({formatCurrency(2000000)})
                </button>
              </div>
            </div>

            {/* Food Upgrade */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Praça de Alimentação</h4>
                  <p className="text-xs text-slate-400">Nível {userTeam.stadium.foodLevel}/5</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">Aumenta a receita gerada por torcedor durante os jogos em casa.</p>
              <div className="mt-auto">
                <button
                  onClick={() => upgradeStadium('food')}
                  disabled={userTeam.finances < 1000000 || userTeam.stadium.foodLevel >= 5}
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {userTeam.stadium.foodLevel >= 5 ? 'Nível Máximo' : `Melhorar (${formatCurrency(1000000)})`}
                </button>
              </div>
            </div>

            {/* Merch Upgrade */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Loja Oficial</h4>
                  <p className="text-xs text-slate-400">Nível {userTeam.stadium.merchLevel}/5</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4">Venda camisas e produtos oficiais para aumentar drasticamente a renda.</p>
              <div className="mt-auto">
                <button
                  onClick={() => upgradeStadium('merch')}
                  disabled={userTeam.finances < 1500000 || userTeam.stadium.merchLevel >= 5}
                  className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {userTeam.stadium.merchLevel >= 5 ? 'Nível Máximo' : `Melhorar (${formatCurrency(1500000)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
