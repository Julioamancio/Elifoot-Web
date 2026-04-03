import { Competition, ContractGoalMetric, ContractRole, Player, PlayerContract, PlayerContractGoal, Position, RenewalPreference, RetiredPlayerRecord, Team } from '../types/game';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roundMoney = (value: number) => {
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  if (value >= 100_000) return Math.round(value / 10_000) * 10_000;
  return Math.round(value / 1_000) * 1_000;
};

const getRoleForPlayer = (player: Player): ContractRole => {
  if (player.youthProspect || player.age <= 19) return 'PROSPECT';
  if (player.overall >= 85) return 'STAR';
  if (player.isStarter || player.overall >= 76) return 'STARTER';
  return 'ROTATION';
};

const getRenewalPreference = (player: Player): RenewalPreference => {
  if (player.age <= 23 || player.overall >= 84) return 'HIGH';
  if (player.age >= 33) return 'LOW';
  return 'NEUTRAL';
};

const buildContractGoals = (player: Player): PlayerContractGoal[] => {
  const goals: PlayerContractGoal[] = [];

  if (player.position === 'ATK') {
    goals.push(
      { metric: 'GOALS', target: player.overall >= 80 ? 12 : 7, description: 'Marcar gols decisivos na temporada.' },
      { metric: 'ASSISTS', target: player.overall >= 80 ? 5 : 3, description: 'Contribuir com assistencias.' },
      { metric: 'AVERAGE_RATING', target: 7, description: 'Manter media de avaliacao acima de 7.0.' },
    );
  } else if (player.position === 'MID') {
    goals.push(
      { metric: 'ASSISTS', target: player.overall >= 78 ? 7 : 4, description: 'Criar chances e distribuir assistencias.' },
      { metric: 'KEY_PASSES', target: player.overall >= 78 ? 24 : 14, description: 'Acumular passes-chave ao longo do ano.' },
      { metric: 'AVERAGE_RATING', target: 6.9, description: 'Sustentar boas notas em campo.' },
    );
  } else if (player.position === 'DEF') {
    goals.push(
      { metric: 'TACKLES', target: player.overall >= 78 ? 45 : 28, description: 'Somar desarmes importantes.' },
      { metric: 'INTERCEPTIONS', target: player.overall >= 78 ? 34 : 20, description: 'Interceptar jogadas com consistencia.' },
      { metric: 'CLEAN_SHEETS', target: 8, description: 'Ajudar a defesa a terminar jogos sem sofrer gols.' },
    );
  } else {
    goals.push(
      { metric: 'SAVES', target: player.overall >= 80 ? 70 : 45, description: 'Acumular defesas ao longo da temporada.' },
      { metric: 'SAVE_PERCENTAGE', target: 68, description: 'Manter um bom aproveitamento de defesas.' },
      { metric: 'CLEAN_SHEETS', target: 10, description: 'Buscar jogos sem sofrer gols.' },
    );
  }

  goals.push({
    metric: 'AVOID_RELEGATION',
    target: 1,
    description: 'Cumprir o objetivo coletivo e evitar fracasso na temporada.',
  });

  return goals;
};

export const createPlayerContract = (player: Player, currentYear: number): PlayerContract => {
  const role = getRoleForPlayer(player);
  const durationYears = role === 'PROSPECT' ? 2 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 4);
  const bonus = roundMoney(player.salary * (role === 'STAR' ? 8 : role === 'STARTER' ? 5 : 3));
  const releaseClause = roundMoney(player.value * (role === 'STAR' ? 2.4 : role === 'STARTER' ? 2.1 : 1.8));

  return {
    startYear: currentYear,
    endYear: currentYear + durationYears,
    durationYears,
    salary: player.salary,
    bonus,
    releaseClause,
    role,
    performanceGoals: buildContractGoals(player),
    renewalPreference: getRenewalPreference(player),
    requestedSalaryIncrease: false,
    requestedTransfer: false,
    lastSeasonGoalsMet: true,
  };
};

