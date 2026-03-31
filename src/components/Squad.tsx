import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { cn } from '../lib/utils';
import { CheckCircle2, Circle, FilterX, ChevronDown, ChevronUp, Users, BarChart3, Search } from 'lucide-react';
import { Position } from '../types/game';

export function Squad() {
  const { teams, userTeamId, toggleStarter, gameMode } = useGameStore();
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'stats'>('roster');
  
  const userTeam = teams.find(t => t.id === userTeamId);

  if (!userTeam) return null;

  const startersCount = userTeam.players.filter(p => p.isStarter).length;

  const getPositionBadge = (pos: string) => {
    switch (pos) {
      case 'GK': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DEF': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'MID': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ATK': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPositionActive = (pos: string) => {
    switch (pos) {
      case 'GK': return 'bg-yellow-500 text-yellow-950 border-yellow-500';
      case 'DEF': return 'bg-blue-500 text-blue-950 border-blue-500';
      case 'MID': return 'bg-emerald-500 text-emerald-950 border-emerald-500';
      case 'ATK': return 'bg-red-500 text-red-950 border-red-500';
      default: return 'bg-slate-500 text-slate-950 border-slate-500';
    }
  };

  // Sort players by position then overall
  const filteredPlayers = userTeam.players.filter(p => {
    const matchesPosition = positionFilter ? p.position === positionFilter : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });
  
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const posOrder = { 'GK': 1, 'DEF': 2, 'MID': 3, 'ATK': 4 };
    if (posOrder[a.position] !== posOrder[b.position]) {
      return posOrder[a.position] - posOrder[b.position];
    }
    return b.overall - a.overall;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Plantel</h1>
          <p className="text-slate-400 mt-1">Gerencie seus jogadores e escale o time titular.</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-lg border font-medium text-sm flex items-center gap-2",
          startersCount === 11 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-orange-500/10 border-orange-500/30 text-orange-400"
        )}>
          <span>Titulares Selecionados:</span>
          <span className="text-lg font-bold">{startersCount}/11</span>
        </div>
      </header>

      {/* TABS */}
      <div className="flex space-x-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('roster')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'roster' 
              ? "border-emerald-500 text-emerald-400" 
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <Users className="w-4 h-4" />
          Elenco
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'stats' 
              ? "border-emerald-500 text-emerald-400" 
              : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Estatísticas
        </button>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
          />
        </div>

        <div className="w-full sm:w-px h-px sm:h-6 bg-slate-700 mx-1 hidden sm:block"></div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-400 mr-2">Posição:</span>
          {(['GK', 'DEF', 'MID', 'ATK'] as Position[]).map(pos => {
            const isActive = positionFilter === pos;
            return (
              <button
                key={pos}
                onClick={() => setPositionFilter(isActive ? null : pos)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-bold border transition-all shadow-sm",
                  isActive 
                    ? getPositionActive(pos) 
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                )}
              >
                {pos}
              </button>
            );
          })}
          
          <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>

          <button
            onClick={() => setPositionFilter(null)}
            disabled={!positionFilter}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold border transition-all shadow-sm",
              positionFilter
                ? "bg-red-500 text-white border-red-600 hover:bg-red-600"
                : "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
            )}
          >
            <FilterX className="w-4 h-4" /> Limpar Filtro
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
                  <th className="px-6 py-4 font-medium text-center">Força</th>
                  <th className="px-6 py-4 font-medium text-center">Energia</th>
                  <th className="px-6 py-4 font-medium text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedPlayers.map(player => (
                  <React.Fragment key={player.id}>
                    <tr 
                      className={cn(
                        "hover:bg-slate-700/30 transition-colors cursor-pointer",
                        player.isStarter ? "bg-slate-700/10" : "",
                        expandedPlayerId === player.id ? "bg-slate-700/40" : ""
                      )}
                      onClick={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
                    >
                      <td className="px-6 py-3">
                      <button 
                        className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={gameMode === 'player'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (gameMode !== 'player') {
                            toggleStarter(player.id);
                          }
                        }}
                      >
                        {player.isStarter ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-200">{player.name}</td>
                    <td className="px-6 py-3">
                      <span className={cn("px-2 py-1 rounded text-xs font-bold border", getPositionBadge(player.position))}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-slate-400">{player.age}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="font-mono font-bold text-slate-200">{player.overall}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="w-full bg-slate-900 rounded-full h-2.5 border border-slate-700 overflow-hidden">
                        <div 
                          className={cn(
                            "h-2.5 rounded-full",
                            player.energy > 70 ? "bg-emerald-500" : player.energy > 40 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${player.energy}%` }}
                        ></div>
                      </div>
                    </td>
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
                      <td colSpan={7} className="px-6 py-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Jogos</div>
                            <div className="text-xl font-bold text-slate-200">{player.matchesPlayed}</div>
                          </div>
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Gols</div>
                            <div className="text-xl font-bold text-emerald-400">{player.goals}</div>
                          </div>
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Assistências</div>
                            <div className="text-xl font-bold text-blue-400">{player.assists}</div>
                          </div>
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">C. Amarelos</div>
                            <div className="text-xl font-bold text-yellow-500">{player.yellowCards}</div>
                          </div>
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">C. Vermelhos</div>
                            <div className="text-xl font-bold text-red-500">{player.redCards}</div>
                          </div>
                          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-center lg:col-span-2">
                            <div className="text-slate-400 text-[10px] uppercase font-bold mb-1 tracking-wider">Finanças</div>
                            <div className="text-sm font-bold text-slate-300">
                              Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(player.value)}
                            </div>
                            <div className="text-sm font-bold text-slate-400">
                              Salário: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(player.salary)}/mês
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
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
                  <th className="px-6 py-4 font-medium text-center">Assistências</th>
                  <th className="px-6 py-4 font-medium text-center">C.A.</th>
                  <th className="px-6 py-4 font-medium text-center">C.V.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedPlayers.map(player => (
                  <tr key={player.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-200">{player.name}</td>
                    <td className="px-6 py-3">
                      <span className={cn("px-2 py-1 rounded text-xs font-bold border", getPositionBadge(player.position))}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-slate-300">{player.matchesPlayed}</td>
                    <td className="px-6 py-3 text-center font-bold text-emerald-400">{player.goals}</td>
                    <td className="px-6 py-3 text-center font-bold text-blue-400">{player.assists}</td>
                    <td className="px-6 py-3 text-center font-bold text-yellow-500">{player.yellowCards}</td>
                    <td className="px-6 py-3 text-center font-bold text-red-500">{player.redCards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
