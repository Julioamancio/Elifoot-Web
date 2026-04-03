import React, { useState } from 'react';
import { generateTeams } from '../game/generator';
import { AuthButton } from './AuthButton';
import { GameMode, Player } from '../types/game';
import { User, Briefcase, ChevronRight } from 'lucide-react';
import startScreenBg from '../assets/start-screen-bg.png';
import futbossLogo from '../assets/futboss-logo.png';

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
    teams.forEach(team => {
      if (!topDivByCountry[team.country] || team.division < topDivByCountry[team.country]) {
        topDivByCountry[team.country] = team.division;
      }
    });
    return teams.filter(team => team.division === topDivByCountry[team.country]);
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

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="max-w-3xl w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/78 shadow-[0_30px_90px_rgba(2,6,23,0.78)] backdrop-blur-md">
          <div className="flex flex-col items-center border-b border-slate-800 p-8 text-center">
          <img
            src={futbossLogo}
            alt="Logo do FutBoss"
            className="mb-5 h-40 w-40 rounded-full border border-white/10 bg-slate-950/60 object-cover shadow-[0_22px_48px_rgba(15,23,42,0.6)] sm:h-48 sm:w-48"
          />
          <p className="mb-6 max-w-xl text-slate-300">
            O classico simulador de futebol, agora com mais opcoes de carreira, competicoes e evolucao.
          </p>
            <AuthButton />
          </div>

          <div className="p-8">
            {!mode ? (
              <>
                <h2 className="mb-8 text-center text-2xl font-bold text-slate-200">Escolha seu Caminho</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <button
                    onClick={() => setMode('manager')}
                    className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-8 text-left text-center transition-all hover:border-emerald-500 hover:bg-slate-700"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 transition-transform group-hover:scale-110">
                      <Briefcase className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-2xl font-bold text-slate-100">Carreira Manager</h3>
                    <p className="text-sm text-slate-400">
                      Assuma o controle de um clube. Gerencie financas, estadio, taticas e o mercado de transferencias.
                    </p>
                  </button>

                  <button
                    onClick={() => setMode('player')}
                    className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-8 text-left text-center transition-all hover:border-blue-500 hover:bg-slate-700"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 transition-transform group-hover:scale-110">
                      <User className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-2xl font-bold text-slate-100">Carreira Jogador</h3>
                    <p className="text-sm text-slate-400">
                      Crie seu jogador, comece na quarta divisao e treine para se tornar uma lenda do futebol mundial.
                    </p>
                  </button>
                </div>
              </>
            ) : mode === 'manager' ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-200">Escolha seu clube para comecar</h2>
                  <button onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-200">
                    Voltar
                  </button>
                </div>
                <div className="custom-scrollbar grid max-h-96 grid-cols-2 gap-3 overflow-y-auto pr-2 sm:grid-cols-3 md:grid-cols-4">
                  {availableTeams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => onStart('Manager', 'manager', team.name)}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-700 hover:text-white"
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-md">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-200">Crie seu Jogador</h2>
                  <button onClick={() => setMode(null)} className="text-sm text-slate-400 hover:text-slate-200">
                    Voltar
                  </button>
                </div>
                <div className="custom-scrollbar max-h-[60vh] space-y-4 overflow-y-auto pr-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-400">Nome do Jogador</label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={event => setPlayerName(event.target.value)}
                      placeholder="Ex: Pele, Zico, Ronaldo..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Idade</label>
                      <input
                        type="number"
                        min="16"
                        max="35"
                        value={playerDetails.age}
                        onChange={event => setPlayerDetails({ ...playerDetails, age: parseInt(event.target.value) })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Nacionalidade</label>
                      <select
                        value={playerDetails.nationality}
                        onChange={event => setPlayerDetails({ ...playerDetails, nationality: event.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="BR">Brasil</option>
                        <option value="AR">Argentina</option>
                        <option value="UY">Uruguai</option>
                        <option value="CL">Chile</option>
                        <option value="CO">Colombia</option>
                        <option value="PE">Peru</option>
                        <option value="EC">Equador</option>
                        <option value="PY">Paraguai</option>
                        <option value="BO">Bolivia</option>
                        <option value="VE">Venezuela</option>
                        <option value="US">Estados Unidos</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Posicao</label>
                      <select
                        value={playerDetails.position}
                        onChange={event => setPlayerDetails({ ...playerDetails, position: event.target.value as Player['position'] })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="GK">Goleiro (GK)</option>
                        <option value="DEF">Defensor (DEF)</option>
                        <option value="MID">Meio-Campo (MID)</option>
                        <option value="ATK">Atacante (ATK)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Perna Boa</label>
                      <select
                        value={playerDetails.preferredFoot}
                        onChange={event =>
                          setPlayerDetails({
                            ...playerDetails,
                            preferredFoot: event.target.value as NonNullable<Player['preferredFoot']>,
                          })
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Right">Direita</option>
                        <option value="Left">Esquerda</option>
                        <option value="Both">Ambas</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Altura (cm)</label>
                      <input
                        type="number"
                        min="150"
                        max="220"
                        value={playerDetails.height}
                        onChange={event => setPlayerDetails({ ...playerDetails, height: parseInt(event.target.value) })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Peso (kg)</label>
                      <input
                        type="number"
                        min="50"
                        max="120"
                        value={playerDetails.weight}
                        onChange={event => setPlayerDetails({ ...playerDetails, weight: parseInt(event.target.value) })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Camisa</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={playerDetails.jerseyNumber}
                        onChange={event => setPlayerDetails({ ...playerDetails, jerseyNumber: parseInt(event.target.value) })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-400">Time Inicial (4a Divisao)</label>
                      <select
                        value={selectedTeamId}
                        onChange={event => setSelectedTeamId(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Aleatorio</option>
                        {availableTeams
                          .filter(team => team.country === playerDetails.nationality)
                          .map(team => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onStart(playerName || 'Jogador Desconhecido', 'player', selectedTeamId || undefined, playerDetails)
                    }
                    disabled={!playerName.trim()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Comecar Carreira <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-300/90">
          <p className="font-semibold tracking-[0.18em] text-slate-200">FUTBOSS</p>
          <p className="mt-2">Desenvolvido por Julio Amancio.</p>
          <p className="mt-1">© 2026. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
