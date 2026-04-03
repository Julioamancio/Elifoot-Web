import React from 'react';
import { Medal, Star, Trophy } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PageHeader } from './ui/PageHeader';

const formatOrdinal = (position: number) => `${position}°`;

export function Ranking() {
  const teams = useGameStore(state => state.teams);
  const sortedTeams = [...teams].sort((teamA, teamB) => teamB.historicalPoints - teamA.historicalPoints);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking Histórico"
        subtitle="Classificação geral de todos os tempos."
        icon={<Trophy className="h-7 w-7" />}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="w-16 p-4 text-center font-medium text-slate-400">Pos</th>
                <th className="p-4 font-medium text-slate-400">Clube</th>
                <th className="p-4 text-center font-medium text-slate-400">País</th>
                <th className="p-4 text-center font-medium text-slate-400">Divisão</th>
                <th className="p-4 text-right font-medium text-slate-400">Pontos Históricos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {sortedTeams.map((team, index) => (
                <tr
                  key={team.id}
                  className={`transition-colors hover:bg-slate-700/30 ${team.isUserControlled ? 'bg-emerald-900/20' : ''}`}
                >
                  <td className="p-4 text-center">
                    {index === 0 ? (
                      <Medal className="mx-auto h-6 w-6 text-yellow-400" />
                    ) : index === 1 ? (
                      <Medal className="mx-auto h-6 w-6 text-slate-300" />
                    ) : index === 2 ? (
                      <Medal className="mx-auto h-6 w-6 text-amber-600" />
                    ) : (
                      <span className="font-bold text-slate-500">{formatOrdinal(index + 1)}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${team.isUserControlled ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {team.name}
                      </span>
                      {team.isUserControlled && <Star className="h-4 w-4 fill-emerald-400 text-emerald-400" />}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="rounded bg-slate-700 px-2 py-1 text-xs font-bold text-slate-300">{team.country}</span>
                  </td>
                  <td className="p-4 text-center text-slate-400">
                    {team.division > 0 ? `Série ${['A', 'B', 'C', 'D'][team.division - 1]}` : 'Seleção'}
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-lg font-bold text-yellow-400">
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
