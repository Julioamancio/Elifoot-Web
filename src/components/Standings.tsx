import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { cn } from '../lib/utils';
import { Trophy, Map, Globe } from 'lucide-react';
import { Competition } from '../types/game';

export function Standings() {
  const { teams, userTeamId } = useGameStore();
  const userTeam = teams.find(t => t.id === userTeamId);
  const [activeComp, setActiveComp] = useState<Competition>('LEAGUE');

  if (!userTeam) return null;

  // Filter teams based on active competition
  let displayTeams = [];
  let compTitle = '';

  if (activeComp === 'LEAGUE') {
    displayTeams = teams.filter(t => t.continent === userTeam.continent && t.division === userTeam.division);
    compTitle = `Campeonato Nacional - Divisão ${userTeam.division}`;
  } else if (activeComp === 'REGIONAL') {
    const key = userTeam.continent === 'SA' ? userTeam.state : userTeam.country;
    displayTeams = teams.filter(t => (t.continent === 'SA' ? t.state : t.country) === key);
    compTitle = userTeam.continent === 'SA' ? `Campeonato Estadual (${userTeam.state})` : `Copa Regional (${userTeam.country})`;
  } else if (activeComp === 'NATIONAL_CUP') {
    displayTeams = teams.filter(t => t.country === userTeam.country);
    compTitle = userTeam.continent === 'SA' ? 'Copa do Brasil' : `Copa Nacional (${userTeam.country})`;
  } else if (activeComp === 'CONTINENTAL') {
    displayTeams = teams.filter(t => t.continent === userTeam.continent && (t.stats.CONTINENTAL.played > 0 || t.division === 1));
    compTitle = userTeam.continent === 'SA' ? 'Copa Libertadores' : 'Champions League';
  } else if (activeComp === 'CONTINENTAL_SECONDARY') {
    displayTeams = teams.filter(t => t.continent === userTeam.continent && (t.stats.CONTINENTAL_SECONDARY.played > 0 || t.division === 2));
    compTitle = userTeam.continent === 'SA' ? 'Copa Sul-Americana' : 'Europa League';
  }

  const sortedTeams = [...displayTeams].sort((a, b) => {
    const statsA = a.stats[activeComp];
    const statsB = b.stats[activeComp];
    if (statsB.points !== statsA.points) return statsB.points - statsA.points;
    const gdA = statsA.goalsFor - statsA.goalsAgainst;
    const gdB = statsB.goalsFor - statsB.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return statsB.goalsFor - statsA.goalsFor;
  });

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Classificação</h1>
        <p className="text-slate-400 mt-1">Acompanhe o desempenho do seu time nas competições.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveComp('LEAGUE')}
          className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeComp === 'LEAGUE' ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200")}
        >
          <Trophy className="w-4 h-4" /> Liga Nacional
        </button>
        <button
          onClick={() => setActiveComp('REGIONAL')}
          className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeComp === 'REGIONAL' ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200")}
        >
          <Map className="w-4 h-4" /> Regional
        </button>
        <button
          onClick={() => setActiveComp('NATIONAL_CUP')}
          className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeComp === 'NATIONAL_CUP' ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200")}
        >
          <Trophy className="w-4 h-4" /> Copa Nacional
        </button>
        <button
          onClick={() => setActiveComp('CONTINENTAL')}
          className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeComp === 'CONTINENTAL' ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200")}
        >
          <Globe className="w-4 h-4" /> Continental
        </button>
        <button
          onClick={() => setActiveComp('CONTINENTAL_SECONDARY')}
          className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeComp === 'CONTINENTAL_SECONDARY' ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200")}
        >
          <Globe className="w-4 h-4" /> Sul-Americana/Europa
        </button>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-900/50 border-b border-slate-700">
          <h2 className="font-bold text-slate-200">{compTitle}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-medium w-16 text-center">Pos</th>
                <th className="px-6 py-4 font-medium">Clube</th>
                <th className="px-4 py-4 font-medium text-center">P</th>
                <th className="px-4 py-4 font-medium text-center">J</th>
                <th className="px-4 py-4 font-medium text-center">V</th>
                <th className="px-4 py-4 font-medium text-center">E</th>
                <th className="px-4 py-4 font-medium text-center">D</th>
                <th className="px-4 py-4 font-medium text-center">GP</th>
                <th className="px-4 py-4 font-medium text-center">GC</th>
                <th className="px-4 py-4 font-medium text-center">SG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {sortedTeams.map((team, index) => {
                const stats = team.stats[activeComp];
                return (
                  <tr 
                    key={team.id} 
                    className={cn(
                      "transition-colors",
                      team.id === userTeamId ? "bg-emerald-900/20" : "hover:bg-slate-700/30"
                    )}
                  >
                    <td className="px-6 py-3 text-center font-bold text-slate-500">{index + 1}º</td>
                    <td className="px-6 py-3 font-medium text-slate-200 flex items-center gap-2">
                      {team.name}
                      {team.id === userTeamId && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">VOCÊ</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-400">{stats.points}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{stats.played}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{stats.wins}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{stats.draws}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{stats.losses}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{stats.goalsFor}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{stats.goalsAgainst}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-300">{stats.goalsFor - stats.goalsAgainst}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
