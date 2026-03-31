import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Trophy, Star, Medal } from 'lucide-react';

export function Ranking() {
  const { teams } = useGameStore();

  // Sort teams by historical points descending
  const sortedTeams = [...teams].sort((a, b) => b.historicalPoints - a.historicalPoints);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
          <Trophy className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Ranking Histórico</h2>
          <p className="text-slate-400">Classificação geral de todos os tempos</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700">
                <th className="p-4 text-slate-400 font-medium text-center w-16">Pos</th>
                <th className="p-4 text-slate-400 font-medium">Clube</th>
                <th className="p-4 text-slate-400 font-medium text-center">País</th>
                <th className="p-4 text-slate-400 font-medium text-center">Divisão</th>
                <th className="p-4 text-slate-400 font-medium text-right">Pontos Históricos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {sortedTeams.map((team, index) => (
                <tr 
                  key={team.id} 
                  className={`hover:bg-slate-700/30 transition-colors ${team.isUserControlled ? 'bg-emerald-900/20' : ''}`}
                >
                  <td className="p-4 text-center">
                    {index === 0 ? (
                      <Medal className="w-6 h-6 text-yellow-400 mx-auto" />
                    ) : index === 1 ? (
                      <Medal className="w-6 h-6 text-slate-300 mx-auto" />
                    ) : index === 2 ? (
                      <Medal className="w-6 h-6 text-amber-600 mx-auto" />
                    ) : (
                      <span className="text-slate-500 font-bold">{index + 1}º</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${team.isUserControlled ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {team.name}
                      </span>
                      {team.isUserControlled && (
                        <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 bg-slate-700 rounded text-xs font-bold text-slate-300">
                      {team.country}
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-400">
                    Série {['A', 'B', 'C', 'D'][team.division - 1]}
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-yellow-400 text-lg">
                      {team.historicalPoints.toLocaleString('pt-BR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
