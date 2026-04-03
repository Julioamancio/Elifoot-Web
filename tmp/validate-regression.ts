import assert from 'node:assert/strict';
import { generateSchedule } from '../src/game/engine';
import { generateTeams } from '../src/game/generator';
import { useGameStore } from '../src/store/useGameStore';
import type { Competition, GameState, MatchEvent, Team } from '../src/types/game';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function getClubTeams(teams: Team[]) {
  return teams.filter(team => team.division > 0);
}

function getMatchesByCompetition<T extends Competition>(competition: T) {
  return useGameStore.getState().matches.filter(match => match.competition === competition);
}

function validateLegacySaveNormalization() {
  const baseTeams = generateTeams();
  const legacyState: GameState = {
    teams: clone(baseTeams),
    matches: [],
    currentWeek: 3,
    userTeamId: baseTeams[0]?.id ?? null,
    userPlayerId: null,
    gameMode: 'manager',
    isGameOver: false,
    marketPlayers: [],
    activeMatchId: null,
    managerReputation: 10,
    jobOffers: [],
  };

  useGameStore.getState().setGameState(legacyState);
  const state = useGameStore.getState();
  const firstClub = state.teams.find(team => team.division > 0);

  assert.equal(state.schemaVersion, 2, 'legacy save should receive schemaVersion');
  assert.equal(state.currentYear, 2026, 'legacy save should receive default currentYear');
  assert.ok(Array.isArray(state.newsFeed), 'legacy save should receive news feed');
  assert.ok(Array.isArray(state.retiredPlayersHistory), 'legacy save should receive retired players history');
  assert.ok(firstClub?.commercial, 'legacy save should receive commercial profile');
  assert.ok(firstClub?.sponsors?.length && firstClub.sponsors.length >= 3, 'legacy save should receive sponsors');
}

function validateScheduleRules() {
  const teams = generateTeams();
  const matches = generateSchedule(teams, { currentYear: 2026 });

  const leagueMatches = matches.filter(match => match.competition === 'LEAGUE');
  assert.ok(leagueMatches.length > 0, 'league schedule should exist');
  leagueMatches.forEach(match => {
    const home = teams.find(team => team.id === match.homeTeamId)!;
    const away = teams.find(team => team.id === match.awayTeamId)!;
    assert.equal(home.country, away.country, 'league should not mix countries');
    assert.equal(home.division, away.division, 'league should not mix divisions');
  });

  const regionalMatches = matches.filter(match => match.competition === 'REGIONAL');
  assert.ok(regionalMatches.length > 0, 'regional schedule should exist');
  regionalMatches.forEach(match => {
    const home = teams.find(team => team.id === match.homeTeamId);
    const away = teams.find(team => team.id === match.awayTeamId);
    if (!home || !away) return;
    assert.equal(home.country, away.country, 'regional should not mix countries');
    assert.equal(home.state, away.state, 'regional should not mix states');
    assert.equal(Boolean(match.isKnockout), true, 'regional should be knockout');
  });

  const cupMatches = matches.filter(match => match.competition === 'NATIONAL_CUP');
  assert.ok(cupMatches.length > 0, 'national cup should exist');
  cupMatches.forEach(match => {
    const home = teams.find(team => team.id === match.homeTeamId);
    const away = teams.find(team => team.id === match.awayTeamId);
    if (!home || !away) return;
    assert.equal(home.country, away.country, 'national cup should not mix countries');
    assert.equal(Boolean(match.isKnockout), true, 'national cup should be knockout');
  });

  const continentalMatches = matches.filter(
    match => match.competition === 'CONTINENTAL' || match.competition === 'CONTINENTAL_SECONDARY',
  );
  assert.equal(continentalMatches.length, 0, 'continental tournaments must start empty');
}

