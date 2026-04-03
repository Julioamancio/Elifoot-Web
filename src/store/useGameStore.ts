import { create } from 'zustand';
import {
  Competition,
  CompetitionHistoryEntry,
  GameState,
  Team,
  Player,
  Match,
  GameMode,
  MatchEvent,
  TeamStats,
  RetiredPlayerRecord,
  NewsItem,
  WeekSummary,
  SeasonReview,
  SeasonMovement,
} from '../types/game';
import { generateTeams, generateNationalTeams } from '../game/generator';
import {
  advanceKnockoutTournaments,
  advanceInternationalGroupTournaments,
  generateContinentalCompetitions,
  generateSchedule,
  getInternationalCompetitionsForYear,
  simulateMatch,
  sortTeamsByCompetitionTable,
} from '../game/engine';
import { ensureTeamSponsors, refreshSponsorsForNewSeason } from '../game/sponsorship';
import {
  autoPromoteAcademyPlayers,
  createPlayerContract,
  createRetiredPlayerRecord,
  createRegenPlayer,
  ensureTeamAcademy,
  getPlayerRetirementRisk,
  recalculatePlayerEconomics,
  refreshContractForNewSeason,
  refreshTeamAcademyForNewSeason,
  shouldPlayerRetire,
} from '../game/playerLifecycle';
import { ensureTeamCommercial, estimateMatchdayAttendance, estimateWeeklyCommercialRevenue } from '../game/commercial';

const DEFAULT_START_YEAR = 2026;
const DEFAULT_BENCH_SIZE = 15;
const YELLOW_SUSPENSION_THRESHOLD = 2;
const CURRENT_SAVE_SCHEMA_VERSION = 2;

const createDisciplinaryRecord = () => ({
  yellowCards: 0,
  redCards: 0,
  accumulatedYellows: 0,
  suspendedMatches: 0,
  matchesSuspended: 0,
});

const getPlayerCompetitionRecord = (player: Player, competition: Competition) =>
  player.disciplinary?.[competition] ?? createDisciplinaryRecord();

const setPlayerCompetitionRecord = (
  player: Player,
  competition: Competition,
  updater: (record: ReturnType<typeof createDisciplinaryRecord>) => ReturnType<typeof createDisciplinaryRecord>,
) => {
  const current = getPlayerCompetitionRecord(player, competition);
  player.disciplinary = {
    ...(player.disciplinary ?? {}),
    [competition]: updater({ ...current }),
  };
};

const isPlayerSuspendedForCompetition = (player: Player, competition: Competition) =>
  getPlayerCompetitionRecord(normalizePlayer(player), competition).suspendedMatches > 0;

const isPlayerInjured = (player: Player) => (player.injury?.weeksRemaining ?? 0) > 0;

const isPlayerUnavailable = (player: Player, competitions: Competition[]) =>
  isPlayerInjured(player) || competitions.some(competition => isPlayerSuspendedForCompetition(player, competition));

const getCompetitionPlayers = (team: Team, competition: Competition) =>
  team.competitionSquads?.[competition]?.length ? team.competitionSquads[competition]! : team.players;

const normalizePlayer = (player: Player): Player => {
  const ratingSamples = player.ratingSamples ?? 0;
  const averageRating =
    player.averageRating ?? (ratingSamples > 0 ? (player.ratingTotal ?? 0) / ratingSamples : 0);

  const normalizedPlayer: Player = {
    ...player,
    seasonMinutes: player.seasonMinutes ?? player.matchesPlayed * 90,
    averageRating,
    ratingTotal: player.ratingTotal ?? averageRating * ratingSamples,
    ratingSamples,
    form: player.form ?? (averageRating || 6),
    nationalCaps: player.nationalCaps ?? 0,
    nationalGoals: player.nationalGoals ?? 0,
    nationalCallUpHistory: player.nationalCallUpHistory ?? [],
    nationalTournamentHistory: player.nationalTournamentHistory ?? [],
    yellowCardsSeason: player.yellowCardsSeason ?? player.yellowCards ?? 0,
    redCardsSeason: player.redCardsSeason ?? player.redCards ?? 0,
    disciplinary: player.disciplinary ?? {},
    potential: player.potential ?? clamp(player.overall + 6, player.overall, 99),
    status: player.status ?? 'ACTIVE',
    cleanSheets: player.cleanSheets ?? 0,
    saves: player.saves ?? 0,
    savePercentage: player.savePercentage ?? 0,
    keyPasses: player.keyPasses ?? 0,
    tackles: player.tackles ?? 0,
    interceptions: player.interceptions ?? 0,
    passAccuracy: player.passAccuracy ?? 0,
    titlesWon: player.titlesWon ?? 0,
    youthProspect: player.youthProspect ?? false,
    injury:
      player.injury && player.injury.weeksRemaining > 0
        ? {
            ...player.injury,
            weeksRemaining: Math.max(0, player.injury.weeksRemaining),
          }
        : null,
    contract: player.contract
      ? {
          ...player.contract,
          performanceGoals: [...player.contract.performanceGoals],
        }
      : undefined,
  };

  return normalizedPlayer.contract
    ? recalculatePlayerEconomics(normalizedPlayer, normalizedPlayer.contract.startYear)
    : recalculatePlayerEconomics(
        {
          ...normalizedPlayer,
          contract: createPlayerContract(normalizedPlayer, DEFAULT_START_YEAR),
        },
        DEFAULT_START_YEAR,
      );
};

const normalizeTeam = (team: Team, currentYear = DEFAULT_START_YEAR): Team => {
  const normalizedTeam: Team = {
    ...team,
    regionalDivision: team.regionalDivision ?? team.division,
    players: team.players.map(normalizePlayer),
    competitionSquads: team.competitionSquads
      ? Object.fromEntries(
          Object.entries(team.competitionSquads).map(([competition, players]) => [
            competition,
            (players ?? []).map(normalizePlayer),
        ]),
      ) as Team['competitionSquads']
      : undefined,
    sponsors: (team.sponsors ?? []).map(sponsor => ({ ...sponsor })),
    academyPlayers: (team.academyPlayers ?? []).map(normalizePlayer),
  };

  return ensureTeamCommercial(ensureTeamAcademy(ensureTeamSponsors(normalizedTeam, currentYear), currentYear));
};

const normalizeGameState = (state: GameState): GameState => ({
  ...state,
  schemaVersion: state.schemaVersion ?? CURRENT_SAVE_SCHEMA_VERSION,
  teams: state.teams.map(team => normalizeTeam(team, state.currentYear ?? DEFAULT_START_YEAR)),
  currentYear: state.currentYear ?? DEFAULT_START_YEAR,
  competitionHistory: state.competitionHistory ?? {},
  retiredPlayersHistory: state.retiredPlayersHistory ?? [],
  newsFeed: state.newsFeed ?? [],
  recentRoundSummary: state.recentRoundSummary ?? null,
  seasonReview: state.seasonReview ?? null,
});

const cloneTeams = (teams: Team[]) =>
  teams.map(team => ({
    ...team,
    commercial: team.commercial
      ? {
          ...team.commercial,
          lastWeeklyReport: team.commercial.lastWeeklyReport ? { ...team.commercial.lastWeeklyReport } : null,
        }
      : undefined,
    players: team.players.map(player => ({ ...normalizePlayer(player) })),
    sponsors: (team.sponsors ?? []).map(sponsor => ({ ...sponsor })),
    academyPlayers: (team.academyPlayers ?? []).map(player => ({ ...normalizePlayer(player) })),
    competitionSquads: team.competitionSquads
      ? Object.fromEntries(
          Object.entries(team.competitionSquads).map(([competition, players]) => [
            competition,
            (players ?? []).map(player => ({ ...normalizePlayer(player) })),
          ]),
        ) as Team['competitionSquads']
      : undefined,
  }));

