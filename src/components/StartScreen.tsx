import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { generateTeams } from '../game/generator';
import { AuthButton } from './AuthButton';
import { GameMode, Player } from '../types/game';
import { User, Briefcase, ChevronRight } from 'lucide-react';
import startScreenBg from '../assets/start-screen-bg.png';

interface StartScreenProps {
  onStart: (name: string, mode: GameMode, teamName?: string, playerDetails?: Partial<Player>) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [teams] = useState(() => generateTeams());
  const [mode, setMode] = useState<GameMode | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [playerDetails, setPlayerDetails] = useState<Partial<Player>>({
    age: 18,
    position: 'ATK',
    nationality: 'BR',
    preferredFoot: 'Right',
    height: 180,
    weight: 75,
    jerseyNumber: 10,
  });

  const getAvailableTeams = () => {
    const topDivByCountry: Record<string, number> = {};
    teams.forEach(t => {
      if (!topDivByCountry[t.country] || t.division < topDivByCountry[t.country]) {
        topDivByCountry[t.country] = t.division;
      }
    });
    return teams.filter(t => t.division === topDivByCountry[t.country]);
  };

  const availableTeams = getAvailableTeams();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${startScreenBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/88 via-slate-950/76 to-emerald-950/72" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.24),transparent_30%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-slate-900/78 rounded-3xl shadow-[0_30px_90px_rgba(2,6,23,0.78)] overflow-hidden border border-white/10 backdrop-blur-md">
        <div className="p-8 text-center border-b border-slate-800 flex flex-col items-center">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500 tracking-tighter mb-2">FUTBOSS</h1>
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
                {availableTeams.map(team => (
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
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Jogador</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ex: Pelé, Zico, Ronaldo..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Idade</label>
                    <input
                      type="number"
                      min="16"
                      max="35"
                      value={playerDetails.age}
                      onChange={(e) => setPlayerDetails({...playerDetails, age: parseInt(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Nacionalidade</label>
                    <select
                      value={playerDetails.nationality}
                      onChange={(e) => setPlayerDetails({...playerDetails, nationality: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="BR">Brasil</option>
                      <option value="AR">Argentina</option>
                      <option value="UY">Uruguai</option>
                      <option value="CL">Chile</option>
                      <option value="CO">Colômbia</option>
                      <option value="PE">Peru</option>
                      <option value="EC">Equador</option>
                      <option value="PY">Paraguai</option>
                      <option value="BO">Bolívia</option>
                      <option value="VE">Venezuela</option>
                      <option value="US">Estados Unidos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Posição</label>
                    <select
                      value={playerDetails.position}
                      onChange={(e) => setPlayerDetails({...playerDetails, position: e.target.value as any})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="GK">Goleiro (GK)</option>
                      <option value="DEF">Defensor (DEF)</option>
                      <option value="MID">Meio-Campo (MID)</option>
                      <option value="ATK">Atacante (ATK)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Perna Boa</label>
                    <select
                      value={playerDetails.preferredFoot}
                      onChange={(e) => setPlayerDetails({...playerDetails, preferredFoot: e.target.value as any})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Right">Direita</option>
                      <option value="Left">Esquerda</option>
                      <option value="Both">Ambas</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      min="150"
                      max="220"
                      value={playerDetails.height}
                      onChange={(e) => setPlayerDetails({...playerDetails, height: parseInt(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      min="50"
                      max="120"
                      value={playerDetails.weight}
                      onChange={(e) => setPlayerDetails({...playerDetails, weight: parseInt(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Camisa</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={playerDetails.jerseyNumber}
                      onChange={(e) => setPlayerDetails({...playerDetails, jerseyNumber: parseInt(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Time Inicial (4ª Divisão)</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Aleatório</option>
                      {availableTeams
                        .filter(t => t.country === playerDetails.nationality)
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => onStart(playerName || 'Jogador Desconhecido', 'player', selectedTeamId || undefined, playerDetails)}
                  disabled={!playerName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  Começar Carreira <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
