import { CommercialProfile, Team, WeeklyCommercialReport } from '../types/game';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundMoney = (value: number) => {
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  if (value >= 100_000) return Math.round(value / 10_000) * 10_000;
  return Math.round(value / 1_000) * 1_000;
};

const getDefaultFanBase = (team: Team) => {
  const divisionBase =
    team.division === 1 ? 1_100_000 :
    team.division === 2 ? 420_000 :
    team.division === 3 ? 140_000 :
    team.division === 4 ? 38_000 :
    600_000;

  const performanceBoost = team.overall * 4_500;
  const historyBoost = Math.max(0, team.historicalPoints) * 16;
  return Math.round(divisionBase + performanceBoost + historyBoost);
};

const getDivisionPriceTarget = (team: Team) => ({
  shirt: team.division === 1 ? 260 : team.division === 2 ? 190 : team.division === 3 ? 130 : 85,
  accessory: team.division === 1 ? 90 : team.division === 2 ? 65 : team.division === 3 ? 45 : 28,
  membership: team.division === 1 ? 55 : team.division === 2 ? 38 : team.division === 3 ? 26 : 16,
  digital: team.division === 1 ? 26 : team.division === 2 ? 20 : team.division === 3 ? 14 : 9,
});

export const createDefaultCommercialProfile = (team: Team): CommercialProfile => {
  const targets = getDivisionPriceTarget(team);
  return {
    shirtPrice: targets.shirt,
    accessoryPrice: targets.accessory,
    membershipPrice: targets.membership,
    digitalPrice: targets.digital,
    lastWeeklyReport: null,
  };
};

export const ensureTeamCommercial = (team: Team): Team => ({
  ...team,
  fanBase: team.fanBase ?? getDefaultFanBase(team),
  commercial: team.commercial
    ? {
        ...createDefaultCommercialProfile(team),
        ...team.commercial,
      }
    : createDefaultCommercialProfile(team),
});

const getPriceFit = (targetPrice: number, chosenPrice: number) => {
  if (chosenPrice <= 0) return 0;
  const ratio = targetPrice / chosenPrice;
  return clamp(Math.pow(ratio, 0.85), 0.35, 1.45);
};

export const getCommercialDemandScore = (team: Team) => {
  const leagueStats = team.stats.LEAGUE;
  const pointsPerMatch = leagueStats.played > 0 ? leagueStats.points / Math.max(leagueStats.played * 3, 1) : 0.5;
  const goalMomentum = leagueStats.played > 0 ? (leagueStats.goalsFor - leagueStats.goalsAgainst) / Math.max(leagueStats.played, 1) : 0;
  const cupMomentum = team.stats.NATIONAL_CUP.wins * 0.03 + team.stats.CONTINENTAL.wins * 0.04 + team.stats.REGIONAL.wins * 0.015;
  const divisionWeight =
    team.division === 1 ? 1.12 :
    team.division === 2 ? 0.98 :
    team.division === 3 ? 0.86 :
    team.division === 4 ? 0.75 :
    1;
  const historicalPull = clamp(team.historicalPoints / 12_000, 0, 0.28);
  const qualityPull = clamp((team.overall - 60) / 100, -0.05, 0.22);

  return Number(clamp(divisionWeight + (pointsPerMatch - 0.5) * 0.8 + goalMomentum * 0.04 + cupMomentum + historicalPull + qualityPull, 0.45, 1.75).toFixed(2));
};

export const estimateWeeklyCommercialRevenue = (team: Team, week: number): WeeklyCommercialReport => {
  const safeTeam = ensureTeamCommercial(team);
  const fanBase = safeTeam.fanBase ?? getDefaultFanBase(safeTeam);
  const commercial = safeTeam.commercial!;
  const targets = getDivisionPriceTarget(safeTeam);
  const demandScore = getCommercialDemandScore(safeTeam);

  const shirtsUnits = Math.round(fanBase * 0.0012 * demandScore * getPriceFit(targets.shirt, commercial.shirtPrice));
  const accessoriesUnits = Math.round(fanBase * 0.002 * demandScore * getPriceFit(targets.accessory, commercial.accessoryPrice));
  const membershipsUnits = Math.round(fanBase * 0.00042 * demandScore * getPriceFit(targets.membership, commercial.membershipPrice));
  const digitalUnits = Math.round(fanBase * 0.0011 * demandScore * getPriceFit(targets.digital, commercial.digitalPrice));

  const shirtsRevenue = roundMoney(shirtsUnits * commercial.shirtPrice);
  const accessoriesRevenue = roundMoney(accessoriesUnits * commercial.accessoryPrice);
  const membershipsRevenue = roundMoney(membershipsUnits * commercial.membershipPrice);
  const digitalRevenue = roundMoney(digitalUnits * commercial.digitalPrice);

  return {
    week,
    demandScore,
    shirtsRevenue,
    accessoriesRevenue,
    membershipsRevenue,
    digitalRevenue,
    totalRevenue: shirtsRevenue + accessoriesRevenue + membershipsRevenue + digitalRevenue,
  };
};

export const estimateMatchdayAttendance = (team: Team) => {
  if (!team.stadium) return 0;

  const demandScore = getCommercialDemandScore(team);
  const targetTicketPrice =
    team.division === 1 ? 70 :
    team.division === 2 ? 48 :
    team.division === 3 ? 34 :
    22;
  const priceFit = getPriceFit(targetTicketPrice, team.stadium.ticketPrice);
  const occupancyRate = clamp(0.28 + demandScore * 0.42 * priceFit, 0.12, 0.98);
  return Math.round(team.stadium.capacity * occupancyRate);
};