export const getPlayerRetirementRisk = (player: Player) => {
  const minutesFactor = (player.seasonMinutes ?? player.matchesPlayed * 90) < 900 ? 0.08 : -0.04;
  const declineFactor = (player.form ?? 6) < 6.2 ? 0.08 : -0.03;
  const roleFactor = player.contract?.role === 'ROTATION' || player.contract?.role === 'PROSPECT' ? 0.04 : -0.02;

  let probability = 0;

  if (player.position === 'GK') {
    if (player.age >= 41) probability = 1;
    else if (player.age >= 39) probability = 0.82;
    else if (player.age >= 37) probability = 0.52;
    else if (player.age >= 36) probability = 0.24;
  } else {
    if (player.age >= 41) probability = 1;
    else if (player.age >= 39) probability = 1;
    else if (player.age >= 37) probability = 0.8;
    else if (player.age >= 36) probability = 0.58;
    else if (player.age >= 35) probability = 0.32;
    else if (player.age >= 34) probability = 0.14;
  }

  probability = clamp(probability + minutesFactor + declineFactor + roleFactor, 0, 1);

  if (probability >= 0.8) return { label: 'Muito Alto', probability };
  if (probability >= 0.55) return { label: 'Alto', probability };
  if (probability >= 0.25) return { label: 'Medio', probability };
  return { label: 'Baixo', probability };
};

export const getPlayerAgeCurveFactor = (age: number) => {
  if (age <= 18) return 1.38;
  if (age <= 22) return 1.24;
  if (age <= 28) return 1.08;
  if (age <= 32) return 0.9;
  if (age <= 35) return 0.68;
  return 0.42;
};

const getPlayerMetricScore = (player: Player) => {
  const averageRating = player.averageRating ?? 6;
  const form = player.form ?? averageRating;
  const titles = player.titlesWon ?? 0;

  if (player.position === 'ATK') {
    return player.goals * 1.2 + player.assists * 0.65 + averageRating * 3 + titles * 2.2 + form * 2.2;
  }

  if (player.position === 'MID') {
    return player.assists * 0.9 + (player.keyPasses ?? 0) * 0.2 + averageRating * 3.2 + titles * 1.8 + form * 2;
  }

  if (player.position === 'DEF') {
    return (player.tackles ?? 0) * 0.18 + (player.interceptions ?? 0) * 0.18 + (player.cleanSheets ?? 0) * 1.1 + averageRating * 3 + titles * 1.9;
  }

  return (player.saves ?? 0) * 0.12 + (player.savePercentage ?? 0) * 0.25 + (player.cleanSheets ?? 0) * 1.2 + averageRating * 3.2 + titles * 1.7;
};

export const calculatePlayerMarketValue = (player: Player) => {
  const baseValue = Math.pow(player.overall, 3) * 22;
  const ageCurve = getPlayerAgeCurveFactor(player.age);
  const performanceMultiplier = clamp(0.82 + getPlayerMetricScore(player) / 90, 0.8, 2.45);
  const potentialBoost = player.potential ? 1 + Math.max(0, player.potential - player.overall) / 140 : 1;
  return roundMoney(baseValue * ageCurve * performanceMultiplier * potentialBoost);
};

export const recalculatePlayerEconomics = (player: Player, currentYear: number) => {
  const value = calculatePlayerMarketValue(player);
  const salary = roundMoney(Math.max(10_000, value * (player.contract?.role === 'STAR' ? 0.012 : 0.0095)));
  const contract = player.contract
    ? {
        ...player.contract,
        salary,
        bonus: roundMoney(salary * 5),
        releaseClause: roundMoney(value * (player.contract.role === 'STAR' ? 2.4 : player.contract.role === 'STARTER' ? 2.1 : 1.8)),
      }
    : createPlayerContract({ ...player, value, salary }, currentYear);

  return {
    ...player,
    value,
    salary,
    contract,
  };
};

const evaluateGoalMetric = (player: Player, metric: ContractGoalMetric, target: number, team: Team, teams: Team[]) => {
  const sameLeagueTeams = teams.filter(
    current => current.country === team.country && current.division === team.division && current.division > 0,
  );
  const sortedByLeague = [...sameLeagueTeams].sort((teamA, teamB) => {
    const statsA = teamA.stats.LEAGUE;
    const statsB = teamB.stats.LEAGUE;
    if (statsB.points !== statsA.points) return statsB.points - statsA.points;
    const gdA = statsA.goalsFor - statsA.goalsAgainst;
    const gdB = statsB.goalsFor - statsB.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (statsB.goalsFor !== statsA.goalsFor) return statsB.goalsFor - statsA.goalsFor;
    return teamB.overall - teamA.overall;
  });
  const teamPosition = Math.max(1, sortedByLeague.findIndex(current => current.id === team.id) + 1);
  const relegationLine = sortedByLeague.length >= 16 ? sortedByLeague.length - 4 : Math.max(sortedByLeague.length - 2, 1);

  switch (metric) {
    case 'GOALS':
      return player.goals >= target;
    case 'ASSISTS':
      return player.assists >= target;
    case 'AVERAGE_RATING':
      return (player.averageRating ?? 0) >= target;
    case 'KEY_PASSES':
      return (player.keyPasses ?? 0) >= target;
    case 'TACKLES':
      return (player.tackles ?? 0) >= target;
    case 'INTERCEPTIONS':
      return (player.interceptions ?? 0) >= target;
    case 'CLEAN_SHEETS':
      return (player.cleanSheets ?? 0) >= target;
    case 'SAVES':
      return (player.saves ?? 0) >= target;
    case 'SAVE_PERCENTAGE':
      return (player.savePercentage ?? 0) >= target;
    case 'TITLES':
      return (player.titlesWon ?? 0) >= target;
    case 'PROMOTION':
      return team.division > 1 && teamPosition <= target;
    case 'AVOID_RELEGATION':
      return teamPosition <= relegationLine;
    default:
      return false;
  }
};

