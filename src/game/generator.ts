import { Player, Team, Position, Competition, TeamStats } from '../types/game';
import { ensureTeamSponsors } from './sponsorship';
import { createPlayerContract, ensureTeamAcademy, recalculatePlayerEconomics } from './playerLifecycle';
import { ensureTeamCommercial } from './commercial';
import { BRAZIL_STATE_OVERRIDES, FIRST_NAMES, LAST_NAMES, TEAM_TEMPLATES } from './generatorData';

const DEFAULT_SEASON_YEAR = 2026;

const normalizeClubName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const inferBrazilianState = (clubName: string, fallbackState = '') => {
  const normalizedName = normalizeClubName(clubName);
  const suffixMatch = normalizedName.match(/-([A-Z]{2})$/);
  if (suffixMatch) {
    return suffixMatch[1];
  }

  return BRAZIL_STATE_OVERRIDES[normalizedName] || fallbackState;
};

const getResolvedState = (country: string, clubName: string, fallbackState = '') => {
  if (country === 'BR') {
    return inferBrazilianState(clubName, fallbackState);
  }

  return fallbackState;
};

const buildCompetitionStats = (): Record<Competition, TeamStats> => ({
  LEAGUE: emptyStats(),
  REGIONAL: emptyStats(),
  NATIONAL_CUP: emptyStats(),
  CONTINENTAL: emptyStats(),
  CONTINENTAL_SECONDARY: emptyStats(),
  WORLD_CUP: emptyStats(),
  OLYMPICS: emptyStats(),
});

const getPlayerSelectionScore = (player: Player) => {
  const goals = player.goals || 0;
  const assists = player.assists || 0;
  const averageRating = player.averageRating ?? 6;
  const seasonMinutes = player.seasonMinutes ?? player.matchesPlayed * 90;
  const form = player.form ?? averageRating;

  return (
    goals * 6 +
    assists * 4 +
    averageRating * 8 +
    (seasonMinutes / 90) * 0.35 +
    form * 6 +
    player.overall * 1.2
  );
};

const appendUniqueHistory = <T,>(current: T[] | undefined, entries: T[]) => [...new Set([...(current || []), ...entries])];

const buildOlympicSquad = (players: Player[]) => {
  const under23 = [...players]
    .filter(player => player.age <= 23)
    .sort((a, b) => getPlayerSelectionScore(b) - getPlayerSelectionScore(a));
  const overage = [...players]
    .filter(player => player.age > 23)
    .sort((a, b) => getPlayerSelectionScore(b) - getPlayerSelectionScore(a));

  const limits: Record<Position, number> = { GK: 2, DEF: 5, MID: 6, ATK: 5 };
  const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, ATK: 0 };
  const squad: Player[] = [];
  let overageUsed = 0;

  const tryAdd = (player: Player, allowOverage: boolean) => {
    if (squad.some(current => current.id === player.id)) return;
    if (counts[player.position] >= limits[player.position]) return;
    if (player.age > 23 && (!allowOverage || overageUsed >= 3)) return;

    counts[player.position] += 1;
    if (player.age > 23) overageUsed += 1;
    squad.push({ ...player, isStarter: squad.length < 11 });
  };

  under23.forEach(player => {
    if (squad.length < 18) tryAdd(player, false);
  });

  overage.forEach(player => {
    if (squad.length < 18) tryAdd(player, true);
  });

  [...under23, ...overage].forEach(player => {
    if (squad.length < 18 && !squad.some(current => current.id === player.id)) {
      squad.push({ ...player, isStarter: squad.length < 11 });
    }
  });

  return squad.slice(0, 18);
};

const generateName = () => {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
};

const generatePlayer = (position: Position, baseOverall: number, isStarter: boolean, nationality?: string): Player => {
  const age = Math.floor(Math.random() * 15) + 18; // 18 to 32
  const overall = Math.max(40, Math.min(99, baseOverall + Math.floor(Math.random() * 10) - 5));
  
  // Calculate value based on overall and age (younger = more expensive)
  const baseValue = Math.pow(overall, 3) * 10;
  const ageMultiplier = age < 23 ? 1.5 : age > 29 ? 0.6 : 1;
  const value = Math.round((baseValue * ageMultiplier) / 10000) * 10000; // Round to 10k
  
  // Salary is roughly 1% of value per year, divided by 12 for monthly, simplified here
  const salary = Math.round(value * 0.01 / 1000) * 1000;

  const basePlayer: Player = {
    id: Math.random().toString(36).substr(2, 9),
    name: generateName(),
    position,
    overall,
    age,
    energy: 100,
    isStarter,
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    value,
    salary,
    nationality: nationality || 'BR',
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
    potential: Math.max(overall, Math.min(99, overall + 4 + Math.floor(Math.random() * 12))),
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

  return recalculatePlayerEconomics(
    {
      ...basePlayer,
      contract: createPlayerContract(basePlayer, DEFAULT_SEASON_YEAR),
    },
    DEFAULT_SEASON_YEAR,
  );
};

const generateSquad = (baseOverall: number, country: string): Player[] => {
  const squad: Player[] = [];
  
  // Starters (11)
  squad.push(generatePlayer('GK', baseOverall, true, country));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('DEF', baseOverall, true, country));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('MID', baseOverall, true, country));
  for (let i = 0; i < 2; i++) squad.push(generatePlayer('ATK', baseOverall, true, country));
  
  // Reserves (11)
  squad.push(generatePlayer('GK', baseOverall - 5, false, country));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('DEF', baseOverall - 5, false, country));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('MID', baseOverall - 5, false, country));
  for (let i = 0; i < 2; i++) squad.push(generatePlayer('ATK', baseOverall - 5, false, country));

  return squad;
};

