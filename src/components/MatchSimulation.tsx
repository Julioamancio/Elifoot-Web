import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Flag,
  Pause,
  Play,
  ShieldAlert,
  Square,
  Trophy,
} from 'lucide-react';
import { Match, MatchEvent, Team } from '../types/game';
import { cn } from '../lib/utils';

interface MatchSimulationProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  result: { matchId: string; homeScore: number; awayScore: number; events: MatchEvent[] };
  onComplete: (result: { matchId: string; homeScore: number; awayScore: number; events: MatchEvent[] }) => void;
  completeLabel?: string;
  sequenceLabel?: string;
}

type EventViewModel = {
  id: string;
  minute: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  teamName: string;
  isHome: boolean;
  accentClass: string;
};

export function MatchSimulation({
  match,
  homeTeam,
  awayTeam,
  result,
  onComplete,
  completeLabel = 'Concluir Rodada',
  sequenceLabel,
}: MatchSimulationProps) {
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [revealedEventIds, setRevealedEventIds] = useState<string[]>([]);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  const minuteRef = useRef(0);
  const isPlayingRef = useRef(true);
  const isFinishedRef = useRef(false);
  const revealedIdsRef = useRef<Set<string>>(new Set());
  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  useEffect(() => {
    minuteRef.current = 0;
    isPlayingRef.current = true;
    isFinishedRef.current = false;
    revealedIdsRef.current = new Set();
    setMinute(0);
    setSpeed(1);
    setIsPlaying(true);
    setIsFinished(false);
    setRevealedEventIds([]);
    setIsSubmittingResult(false);
  }, [match.id]);

  const sortedEvents = [...result.events].sort((a, b) => a.minute - b.minute);

  const getPlayerName = (team: Team, playerId: string) => {
    return team.players.find(player => player.id === playerId)?.name || 'Jogador desconhecido';
  };

  const buildEventView = (event: MatchEvent): EventViewModel => {
    const isHome = event.teamId === homeTeam.id;
    const team = isHome ? homeTeam : awayTeam;
    const playerName = getPlayerName(team, event.playerId);
    const assistName = event.assistPlayerId ? getPlayerName(team, event.assistPlayerId) : null;

    switch (event.type) {
      case 'GOAL':
        return {
          id: event.id,
          minute: event.minute,
          icon: <Trophy className="h-4 w-4" />,
          title: `Gol do ${team.name}`,
          description: assistName
            ? `${playerName} marcou com assistência de ${assistName}.`
            : `${playerName} balançou as redes.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
        };
      case 'YELLOW_CARD':
        return {
          id: event.id,
          minute: event.minute,
          icon: <Square className="h-4 w-4 fill-yellow-400 text-yellow-400" />,
          title: `Cartão amarelo para ${playerName}`,
          description: `${playerName} foi advertido pelo árbitro.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
        };
      case 'RED_CARD':
        return {
          id: event.id,
          minute: event.minute,
          icon: <ShieldAlert className="h-4 w-4" />,
          title: `Cartão vermelho para ${playerName}`,
          description: `${playerName} foi expulso e deixa o ${team.name} com um a menos.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-red-500/40 bg-red-500/10 text-red-300',
        };
      case 'SUBSTITUTION':
        return {
          id: event.id,
          minute: event.minute,
          icon: <ArrowRightLeft className="h-4 w-4" />,
          title: `Substituição no ${team.name}`,
          description: assistName
            ? `${playerName} entrou no lugar de ${assistName}.`
            : `${playerName} entrou em campo.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
        };
      case 'OFFSIDE':
        return {
          id: event.id,
          minute: event.minute,
          icon: <Flag className="h-4 w-4" />,
          title: `Impedimento do ${team.name}`,
          description: `${playerName} foi flagrado em posição irregular.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
        };
      case 'INJURY':
        return {
          id: event.id,
          minute: event.minute,
          icon: <ShieldAlert className="h-4 w-4" />,
          title: `Lesao no ${team.name}`,
          description: event.reason ? `${playerName} saiu sentindo ${event.reason}.` : `${playerName} deixou o campo com dores.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        };
      default:
        return {
          id: event.id,
          minute: event.minute,
          icon: <Flag className="h-4 w-4" />,
          title: `Lance do ${team.name}`,
          description: `${playerName} participou da jogada.`,
          teamName: team.name,
          isHome,
          accentClass: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
        };
    }
  };

  const revealedEvents = useMemo(
    () =>
      sortedEvents
        .filter(event => revealedEventIds.includes(event.id))
        .map(buildEventView),
    [revealedEventIds, sortedEvents],
  );

  const homeScore = revealedEvents.filter(event => event.title.startsWith('Gol') && event.isHome).length;
  const awayScore = revealedEvents.filter(event => event.title.startsWith('Gol') && !event.isHome).length;

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [revealedEvents.length]);

  useEffect(() => {
    let animationFrameId = 0;
    let lastTime = performance.now();

    const update = (time: number) => {
      if (!isPlayingRef.current || isFinishedRef.current) {
        lastTime = time;
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      const deltaTime = time - lastTime;
      lastTime = time;

      minuteRef.current += (deltaTime / 100) * speed;

      if (minuteRef.current >= 90) {
        minuteRef.current = 90;
        setMinute(90);
        setIsFinished(true);
        setIsPlaying(false);
      } else {
        setMinute(Math.floor(minuteRef.current));
      }

      const currentMinute = Math.floor(minuteRef.current);
      const newlyVisible = sortedEvents.filter(
        event => event.minute <= currentMinute && !revealedIdsRef.current.has(event.id),
      );

      if (newlyVisible.length > 0) {
        newlyVisible.forEach(event => revealedIdsRef.current.add(event.id));
        setRevealedEventIds(prev => [...prev, ...newlyVisible.map(event => event.id)]);
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sortedEvents, speed]);

  const handleComplete = () => {
    if (isSubmittingResult) return;
    setIsSubmittingResult(true);
    onComplete(result);
  };

  const timelineStatus =
    revealedEvents.length > 0
      ? `${revealedEvents.length} lance${revealedEvents.length > 1 ? 's' : ''} narrado${revealedEvents.length > 1 ? 's' : ''}`
      : 'Aguardando os primeiros lances';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 text-center lg:text-right">
            <h2 className="text-2xl font-bold text-slate-100">{homeTeam.name}</h2>
            <p className="text-sm text-slate-400">Mandante</p>
          </div>

          <div className="min-w-[220px] text-center">
            <div className="text-4xl font-black font-mono text-white">
              {homeScore} - {awayScore}
            </div>
            <div className="mt-2 text-xl font-bold text-emerald-400">{minute}'</div>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{timelineStatus}</p>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-100">{awayTeam.name}</h2>
            <p className="text-sm text-slate-400">Visitante</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-100">Linha do tempo da partida</h3>
            {sequenceLabel && <p className="mt-1 text-xs font-medium text-emerald-400">{sequenceLabel}</p>}
            <p className="text-sm text-slate-400">Os eventos aparecem em ordem cronológica, de cima para baixo.</p>
          </div>
          {isFinished && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Encerrado
            </span>
          )}
        </div>

        <div className="max-h-[28rem] overflow-y-auto rounded-xl bg-slate-900/70 p-4">
          <div className="relative space-y-4 pl-8">
            <div className="absolute bottom-0 left-3 top-0 w-px bg-slate-700" />

            {revealedEvents.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
                A partida começou. Os lances vão aparecendo aqui conforme o relógio avança.
              </div>
            )}

            {revealedEvents.map(event => (
              <div key={event.id} className="relative">
                <div className="absolute left-[-1.95rem] top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-200">
                  {event.icon}
                </div>

                <div
                  className={cn(
                    'rounded-2xl border px-4 py-4 shadow-sm',
                    event.accentClass,
                    event.isHome ? 'mr-8' : 'ml-8',
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-200/80">
                        {event.teamName}
                      </p>
                      <h4 className="text-lg font-bold text-white">{event.title}</h4>
                    </div>
                    <span className="text-lg font-black text-white">{event.minute}'</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">{event.description}</p>
                </div>
              </div>
            ))}

            {isFinished && (
              <div className="relative">
                <div className="absolute left-[-1.95rem] top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">Fim de jogo</h4>
                      <p className="text-sm text-slate-200">
                        {homeTeam.name} {homeScore} x {awayScore} {awayTeam.name}
                      </p>
                    </div>
                    <span className="text-lg font-black text-emerald-300">90'</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={timelineEndRef} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isFinished}
            className="rounded-lg bg-slate-700 p-3 text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setSpeed(1)}
            className={cn(
              'rounded-lg px-4 py-2 font-bold transition-colors',
              speed === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            )}
          >
            1x
          </button>
          <button
            onClick={() => setSpeed(2)}
            className={cn(
              'rounded-lg px-4 py-2 font-bold transition-colors',
              speed === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            )}
          >
            2x
          </button>
          <button
            onClick={() => setSpeed(10)}
            className={cn(
              'rounded-lg px-4 py-2 font-bold transition-colors',
              speed === 10 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            )}
          >
            10x
          </button>
        </div>

        {isFinished && (
          <button
            onClick={handleComplete}
            disabled={isSubmittingResult}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 className="h-5 w-5" />
            {isSubmittingResult ? 'Concluindo...' : completeLabel}
          </button>
        )}
      </div>
    </div>
  );
}