export const evaluatePlayerContractGoals = (player: Player, team: Team, teams: Team[]) => {
  const goals = player.contract?.performanceGoals ?? [];
  const achieved = goals.filter(goal => evaluateGoalMetric(player, goal.metric, goal.target, team, teams)).length;
  return {
    achieved,
    total: goals.length,
    met: goals.length === 0 ? true : achieved >= Math.ceil(goals.length * 0.6),
  };
};

export const refreshContractForNewSeason = (player: Player, team: Team, teams: Team[], nextYear: number) => {
  const contract = player.contract ?? createPlayerContract(player, nextYear - 1);
  const evaluation = evaluatePlayerContractGoals(player, team, teams);
  const expired = contract.endYear < nextYear;

  if (!expired) {
    return {
      ...player,
      contract: {
        ...contract,
        lastSeasonGoalsMet: evaluation.met,
        requestedSalaryIncrease: evaluation.met && player.contract?.renewalPreference === 'HIGH',
        requestedTransfer: !evaluation.met && player.age <= 31,
      },
    };
  }

  let renewChance = 0.25;
  if (evaluation.met) renewChance += 0.6;
  if (contract.renewalPreference === 'HIGH') renewChance += 0.1;
  if (contract.renewalPreference === 'LOW') renewChance -= 0.08;
  if ((player.form ?? 6) < 6.2) renewChance -= 0.12;
  if (player.age >= 34) renewChance -= 0.18;

  const willRenew = Math.random() < clamp(renewChance, 0.05, 0.95);
  if (!willRenew) {
    return {
      ...player,
      contract: {
        ...contract,
        lastSeasonGoalsMet: evaluation.met,
        requestedTransfer: true,
        requestedSalaryIncrease: !evaluation.met,
      },
    };
  }

  const nextContract = createPlayerContract({ ...player, salary: player.salary, value: player.value }, nextYear);
  return {
    ...player,
    contract: {
      ...nextContract,
      salary: roundMoney(nextContract.salary * (evaluation.met ? 1.12 : 1.03)),
      lastSeasonGoalsMet: evaluation.met,
      requestedTransfer: false,
      requestedSalaryIncrease: evaluation.met && contract.renewalPreference === 'HIGH',
    },
  };
};

export const shouldPlayerRetire = (player: Player, allowAutoForUserPlayer: boolean) => {
  if (player.status === 'RETIRED') return true;
  if (player.age >= 41) return true;
  if (!allowAutoForUserPlayer && player.age < 41) return false;
  return Math.random() < getPlayerRetirementRisk(player).probability;
};

export const createRetiredPlayerRecord = (player: Player, retiredYear: number): RetiredPlayerRecord => ({
  id: player.id,
  name: player.name,
  position: player.position,
  nationality: player.nationality,
  retiredYear,
  age: player.age,
  careerGoals: player.careerGoals ?? player.goals ?? 0,
  careerAssists: player.careerAssists ?? player.assists ?? 0,
  careerMatches: player.careerMatches ?? player.matchesPlayed ?? 0,
  cleanSheets: player.cleanSheets ?? 0,
  titlesWon: player.titlesWon ?? 0,
});