const emptyStats = (): TeamStats => ({ played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });


export const generateNationalTeams = (
  clubTeams: Team[],
  seasonYear: number = DEFAULT_SEASON_YEAR,
  internationalCompetitions: Competition[] = [],
): Team[] => {
  const nationalTeams: Team[] = [];
  const playersByCountry: Record<string, Player[]> = {};
  const clubCountryLookup = new Map<string, Team['continent']>();

  // Group all players by nationality
  clubTeams.forEach(team => {
    clubCountryLookup.set(team.country, team.continent);
    team.players.forEach(player => {
      const nat = player.nationality || team.country;
      if (!playersByCountry[nat]) playersByCountry[nat] = [];
      playersByCountry[nat].push(player);
    });
  });

  // Create a national team for each country that has enough players
  Object.entries(playersByCountry).forEach(([country, players]) => {
    if (players.length >= 22) {
      players.sort((a, b) => {
        const scoreDelta = getPlayerSelectionScore(b) - getPlayerSelectionScore(a);
        if (scoreDelta !== 0) return scoreDelta;
        return b.overall - a.overall;
      });
      
      const selectedPlayers: Player[] = [];
      const counts = { GK: 0, DEF: 0, MID: 0, ATK: 0 };
      
      players.forEach(p => {
        if (p.position === 'GK' && counts.GK < 2) { selectedPlayers.push({...p, isStarter: counts.GK < 1}); counts.GK++; }
        else if (p.position === 'DEF' && counts.DEF < 8) { selectedPlayers.push({...p, isStarter: counts.DEF < 4}); counts.DEF++; }
        else if (p.position === 'MID' && counts.MID < 8) { selectedPlayers.push({...p, isStarter: counts.MID < 4}); counts.MID++; }
        else if (p.position === 'ATK' && counts.ATK < 4) { selectedPlayers.push({...p, isStarter: counts.ATK < 2}); counts.ATK++; }
      });

      // If we couldn't fill exactly, just take the best remaining
      if (selectedPlayers.length < 22) {
        const remaining = players.filter(p => !selectedPlayers.find(sp => sp.id === p.id));
        for (let i = 0; i < remaining.length && selectedPlayers.length < 22; i++) {
          selectedPlayers.push({...remaining[i], isStarter: false});
        }
      }

      selectedPlayers.forEach(player => {
        player.nationalCallUpHistory = appendUniqueHistory(player.nationalCallUpHistory, [seasonYear]);
        player.nationalTournamentHistory = appendUniqueHistory(
          player.nationalTournamentHistory,
          internationalCompetitions.map(competition => `${competition}_${seasonYear}`),
        );
        player.nationalCaps = player.nationalCaps || 0;
        player.nationalGoals = player.nationalGoals || 0;
      });

      const overall = Math.round(selectedPlayers.filter(p => p.isStarter).reduce((acc, p) => acc + p.overall, 0) / 11);

      nationalTeams.push({
        id: `NAT_${country}`,
        name: `Seleção ${country}`,
        overall,
        isUserControlled: false,
      players: selectedPlayers,
      finances: 0,
      historicalPoints: 0,
      fanBase: 1_500_000,
      division: 0, // 0 for national teams
      country: country,
      state: '',
      continent: clubCountryLookup.get(country) || 'EU',
      regionalDivision: 0,
        competitionSquads: internationalCompetitions.includes('OLYMPICS')
          ? { OLYMPICS: buildOlympicSquad(players) }
          : undefined,
      stats: buildCompetitionStats()
    });
  }
  });

  return nationalTeams;
};

export const generateTeams = (): Team[] => {
  const generatedTeams = TEAM_TEMPLATES.map(t => {
    const players = generateSquad(t.str, t.country);
    const overall = Math.round(players.filter(p => p.isStarter).reduce((acc, p) => acc + p.overall, 0) / 11);
    const resolvedState = getResolvedState(t.country, t.name, t.state);
    const regionalDivision = t.country === 'BR' ? (t.div <= 2 ? 1 : 2) : t.div;
    
    // Initial balance based on division (SAF fixed value)
    const baseBalance = t.div === 1 ? 100000000 : t.div === 2 ? 40000000 : t.div === 3 ? 10000000 : 2000000;
    
    // Historical points (higher divisions have more history)
    const historicalPoints = t.div === 1 ? 5000 + Math.floor(Math.random() * 5000) : 
                             t.div === 2 ? 2000 + Math.floor(Math.random() * 2000) : 
                             t.div === 3 ? 500 + Math.floor(Math.random() * 1000) : 
                             Math.floor(Math.random() * 300);

    // Stadium generation
    let stadium;
    if (t.div <= 3) {
      stadium = {
        name: `Estádio do ${t.name}`,
        capacity: t.div === 1 ? 40000 : t.div === 2 ? 20000 : 5000,
        ticketPrice: t.div === 1 ? 100 : t.div === 2 ? 50 : 30,
        foodLevel: t.div === 1 ? 2 : t.div === 2 ? 1 : 0,
        merchLevel: t.div === 1 ? 2 : t.div === 2 ? 1 : 0,
      };
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      name: t.name,
      overall,
      isUserControlled: false,
      players,
      finances: baseBalance,
      historicalPoints,
      stadium,
      division: t.div,
      country: t.country,
      state: resolvedState,
      continent: t.cont as 'SA' | 'EU' | 'NA',
      regionalDivision,
      stats: buildCompetitionStats()
    };
  });

return generatedTeams.map(team =>
  ensureTeamCommercial(
    ensureTeamAcademy(
      ensureTeamSponsors(team, DEFAULT_SEASON_YEAR, generatedTeams),
      DEFAULT_SEASON_YEAR,
    ),
  ),
);
};
