import { Competition, Match, MatchEvent, Team } from '../types/game';
import {
  buildContinentalQualifiers,
  buildInternationalGroupSchedule,
  buildLeagueGroups,
  buildNationalCupGroups,
  buildRegionalGroups,
  buildRoundRobinSchedule,
  BYE_TEAM_ID,
  createKnockoutRound,
  createMatch,
  DEFAULT_START_YEAR,
  getCompetitionPlayers,
  getGroupStandings,
  getInternationalCompetitionsForYear,
  getKnockoutDurationWeeks,
  getKnockoutStageName,
  PROJECTED_CONTINENTAL_DURATION_WEEKS,
  sortTeamsByCompetitionTable,
} from './competitionScheduling';

interface ScheduleOptions {
  currentYear?: number;
  qualificationSourceTeams?: Team[];
}

const DEFAULT_BENCH_SIZE = 15;

const createOrderedKnockoutRound = (
  orderedTeams: Team[],
  startWeek: number,
  competition: Competition,
  tournamentId: string,
  tournamentName: string,
  seasonYear: number,
) => {
  if (orderedTeams.length < 2) return [];
  const roundSize = orderedTeams.length;
  const matches: Match[] = [];

  for (let index = 0; index < orderedTeams.length; index += 2) {
    const home = orderedTeams[index];
    const away = orderedTeams[index + 1];
    if (!home || !away) continue;

    matches.push(
      createMatch(home.id, away.id, startWeek, competition, {
        isKnockout: true,
        stage: getKnockoutStageName(roundSize),
        roundSize,
        tournamentId,
        tournamentName,
        seasonYear,
      }),
    );
  }

  return matches;
};

const buildInternationalKnockoutRound = (
  competition: Competition,
  groupWinners: Team[],
  currentWeek: number,
  seasonYear: number,
) => {
  const tournamentId = `${competition}_${seasonYear}`;
  const tournamentName = competition === 'WORLD_CUP' ? 'Copa do Mundo' : 'Olimpíadas';

  if (competition === 'WORLD_CUP') {
    const orderedTeams = [
      groupWinners[0], groupWinners[3],
      groupWinners[4], groupWinners[7],
      groupWinners[1], groupWinners[2],
      groupWinners[5], groupWinners[6],
      groupWinners[8], groupWinners[11],
      groupWinners[12], groupWinners[15],
      groupWinners[9], groupWinners[10],
      groupWinners[13], groupWinners[14],
    ].filter(Boolean) as Team[];

    return createOrderedKnockoutRound(
      orderedTeams,
      currentWeek + 1,
      competition,
      tournamentId,
      tournamentName,
      seasonYear,
    );
  }

  return createOrderedKnockoutRound(
    groupWinners,
    currentWeek + 1,
    competition,
    tournamentId,
    tournamentName,
    seasonYear,
  );
};

export const advanceInternationalGroupTournaments = (matches: Match[], teams: Team[], currentWeek: number) => {
  const nextMatches: Match[] = [];
  const groupedByTournament = new Map<string, Match[]>();

  matches
    .filter(
      match =>
        (match.competition === 'WORLD_CUP' || match.competition === 'OLYMPICS') &&
        !match.isKnockout &&
        match.groupName,
    )
    .forEach(match => {
      if (!match.tournamentId) return;
      if (!groupedByTournament.has(match.tournamentId)) groupedByTournament.set(match.tournamentId, []);
      groupedByTournament.get(match.tournamentId)!.push(match);
    });

  groupedByTournament.forEach(tournamentMatches => {
    if (!tournamentMatches.every(match => match.played)) return;

    const { competition, tournamentId, seasonYear } = tournamentMatches[0];
    const knockoutAlreadyExists = matches.some(
      match => match.tournamentId === tournamentId && match.isKnockout,
    );
    if (knockoutAlreadyExists) return;

    const groups = [...new Set(tournamentMatches.map(match => match.groupName).filter(Boolean))];
    const qualifiedTeams: Team[] = [];

    groups.forEach(groupName => {
      const groupMatches = tournamentMatches.filter(match => match.groupName === groupName);
      const teamIds = [...new Set(groupMatches.flatMap(match => [match.homeTeamId, match.awayTeamId]))];
      const groupTeams = teamIds
        .map(teamId => teams.find(team => team.id === teamId))
        .filter((team): team is Team => Boolean(team));
      const standings = getGroupStandings(groupMatches, groupTeams);
      qualifiedTeams.push(...standings.slice(0, 2));
    });

    if (qualifiedTeams.length >= 8) {
      nextMatches.push(
        ...buildInternationalKnockoutRound(
          competition,
          qualifiedTeams,
          currentWeek,
          seasonYear || DEFAULT_START_YEAR,
        ),
      );
    }
  });

  return nextMatches;
};

