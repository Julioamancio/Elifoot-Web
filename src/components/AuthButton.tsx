import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FolderOpen,
  Library,
  LogIn,
  LogOut,
  Pencil,
  PlusCircle,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import {
  clearStoredToken,
  deleteSaveSlot,
  getCurrentUser,
  listSaveSlots,
  loadGameState,
  loginWithPassword,
  registerWithPassword,
  renameSaveSlot,
  saveGameState,
  type AuthUser,
  type SaveSlotSummary,
} from '../lib/api';
import type { GameState } from '../types/game';
import { TeamFlag } from './ui/TeamFlag';

type FeedbackState = {
  title: string;
  message: string;
  tone: 'success' | 'error';
};

type CareerModalMode = 'save' | 'load';

const getActiveSlotStorageKey = (userId: number) => `elifoot_active_slot_${userId}`;

interface AuthButtonProps {
  onAuthStateChange?: (state: { user: AuthUser | null; isBootstrapping: boolean }) => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onAuthStateChange }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingSlots, setIsRefreshingSlots] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [careerModalMode, setCareerModalMode] = useState<CareerModalMode | null>(null);
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<number | null>(null);
  const [slotNameInput, setSlotNameInput] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [editingSlotName, setEditingSlotName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<number | null>(null);

  const teams = useGameStore(state => state.teams);
  const matches = useGameStore(state => state.matches);
  const currentWeek = useGameStore(state => state.currentWeek);
  const userTeamId = useGameStore(state => state.userTeamId);
  const userPlayerId = useGameStore(state => state.userPlayerId);
  const gameMode = useGameStore(state => state.gameMode);
  const isGameOver = useGameStore(state => state.isGameOver);
  const marketPlayers = useGameStore(state => state.marketPlayers);
  const activeMatchId = useGameStore(state => state.activeMatchId);
  const managerReputation = useGameStore(state => state.managerReputation);
  const jobOffers = useGameStore(state => state.jobOffers);
  const currentYear = useGameStore(state => state.currentYear);
  const competitionHistory = useGameStore(state => state.competitionHistory);
  const retiredPlayersHistory = useGameStore(state => state.retiredPlayersHistory);
  const newsFeed = useGameStore(state => state.newsFeed);
  const recentRoundSummary = useGameStore(state => state.recentRoundSummary);
  const seasonReview = useGameStore(state => state.seasonReview);
  const setGameState = useGameStore(state => state.setGameState);
  const resetGame = useGameStore(state => state.resetGame);

  const userTeam = teams.find(team => team.id === userTeamId);
  const userPlayer = userTeam?.players.find(player => player.id === userPlayerId);
  const getTeamCountryByName = (teamName?: string | null) =>
    teamName ? teams.find(team => team.name === teamName)?.country ?? null : null;

  const derivedSlotName = useMemo(() => {
    if (gameMode === 'player' && userPlayer) {
      return `Jogador - ${userPlayer.name}`;
    }

    if (userTeam) {
      return `Técnico - ${userTeam.name}`;
    }

    return 'Nova carreira';
  }, [gameMode, userPlayer, userTeam]);

  const activeSlot = saveSlots.find(slot => slot.id === activeSlotId) ?? null;

  const buildGameState = (): GameState => ({
    schemaVersion: 2,
    teams: teams.map(team => ({
      ...team,
      competitionSquads: undefined,
    })),
    matches,
    currentWeek,
    userTeamId,
    userPlayerId,
    gameMode,
    isGameOver,
    marketPlayers,
    activeMatchId,
    managerReputation,
    jobOffers,
    currentYear,
    competitionHistory,
    retiredPlayersHistory,
    newsFeed,
    recentRoundSummary,
    seasonReview,
  });

  const showFeedback = (nextFeedback: FeedbackState) => {
    setFeedback(nextFeedback);
  };

  const persistActiveSlotId = (currentUser: AuthUser | null, slotId: number | null) => {
    if (!currentUser) return;

    const storageKey = getActiveSlotStorageKey(currentUser.id);
    if (slotId === null) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, String(slotId));
  };

  const refreshSlots = async (currentUser: AuthUser, preferredSlotId?: number | null) => {
    setIsRefreshingSlots(true);

    try {
      const response = await listSaveSlots();
      setSaveSlots(response.slots);

      const storedSlotId = Number(window.localStorage.getItem(getActiveSlotStorageKey(currentUser.id)));
      const resolvedPreferredSlotId =
        preferredSlotId !== undefined
          ? preferredSlotId
          : Number.isFinite(storedSlotId)
            ? storedSlotId
            : null;

      const nextActiveSlotId =
        resolvedPreferredSlotId !== null
          ? response.slots.find(slot => slot.id === resolvedPreferredSlotId)?.id ?? null
          : null;

      setActiveSlotId(nextActiveSlotId);
      persistActiveSlotId(currentUser, nextActiveSlotId);
    } finally {
      setIsRefreshingSlots(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then(async currentUser => {
        if (!isMounted) return;

        setUser(currentUser);
        if (currentUser) {
          await refreshSlots(currentUser);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  useEffect(() => {
    onAuthStateChange?.({ user, isBootstrapping });
  }, [user, isBootstrapping, onAuthStateChange]);

  useEffect(() => {
    if (!careerModalMode) return;
    setSlotNameInput(derivedSlotName);
  }, [careerModalMode, derivedSlotName]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      const authenticatedUser =
        mode === 'register'
          ? await registerWithPassword(username, password)
          : await loginWithPassword(username, password);

      setUser(authenticatedUser);
      setPassword('');
      await refreshSlots(authenticatedUser, null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (user) {
      persistActiveSlotId(user, null);
    }

    resetGame();
    clearStoredToken();
    setUser(null);
    setPassword('');
    setAuthError('');
    setSaveSlots([]);
    setActiveSlotId(null);
    setCareerModalMode(null);
    setEditingSlotId(null);
    setDeletingSlotId(null);
  };

  const openCareerModal = async (nextMode: CareerModalMode) => {
    if (!user) return;

    setCareerModalMode(nextMode);
    setSlotNameInput(derivedSlotName);
    setEditingSlotId(null);
    setDeletingSlotId(null);
    await refreshSlots(user);
  };

  const handleSaveToExistingSlot = async (slot: SaveSlotSummary) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const response = await saveGameState(buildGameState(), { slotId: slot.id });
      await refreshSlots(user, slot.id);
      setCareerModalMode(null);
      showFeedback({
        title: 'Carreira salva',
        message: `Seu progresso foi salvo em "${response.slot?.slotName ?? slot.slotName}".`,
        tone: 'success',
      });
    } catch (error) {
      console.error('Erro ao salvar carreira:', error);
      showFeedback({
        title: 'Falha ao salvar',
        message: error instanceof Error ? error.message : 'Não foi possível salvar a carreira.',
        tone: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const response = await saveGameState(buildGameState(), { slotName: slotNameInput.trim() || derivedSlotName });
      const savedSlotId = response.slot?.id ?? null;
      await refreshSlots(user, savedSlotId);
      setCareerModalMode(null);
      showFeedback({
        title: 'Nova carreira criada',
        message: `Sua carreira foi salva em "${response.slot?.slotName ?? slotNameInput}".`,
        tone: 'success',
      });
    } catch (error) {
      console.error('Erro ao criar slot:', error);
      showFeedback({
        title: 'Falha ao salvar',
        message: error instanceof Error ? error.message : 'Não foi possível criar a carreira.',
        tone: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSlot = async (slot: SaveSlotSummary) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await loadGameState(slot.id);
      setGameState(data.gameState);
      await refreshSlots(user, slot.id);
      setCareerModalMode(null);
      showFeedback({
        title: 'Carreira carregada',
        message: `Agora você está jogando a carreira "${slot.slotName}".`,
        tone: 'success',
      });
    } catch (error) {
      console.error('Erro ao carregar carreira:', error);
      showFeedback({
        title: 'Falha ao carregar',
        message: error instanceof Error ? error.message : 'Não foi possível carregar a carreira.',
        tone: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameSlot = async (slot: SaveSlotSummary) => {
    if (!user || !editingSlotName.trim()) return;

    setIsRenaming(true);
    try {
      await renameSaveSlot(slot.id, editingSlotName.trim());
      await refreshSlots(user, slot.id);
      setEditingSlotId(null);
      showFeedback({
        title: 'Carreira renomeada',
        message: 'O nome da carreira foi atualizado com sucesso.',
        tone: 'success',
      });
    } catch (error) {
      console.error('Erro ao renomear carreira:', error);
      showFeedback({
        title: 'Falha ao renomear',
        message: error instanceof Error ? error.message : 'Não foi possível renomear a carreira.',
        tone: 'error',
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteSlot = async (slot: SaveSlotSummary) => {
    if (!user) return;

    setDeletingSlotId(slot.id);
    try {
      await deleteSaveSlot(slot.id);
      const nextPreferredSlotId = activeSlotId === slot.id ? null : activeSlotId;
      await refreshSlots(user, nextPreferredSlotId);
      showFeedback({
        title: 'Carreira excluída',
        message: `A carreira "${slot.slotName}" foi removida.`,
        tone: 'success',
      });
    } catch (error) {
      console.error('Erro ao excluir carreira:', error);
      showFeedback({
        title: 'Falha ao excluir',
        message: error instanceof Error ? error.message : 'Não foi possível excluir a carreira.',
        tone: 'error',
      });
    } finally {
      setDeletingSlotId(null);
    }
  };

  const feedbackModal = feedback ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-emerald-950/20">
        <div
          className={
            feedback.tone === 'success'
              ? 'h-1.5 w-full bg-gradient-to-r from-emerald-500 to-sky-500'
              : 'h-1.5 w-full bg-gradient-to-r from-rose-500 to-orange-500'
          }
        />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={
                feedback.tone === 'success'
                  ? 'mt-0.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400'
                  : 'mt-0.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-400'
              }
            >
              {feedback.tone === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-100">{feedback.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feedback.message}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className={
                feedback.tone === 'success'
                  ? 'rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500'
                  : 'rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500'
              }
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const careerModal = careerModalMode ? (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-950/80 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
              {careerModalMode === 'save' ? <Save size={22} /> : <Library size={22} />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100">
                {careerModalMode === 'save' ? 'Gerenciar carreiras para salvar' : 'Escolher carreira para carregar'}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {careerModalMode === 'save'
                  ? 'Cada carreira fica independente. Você escolhe em qual slot salvar ou cria uma nova.'
                  : 'Carregue qualquer carreira sem apagar a outra.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCareerModalMode(null)}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Carreiras existentes</h4>
              {activeSlot ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  Ativa: {activeSlot.slotName}
                </span>
              ) : null}
            </div>

            <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
              {isRefreshingSlots ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-sm text-slate-400">
                  Atualizando lista de carreiras...
                </div>
              ) : saveSlots.length > 0 ? (
                saveSlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`rounded-2xl border p-4 ${
                      slot.id === activeSlotId
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-slate-700 bg-slate-800/70'
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          {editingSlotId === slot.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={editingSlotName}
                                onChange={event => setEditingSlotName(event.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isRenaming}
                                  onClick={() => handleRenameSlot(slot)}
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                                >
                                  {isRenaming ? 'Salvando...' : 'Confirmar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSlotId(null)}
                                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-bold text-slate-100">{slot.slotName}</p>
                                <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
                                  {slot.gameMode === 'player' ? 'Jogador' : 'Técnico'}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-slate-400">{slot.careerLabel}</p>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSlotId(slot.id);
                              setEditingSlotName(slot.slotName);
                            }}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
                            title="Renomear"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingSlotId === slot.id}
                            onClick={() => handleDeleteSlot(slot)}
                            className="rounded-xl border border-rose-500/20 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {careerModalMode === 'save' ? (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveToExistingSlot(slot)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                            >
                              {isSaving ? 'Salvando...' : 'Salvar aqui'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleLoadSlot(slot)}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {isLoading ? 'Carregando...' : 'Carregar'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Time</p>
                          <div className="mt-1 text-sm font-semibold text-slate-100">
                            {slot.teamName ? (
                              <span className="inline-flex items-center gap-2">
                                <TeamFlag country={getTeamCountryByName(slot.teamName)} teamName={slot.teamName} size="xs" />
                                <span>{slot.teamName}</span>
                              </span>
                            ) : (
                              <span>Sem time</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Temporada</p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">{slot.currentYear ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Semana</p>
                          <p className="mt-1 text-sm font-semibold text-slate-100">{slot.currentWeek ?? '—'}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500">
                        Atualizada em {new Date(slot.updatedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-sm text-slate-400">
                  Nenhuma carreira salva ainda.
                </div>
              )}
            </div>
          </div>

          {careerModalMode === 'save' ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-400" />
                <h4 className="text-lg font-bold text-slate-100">Criar nova carreira</h4>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Ideal para separar sua carreira de técnico da de jogador, ou criar vários caminhos paralelos.
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Nome do slot</span>
                  <input
                    type="text"
                    value={slotNameInput}
                    onChange={event => setSlotNameInput(event.target.value)}
                    placeholder={derivedSlotName}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </label>

                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
                  <p className="font-semibold text-slate-200">Carreira atual</p>
                  <p className="mt-2">
                    {gameMode === 'player'
                      ? `${userPlayer?.name ?? 'Jogador'} • ${userTeam?.name ?? 'Sem clube'}`
                      : userTeam?.name ?? 'Sem clube'}
                  </p>
                  <p className="mt-2">Temporada {currentYear ?? 2026} • Semana {currentWeek}</p>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCreateSlot}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSaving ? 'Criando carreira...' : 'Salvar como nova carreira'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-sky-400" />
                <h4 className="text-lg font-bold text-slate-100">Trocar de caminho</h4>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Carregue qualquer carreira da lista e continue daquele ponto, sem apagar a outra.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (isBootstrapping) {
    return (
      <>
        <p className="text-sm text-slate-500">Verificando sessão...</p>
        {feedbackModal}
      </>
    );
  }

  if (user) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="mb-2 hidden w-full text-center md:block">
            <span className="text-sm text-slate-400">Usuário: {user.username}</span>
            {activeSlot ? (
              <p className="mt-1 text-xs font-medium text-emerald-400">
                Carreira ativa: {activeSlot.slotName}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Nenhuma carreira selecionada no momento</p>
            )}
          </div>

          {userTeamId && (
            <button
              onClick={() => openCareerModal('save')}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              title="Salvar carreira"
            >
              <Save size={16} />
              <span className="hidden sm:inline">{isSaving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          )}
          <button
            onClick={() => openCareerModal('load')}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            title="Carregar carreira"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{isLoading ? 'Carregando...' : 'Carregar'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
            title="Encerrar sessão"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
        {careerModal}
        {feedbackModal}
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleAuthSubmit} className="w-full max-w-sm space-y-3">
        <div className="grid gap-2">
          <input
            type="text"
            value={username}
            onChange={event => setUsername(event.target.value)}
            placeholder="Usuário"
            autoComplete="username"
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="Senha"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {authError && <p className="text-sm text-red-400">{authError}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            {mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isSubmitting ? 'Processando...' : mode === 'register' ? 'Criar Conta' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(currentMode => (currentMode === 'login' ? 'register' : 'login'));
              setAuthError('');
            }}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            {mode === 'login' ? 'Quero criar conta' : 'Já tenho conta'}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Seu acesso e suas carreiras ficam gravados no banco local SQLite do projeto.
        </p>
      </form>
      {careerModal}
      {feedbackModal}
    </>
  );
};