export const createRegenPlayer = (retiredPlayer: Player, currentYear: number): Player => {
  const age = 16 + Math.floor(Math.random() * 3);
  const potentialFloor = clamp((retiredPlayer.overall ?? 70) - 8, 70, 90);
  const potential = clamp(potentialFloor + Math.floor(Math.random() * 10), 70, 95);
  const overall = clamp(potential - (10 + Math.floor(Math.random() * 12)), 54, 82);

  const basePlayer: Player = {
    id: Math.random().toString(36).slice(2, 11),
    name: `${retiredPlayer.nationality ?? 'BR'} Prospect ${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    position: retiredPlayer.position,
    overall,
    age,
    energy: 100,
    isStarter: false,
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    value: roundMoney(Math.pow(overall, 3) / 120),
    salary: 10_000,
    potential,
    status: 'ACTIVE',
    nationality: retiredPlayer.nationality,
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
    cleanSheets: 0,
    saves: 0,
    savePercentage: 0,
    keyPasses: 0,
    tackles: 0,
    interceptions: 0,
    passAccuracy: 0,
    titlesWon: 0,
    youthProspect: true,
  };

  return recalculatePlayerEconomics(
    {
      ...basePlayer,
      contract: createPlayerContract(basePlayer, currentYear),
    },
    currentYear,
  );
};

export const createAcademyProspect = (team: Team, currentYear: number): Player => {
  const age = 15 + Math.floor(Math.random() * 4);
  const positionPool: Position[] = ['GK', 'DEF', 'MID', 'ATK', 'DEF', 'MID', 'ATK'];
  const position = positionPool[Math.floor(Math.random() * positionPool.length)];
  const potentialFloor = team.division === 1 ? 76 : team.division === 2 ? 70 : team.division === 3 ? 64 : 58;
  const potentialCeiling = team.division === 1 ? 95 : team.division === 2 ? 89 : team.division === 3 ? 82 : 76;
  const potential = potentialFloor + Math.floor(Math.random() * (potentialCeiling - potentialFloor + 1));
  const overall = clamp(potential - (12 + Math.floor(Math.random() * 16)), 48, 74);

  const prospect: Player = {
    id: Math.random().toString(36).slice(2, 11),
    name: `${team.country} Academy ${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    position,
    overall,
    age,
    energy: 100,
    isStarter: false,
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    value: roundMoney(Math.pow(overall, 3) / 140),
    salary: 8_000,
    potential,
    status: 'ACTIVE',
    nationality: team.country,
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
    cleanSheets: 0,
    saves: 0,
    savePercentage: 0,
    keyPasses: 0,
    tackles: 0,
    interceptions: 0,
    passAccuracy: 0,
    titlesWon: 0,
    youthProspect: true,
  };

  return recalculatePlayerEconomics(
    {
      ...prospect,
      contract: createPlayerContract(prospect, currentYear),
    },
    currentYear,
  );
};

export const ensureTeamAcademy = (team: Team, currentYear: number) => {
  if (team.division <= 0) return team;

  const academyPlayers = [...(team.academyPlayers ?? [])];
  if (academyPlayers.length === 0) {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let index = 0; index < count; index += 1) {
      academyPlayers.push(createAcademyProspect(team, currentYear));
    }
  }

  return {
    ...team,
    academyPlayers,
  };
};

export const refreshTeamAcademyForNewSeason = (team: Team, currentYear: number, regens: Player[] = []) => {
  if (team.division <= 0) return team;

  const academyPlayers = [...(team.academyPlayers ?? [])];
  const generatedCount = 1 + Math.floor(Math.random() * 3);

  for (let index = 0; index < generatedCount; index += 1) {
    academyPlayers.push(createAcademyProspect(team, currentYear));
  }

  academyPlayers.push(...regens.map(player => ({ ...player, youthProspect: true, isStarter: false })));

  return {
    ...team,
    academyPlayers: academyPlayers
      .sort((playerA, playerB) => (playerB.potential ?? playerB.overall) - (playerA.potential ?? playerA.overall))
      .slice(0, 8),
  };
};

export const autoPromoteAcademyPlayers = (team: Team, currentYear: number) => {
  if (team.division <= 0) return team;

  const academyPlayers = [...(team.academyPlayers ?? [])].sort(
    (playerA, playerB) => (playerB.potential ?? playerB.overall) - (playerA.potential ?? playerA.overall),
  );
  const squadPlayers = [...team.players];
  const minimumSquadSize = 22;

  while (academyPlayers.length > 0 && squadPlayers.length < minimumSquadSize) {
    const promoted = academyPlayers.shift()!;
    squadPlayers.push(
      recalculatePlayerEconomics(
        {
          ...promoted,
          youthProspect: false,
          contract: createPlayerContract({ ...promoted, youthProspect: false }, currentYear),
        },
        currentYear,
      ),
    );
  }

  return {
    ...team,
    players: squadPlayers,
    academyPlayers,
  };
};

export const getPlayerContractStatus = (player: Player, currentYear: number) => {
  const contract = player.contract;
  if (!contract) return 'Sem contrato';
  const yearsLeft = contract.endYear - currentYear;
  if (yearsLeft < 0) return 'Expirado';
  if (yearsLeft === 0) return 'Ultimo ano';
  if (yearsLeft === 1) return '2 temporadas restantes';
  return `${yearsLeft + 1} temporadas restantes`;
};