const mutatePlayerAcrossTeams = (
  teams: Team[],
  playerId: string,
  mutator: (player: Player, team: Team) => void,
) => {
  teams.forEach(team => {
    const player = team.players.find(currentPlayer => currentPlayer.id === playerId);
    if (player) {
      mutator(player, team);
    }
  });
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundMoney = (value: number) => {
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  if (value >= 100_000) return Math.round(value / 10_000) * 10_000;
  return Math.round(value / 1_000) * 1_000;
};

const getMinutesPlayedMap = (team: Team, teamEvents: MatchEvent[]) => {
  const minutes = new Map<string, number>();

  team.players
    .filter(player => player.isStarter)
    .forEach(player => {
      minutes.set(player.id, 90);
    });

  teamEvents
    .filter(event => event.type === 'SUBSTITUTION')
    .forEach(event => {
      if (event.assistPlayerId) {
        minutes.set(event.assistPlayerId, Math.min(minutes.get(event.assistPlayerId) ?? 90, event.minute));
      }

      minutes.set(event.playerId, Math.max(minutes.get(event.playerId) ?? 0, 90 - event.minute));
    });

  return minutes;
};

const calculatePlayerRating = (
  playerId: string,
  teamScore: number,
  opponentScore: number,
  teamEvents: MatchEvent[],
  minutesPlayed: number,
) => {
  const goals = teamEvents.filter(event => event.type === 'GOAL' && event.playerId === playerId).length;
  const assists = teamEvents.filter(event => event.type === 'GOAL' && event.assistPlayerId === playerId).length;
  const yellowCards = teamEvents.filter(event => event.type === 'YELLOW_CARD' && event.playerId === playerId).length;
  const redCards = teamEvents.filter(event => event.type === 'RED_CARD' && event.playerId === playerId).length;

  let rating = 6;
  rating += goals * 1.6;
  rating += assists * 1.1;
  rating += minutesPlayed >= 60 ? 0.25 : minutesPlayed > 0 ? 0.1 : 0;
  rating += teamScore > opponentScore ? 0.4 : teamScore < opponentScore ? -0.3 : 0.1;
  rating -= yellowCards * 0.35;
  rating -= redCards * 1.2;

  return Number(clamp(rating, 4, 10).toFixed(2));
};

const resolveKnockoutWinner = (home: Team, away: Team, result: { homeScore: number; awayScore: number }) => {
  if (result.homeScore > result.awayScore) {
    return { winnerTeamId: home.id, wentToPenalties: false };
  }

  if (result.awayScore > result.homeScore) {
    return { winnerTeamId: away.id, wentToPenalties: false };
  }

  const homeStrength = home.players.filter(player => player.isStarter).reduce((sum, player) => sum + player.overall, 0);
  const awayStrength = away.players.filter(player => player.isStarter).reduce((sum, player) => sum + player.overall, 0);
  const homeTieBreaker = homeStrength + home.historicalPoints / 1000 + 0.1;
  const awayTieBreaker = awayStrength + away.historicalPoints / 1000;

  return {
    winnerTeamId: homeTieBreaker >= awayTieBreaker ? home.id : away.id,
    wentToPenalties: true,
  };
};

const emptyCompetitionStats = (): TeamStats => ({
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
});

const buildCompetitionStats = (): Record<Competition, TeamStats> => ({
  LEAGUE: emptyCompetitionStats(),
  REGIONAL: emptyCompetitionStats(),
  NATIONAL_CUP: emptyCompetitionStats(),
  CONTINENTAL: emptyCompetitionStats(),
  CONTINENTAL_SECONDARY: emptyCompetitionStats(),
  WORLD_CUP: emptyCompetitionStats(),
  OLYMPICS: emptyCompetitionStats(),
});

const calculateTeamOverall = (players: Player[]) => {
  const starters = players.filter(player => player.isStarter);
  const source = starters.length > 0 ? starters : players.slice(0, 11);
  if (source.length === 0) return 0;
  return Math.round(source.reduce((sum, player) => sum + player.overall, 0) / source.length);
};

const resetPlayerSeasonStats = (player: Player, resetCareer = false): Player => ({
  ...normalizePlayer(player),
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  matchesPlayed: 0,
  seasonMinutes: 0,
  averageRating: 0,
  ratingTotal: 0,
  ratingSamples: 0,
  form: 6,
  careerGoals: resetCareer ? 0 : player.careerGoals,
  careerAssists: resetCareer ? 0 : player.careerAssists,
  careerMatches: resetCareer ? 0 : player.careerMatches,
  yellowCardsSeason: 0,
  redCardsSeason: 0,
  disciplinary: {},
  cleanSheets: 0,
  saves: 0,
  savePercentage: 0,
  keyPasses: 0,
  tackles: 0,
  interceptions: 0,
  passAccuracy: 0,
  youthProspect: resetCareer ? true : player.youthProspect,
  injury: null,
});

const cloneCompetitionHistory = (
  history: GameState['competitionHistory'],
): Partial<Record<Competition, CompetitionHistoryEntry[]>> => {
  const entries = history ?? {};
  return Object.fromEntries(
    Object.entries(entries).map(([competition, items]) => [
      competition,
      [...(items ?? [])],
    ]),
  ) as Partial<Record<Competition, CompetitionHistoryEntry[]>>;
};

const recordCompetitionChampion = (
  history: Partial<Record<Competition, CompetitionHistoryEntry[]>>,
  competition: Competition,
  champion: CompetitionHistoryEntry,
) => {
  const currentEntries = history[competition] ?? [];
  const exists = currentEntries.some(
    entry => entry.year === champion.year && entry.championTeamId === champion.championTeamId,
  );
  if (!exists) {
    history[competition] = [...currentEntries, champion];
  }
};

const getRegionalDivisionForTeam = (team: Team, division = team.division) => {
  if (division <= 0) return 0;
  if (team.country === 'BR') return division <= 2 ? 1 : 2;
  return division;
};

const getPromotionSlots = (teamCount: number) => {
  if (teamCount >= 18) return 4;
  if (teamCount >= 10) return 2;
  if (teamCount >= 6) return 1;
  return 0;
};

const applyPromotionAndRelegation = (teams: Team[], matches: Match[]) => {
  const updatedTeams = teams.map(team => ({
    ...team,
    regionalDivision: getRegionalDivisionForTeam(team),
  }));
  const byId = new Map(updatedTeams.map(team => [team.id, team]));
  const countries = [...new Set(updatedTeams.map(team => team.country))];

  countries.forEach(country => {
    const originalCountryTeams = teams.filter(team => team.country === country && team.division > 0);
    const maxDivision = Math.max(...originalCountryTeams.map(team => team.division), 0);

    for (let division = 1; division < maxDivision; division += 1) {
      const currentDivisionTeams = originalCountryTeams.filter(team => team.division === division);
      const lowerDivisionTeams = originalCountryTeams.filter(team => team.division === division + 1);
      if (currentDivisionTeams.length < 2 || lowerDivisionTeams.length < 2) continue;

      const slots = Math.min(
        getPromotionSlots(currentDivisionTeams.length),
        getPromotionSlots(lowerDivisionTeams.length),
      );
      if (slots <= 0) continue;

      const relegated = sortTeamsByCompetitionTable(currentDivisionTeams, 'LEAGUE', matches).slice(-slots);
      const promoted = sortTeamsByCompetitionTable(lowerDivisionTeams, 'LEAGUE', matches).slice(0, slots);

      relegated.forEach(team => {
        const current = byId.get(team.id);
        if (!current) return;
        current.division = division + 1;
        current.regionalDivision = getRegionalDivisionForTeam(current, current.division);
      });

      promoted.forEach(team => {
        const current = byId.get(team.id);
        if (!current) return;
        current.division = division;
        current.regionalDivision = getRegionalDivisionForTeam(current, current.division);
      });
    }
  });

  return updatedTeams;
};

const createNewsItem = (
  type: NewsItem['type'],
  title: string,
  body: string,
  week: number,
  year: number,
  options: Partial<Pick<NewsItem, 'teamId' | 'playerId'>> = {},
): NewsItem => ({
  id: Math.random().toString(36).slice(2, 11),
  type,
  title,
  body,
  week,
  year,
  teamId: options.teamId,
  playerId: options.playerId,
  createdAt: Date.now() + Math.floor(Math.random() * 1000),
});

const appendNewsFeed = (existing: NewsItem[] | undefined, entries: NewsItem[]) =>
  [...entries, ...(existing ?? [])]
    .sort((itemA, itemB) => itemB.createdAt - itemA.createdAt)
    .slice(0, 40);

const decrementPlayerInjuries = (teams: Team[]) =>
  teams.map(team => ({
    ...team,
    players: team.players.map(player => {
      if (!player.injury || player.injury.weeksRemaining <= 0) {
        return player;
      }

      const remaining = player.injury.weeksRemaining - 1;
      return {
        ...player,
        injury:
          remaining > 0
            ? {
                ...player.injury,
                weeksRemaining: remaining,
              }
            : null,
      };
    }),
    academyPlayers: (team.academyPlayers ?? []).map(player => {
      if (!player.injury || player.injury.weeksRemaining <= 0) {
        return player;
      }

      const remaining = player.injury.weeksRemaining - 1;
      return {
        ...player,
        injury:
          remaining > 0
            ? {
                ...player.injury,
                weeksRemaining: remaining,
              }
            : null,
      };
    }),
  }));

const enforceAvailableLineup = (team: Team, competitions: Competition[]) => {
  const availablePlayers = team.players.filter(player => !isPlayerUnavailable(player, competitions));
  const preferredStarters = availablePlayers.filter(player => player.isStarter);

  team.players.forEach(player => {
    if (isPlayerUnavailable(player, competitions)) {
      player.isStarter = false;
    }
  });

  const pickByPosition = (position: Player['position'], limit: number, pool: Player[], selectedIds: Set<string>) => {
    pool
      .filter(player => player.position === position && !selectedIds.has(player.id))
      .sort((playerA, playerB) => {
        const scoreA = playerA.overall * (0.6 + playerA.energy / 250);
        const scoreB = playerB.overall * (0.6 + playerB.energy / 250);
        return scoreB - scoreA;
      })
      .slice(0, limit)
      .forEach(player => {
        selectedIds.add(player.id);
      });
  };

  const selectedIds = new Set<string>();
  const preferredByPosition = (position: Player['position']) => preferredStarters.filter(player => player.position === position);

  preferredByPosition('GK').slice(0, 1).forEach(player => selectedIds.add(player.id));
  preferredByPosition('DEF').slice(0, 4).forEach(player => selectedIds.add(player.id));
  preferredByPosition('MID').slice(0, 4).forEach(player => selectedIds.add(player.id));
  preferredByPosition('ATK').slice(0, 2).forEach(player => selectedIds.add(player.id));

  pickByPosition('GK', Math.max(0, 1 - preferredByPosition('GK').length), availablePlayers, selectedIds);
  pickByPosition('DEF', Math.max(0, 4 - preferredByPosition('DEF').length), availablePlayers, selectedIds);
  pickByPosition('MID', Math.max(0, 4 - preferredByPosition('MID').length), availablePlayers, selectedIds);
  pickByPosition('ATK', Math.max(0, 2 - preferredByPosition('ATK').length), availablePlayers, selectedIds);

  availablePlayers
    .filter(player => !selectedIds.has(player.id))
    .sort((playerA, playerB) => {
      const scoreA = playerA.overall * (0.6 + playerA.energy / 250);
      const scoreB = playerB.overall * (0.6 + playerB.energy / 250);
      return scoreB - scoreA;
    })
    .forEach(player => {
      if (selectedIds.size < 11) {
        selectedIds.add(player.id);
      }
    });

  team.players.forEach(player => {
    player.isStarter = selectedIds.has(player.id);
  });
};

const getNegotiatedMarketValue = (player: Player, currentYear: number, direction: 'buy' | 'sell') => {
  const contractYearsLeft = player.contract ? Math.max(0, player.contract.endYear - currentYear) : 1;
  const formModifier = (player.form ?? 6) >= 7.2 ? 0.1 : (player.form ?? 6) <= 5.8 ? -0.08 : 0;
  const ageModifier = player.age <= 23 ? 0.12 : player.age >= 31 ? -0.12 : 0;
  const requestModifier = player.contract?.requestedTransfer ? -0.08 : player.contract?.requestedSalaryIncrease ? 0.06 : 0;
  const contractModifier = contractYearsLeft >= 3 ? 0.08 : contractYearsLeft === 0 ? -0.12 : 0;
  const marketMultiplier =
    direction === 'buy'
      ? clamp(1.02 + formModifier + ageModifier + contractModifier + requestModifier, 0.82, 1.35)
      : clamp(0.9 + formModifier + ageModifier + contractModifier + requestModifier, 0.72, 1.18);

  return roundMoney(player.value * marketMultiplier);
};

const buildSeasonReview = (teams: Team[], matches: Match[], year: number): SeasonReview => {
  const leagueTeams = teams.filter(team => team.division > 0);
  const countries = [...new Set(leagueTeams.map(team => team.country))];
  const movements: SeasonMovement[] = [];
  const leagueChampions: SeasonReview['leagueChampions'] = [];

  countries.forEach(country => {
    const countryTeams = leagueTeams.filter(team => team.country === country);
    const maxDivision = Math.max(...countryTeams.map(team => team.division), 0);

    for (let division = 1; division <= maxDivision; division += 1) {
      const divisionTeams = countryTeams.filter(team => team.division === division);
      if (divisionTeams.length === 0) continue;

      const ordered = sortTeamsByCompetitionTable(divisionTeams, 'LEAGUE', matches);
      const champion = ordered[0];
      if (champion) {
        leagueChampions.push({
          country,
          division,
          teamId: champion.id,
          teamName: champion.name,
        });
      }

      if (division === maxDivision) continue;

      const lowerDivisionTeams = countryTeams.filter(team => team.division === division + 1);
      if (divisionTeams.length < 2 || lowerDivisionTeams.length < 2) continue;

      const slots = Math.min(getPromotionSlots(divisionTeams.length), getPromotionSlots(lowerDivisionTeams.length));
      if (slots <= 0) continue;

      ordered.slice(-slots).forEach(team => {
        movements.push({
          country,
          teamId: team.id,
          teamName: team.name,
          fromDivision: division,
          toDivision: division + 1,
        });
      });

      sortTeamsByCompetitionTable(lowerDivisionTeams, 'LEAGUE', matches)
        .slice(0, slots)
        .forEach(team => {
          movements.push({
            country,
            teamId: team.id,
            teamName: team.name,
            fromDivision: division + 1,
            toDivision: division,
          });
        });
    }
  });

  return {
    year,
    leagueChampions,
    promoted: movements.filter(movement => movement.toDivision < movement.fromDivision),
    relegated: movements.filter(movement => movement.toDivision > movement.fromDivision),
  };
};

const buildWeekSummary = (
  week: number,
  year: number,
  weekMatches: Match[],
  teams: Team[],
  userEntityIds: Set<string>,
): WeekSummary => {
  const userResults = weekMatches
    .filter(match => userEntityIds.has(match.homeTeamId) || userEntityIds.has(match.awayTeamId))
    .map(match => ({
      matchId: match.id,
      competition: match.competition,
      homeTeamName: teams.find(team => team.id === match.homeTeamId)?.name ?? 'Casa',
      awayTeamName: teams.find(team => team.id === match.awayTeamId)?.name ?? 'Fora',
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      userControlledTeamName:
        teams.find(team => userEntityIds.has(team.id) && (team.id === match.homeTeamId || team.id === match.awayTeamId))?.name ??
        undefined,
    }));

  const goalsInWeek = weekMatches.reduce((total, match) => total + match.homeScore + match.awayScore, 0);
  const headlines = [
    `${weekMatches.length} jogo(s) concluido(s) na semana ${week}.`,
    `${goalsInWeek} gol(s) marcados ao longo da rodada.`,
  ];

  return {
    week,
    year,
    hiddenMatchesCount: Math.max(0, weekMatches.length - userResults.length),
    userResults,
    headlines,
  };
};

interface GameStore extends GameState {
  startNewGame: (name: string, mode: GameMode, teamName?: string, playerDetails?: Partial<Player>) => void;
  playWeek: (
    userMatchResult?:
      | { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }
      | Array<{ matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }>
  ) => void;
  updateLineup: (teamId: string, starters: string[]) => void;
  toggleStarter: (playerId: string) => void;
  setGameState: (state: GameState) => void;
  resetGame: () => void;
  generateMarket: () => void;
  buyPlayer: (playerId: string) => void;
  sellPlayer: (playerId: string) => void;
  distributePrizeMoney: () => void;
  upgradeStadium: (type: 'capacity' | 'food' | 'merch' | 'build') => void;
  updateClubPrice: (field: 'ticketPrice' | 'shirtPrice' | 'accessoryPrice' | 'membershipPrice' | 'digitalPrice', value: number) => void;
  trainPlayer: () => { success: boolean, improved: boolean, message: string } | undefined;
  generateJobOffers: () => void;
  acceptJobOffer: (teamId: string) => void;
  generatePlayerOffers: () => void;
  acceptPlayerOffer: (teamId: string) => void;
  renewPlayerContract: (playerId: string) => void;
  releasePlayer: (playerId: string) => void;
  promoteAcademyPlayer: (playerId: string) => void;
  requestPlayerTransfer: () => void;
  retireUserPlayer: () => void;
  nextSeason: () => void;
}

const initialState: GameState = {
  teams: [],
  matches: [],
  currentWeek: 1,
  schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
  userTeamId: null,
  userPlayerId: null,
  gameMode: null,
  isGameOver: false,
  marketPlayers: [],
  activeMatchId: null,
  managerReputation: 10,
  jobOffers: [],
  currentYear: DEFAULT_START_YEAR,
  competitionHistory: {},
  retiredPlayersHistory: [],
  newsFeed: [],
  recentRoundSummary: null,
  seasonReview: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setGameState: (state) => set(normalizeGameState(state)),

  resetGame: () => set(initialState),

  generateMarket: () => {
    const { teams, currentYear = DEFAULT_START_YEAR } = get();
    const market: Player[] = [];

    teams.forEach(team => {
      if (!team.isUserControlled) {
        const availablePool = team.players.filter(
          player =>
            !player.injury &&
            (
              player.contract?.requestedTransfer ||
              player.contract?.endYear === currentYear ||
              (!player.isStarter && Math.random() > 0.72)
            ),
        );

        availablePool
          .sort((playerA, playerB) => getNegotiatedMarketValue(playerB, currentYear, 'buy') - getNegotiatedMarketValue(playerA, currentYear, 'buy'))
          .slice(0, Math.max(1, Math.min(4, availablePool.length)))
          .forEach(player => {
            market.push({ ...player });
          });
      }
    });

    set({
      marketPlayers: market.sort(
        (playerA, playerB) => getNegotiatedMarketValue(playerB, currentYear, 'buy') - getNegotiatedMarketValue(playerA, currentYear, 'buy'),
      ),
    });
  },

  buyPlayer: (playerId) => {
    const { teams, userTeamId, marketPlayers, currentYear = DEFAULT_START_YEAR, newsFeed = [], currentWeek } = get();
    if (!userTeamId) return;

    const userTeam = teams.find(t => t.id === userTeamId);
    if (!userTeam) return;

    const playerToBuy = marketPlayers.find(p => p.id === playerId);
    if (!playerToBuy) return;

    const askingPrice = getNegotiatedMarketValue(playerToBuy, currentYear, 'buy');

    if (userTeam.finances >= askingPrice) {
      set(state => ({
        teams: state.teams.map(team => {
          if (team.id === userTeamId) {
            return {
              ...team,
              finances: team.finances - askingPrice,
              players: [
                ...team.players,
                {
                  ...playerToBuy,
                  isStarter: false,
                  contract: playerToBuy.contract
                    ? {
                        ...playerToBuy.contract,
                        requestedTransfer: false,
                      }
                    : playerToBuy.contract,
                },
              ]
            };
          }
          // Remove from original team
          if (team.players.some(p => p.id === playerId)) {
            return {
              ...team,
              finances: team.finances + askingPrice,
              players: team.players.filter(p => p.id !== playerId)
            };
          }
          return team;
        }),
        marketPlayers: state.marketPlayers.filter(p => p.id !== playerId),
        newsFeed: appendNewsFeed(newsFeed, [
          createNewsItem(
            'TRANSFER',
            'Reforco confirmado',
            `${playerToBuy.name} assinou com ${userTeam.name} por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(askingPrice)}.`,
            currentWeek,
            currentYear,
            { teamId: userTeam.id, playerId: playerToBuy.id },
          ),
        ]),
      }));
    }
  },

  sellPlayer: (playerId) => {
    const { teams, userTeamId, currentYear = DEFAULT_START_YEAR, newsFeed = [], currentWeek } = get();
    if (!userTeamId) return;

    const userTeam = teams.find(t => t.id === userTeamId);
    if (!userTeam) return;

    const playerToSell = userTeam.players.find(p => p.id === playerId);
    if (!playerToSell) return;
    const saleValue = getNegotiatedMarketValue(playerToSell, currentYear, 'sell');

    set(state => ({
      teams: state.teams.map(team => {
        if (team.id === userTeamId) {
          return {
            ...team,
            finances: team.finances + saleValue,
            players: team.players.filter(p => p.id !== playerId)
          };
        }
        return team;
      }),
      marketPlayers: [...state.marketPlayers, { ...playerToSell, isStarter: false }],
      newsFeed: appendNewsFeed(newsFeed, [
        createNewsItem(
          'TRANSFER',
          'Saida confirmada',
          `${playerToSell.name} deixou ${userTeam.name} por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(saleValue)}.`,
          currentWeek,
          currentYear,
          { teamId: userTeam.id, playerId: playerToSell.id },
        ),
      ]),
    }));
  },

  startNewGame: (name, mode, teamName, playerDetails) => {
    const teams = generateTeams();
    const currentYear = DEFAULT_START_YEAR;
    const internationalCompetitions = getInternationalCompetitionsForYear(currentYear);
    let userTeamId = null;
    let userPlayerId = null;

    if (mode === 'manager' && teamName) {
      const userTeam = teams.find(t => t.name === teamName);
      if (userTeam) {
        userTeam.isUserControlled = true;
        userTeamId = userTeam.id;
      }
    } else if (mode === 'player') {
      // Create a player and assign to a random lowest division team of their nationality
      const nationality = playerDetails?.nationality || 'BR';
      const countryTeams = teams.filter(t => t.country === nationality);
      const maxDiv = Math.max(...countryTeams.map(t => t.division));
      const lowestDivTeams = countryTeams.filter(t => t.division === maxDiv);
      
      let selectedTeam = teamName ? teams.find(t => t.id === teamName) : null;
      if (!selectedTeam) {
        selectedTeam = lowestDivTeams[Math.floor(Math.random() * lowestDivTeams.length)];
      }
      
      const createdPlayer: Player = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        position: playerDetails?.position || 'ATK',
        overall: 65,
        age: playerDetails?.age || 18,
        energy: 100,
        isStarter: true,
        value: 1000000,
        salary: 10000,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        nationality: playerDetails?.nationality,
        preferredFoot: playerDetails?.preferredFoot,
        height: playerDetails?.height,
        weight: playerDetails?.weight,
        jerseyNumber: playerDetails?.jerseyNumber,
        careerGoals: 0,
        careerAssists: 0,
        careerMatches: 0,
        seasonMinutes: 0,
        averageRating: 0,
        ratingTotal: 0,
        ratingSamples: 0,
        form: 6,
        nationalCaps: 0,
        nationalGoals: 0,
        nationalCallUpHistory: [],
        nationalTournamentHistory: [],
        yellowCardsSeason: 0,
        redCardsSeason: 0,
        disciplinary: {},
        potential: 84,
        status: 'ACTIVE',
        cleanSheets: 0,
        saves: 0,
        savePercentage: 0,
        keyPasses: 0,
        tackles: 0,
        interceptions: 0,
        passAccuracy: 0,
        titlesWon: 0,
        youthProspect: false,
      };
      const newPlayer = recalculatePlayerEconomics(
        {
          ...createdPlayer,
          contract: createPlayerContract(createdPlayer, currentYear),
        },
        currentYear,
      );

      if (selectedTeam) {
        selectedTeam.players.push(newPlayer);
        selectedTeam.isUserControlled = true;
        userTeamId = selectedTeam.id;
        userPlayerId = newPlayer.id;
      }
    }

    const nationalTeams = generateNationalTeams(teams, currentYear, internationalCompetitions);
    const allTeams = [...teams, ...nationalTeams];

    const matches = generateSchedule(allTeams, { currentYear });

    set({
      teams: allTeams,
      matches,
      currentWeek: 1,
      userTeamId,
      userPlayerId,
      gameMode: mode,
      isGameOver: false,
      marketPlayers: [],
      activeMatchId: null,
      managerReputation: 10,
      jobOffers: [],
      currentYear,
      competitionHistory: {},
      retiredPlayersHistory: [],
      newsFeed: [
        createNewsItem(
          'GENERAL',
          'Nova carreira iniciada',
          mode === 'player'
            ? `${name} comeca a carreira em ${teams.find(team => team.id === userTeamId)?.name ?? 'seu clube'}.`
            : `${name} assume o comando de ${teams.find(team => team.id === userTeamId)?.name ?? 'seu clube'}.`,
          1,
          currentYear,
          { teamId: userTeamId ?? undefined, playerId: userPlayerId ?? undefined },
        ),
      ],
      recentRoundSummary: null,
      seasonReview: null,
    });
    
    get().generateMarket();
  },

  distributePrizeMoney: () => {
    const { teams } = get();
    
    set(state => ({
      teams: state.teams.map(team => {
        let prize = 0;
        let histPoints = 0;
        
        // League prizes based on division and points (simplified)
        const leagueMultiplier = team.division === 1 ? 1000000 : team.division === 2 ? 500000 : team.division === 3 ? 250000 : 100000;
        prize += team.stats.LEAGUE.points * leagueMultiplier;
        histPoints += team.stats.LEAGUE.points * (5 - team.division); // More points for higher divisions
        
        // Continental prizes
        prize += team.stats.CONTINENTAL.wins * 2000000;
        histPoints += team.stats.CONTINENTAL.wins * 10;
        
        prize += team.stats.CONTINENTAL_SECONDARY.wins * 1000000;
        histPoints += team.stats.CONTINENTAL_SECONDARY.wins * 5;
        
        // National Cup prizes
        prize += team.stats.NATIONAL_CUP.wins * 500000;
        histPoints += team.stats.NATIONAL_CUP.wins * 3;

        return {
          ...team,
          finances: team.finances + prize,
          historicalPoints: team.historicalPoints + histPoints
        };
      })
    }));
  },

  playWeek: (
    userMatchResult?:
      | { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }
      | Array<{ matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }>
  ) => {
    const {
      matches,
      teams,
      currentWeek,
      currentYear = DEFAULT_START_YEAR,
      userTeamId,
      userPlayerId,
      gameMode,
      newsFeed = [],
    } = get();
    const userNationalTeamId =
      gameMode === 'player'
        ? teams.find(
            team =>
              team.division === 0 &&
              (team.players.some(player => player.id === userPlayerId) ||
                Object.values(team.competitionSquads ?? {}).some(players => players?.some(player => player.id === userPlayerId))),
          )?.id ?? null
        : null;
    const userEntityIds = new Set([userTeamId, userNationalTeamId].filter((value): value is string => Boolean(value)));
    
    const weekMatches = matches.filter(m => m.week === currentWeek && !m.played);
    if (weekMatches.length === 0) {
      // Check if game is over (no more matches)
      const hasMoreMatches = matches.some(m => m.week > currentWeek);
      if (!hasMoreMatches) {
        get().distributePrizeMoney();
        if (get().gameMode === 'manager') {
          get().generateJobOffers();
        } else if (get().gameMode === 'player') {
          get().generatePlayerOffers();
        }
        set({ isGameOver: true });
      } else {
        set({ currentWeek: currentWeek + 1 });
        // Generate market every 4 weeks
        if (currentWeek % 4 === 0) {
          get().generateMarket();
        }
      }
      return;
    }

    const updatedTeams = decrementPlayerInjuries(cloneTeams(teams));
    const updatedMatches = [...matches];
    const competitionHistory = cloneCompetitionHistory(get().competitionHistory);
    const providedResults = Array.isArray(userMatchResult)
      ? userMatchResult
      : userMatchResult
        ? [userMatchResult]
        : [];
    const providedResultMap = new Map(providedResults.map(result => [result.matchId, result]));
    const generatedNews: NewsItem[] = [];

    updatedTeams.forEach(team => {
      const teamCompetitionsThisWeek = weekMatches
        .filter(match => match.homeTeamId === team.id || match.awayTeamId === team.id)
        .map(match => match.competition);
      if (teamCompetitionsThisWeek.length === 0) return;
      enforceAvailableLineup(team, teamCompetitionsThisWeek);
    });

    updatedTeams.forEach(team => {
      if (team.division <= 0) return;
      const report = estimateWeeklyCommercialRevenue(team, currentWeek);
      team.finances += report.totalRevenue;
      team.commercial = {
        ...ensureTeamCommercial(team).commercial!,
        lastWeeklyReport: report,
      };
    });

    // Deduct weekly salaries (simplified: monthly salary / 4)
    updatedTeams.forEach(team => {
      const weeklySalary = team.players.reduce((sum, p) => sum + p.salary, 0) / 4;
      team.finances -= weeklySalary;
    });

    const playedPlayerIds = new Set<string>();

    weekMatches.forEach(match => {
      const home = updatedTeams.find(t => t.id === match.homeTeamId);
      const away = updatedTeams.find(t => t.id === match.awayTeamId);
      const hasBye = !home || !away;

      let result: { homeScore: number; awayScore: number; events: MatchEvent[] };
      let winnerInfo: { winnerTeamId: string | null; wentToPenalties: boolean } | undefined;
      const comp = match.competition;

      if (hasBye) {
        result = { homeScore: 0, awayScore: 0, events: [] };
        winnerInfo = {
          winnerTeamId: home?.id ?? away?.id ?? null,
          wentToPenalties: false,
        };
      } else {
        if (home.stadium) {
          const attendance = estimateMatchdayAttendance(home);
          const ticketRev = attendance * home.stadium.ticketPrice;
          const foodRev = attendance * home.stadium.foodLevel * 15;
          const merchRev = attendance * home.stadium.merchLevel * 25;
          home.finances += ticketRev + foodRev + merchRev;
        }

        const precomputedResult = providedResultMap.get(match.id);
        if (precomputedResult) {
          result = precomputedResult;
        } else {
          result = simulateMatch(home, away, { competition: comp, isKnockout: Boolean(match.isKnockout) });
        }

        if (match.isKnockout) {
          winnerInfo = resolveKnockoutWinner(home, away, result);
        }
      }

      const matchIndex = updatedMatches.findIndex(m => m.id === match.id);
      updatedMatches[matchIndex] = {
        ...match,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        played: true,
        winnerTeamId: winnerInfo?.winnerTeamId ?? match.winnerTeamId ?? null,
        wentToPenalties: winnerInfo?.wentToPenalties ?? false,
        events: result.events.map(event => ({ ...event, matchId: match.id })),
      };

      if (match.isKnockout && (match.roundSize ?? 0) === 2 && winnerInfo?.winnerTeamId) {
        const championTeam = updatedTeams.find(team => team.id === winnerInfo?.winnerTeamId);
        if (championTeam) {
          championTeam.players.forEach(player => {
            player.titlesWon = (player.titlesWon ?? 0) + 1;
          });
          if (comp === 'WORLD_CUP' || comp === 'OLYMPICS') {
            recordCompetitionChampion(competitionHistory, comp, {
              year: match.seasonYear ?? currentYear,
              championTeamId: championTeam.id,
              championName: championTeam.name,
            });
          }
        }
      }

      if (!home || !away) {
        return;
      }

      [home, away].forEach(team => {
        getCompetitionPlayers(team, comp).forEach(player => {
          mutatePlayerAcrossTeams(updatedTeams, player.id, currentPlayer => {
            const record = getPlayerCompetitionRecord(currentPlayer, comp);
            if (record.suspendedMatches > 0) {
              setPlayerCompetitionRecord(currentPlayer, comp, currentRecord => ({
                ...currentRecord,
                suspendedMatches: currentRecord.suspendedMatches - 1,
                matchesSuspended: currentRecord.matchesSuspended + 1,
              }));
            }
          });
        });
      });

      const { userTeamId, managerReputation } = get();
      let newReputation = managerReputation;
      const userParticipated = home.id === userTeamId || away.id === userTeamId;
      if (userParticipated) {
        if (match.isKnockout && winnerInfo?.winnerTeamId) {
          newReputation =
            winnerInfo.winnerTeamId === userTeamId
              ? Math.min(100, newReputation + 1)
              : Math.max(0, newReputation - 1);
        } else {
          const isHome = home.id === userTeamId;
          const userScore = isHome ? result.homeScore : result.awayScore;
          const oppScore = isHome ? result.awayScore : result.homeScore;

          if (userScore > oppScore) newReputation = Math.min(100, newReputation + 1);
          else if (userScore < oppScore) newReputation = Math.max(0, newReputation - 1);
          else newReputation = Math.min(100, newReputation + 0.2);
        }
        set({ managerReputation: newReputation });

        generatedNews.push(
          createNewsItem(
            'MATCH',
            `Resultado: ${home.name} ${result.homeScore} x ${result.awayScore} ${away.name}`,
            match.isKnockout && winnerInfo?.wentToPenalties
              ? `A decisao foi para os penaltis em ${match.competition}.`
              : `Partida concluida em ${match.competition}.`,
            currentWeek,
            currentYear,
            { teamId: home.id === userTeamId || home.id === userNationalTeamId ? home.id : away.id },
          ),
        );
      }

      const homeIndex = updatedTeams.findIndex(team => team.id === home.id);
      const awayIndex = updatedTeams.findIndex(team => team.id === away.id);
      const isInternationalMatch = home.division === 0 && away.division === 0;

      updatedTeams[homeIndex].stats[comp].goalsFor += result.homeScore;
      updatedTeams[homeIndex].stats[comp].goalsAgainst += result.awayScore;
      updatedTeams[homeIndex].stats[comp].played += 1;

      updatedTeams[awayIndex].stats[comp].goalsFor += result.awayScore;
      updatedTeams[awayIndex].stats[comp].goalsAgainst += result.homeScore;
      updatedTeams[awayIndex].stats[comp].played += 1;

      if (match.isKnockout) {
        if (result.homeScore === result.awayScore) {
          updatedTeams[homeIndex].stats[comp].draws += 1;
          updatedTeams[awayIndex].stats[comp].draws += 1;
        }

        if (winnerInfo?.winnerTeamId === home.id) {
          updatedTeams[homeIndex].stats[comp].wins += 1;
          updatedTeams[awayIndex].stats[comp].losses += 1;
        } else if (winnerInfo?.winnerTeamId === away.id) {
          updatedTeams[awayIndex].stats[comp].wins += 1;
          updatedTeams[homeIndex].stats[comp].losses += 1;
        }
      } else if (result.homeScore > result.awayScore) {
        updatedTeams[homeIndex].stats[comp].wins += 1;
        updatedTeams[homeIndex].stats[comp].points += 3;
        updatedTeams[awayIndex].stats[comp].losses += 1;
      } else if (result.homeScore < result.awayScore) {
        updatedTeams[awayIndex].stats[comp].wins += 1;
        updatedTeams[awayIndex].stats[comp].points += 3;
        updatedTeams[homeIndex].stats[comp].losses += 1;
      } else {
        updatedTeams[homeIndex].stats[comp].draws += 1;
        updatedTeams[homeIndex].stats[comp].points += 1;
        updatedTeams[awayIndex].stats[comp].draws += 1;
        updatedTeams[awayIndex].stats[comp].points += 1;
      }

      const homeEvents = result.events.filter(event => event.teamId === home.id);
      const awayEvents = result.events.filter(event => event.teamId === away.id);
      const homeMatchTeam = { ...home, players: getCompetitionPlayers(home, comp) };
      const awayMatchTeam = { ...away, players: getCompetitionPlayers(away, comp) };
      const homeMinutes = getMinutesPlayedMap(homeMatchTeam, homeEvents);
      const awayMinutes = getMinutesPlayedMap(awayMatchTeam, awayEvents);

      const registerPlayerAppearance = (
        participantTeam: Team,
        participantEvents: MatchEvent[],
        minutesMap: Map<string, number>,
        teamScore: number,
        opponentScore: number,
      ) => {
        const competitionPlayers = getCompetitionPlayers(participantTeam, comp);
        const activePlayerIds = new Set<string>([
          ...competitionPlayers.filter(player => player.isStarter).map(player => player.id),
          ...participantEvents
            .filter(event => event.type === 'SUBSTITUTION')
            .map(event => event.playerId),
        ]);

        activePlayerIds.forEach(playerId => {
          const minutesPlayed = minutesMap.get(playerId) ?? 0;
          if (minutesPlayed <= 0) return;

          playedPlayerIds.add(playerId);
          const rating = calculatePlayerRating(playerId, teamScore, opponentScore, participantEvents, minutesPlayed);

          mutatePlayerAcrossTeams(updatedTeams, playerId, player => {
            player.matchesPlayed += 1;
            player.careerMatches = (player.careerMatches || 0) + 1;
            player.seasonMinutes = (player.seasonMinutes || 0) + minutesPlayed;
            player.ratingSamples = (player.ratingSamples || 0) + 1;
            player.ratingTotal = (player.ratingTotal || 0) + rating;
            player.averageRating = Number((player.ratingTotal / player.ratingSamples).toFixed(2));
            player.form = Number((((player.form ?? 6) * 0.7) + rating * 0.3).toFixed(2));

            if (player.position === 'MID') {
              player.keyPasses = (player.keyPasses ?? 0) + Math.max(0, Math.round(rating - 5));
              player.passAccuracy = Number(
                clamp(
                  (((player.passAccuracy ?? 74) * Math.max(player.matchesPlayed - 1, 0)) + (72 + rating * 2)) /
                    player.matchesPlayed,
                  55,
                  95,
                ).toFixed(1),
              );
            } else if (player.position === 'DEF') {
              player.tackles = (player.tackles ?? 0) + Math.max(1, Math.round((minutesPlayed / 90) * (2 + rating / 2)));
              player.interceptions =
                (player.interceptions ?? 0) + Math.max(1, Math.round((minutesPlayed / 90) * (1 + rating / 2.4)));
            } else if (player.position === 'GK') {
              const goalsConceded = opponentScore;
              const estimatedShotsOnTarget = Math.max(goalsConceded + 1, Math.round(3 + opponentScore * 1.8 + (10 - rating)));
              const saves = Math.max(0, estimatedShotsOnTarget - goalsConceded);
              const totalSaves = (player.saves ?? 0) + saves;
              player.saves = totalSaves;
              player.savePercentage = Number(
                ((totalSaves / Math.max(totalSaves + goalsConceded, 1)) * 100).toFixed(1),
              );
            }

            if (opponentScore === 0 && (player.position === 'GK' || player.position === 'DEF')) {
              player.cleanSheets = (player.cleanSheets ?? 0) + 1;
            }

            if (isInternationalMatch) {
              player.nationalCaps = (player.nationalCaps || 0) + 1;
            }
          });
        });
      };

      registerPlayerAppearance(home, homeEvents, homeMinutes, result.homeScore, result.awayScore);
      registerPlayerAppearance(away, awayEvents, awayMinutes, result.awayScore, result.homeScore);

      const maybeCreateInjuryEvent = (
        participantTeam: Team,
        participantMinutes: Map<string, number>,
        baseMinute: number,
      ) => {
        const injuryChance = match.competition === 'REGIONAL' || match.competition === 'NATIONAL_CUP' ? 0.07 : 0.05;
        if (Math.random() > injuryChance) return;

        const candidates = participantTeam.players.filter(
          player => (participantMinutes.get(player.id) ?? 0) >= 20 && !isPlayerInjured(player),
        );
        if (candidates.length === 0) return;

        const injuredPlayer = candidates[Math.floor(Math.random() * candidates.length)];
        const weeksRemaining = Math.floor(Math.random() * 4) + 1;
        const severity = weeksRemaining >= 4 ? 'HIGH' : weeksRemaining >= 2 ? 'MEDIUM' : 'LOW';
        const injuryType =
          severity === 'HIGH'
            ? 'lesao muscular'
            : severity === 'MEDIUM'
              ? 'entorse'
              : 'desconforto muscular';
        const eventMinute = Math.min(118, baseMinute + Math.floor(Math.random() * 6));
        const injuryEvent: MatchEvent = {
          id: Math.random().toString(36).slice(2, 11),
          matchId: match.id,
          minute: eventMinute,
          type: 'INJURY',
          teamId: participantTeam.id,
          playerId: injuredPlayer.id,
          reason: `${injuryType} (${weeksRemaining} semana${weeksRemaining > 1 ? 's' : ''})`,
        };

        mutatePlayerAcrossTeams(updatedTeams, injuredPlayer.id, player => {
          player.injury = {
            type: injuryType,
            severity,
            startWeek: currentWeek,
            expectedRecoveryWeek: currentWeek + weeksRemaining,
            weeksRemaining,
          };
          player.energy = Math.max(0, player.energy - 10);
          player.form = Number(Math.max(4.5, (player.form ?? 6) - 0.35).toFixed(2));
        });

        result.events.push(injuryEvent);

        if (userEntityIds.has(participantTeam.id)) {
          generatedNews.push(
            createNewsItem(
              'INJURY',
              'Departamento medico em alerta',
              `${injuredPlayer.name} sofreu ${injuryType} e desfalca ${participantTeam.name} por ${weeksRemaining} semana${weeksRemaining > 1 ? 's' : ''}.`,
              currentWeek,
              currentYear,
              { teamId: participantTeam.id, playerId: injuredPlayer.id },
            ),
          );
        }
      };

      maybeCreateInjuryEvent(home, homeMinutes, 58);
      maybeCreateInjuryEvent(away, awayMinutes, 63);

      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        events: [...result.events].sort((eventA, eventB) => eventA.minute - eventB.minute),
      };

      result.events.forEach(event => {
        mutatePlayerAcrossTeams(updatedTeams, event.playerId, player => {
          if (event.type === 'GOAL') {
            player.goals += 1;
            player.careerGoals = (player.careerGoals || 0) + 1;
            if (isInternationalMatch) {
              player.nationalGoals = (player.nationalGoals || 0) + 1;
            }
          }

          if (event.type === 'YELLOW_CARD') {
            player.yellowCards += 1;
            player.yellowCardsSeason = (player.yellowCardsSeason || 0) + 1;
            if (event.reason !== 'Segundo amarelo') {
              setPlayerCompetitionRecord(player, comp, currentRecord => {
                const accumulatedYellows = currentRecord.accumulatedYellows + 1;
                const suspendedMatches =
                  accumulatedYellows >= YELLOW_SUSPENSION_THRESHOLD
                    ? currentRecord.suspendedMatches + 1
                    : currentRecord.suspendedMatches;
                return {
                  ...currentRecord,
                  yellowCards: currentRecord.yellowCards + 1,
                  accumulatedYellows:
                    accumulatedYellows >= YELLOW_SUSPENSION_THRESHOLD ? 0 : accumulatedYellows,
                  suspendedMatches,
                };
              });
            }
          }

          if (event.type === 'RED_CARD') {
            player.redCards += 1;
            player.redCardsSeason = (player.redCardsSeason || 0) + 1;
            setPlayerCompetitionRecord(player, comp, currentRecord => ({
              ...currentRecord,
              redCards: currentRecord.redCards + 1,
              suspendedMatches: currentRecord.suspendedMatches + (event.reason === 'Conduta violenta' ? 2 : 1),
            }));
          }
        });

        if (event.type === 'GOAL' && event.assistPlayerId) {
          mutatePlayerAcrossTeams(updatedTeams, event.assistPlayerId, player => {
            player.assists += 1;
            player.careerAssists = (player.careerAssists || 0) + 1;
          });
        }

        if (event.type === 'SUBSTITUTION') {
          playedPlayerIds.add(event.playerId);
          if (event.assistPlayerId) {
            playedPlayerIds.add(event.assistPlayerId);
          }
        }
      });
    });

    // Update Energy
    const processedEnergy = new Map<string, number>();
    updatedTeams.forEach(team => {
      team.players.forEach(player => {
        if (!processedEnergy.has(player.id)) {
          if (playedPlayerIds.has(player.id)) {
            // Played: lose energy
            player.energy = Math.max(0, Math.round(player.energy - (15 + Math.random() * 15)));
          } else {
            // Rested: gain energy
            player.energy = Math.min(100, Math.round(player.energy + (20 + Math.random() * 10)));
          }
          processedEnergy.set(player.id, player.energy);
        } else {
          // Sync energy if already processed
          player.energy = processedEnergy.get(player.id)!;
        }
      });
    });

    const nextGroupStageMatches = advanceInternationalGroupTournaments(updatedMatches, updatedTeams, currentWeek);
    const nextKnockoutMatches = advanceKnockoutTournaments(updatedMatches, updatedTeams, currentWeek);
    const domesticCompetitions: Competition[] = ['LEAGUE', 'REGIONAL', 'NATIONAL_CUP'];
    const continentalAlreadyScheduled = updatedMatches.some(match => match.competition === 'CONTINENTAL');
    const pendingDomesticMatches = updatedMatches.some(
      match => domesticCompetitions.includes(match.competition) && !match.played,
    );

    const continentalMatches =
      !continentalAlreadyScheduled && !pendingDomesticMatches
        ? generateContinentalCompetitions(updatedTeams, updatedTeams, currentYear, currentWeek + 1, updatedMatches)
        : [];

    const nextMatches = [...updatedMatches, ...nextGroupStageMatches, ...nextKnockoutMatches, ...continentalMatches].sort(
      (matchA, matchB) => matchA.week - matchB.week,
    );
    const hasMoreMatches = nextMatches.some(match => !match.played && match.week > currentWeek);
    const finalTeams = !hasMoreMatches
      ? updatedTeams.map(team => {
          let prize = 0;
          let histPoints = 0;
          const leagueMultiplier =
            team.division === 1 ? 1_000_000 : team.division === 2 ? 500_000 : team.division === 3 ? 250_000 : 100_000;
          prize += team.stats.LEAGUE.points * leagueMultiplier;
          histPoints += team.stats.LEAGUE.points * (5 - Math.max(team.division, 1));
          prize += team.stats.CONTINENTAL.wins * 2_000_000;
          histPoints += team.stats.CONTINENTAL.wins * 10;
          prize += team.stats.CONTINENTAL_SECONDARY.wins * 1_000_000;
          histPoints += team.stats.CONTINENTAL_SECONDARY.wins * 5;
          prize += team.stats.NATIONAL_CUP.wins * 500_000;
          histPoints += team.stats.NATIONAL_CUP.wins * 3;

          return {
            ...team,
            finances: team.finances + prize,
            historicalPoints: team.historicalPoints + histPoints,
          };
        })
      : updatedTeams;
    const recentRoundSummary = buildWeekSummary(currentWeek, currentYear, updatedMatches.filter(match => match.week === currentWeek), updatedTeams, userEntityIds);
    const seasonReview = hasMoreMatches ? get().seasonReview ?? null : buildSeasonReview(finalTeams, updatedMatches, currentYear);
    const seasonNews = !hasMoreMatches
      ? [
          ...seasonReview.promoted.map(movement =>
            createNewsItem(
              'SEASON',
              'Promocao confirmada',
              `${movement.teamName} garantiu acesso para a divisao ${movement.toDivision}.`,
              currentWeek,
              currentYear,
              { teamId: movement.teamId },
            ),
          ),
          ...seasonReview.relegated.map(movement =>
            createNewsItem(
              'SEASON',
              'Rebaixamento confirmado',
              `${movement.teamName} caiu para a divisao ${movement.toDivision}.`,
              currentWeek,
              currentYear,
              { teamId: movement.teamId },
            ),
          ),
        ]
      : [];

    set({
      teams: finalTeams,
      matches: nextMatches,
      currentWeek: currentWeek + 1,
      competitionHistory,
      recentRoundSummary,
      newsFeed: appendNewsFeed(newsFeed, [...seasonNews, ...generatedNews]),
      seasonReview,
      isGameOver: !hasMoreMatches,
    });

    if (!hasMoreMatches) {
      if (get().gameMode === 'manager') {
        get().generateJobOffers();
      } else if (get().gameMode === 'player') {
        get().generatePlayerOffers();
      }
    }
  },

  updateLineup: (teamId, starters) => {
    set(state => ({
      teams: state.teams.map(team => {
        if (team.id !== teamId) return team;
        return {
          ...team,
          players: team.players.map(player => ({
            ...player,
            isStarter: starters.includes(player.id)
          }))
        };
      })
    }));
  },

  toggleStarter: (playerId) => {
    set(state => {
      const { userTeamId, teams, gameMode } = state;
      if (!userTeamId || gameMode === 'player') return state;

      const userTeam = teams.find(t => t.id === userTeamId);
      if (!userTeam) return state;

      const player = userTeam.players.find(p => p.id === playerId);
      if (!player) return state;
      const nextUserMatch = state.matches.find(
        match =>
          !match.played &&
          (match.homeTeamId === userTeamId || match.awayTeamId === userTeamId),
      );
      if (nextUserMatch && isPlayerSuspendedForCompetition(player, nextUserMatch.competition)) {
        return state;
      }
      if (isPlayerInjured(player)) {
        return state;
      }

      const startersCount = userTeam.players.filter(p => p.isStarter).length;

      // Se já é titular, pode remover (a menos que seja o único, mas vamos permitir)
      // Se não é titular, só pode adicionar se tiver menos de 11
      if (!player.isStarter && startersCount >= 11) {
        return state;
      }

      return {
        teams: state.teams.map(team => {
          if (team.id !== userTeamId) return team;
          return {
            ...team,
            players: team.players.map(p => 
              p.id === playerId ? { ...p, isStarter: !p.isStarter } : p
            )
          };
        })
      };
    });
  },

  upgradeStadium: (type) => {
    const { teams, userTeamId } = get();
    if (!userTeamId) return;

    set(state => ({
      teams: state.teams.map(team => {
        if (team.id !== userTeamId) return team;

        const newTeam = { ...team };
        
        if (type === 'build' && !newTeam.stadium) {
          const cost = 5000000;
          if (newTeam.finances >= cost) {
            newTeam.finances -= cost;
            newTeam.stadium = {
              name: `Arena ${newTeam.name}`,
              capacity: 5000,
              ticketPrice: 30,
              foodLevel: 0,
              merchLevel: 0
            };
          }
        } else if (newTeam.stadium) {
          if (type === 'capacity') {
            const cost = 2000000;
            if (newTeam.finances >= cost) {
              newTeam.finances -= cost;
              newTeam.stadium.capacity += 5000;
            }
          } else if (type === 'food') {
            const cost = 1000000;
            if (newTeam.finances >= cost && newTeam.stadium.foodLevel < 5) {
              newTeam.finances -= cost;
              newTeam.stadium.foodLevel += 1;
            }
          } else if (type === 'merch') {
            const cost = 1500000;
            if (newTeam.finances >= cost && newTeam.stadium.merchLevel < 5) {
              newTeam.finances -= cost;
              newTeam.stadium.merchLevel += 1;
            }
          }
        }
        return newTeam;
      })
    }));
  },

  updateClubPrice: (field, value) => {
    const { userTeamId } = get();
    if (!userTeamId) return;

    const normalizedValue = Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;

    set(state => ({
      teams: state.teams.map(team => {
        if (team.id !== userTeamId) return team;

        const updatedTeam = ensureTeamCommercial({ ...team });
        if (field === 'ticketPrice' && updatedTeam.stadium) {
          return {
            ...updatedTeam,
            stadium: {
              ...updatedTeam.stadium,
              ticketPrice: normalizedValue,
            },
          };
        }

        return {
          ...updatedTeam,
          commercial: {
            ...updatedTeam.commercial!,
            [field]: normalizedValue,
          },
        };
      }),
    }));
  },

  trainPlayer: () => {
    const { teams, userPlayerId } = get();
    if (!userPlayerId) return undefined;

    let result = { success: false, improved: false, message: 'Não foi possível treinar.' };
    let energyDeducted = false;
    let overallIncreased = false;
    let newOverall = 0;
    let newValue = 0;
    let newSalary = 0;

    set(state => ({
      teams: state.teams.map(team => {
        const playerIndex = team.players.findIndex(p => p.id === userPlayerId);
        if (playerIndex !== -1) {
          const newTeam = { ...team };
          const player = { ...newTeam.players[playerIndex] };
          
          if (!energyDeducted) {
            if (player.energy >= 20) {
              player.energy -= 20;
              result.success = true;
              result.message = 'Treino concluído! Você gastou 20 de energia.';
              // Small chance to increase overall
              if (Math.random() > 0.7 && player.overall < 99) {
                player.overall += 1;
                player.potential = Math.max(player.potential ?? player.overall, player.overall + 2);
                Object.assign(player, recalculatePlayerEconomics(player, get().currentYear ?? DEFAULT_START_YEAR));
                result.improved = true;
                result.message = 'Treino excelente! Seu overall aumentou em +1.';
                
                overallIncreased = true;
                newOverall = player.overall;
                newValue = player.value;
                newSalary = player.salary;
              }
              energyDeducted = true;
            } else {
              result.message = 'Energia insuficiente para treinar.';
              return team; // Don't update if not enough energy
            }
          } else {
            // Apply the same updates to other instances of the player (e.g., national team)
            player.energy -= 20;
            if (overallIncreased) {
              player.overall = newOverall;
              player.value = newValue;
              player.salary = newSalary;
              Object.assign(player, recalculatePlayerEconomics(player, get().currentYear ?? DEFAULT_START_YEAR));
            }
          }
          
          newTeam.players[playerIndex] = player;
          return newTeam;
        }
        return team;
      })
    }));

    return result;
  },

  generateJobOffers: () => {
    const { teams, managerReputation, gameMode, userTeamId } = get();
    if (gameMode !== 'manager') return;

    const offers: string[] = [];
    
    let targetDivision = 4;
    if (managerReputation > 75) targetDivision = 1;
    else if (managerReputation > 50) targetDivision = 2;
    else if (managerReputation > 25) targetDivision = 3;

    // Get teams from target division or lower (excluding current team)
    const eligibleTeams = teams.filter(t => t.division >= targetDivision && t.id !== userTeamId);
    
    // Pick 1-3 random teams
    const numOffers = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numOffers; i++) {
      if (eligibleTeams.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleTeams.length);
        offers.push(eligibleTeams[randomIndex].id);
        eligibleTeams.splice(randomIndex, 1); // Prevent duplicate offers
      }
    }

    set({ jobOffers: offers });
  },

  acceptJobOffer: (teamId: string) => {
    const { teams, userTeamId } = get();
    set({
      teams: teams.map(t => {
        if (t.id === userTeamId) return { ...t, isUserControlled: false };
        if (t.id === teamId) return { ...t, isUserControlled: true };
        return t;
      }),
      userTeamId: teamId,
      jobOffers: []
    });
  },

  generatePlayerOffers: () => {
    const { teams, userPlayerId, userTeamId } = get();
    const offers: string[] = [];
    
    const userTeam = teams.find(t => t.id === userTeamId);
    if (!userTeam) return;
    
    const userPlayer = userTeam.players.find(p => p.id === userPlayerId);
    if (!userPlayer) return;

    let maxDivision = 4;
    if (userPlayer.overall >= 82 || (userPlayer.averageRating ?? 6) >= 7.4) maxDivision = 1;
    else if (userPlayer.overall >= 72 || (userPlayer.averageRating ?? 6) >= 7.0) maxDivision = 2;
    else if (userPlayer.overall >= 62) maxDivision = 3;

    const eligibleTeams = teams.filter(t => t.division > 0 && t.division <= maxDivision && t.id !== userTeamId);
    
    // Pick 1-3 random teams
    const numOffers = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numOffers; i++) {
      if (eligibleTeams.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleTeams.length);
        offers.push(eligibleTeams[randomIndex].id);
        eligibleTeams.splice(randomIndex, 1); // Prevent duplicate offers
      }
    }

    set({ jobOffers: offers });
  },

  acceptPlayerOffer: (teamId: string) => {
    const { teams, userTeamId, userPlayerId } = get();
    
    const oldTeam = teams.find(t => t.id === userTeamId);
    if (!oldTeam) return;
    
    const userPlayer = oldTeam.players.find(p => p.id === userPlayerId);
    if (!userPlayer) return;

    set({
      teams: teams.map(t => {
        if (t.id === userTeamId) {
          return {
            ...t,
            isUserControlled: false,
            players: t.players.filter(p => p.id !== userPlayerId)
          };
        }
        if (t.id === teamId) {
          return {
            ...t,
            isUserControlled: true,
            players: [...t.players, { ...userPlayer, isStarter: true }]
          };
        }
        return t;
      }),
      userTeamId: teamId,
      jobOffers: []
    });
  },

  renewPlayerContract: (playerId: string) => {
    const { teams, userTeamId, currentYear = DEFAULT_START_YEAR, currentWeek, newsFeed = [] } = get();
    if (!userTeamId) return;

    const userTeam = teams.find(team => team.id === userTeamId);
    const player = userTeam?.players.find(currentPlayer => currentPlayer.id === playerId);
    if (!userTeam || !player) return;

    const currentContract = player.contract ?? createPlayerContract(player, currentYear);
    const durationYears =
      currentContract.role === 'PROSPECT'
        ? 2
        : currentContract.requestedSalaryIncrease || currentContract.renewalPreference === 'HIGH'
          ? 4
          : 3;
    const salaryMultiplier = currentContract.requestedSalaryIncrease ? 1.18 : 1.08;

    set({
      teams: teams.map(team => {
        if (team.id !== userTeamId) return team;

        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player;
            const normalizedPlayer = normalizePlayer(player);
            const renewed = recalculatePlayerEconomics(normalizedPlayer, currentYear);
            const latestContract = renewed.contract ?? createPlayerContract(renewed, currentYear);

            return {
              ...renewed,
              contract: {
                ...latestContract,
                startYear: currentYear,
                endYear: currentYear + durationYears,
                durationYears,
                salary: roundMoney(latestContract.salary * salaryMultiplier),
                bonus: roundMoney(latestContract.bonus * (currentContract.requestedSalaryIncrease ? 1.15 : 1.05)),
                releaseClause: roundMoney(latestContract.releaseClause * 1.12),
                requestedTransfer: false,
                requestedSalaryIncrease: false,
                lastSeasonGoalsMet: true,
              },
            };
          }),
        };
      }),
      newsFeed: appendNewsFeed(newsFeed, [
        createNewsItem(
          'CONTRACT',
          'Renovacao assinada',
          `${player.name} renovou com ${userTeam.name} ate ${currentYear + durationYears}.`,
          currentWeek,
          currentYear,
          { teamId: userTeam.id, playerId: player.id },
        ),
      ]),
    });
  },

  releasePlayer: (playerId: string) => {
    const { teams, userTeamId, marketPlayers } = get();
    if (!userTeamId) return;

    const userTeam = teams.find(team => team.id === userTeamId);
    const playerToRelease = userTeam?.players.find(player => player.id === playerId);
    if (!playerToRelease) return;

    set({
      teams: teams.map(team =>
        team.id === userTeamId
          ? {
              ...team,
              players: team.players.filter(player => player.id !== playerId),
            }
          : team,
      ),
      marketPlayers: [...marketPlayers, { ...playerToRelease }],
    });
  },

  promoteAcademyPlayer: (playerId: string) => {
    const { teams, userTeamId, currentYear = DEFAULT_START_YEAR } = get();
    if (!userTeamId) return;

    set({
      teams: teams.map(team => {
        if (team.id !== userTeamId) return team;
        const academyPlayer = team.academyPlayers?.find(player => player.id === playerId);
        if (!academyPlayer) return team;

        const promotedPlayer = recalculatePlayerEconomics(
          {
            ...normalizePlayer(academyPlayer),
            youthProspect: false,
            contract: createPlayerContract({ ...normalizePlayer(academyPlayer), youthProspect: false }, currentYear),
          },
          currentYear,
        );

        return {
          ...team,
          players: [...team.players, promotedPlayer],
          academyPlayers: (team.academyPlayers ?? []).filter(player => player.id !== playerId),
        };
      }),
    });
  },

  requestPlayerTransfer: () => {
    const { teams, userTeamId, userPlayerId, currentWeek, currentYear = DEFAULT_START_YEAR, newsFeed = [] } = get();
    if (!userTeamId || !userPlayerId) return;

    const userTeam = teams.find(team => team.id === userTeamId);
    const userPlayer = userTeam?.players.find(player => player.id === userPlayerId);
    if (!userTeam || !userPlayer) return;

    set({
      teams: teams.map(team => ({
        ...team,
        players: team.players.map(player =>
          player.id === userPlayerId
            ? {
                ...player,
                contract: player.contract
                  ? {
                      ...player.contract,
                      requestedTransfer: true,
                    }
                  : player.contract,
              }
            : player,
        ),
      })),
      newsFeed: appendNewsFeed(newsFeed, [
        createNewsItem(
          'TRANSFER',
          'Pedido de transferencia',
          `${userPlayer.name} informou ao ${userTeam.name} que deseja ouvir propostas.`,
          currentWeek,
          currentYear,
          { teamId: userTeam.id, playerId: userPlayer.id },
        ),
      ]),
    });

    get().generatePlayerOffers();
  },

  retireUserPlayer: () => {
    const { teams, userPlayerId, userTeamId, currentYear = DEFAULT_START_YEAR, retiredPlayersHistory = [] } = get();
    if (!userPlayerId || !userTeamId) return;

    const userTeam = teams.find(team => team.id === userTeamId);
    const userPlayer = userTeam?.players.find(player => player.id === userPlayerId);
    if (!userPlayer) return;

    const retiredRecord = createRetiredPlayerRecord(normalizePlayer(userPlayer), currentYear);

    set({
      teams: teams.map(team =>
        team.id === userTeamId
          ? {
              ...team,
              players: team.players.filter(player => player.id !== userPlayerId),
            }
          : team,
      ),
      retiredPlayersHistory: [...retiredPlayersHistory, retiredRecord],
      isGameOver: true,
    });
  },

  nextSeason: () => {
    const {
      teams,
      matches,
      userPlayerId,
      gameMode,
      currentYear = DEFAULT_START_YEAR,
      retiredPlayersHistory = [],
      newsFeed = [],
      userTeamId,
    } = get();
    const nextYear = currentYear + 1;
    const internationalCompetitions = getInternationalCompetitionsForYear(nextYear);
    const clubTeams = teams.filter(team => team.division > 0).map(team => normalizeTeam(team, currentYear));

    const updatedRetiredHistory: RetiredPlayerRecord[] = [...retiredPlayersHistory];
    const offSeasonFreeAgents: Player[] = [];

    const progressedClubTeams = clubTeams.map(team => {
      const regenPlayers: Player[] = [];
      const retainedPlayers: Player[] = [];

      team.players.forEach(player => {
        const normalizedPlayer = normalizePlayer(player);
        const newAge = normalizedPlayer.age + 1;
        const performanceBoost =
          ((normalizedPlayer.averageRating ?? 6) >= 7.2 ? 1 : 0) +
          ((normalizedPlayer.form ?? 6) >= 7 ? 1 : 0) +
          (normalizedPlayer.matchesPlayed > 18 ? 1 : 0);
        let overallDelta = 0;

        if (newAge <= 22) overallDelta = Math.floor(Math.random() * 2) + performanceBoost;
        else if (newAge <= 28) overallDelta = performanceBoost > 1 ? 1 : 0;
        else if (newAge <= 32) overallDelta = performanceBoost > 1 ? 0 : -Math.floor(Math.random() * 2);
        else overallDelta = -1 - Math.floor(Math.random() * 2);

        if (gameMode === 'player' && normalizedPlayer.id === userPlayerId && newAge < 35) {
          overallDelta = Math.max(overallDelta, performanceBoost);
        }

        const progressedPlayer = refreshContractForNewSeason(
          recalculatePlayerEconomics(
            {
              ...normalizedPlayer,
              age: newAge,
              overall: clamp(normalizedPlayer.overall + overallDelta, 40, 99),
              potential: Math.max(normalizedPlayer.potential ?? normalizedPlayer.overall, normalizedPlayer.overall + 1),
            },
            nextYear,
          ),
          team,
          clubTeams,
          nextYear,
        );

        const isUserCareerPlayer = gameMode === 'player' && progressedPlayer.id === userPlayerId;
        if (shouldPlayerRetire(progressedPlayer, !isUserCareerPlayer)) {
          updatedRetiredHistory.push(createRetiredPlayerRecord(progressedPlayer, nextYear));
          regenPlayers.push(createRegenPlayer(progressedPlayer, nextYear));
          return;
        }

        const isExpiredWithoutRenewal = (progressedPlayer.contract?.endYear ?? nextYear) < nextYear;
        const shouldKeepForUserManagerDecision =
          team.isUserControlled && gameMode === 'manager' && progressedPlayer.contract?.requestedTransfer;

        if (isExpiredWithoutRenewal && !isUserCareerPlayer && !shouldKeepForUserManagerDecision) {
          offSeasonFreeAgents.push(resetPlayerSeasonStats(progressedPlayer));
          return;
        }

        retainedPlayers.push(progressedPlayer);
      });

      const academyRefreshedTeam = refreshTeamAcademyForNewSeason(
        {
          ...team,
          players: retainedPlayers,
          overall: calculateTeamOverall(retainedPlayers),
        },
        nextYear,
        regenPlayers,
      );

      const promotedTeam = autoPromoteAcademyPlayers(academyRefreshedTeam, nextYear);

      return {
        ...promotedTeam,
        overall: calculateTeamOverall(promotedTeam.players),
      };
    });

    const rebalancedClubTeams = applyPromotionAndRelegation(progressedClubTeams, matches);
    const sponsoredClubTeams = refreshSponsorsForNewSeason(rebalancedClubTeams, nextYear);

    const resetClubTeams = sponsoredClubTeams.map(team => {
      const resetPlayers = team.players.map(player => resetPlayerSeasonStats(recalculatePlayerEconomics(player, nextYear)));
      const resetAcademy = (team.academyPlayers ?? []).map(player => resetPlayerSeasonStats(recalculatePlayerEconomics(player, nextYear)));

      return {
        ...team,
        players: resetPlayers,
        academyPlayers: resetAcademy,
        overall: calculateTeamOverall(resetPlayers),
        stats: buildCompetitionStats(),
      };
    });

    const newNationalTeams = generateNationalTeams(sponsoredClubTeams, nextYear, internationalCompetitions).map(team => {
      const resetPlayers = team.players.map(player => resetPlayerSeasonStats(player));
      return {
        ...team,
        players: resetPlayers,
        overall: calculateTeamOverall(resetPlayers),
        stats: buildCompetitionStats(),
      };
    });

    const allUpdatedTeams = [...resetClubTeams, ...newNationalTeams];
    const newMatches = generateSchedule(allUpdatedTeams, {
      currentYear: nextYear,
      qualificationSourceTeams: sponsoredClubTeams,
    });

    set({
      teams: allUpdatedTeams,
      matches: newMatches,
      currentWeek: 1,
      isGameOver: false,
      jobOffers: [],
      marketPlayers: offSeasonFreeAgents,
      currentYear: nextYear,
      competitionHistory: get().competitionHistory ?? {},
      retiredPlayersHistory: updatedRetiredHistory,
      recentRoundSummary: null,
      newsFeed: appendNewsFeed(newsFeed, [
        createNewsItem(
          'SEASON',
          'Nova temporada aberta',
          `A temporada ${nextYear} comecou para ${allUpdatedTeams.find(team => team.id === userTeamId)?.name ?? 'seu clube'}.`,
          1,
          nextYear,
          { teamId: userTeamId ?? undefined, playerId: gameMode === 'player' ? userPlayerId ?? undefined : undefined },
        ),
      ]),
    });
  }
}));
