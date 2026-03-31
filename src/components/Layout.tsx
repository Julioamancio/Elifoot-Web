import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { Trophy, Users, Calendar, LayoutDashboard, DollarSign, Building2, Medal, User, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { AuthButton } from './AuthButton';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { teams, userTeamId, userPlayerId, gameMode, currentWeek } = useGameStore();
  const userTeam = teams.find(t => t.id === userTeamId);
  const userPlayer = userTeam?.players.find(p => p.id === userPlayerId);

  if (!userTeam) return <>{children}</>;

  const managerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'squad', label: 'Plantel', icon: Users },
    { id: 'market', label: 'Mercado', icon: DollarSign },
    { id: 'club', label: 'Clube/Estádio', icon: Building2 },
    { id: 'standings', label: 'Classificação', icon: Trophy },
    { id: 'match', label: 'Próximo Jogo', icon: Calendar },
    { id: 'ranking', label: 'Ranking', icon: Medal },
  ];

  const playerTabs = [
    { id: 'dashboard', label: 'Meu Jogador', icon: User },
    { id: 'squad', label: 'Elenco', icon: Users },
    { id: 'standings', label: 'Classificação', icon: Trophy },
    { id: 'match', label: 'Próximo Jogo', icon: Calendar },
    { id: 'ranking', label: 'Ranking', icon: Medal },
  ];

  const tabs = gameMode === 'player' ? playerTabs : managerTabs;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 tracking-tight">ELIFOOT WEB</h1>
          <div className="mt-4">
            {gameMode === 'player' && userPlayer ? (
              <>
                <h2 className="text-lg font-bold text-slate-200">{userPlayer.name}</h2>
                <p className="text-sm font-medium text-emerald-400">{userTeam.name}</p>
              </>
            ) : (
              <h2 className="text-lg font-bold text-slate-200">{userTeam.name}</h2>
            )}
            <p className="text-sm text-slate-400 mt-1">Semana {currentWeek}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          <AuthButton />
          <button 
            onClick={() => useGameStore.getState().resetGame()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Aposentar / Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-900">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