function validateNewGameLifecycle() {
  useGameStore.getState().resetGame();
  useGameStore.getState().startNewGame('Julio', 'manager', 'CSA');

  const startState = useGameStore.getState();
  const userTeam = startState.teams.find(team => team.id === startState.userTeamId);
  assert.ok(userTeam, 'user team should exist after starting game');
  assert.equal(startState.currentWeek, 1, 'new season should start on week 1');
  assert.equal(startState.schemaVersion, 2, 'new game should keep current schema version');
  assert.ok(userTeam?.commercial, 'user team should have commercial profile');

  const userFixtures = startState.matches.filter(
    match =>
      !match.played &&
      (match.homeTeamId === startState.userTeamId || match.awayTeamId === startState.userTeamId),
  );
  assert.ok(userFixtures.length > 0, 'user team should have future fixtures');

  const ageSnapshot = new Map(
    userTeam!.players
      .filter(player => player.age <= 30)
      .map(player => [player.id, player.age]),
  );
  assert.ok(ageSnapshot.size > 0, 'should find players eligible for age progression');

  useGameStore.getState().playWeek();
  const afterWeek = useGameStore.getState();
  assert.equal(afterWeek.currentWeek, 2, 'playing a week should advance current week');
  assert.ok(afterWeek.recentRoundSummary, 'playing a week should generate round summary');
  assert.ok(Array.isArray(afterWeek.newsFeed), 'playing a week should keep news feed');

  useGameStore.getState().nextSeason();
  const afterSeason = useGameStore.getState();
  const progressedUserTeam = afterSeason.teams.find(team => team.id === afterSeason.userTeamId);
  const retainedProgressedPlayers =
    progressedUserTeam?.players.filter(player => {
      const previousAge = ageSnapshot.get(player.id);
      return previousAge !== undefined && player.age === previousAge + 1;
    }) ?? [];
  assert.equal(afterSeason.currentYear, 2027, 'next season should advance year');
  assert.equal(afterSeason.currentWeek, 1, 'next season should reset week');
  assert.ok(retainedProgressedPlayers.length > 0, 'at least one retained player should age by one season');
  assert.ok(Array.isArray(afterSeason.marketPlayers), 'next season should refresh transfer market');
}

function validateClubDataSafety() {
  const teams = getClubTeams(generateTeams());
  assert.ok(teams.length > 0, 'club teams should exist');

  teams.forEach(team => {
    assert.ok(team.sponsors && team.sponsors.length >= 3, `${team.name} should have at least three sponsors`);
    assert.ok(team.commercial, `${team.name} should have commercial profile`);
    assert.ok(Array.isArray(team.academyPlayers), `${team.name} should have academy pipeline`);
  });
}

function validatePlayerCareerInitialization() {
  useGameStore.getState().resetGame();
  useGameStore.getState().startNewGame('Julio', 'player', undefined, {
    nationality: 'BR',
    position: 'MID',
    age: 18,
  });

  const state = useGameStore.getState();
  const userTeam = state.teams.find(team => team.id === state.userTeamId);
  const userPlayer = userTeam?.players.find(player => player.id === state.userPlayerId);
  const lowestDivisionInCountry = Math.max(
    ...state.teams.filter(team => team.country === 'BR' && team.division > 0).map(team => team.division),
  );

  assert.equal(state.gameMode, 'player', 'player career should keep player mode');
  assert.ok(userTeam, 'player career should assign a club');
  assert.ok(userPlayer, 'player career should create the user player');
  assert.equal(userTeam?.division, lowestDivisionInCountry, 'player career should start in the lowest domestic division');
  assert.ok(userPlayer?.contract, 'user player should start with a contract');
}

function validateManualWeekResultPreserved() {
  useGameStore.getState().resetGame();
  useGameStore.getState().startNewGame('Julio', 'manager', 'CSA');

  const state = useGameStore.getState();
  const userMatch = state.matches.find(
    match =>
      match.week === state.currentWeek &&
      !match.played &&
      (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId),
  );
  assert.ok(userMatch, 'user match should exist on the current week');

  const homeTeam = state.teams.find(team => team.id === userMatch!.homeTeamId)!;
  const awayTeam = state.teams.find(team => team.id === userMatch!.awayTeamId)!;
  const scoringPlayer = homeTeam.players.find(player => player.isStarter) ?? homeTeam.players[0];
  const assistPlayer = homeTeam.players.find(player => player.id !== scoringPlayer.id) ?? scoringPlayer;

  const manualEvents: MatchEvent[] = [
    {
      id: 'manual-goal',
      matchId: userMatch!.id,
      minute: 12,
      type: 'GOAL',
      teamId: homeTeam.id,
      playerId: scoringPlayer.id,
      assistPlayerId: assistPlayer.id,
      reason: 'Validacao manual',
    },
  ];

  useGameStore.getState().playWeek({
    matchId: userMatch!.id,
    homeScore: 1,
    awayScore: 0,
    events: manualEvents,
  });

  const afterWeek = useGameStore.getState();
  const playedMatch = afterWeek.matches.find(match => match.id === userMatch!.id);

  assert.equal(playedMatch?.played, true, 'manual match should be marked as played');
  assert.equal(playedMatch?.homeScore, 1, 'manual result should preserve home score');
  assert.equal(playedMatch?.awayScore, 0, 'manual result should preserve away score');
  assert.equal(playedMatch?.events.length, manualEvents.length, 'manual match should preserve provided events');
  assert.ok(
    afterWeek.recentRoundSummary?.userResults.some(result => result.matchId === userMatch!.id),
    'round summary should include the manually played user match',
  );
}

function main() {
  validateLegacySaveNormalization();
  validateScheduleRules();
  validateNewGameLifecycle();
  validatePlayerCareerInitialization();
  validateManualWeekResultPreserved();
  validateClubDataSafety();
  console.log('Regression validation passed.');
}

main();