export { getInternationalCompetitionsForYear, sortTeamsByCompetitionTable };

export const generateContinentalCompetitions = (
  teams: Team[],
  qualificationSourceTeams: Team[],
  currentYear: number,
  startWeek: number,
  matches: Match[] = [],
): Match[] => {
  const clubTeams = teams.filter(team => team.division > 0);
  const divisionOneTeams = clubTeams.filter(team => team.division === 1);
  const qualifiersByContinent = buildContinentalQualifiers(divisionOneTeams, qualificationSourceTeams, matches);
  const continentalMatches: Match[] = [];

  qualifiersByContinent.forEach(({ continent, primary }) => {
    if (primary.length < 2) return;

    continentalMatches.push(
      ...createKnockoutRound(
        primary,
        startWeek,
        'CONTINENTAL',
        `CONTINENTAL_${continent}_${currentYear}`,
        `Continental ${continent}`,
        currentYear,
      ),
    );
  });

  return continentalMatches;
};

const getMatchWinner = (match: Match) => {
  if (match.winnerTeamId) return match.winnerTeamId;
  if (match.homeTeamId === BYE_TEAM_ID) return match.awayTeamId;
  if (match.awayTeamId === BYE_TEAM_ID) return match.homeTeamId;
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  return null;
};

export const advanceKnockoutTournaments = (matches: Match[], teams: Team[], currentWeek: number): Match[] => {
  const nextMatches: Match[] = [];
  const grouped = new Map<string, Match[]>();

  matches
    .filter(match => match.isKnockout && match.week === currentWeek)
    .forEach(match => {
      if (!match.tournamentId || !match.roundSize) return;
      const key = `${match.tournamentId}_${match.roundSize}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(match);
    });

  grouped.forEach(stageMatches => {
    if (!stageMatches.every(match => match.played)) return;

    const { tournamentId, roundSize, competition, tournamentName, seasonYear } = stageMatches[0];
    if (!tournamentId || !roundSize || roundSize <= 2) return;

    const nextRoundSize = Math.floor(roundSize / 2);
    const alreadyScheduled = matches.some(
      match => match.tournamentId === tournamentId && match.roundSize === nextRoundSize,
    );
    if (alreadyScheduled) return;

    const winnerIds = stageMatches
      .map(match => getMatchWinner(match))
      .filter((teamId): teamId is string => Boolean(teamId) && teamId !== BYE_TEAM_ID);

    if (winnerIds.length < 2) return;

    const winnerTeams = winnerIds
      .map(teamId => teams.find(team => team.id === teamId))
      .filter((team): team is Team => Boolean(team));

    if (winnerTeams.length < 2) return;

    nextMatches.push(
      ...createKnockoutRound(
        winnerTeams,
        currentWeek + 1,
        competition,
        tournamentId,
        tournamentName || tournamentId,
        seasonYear || DEFAULT_START_YEAR,
      ),
    );
  });

  return nextMatches;
};

export const generateSchedule = (teams: Team[], options: ScheduleOptions = {}): Match[] => {
  const allMatches: Match[] = [];
  const currentYear = options.currentYear ?? DEFAULT_START_YEAR;
  const clubTeams = teams.filter(team => team.division > 0);
  const scheduledNationalTeams = teams.filter(team => team.division === 0);
  let currentWeek = 1;
  const regionalGroups = buildRegionalGroups(clubTeams);

  regionalGroups.forEach(({ key, teams: regionalTeams }) => {
    allMatches.push(
      ...createKnockoutRound(
        regionalTeams,
        currentWeek,
        'REGIONAL',
        `REGIONAL_${key}_${currentYear}`,
        `Regional ${key}`,
        currentYear,
      ),
    );
  });

  const maxRegionalDuration = regionalGroups.reduce(
    (maxDuration, group) => Math.max(maxDuration, getKnockoutDurationWeeks(group.teams.length)),
    0,
  );
  const leagueStartWeek = currentWeek + maxRegionalDuration;

  let maxLeagueWeek = leagueStartWeek;
  buildLeagueGroups(clubTeams).forEach(group => {
    const groupMatches = buildRoundRobinSchedule(group, leagueStartWeek, 'LEAGUE', { seasonYear: currentYear });
    allMatches.push(...groupMatches);
    const lastWeek = groupMatches.length > 0 ? Math.max(...groupMatches.map(match => match.week)) : leagueStartWeek;
    maxLeagueWeek = Math.max(maxLeagueWeek, lastWeek);
  });

  const cupStartWeek = leagueStartWeek;
  const nationalCupGroups = buildNationalCupGroups(clubTeams);
  nationalCupGroups.forEach(({ country, teams: cupTeams }) => {
    allMatches.push(
      ...createKnockoutRound(
        cupTeams,
        cupStartWeek,
        'NATIONAL_CUP',
        `NATIONAL_CUP_${country}_${currentYear}`,
        `Copa ${country}`,
        currentYear,
      ),
    );
  });

  const scheduledInternationalCompetitions = getInternationalCompetitionsForYear(currentYear);
  const maxNationalCupDuration = nationalCupGroups.reduce(
    (maxDuration, group) => Math.max(maxDuration, getKnockoutDurationWeeks(group.teams.length)),
    0,
  );
  const projectedDomesticEndWeek = Math.max(maxLeagueWeek, cupStartWeek + Math.max(0, maxNationalCupDuration - 1));
  let scheduledInternationalWeek = projectedDomesticEndWeek + PROJECTED_CONTINENTAL_DURATION_WEEKS + 1;

  scheduledInternationalCompetitions.forEach(competition => {
    if (scheduledNationalTeams.length < 2) return;
    allMatches.push(
      ...buildInternationalGroupSchedule(
        competition,
        scheduledNationalTeams,
        currentYear,
        scheduledInternationalWeek,
      ),
    );
    scheduledInternationalWeek += competition === 'WORLD_CUP' ? 8 : 6;
  });

  return allMatches.sort((a, b) => a.week - b.week);
};

export const simulateMatch = (
  home: Team,
  away: Team,
  options: { competition?: Competition; isKnockout?: boolean } = {},
): { homeScore: number; awayScore: number; events: MatchEvent[] } => {
  const competition = options.competition;
  const events: MatchEvent[] = [];
  const homePlayers = getCompetitionPlayers(home, competition);
  const awayPlayers = getCompetitionPlayers(away, competition);

  const createActiveSet = (players: typeof homePlayers) => {
    const starters = players.filter(player => player.isStarter).slice(0, 11);
    const source = starters.length > 0 ? starters : players.slice(0, 11);
    return new Set(source.map(player => player.id));
  };

  const createSubstitutionState = () => ({
    totalSubsUsed: 0,
    windowsUsed: 0,
    currentWindowKey: null as string | null,
  });

  const getWindowKey = (minute: number) => {
    if (minute < 46) return 'FIRST_HALF';
    if (minute < 61) return 'SECOND_HALF_1';
    if (minute < 76) return 'SECOND_HALF_2';
    if (minute <= 90) return 'SECOND_HALF_3';
    return 'EXTRA_TIME';
  };

  const canUseSubstitution = (
    state: ReturnType<typeof createSubstitutionState>,
    minute: number,
    inExtraTime: boolean,
  ) => {
    const maxSubs = inExtraTime ? 6 : 5;
    const maxWindows = inExtraTime ? 4 : 3;
    if (state.totalSubsUsed >= maxSubs) return false;

    const windowKey = getWindowKey(minute);
    if (windowKey === 'FIRST_HALF') return false;
    if (state.currentWindowKey === windowKey) return true;
    if (state.windowsUsed >= maxWindows) return false;
    return true;
  };

  const registerSubstitutionWindow = (
    state: ReturnType<typeof createSubstitutionState>,
    minute: number,
  ) => {
    const windowKey = getWindowKey(minute);
    if (state.currentWindowKey !== windowKey) {
      state.currentWindowKey = windowKey;
      state.windowsUsed += 1;
    }
    state.totalSubsUsed += 1;
  };

  const getBenchPlayers = (players: typeof homePlayers, activePlayers: Set<string>, usedEvents: MatchEvent[]) => {
    const subbedOut = new Set(usedEvents.map(event => event.assistPlayerId).filter(Boolean));
    const subbedIn = new Set(usedEvents.map(event => event.playerId));
    return players
      .filter(player => !activePlayers.has(player.id) && !subbedOut.has(player.id) && !subbedIn.has(player.id))
      .slice(0, DEFAULT_BENCH_SIZE);
  };

  const getTeamStrength = (players: typeof homePlayers, activePlayers: Set<string>, goalkeepingPenalty: number) => {
    const currentPlayers = players.filter(player => activePlayers.has(player.id));
    if (currentPlayers.length === 0) return 1;
    const average =
      currentPlayers.reduce((sum, player) => sum + player.overall * (0.5 + player.energy / 200), 0) / currentPlayers.length;
    return Math.max(1, average - goalkeepingPenalty);
  };

  const removePlayerFromField = (activePlayers: Set<string>, playerId: string) => {
    activePlayers.delete(playerId);
  };

  const homeActive = createActiveSet(homePlayers);
  const awayActive = createActiveSet(awayPlayers);
  const homeSubState = createSubstitutionState();
  const awaySubState = createSubstitutionState();
  const homeMatchYellows = new Map<string, number>();
  const awayMatchYellows = new Map<string, number>();
  let homeGoalkeeperPenalty = 0;
  let awayGoalkeeperPenalty = 0;
  let homeScore = 0;
  let awayScore = 0;

  const handleGoalkeeperDismissal = (
    team: Team,
    players: typeof homePlayers,
    activePlayers: Set<string>,
    state: ReturnType<typeof createSubstitutionState>,
    minute: number,
    teamEvents: MatchEvent[],
  ) => {
    const reserveGoalkeeper = getBenchPlayers(players, activePlayers, teamEvents).find(player => player.position === 'GK');
    const inExtraTime = minute > 90;

    if (reserveGoalkeeper && canUseSubstitution(state, minute, inExtraTime)) {
      const outfieldPlayer = players.find(
        player => activePlayers.has(player.id) && player.position !== 'GK',
      );
      if (outfieldPlayer) {
        activePlayers.delete(outfieldPlayer.id);
        activePlayers.add(reserveGoalkeeper.id);
        registerSubstitutionWindow(state, minute);
        events.push({
          id: Math.random().toString(36).substr(2, 9),
          matchId: '',
          minute,
          type: 'SUBSTITUTION',
          teamId: team.id,
          playerId: reserveGoalkeeper.id,
          assistPlayerId: outfieldPlayer.id,
          reason: 'Substituição obrigatória de goleiro',
        });
        return 0;
      }
    }

    return 8;
  };

  const registerCardEvent = (
    team: Team,
    players: typeof homePlayers,
    activePlayers: Set<string>,
    matchYellows: Map<string, number>,
    state: ReturnType<typeof createSubstitutionState>,
    minute: number,
    directRed: boolean,
  ) => {
    const activePlayersList = players.filter(player => activePlayers.has(player.id));
    if (activePlayersList.length === 0) return 0;

    const likelyCardPlayers = activePlayersList.filter(player => player.position === 'DEF' || player.position === 'MID');
    const player =
      likelyCardPlayers.length > 0 && Math.random() > 0.3
        ? likelyCardPlayers[Math.floor(Math.random() * likelyCardPlayers.length)]
        : activePlayersList[Math.floor(Math.random() * activePlayersList.length)];

    if (!player) return 0;

    if (!directRed) {
      const yellowCount = (matchYellows.get(player.id) ?? 0) + 1;
      matchYellows.set(player.id, yellowCount);
      events.push({
        id: Math.random().toString(36).substr(2, 9),
        matchId: '',
        minute,
        type: 'YELLOW_CARD',
        teamId: team.id,
        playerId: player.id,
        reason: yellowCount >= 2 ? 'Segundo amarelo' : 'Advertência',
      });

      if (yellowCount < 2) return 0;
    }

    const directRedReason = directRed && Math.random() > 0.6 ? 'Conduta violenta' : 'Falta grave';
    removePlayerFromField(activePlayers, player.id);
    events.push({
      id: Math.random().toString(36).substr(2, 9),
      matchId: '',
      minute,
      type: 'RED_CARD',
      teamId: team.id,
      playerId: player.id,
      reason: directRed ? directRedReason : 'Expulsão por segundo amarelo',
    });

    if (player.position === 'GK') {
      return handleGoalkeeperDismissal(team, players, activePlayers, state, minute, events.filter(event => event.teamId === team.id && event.type === 'SUBSTITUTION'));
    }

    return 0;
  };

  const processSubstitutions = (
    team: Team,
    players: typeof homePlayers,
    activePlayers: Set<string>,
    state: ReturnType<typeof createSubstitutionState>,
    minute: number,
  ) => {
    const inExtraTime = minute > 90;
    if (!canUseSubstitution(state, minute, inExtraTime)) return;

    const activePlayersList = players.filter(player => activePlayers.has(player.id));
    const teamSubEvents = events.filter(event => event.teamId === team.id && event.type === 'SUBSTITUTION');
    const benchPlayers = getBenchPlayers(players, activePlayers, teamSubEvents);
    const tiredPlayer = [...activePlayersList].sort((a, b) => a.energy - b.energy)[0];

    if (!tiredPlayer || tiredPlayer.energy >= (minute > 90 ? 70 : 65)) return;

    const replacement =
      benchPlayers.find(player => player.position === tiredPlayer.position && player.energy > tiredPlayer.energy + 10) ||
      benchPlayers[0];

    if (!replacement) return;

    activePlayers.delete(tiredPlayer.id);
    activePlayers.add(replacement.id);
    registerSubstitutionWindow(state, minute);
    events.push({
      id: Math.random().toString(36).substr(2, 9),
      matchId: '',
      minute,
      type: 'SUBSTITUTION',
      teamId: team.id,
      playerId: replacement.id,
      assistPlayerId: tiredPlayer.id,
      reason: minute > 90 ? 'Janela da prorrogação' : 'Janela regulamentar',
    });
  };

  const playMinuteBlock = (startMinute: number, endMinute: number) => {
    for (let minute = startMinute; minute <= endMinute; minute += 10) {
      if (minute >= 60) {
        processSubstitutions(home, homePlayers, homeActive, homeSubState, minute);
        processSubstitutions(away, awayPlayers, awayActive, awaySubState, minute);
      }

      const homeStrength = getTeamStrength(homePlayers, homeActive, homeGoalkeeperPenalty) + 5;
      const awayStrength = getTeamStrength(awayPlayers, awayActive, awayGoalkeeperPenalty);
      const totalStrength = homeStrength + awayStrength;
      const homeProb = homeStrength / totalStrength;

      if (Math.random() < 0.6) {
        const isHomeChance = Math.random() < homeProb;
        const attackingTeam = isHomeChance ? home : away;
        const attackingPlayers = isHomeChance ? homePlayers : awayPlayers;
        const defendingPlayers = isHomeChance ? awayPlayers : homePlayers;
        const activeSet = isHomeChance ? homeActive : awayActive;
        const defendingSet = isHomeChance ? awayActive : homeActive;
        const defendingPenalty = isHomeChance ? awayGoalkeeperPenalty : homeGoalkeeperPenalty;

        const defendingStrength = getTeamStrength(defendingPlayers, defendingSet, defendingPenalty);
        const offsideChance = 0.1 + defendingStrength / 200;

        if (Math.random() < offsideChance) {
          const currentAttackers = attackingPlayers.filter(
            player => activeSet.has(player.id) && (player.position === 'ATK' || player.position === 'MID'),
          );
          const offsidePlayer =
            currentAttackers[Math.floor(Math.random() * currentAttackers.length)] ||
            attackingPlayers.find(player => activeSet.has(player.id));
          if (offsidePlayer) {
            events.push({
              id: Math.random().toString(36).substr(2, 9),
              matchId: '',
              minute: minute + Math.floor(Math.random() * 9),
              type: 'OFFSIDE',
              teamId: attackingTeam.id,
              playerId: offsidePlayer.id,
              reason: 'Linha defensiva adiantada',
            });
          }
        } else if (Math.random() < 0.3) {
          if (isHomeChance) homeScore += 1;
          else awayScore += 1;

          const currentPlayers = attackingPlayers.filter(player => activeSet.has(player.id));
          const scorers = currentPlayers.filter(player => player.position === 'ATK' || player.position === 'MID');
          const scorer = scorers[Math.floor(Math.random() * scorers.length)] || currentPlayers[0];
          const assisters = currentPlayers.filter(player => player.id !== scorer?.id);
          const assister = Math.random() > 0.4 ? assisters[Math.floor(Math.random() * assisters.length)] : undefined;

          if (scorer) {
            events.push({
              id: Math.random().toString(36).substr(2, 9),
              matchId: '',
              minute: minute + Math.floor(Math.random() * 9),
              type: 'GOAL',
              teamId: attackingTeam.id,
              playerId: scorer.id,
              assistPlayerId: assister?.id,
              reason: minute > 90 ? 'Gol na prorrogação' : 'Gol em bola rolando',
            });
          }
        }
      }

      const homeDefEnergy =
        homePlayers.filter(player => homeActive.has(player.id) && player.position === 'DEF').reduce((sum, player) => sum + player.energy, 0) / 4 || 60;
      const awayDefEnergy =
        awayPlayers.filter(player => awayActive.has(player.id) && player.position === 'DEF').reduce((sum, player) => sum + player.energy, 0) / 4 || 60;

      const baseCardChance = 0.15;
      const homeCardChance = baseCardChance + (100 - homeDefEnergy) / 500;
      const awayCardChance = baseCardChance + (100 - awayDefEnergy) / 500;

      if (Math.random() < (homeCardChance + awayCardChance) / 2) {
        const isHomeCard = Math.random() < homeCardChance / (homeCardChance + awayCardChance);
        const eventMinute = minute + Math.floor(Math.random() * 9);
        if (isHomeCard) {
          homeGoalkeeperPenalty = registerCardEvent(
            home,
            homePlayers,
            homeActive,
            homeMatchYellows,
            homeSubState,
            eventMinute,
            Math.random() > 0.9,
          );
        } else {
          awayGoalkeeperPenalty = registerCardEvent(
            away,
            awayPlayers,
            awayActive,
            awayMatchYellows,
            awaySubState,
            eventMinute,
            Math.random() > 0.9,
          );
        }
      }
    }
  };

  playMinuteBlock(1, 90);

  if (options.isKnockout && homeScore === awayScore) {
    playMinuteBlock(91, 120);
  }

  events.sort((a, b) => a.minute - b.minute);
  return { homeScore, awayScore, events };
};
