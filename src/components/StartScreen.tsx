import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { generateTeams } from '../game/generator';
import { AuthButton } from './AuthButton';
import { GameMode } from '../types/game';
import { User, Briefcase, ChevronRight } from 'lucide-react';

interface StartScreenProps {
  onStart: (name: string, mode: GameMode, teamName?: string) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [teams] = useState(() => generateTeams());
  const [mode, setMode] = useState<GameMode | null>(null);
  const [playerName, setPlayerName] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8 text-center border-b border-slate-800 flex flex-col items-center">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 tracking-tighter mb-2">ELIFOOT WEB</h1>
          <p className="text-slate-400 mb-6">O clássico simulador de futebol, agora com mais opções.</p>
          <AuthButton />
        </div>
        
        <div className="p-8">
          {!mode ? (
            <>
              <h2 className="text-2xl font-bold text-slate-200 mb-8 text-center">Escolha seu Caminho</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setMode('manager')}
                  className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 p-8 rounded-2xl transition-all text-left flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">Carreira Manager</h3>
                  <p className="text-slate-400 text-sm">Assuma o controle de um clube. Gerencie finanças, estádio, táticas e o mercado de transferências.</p>
                </button>

                <button
                  onClick={() => setMode('player')}
                  className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 p-8 rounded-2xl transition-all text-left flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <User className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100 mb-2">Carreira Jogador</h3>
                  <p className="text-slate-400 text-sm">Crie seu jogador, comece na 4ª divisão e treine para se tornar uma lenda do futebol mundial.</p>
                </button>
              </div>
            </>
          ) : mode === 'manager' ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-200">Escolha seu clube para começar</h2>
                <button onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-200">Voltar</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => onStart('Manager', 'manager', team.name)}
                    className="p-3 bg-slate-800 hover:bg-emerald-700 hover:text-white text-slate-300 rounded-xl text-sm font-medium transition-all duration-200 border border-slate-700 hover:border-emerald-500"
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-200">Crie seu Jogador</h2>
                <button onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-200">Voltar</button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nome do Jogador</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ex: Pelé, Zico, Ronaldo..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => onStart(playerName || 'Jogador Desconhecido', 'player')}
                  disabled={!playerName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Começar Carreira <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
