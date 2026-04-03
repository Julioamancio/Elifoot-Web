import { SponsorContract, SponsorGoalType, SponsorSlot, Team } from '../types/game';

type SponsorPerformanceContext = {
  leaguePosition: number;
  leagueTeamCount: number;
  promotion: boolean;
  top4: boolean;
  avoidRelegation: boolean;
  continentalQualification: boolean;
  reachedCupQuarterFinal: boolean;
  wonRegional: boolean;
  goalsScored: number;
  financialStability: boolean;
  performanceIndex: number;
};

type SponsorPlan = {
  slot: SponsorSlot;
  payment: number;
  tier: 1 | 2 | 3 | 4;
  goalType: SponsorGoalType;
  goalTarget?: number;
  goalDescription: string;
};

const DIVISION_SPONSOR_CAPS: Record<number, { min: number; max: number }> = {
  1: { min: 5_000_000, max: 50_000_000 },
  2: { min: 1_000_000, max: 10_000_000 },
  3: { min: 200_000, max: 2_000_000 },
  4: { min: 20_000, max: 300_000 },
};

const SLOT_ORDER: SponsorSlot[] = ['MAIN', 'SECONDARY', 'LOCAL'];

const SLOT_LABELS: Record<SponsorSlot, string> = {
  MAIN: 'Master',
  SECONDARY: 'Secundario',
  LOCAL: 'Local',
};

const SLOT_SHARE_RANGES: Record<SponsorSlot, { min: number; max: number }> = {
  MAIN: { min: 0.58, max: 0.7 },
  SECONDARY: { min: 0.2, max: 0.28 },
  LOCAL: { min: 0.08, max: 0.15 },
};

const MAIN_SPONSOR_POOLS: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['Emirates', 'Santander', 'Betano', 'Vodafone', 'Qatar Airways', 'Amazon', 'ItaU', 'Samsung'],
  2: ['Magazine Luiza', 'Porto Seguro', 'Sicredi', 'Localiza', 'MRV', 'Unimed', 'Bradesco Seguros'],
  3: ['Construtora Horizonte', 'Rede Mais', 'Via Center', 'Supermercados Popular', 'Transportes Uniao'],
  4: ['Casa do Bairro', 'Auto Pecas Centro', 'Mercado Popular', 'Restaurante da Esquina', 'Farmacia Local'],
};

const SECONDARY_SPONSOR_POOLS: Record<1 | 2 | 3 | 4, string[]> = {
  1: ['Adidas', 'Nike', 'Visa', 'Claro', 'Puma', 'Lenovo', 'Mercado Pago'],
  2: ['Havan', 'Azul Cargo', 'PagBank', 'Mapfre', 'Assai', 'Natura'],
  3: ['Construsul', 'Atacado do Vale', 'Seguros Capital', 'Moveis Norte', 'Posto Avenida'],
  4: ['Padaria Central', 'Vila Telecom', 'Oficina do Povo', 'Loja da Praca', 'Papelaria Ideal'],
};

const LOCAL_SUFFIXES = ['Comercio', 'Servicos', 'Atacado', 'Distribuidora', 'Mercados', 'Energia'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roundMoney = (value: number) => {
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  if (value >= 100_000) return Math.round(value / 10_000) * 10_000;
  return Math.round(value / 1_000) * 1_000;
};

const normalizeLeaguePosition = (team: Team, teams: Team[]) => {
  const leaguePeers = teams.filter(
    current => current.division === team.division && current.country === team.country && current.division > 0,
  );

  const sortedPeers = [...leaguePeers].sort((teamA, teamB) => {
    const statsA = teamA.stats.LEAGUE;
    const statsB = teamB.stats.LEAGUE;
    if (statsB.points !== statsA.points) return statsB.points - statsA.points;
    const goalDiffA = statsA.goalsFor - statsA.goalsAgainst;
    const goalDiffB = statsB.goalsFor - statsB.goalsAgainst;
    if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
    if (statsB.goalsFor !== statsA.goalsFor) return statsB.goalsFor - statsA.goalsFor;
    if (teamB.historicalPoints !== teamA.historicalPoints) return teamB.historicalPoints - teamA.historicalPoints;
    return teamB.overall - teamA.overall;
  });

  const leaguePosition = Math.max(1, sortedPeers.findIndex(current => current.id === team.id) + 1);

  return {
    leaguePosition,
    leagueTeamCount: Math.max(sortedPeers.length, 1),
  };
};

const getPerformanceContext = (team: Team, teams: Team[]): SponsorPerformanceContext => {
  const { leaguePosition, leagueTeamCount } = normalizeLeaguePosition(team, teams);
  const relegationLine = leagueTeamCount >= 16 ? leagueTeamCount - 4 : Math.max(leagueTeamCount - 2, 1);
  const positionScore =
    leagueTeamCount <= 1 ? 0.6 : clamp((leagueTeamCount - leaguePosition) / (leagueTeamCount - 1), 0, 1);
  const cupBonus = clamp(team.stats.NATIONAL_CUP.wins / 4, 0, 0.2);
  const regionalBonus = clamp(team.stats.REGIONAL.wins / 3, 0, 0.1);
  const continentalBonus = clamp(team.stats.CONTINENTAL.wins / 4, 0, 0.18);
  const starPlayers = team.players.filter(player => player.overall >= (team.division === 1 ? 82 : 76)).length;
  const starBonus = clamp(starPlayers / 20, 0, 0.08);
  const historyBonus = clamp(team.historicalPoints / 12_000, 0, 0.12);
  const financeBonus = team.finances > 0 ? 0.05 : -0.06;
  const divisionBase = ({ 1: 0.55, 2: 0.42, 3: 0.28, 4: 0.18 } as Record<number, number>)[team.division] ?? 0.2;
  const performanceIndex = clamp(
    divisionBase + positionScore * 0.35 + cupBonus + regionalBonus + continentalBonus + starBonus + historyBonus + financeBonus,
    0.05,
    0.98,
  );

  return {
    leaguePosition,
    leagueTeamCount,
    promotion: team.division > 1 && leaguePosition <= 2,
    top4: leaguePosition <= Math.min(4, leagueTeamCount),
    avoidRelegation: leaguePosition <= relegationLine,
    continentalQualification: team.division === 1 && leaguePosition <= 2,
    reachedCupQuarterFinal: team.stats.NATIONAL_CUP.wins >= 2,
    wonRegional: team.stats.REGIONAL.wins >= 2,
    goalsScored: team.stats.LEAGUE.goalsFor,
    financialStability: team.finances >= 0,
    performanceIndex,
  };
};

const getEffectiveSponsorTier = (team: Team, context: SponsorPerformanceContext): 1 | 2 | 3 | 4 => {
  let tier = clamp(team.division, 1, 4);

  if (context.performanceIndex >= 0.82) tier -= 1;
  if (context.performanceIndex <= 0.28) tier += 1;

  return clamp(tier, 1, 4) as 1 | 2 | 3 | 4;
};

const createGoal = (team: Team, slot: SponsorSlot, context: SponsorPerformanceContext): Omit<SponsorPlan, 'slot' | 'payment' | 'tier'> => {
  if (slot === 'MAIN') {
    if (team.division === 1) {
      if (context.performanceIndex >= 0.78) {
        return {
          goalType: 'TOP_4',
          goalDescription: 'Terminar a liga entre os 4 primeiros.',
        };
      }

      return {
        goalType: 'CONTINENTAL_QUALIFICATION',
        goalDescription: 'Garantir vaga continental pela liga.',
      };
    }

    return {
      goalType: 'PROMOTION',
      goalDescription: 'Conquistar o acesso nesta temporada.',
    };
  }

  if (slot === 'SECONDARY') {
    if (team.division <= 2) {
      return {
        goalType: 'CUP_QUARTER_FINAL',
        goalDescription: 'Chegar pelo menos as quartas da copa nacional.',
      };
    }

    return {
      goalType: 'AVOID_RELEGATION',
      goalDescription: 'Evitar qualquer risco de rebaixamento.',
    };
  }

  if (team.country === 'BR' && team.state) {
    return {
      goalType: 'WIN_REGIONAL',
      goalDescription: 'Fazer campanha forte no estadual e buscar o titulo.',
    };
  }

  return {
    goalType: 'SCORE_GOALS',
    goalTarget: team.division === 1 ? 45 : team.division === 2 ? 35 : 24,
    goalDescription: `Marcar pelo menos ${team.division === 1 ? 45 : team.division === 2 ? 35 : 24} gols na liga.`,
  };
};

const buildSlotPayments = (totalBudget: number) => {
  const mainShare = SLOT_SHARE_RANGES.MAIN.min + Math.random() * (SLOT_SHARE_RANGES.MAIN.max - SLOT_SHARE_RANGES.MAIN.min);
  const secondaryShare =
    SLOT_SHARE_RANGES.SECONDARY.min +
    Math.random() * (SLOT_SHARE_RANGES.SECONDARY.max - SLOT_SHARE_RANGES.SECONDARY.min);
  const localShare = clamp(1 - mainShare - secondaryShare, SLOT_SHARE_RANGES.LOCAL.min, SLOT_SHARE_RANGES.LOCAL.max);
  const normalizationFactor = mainShare + secondaryShare + localShare;

  return {
    MAIN: roundMoney((totalBudget * mainShare) / normalizationFactor),
    SECONDARY: roundMoney((totalBudget * secondaryShare) / normalizationFactor),
    LOCAL: roundMoney((totalBudget * localShare) / normalizationFactor),
  } as Record<SponsorSlot, number>;
};

const buildSponsorBudgetPlan = (team: Team, teams: Team[]) => {
  const caps = DIVISION_SPONSOR_CAPS[team.division] ?? DIVISION_SPONSOR_CAPS[4];
  const context = getPerformanceContext(team, teams);
  const totalBudget = roundMoney(caps.min + (caps.max - caps.min) * context.performanceIndex);
  const payments = buildSlotPayments(clamp(totalBudget, caps.min, caps.max));
  const tier = getEffectiveSponsorTier(team, context);

  const plans = SLOT_ORDER.map(slot => ({
    slot,
    payment: payments[slot],
    tier,
    ...createGoal(team, slot, context),
  }));

  const plannedTotal = plans.reduce((sum, plan) => sum + plan.payment, 0);
  if (plannedTotal > caps.max) {
    const scale = caps.max / plannedTotal;
    plans.forEach(plan => {
      plan.payment = roundMoney(plan.payment * scale);
    });
  }

  return {
    context,
    plans,
    caps,
  };
};

const pickUniqueName = (candidates: string[], usedNames: Set<string>) => {
  const available = candidates.filter(candidate => !usedNames.has(candidate));
  const pool = available.length > 0 ? available : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  usedNames.add(chosen);
  return chosen;
};

const buildLocalSponsorName = (team: Team, usedNames: Set<string>) => {
  const locationToken = team.state || team.country || team.name.split(' ')[0];
  const suffix = LOCAL_SUFFIXES[Math.floor(Math.random() * LOCAL_SUFFIXES.length)];
  const candidate = `${locationToken} ${suffix}`;

  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  return pickUniqueName(
    LOCAL_SUFFIXES.map(currentSuffix => `${locationToken} ${currentSuffix}`),
    usedNames,
  );
};

const buildSponsorName = (team: Team, slot: SponsorSlot, tier: 1 | 2 | 3 | 4, usedNames: Set<string>) => {
  if (slot === 'LOCAL') return buildLocalSponsorName(team, usedNames);
  if (slot === 'MAIN') return pickUniqueName(MAIN_SPONSOR_POOLS[tier], usedNames);
  return pickUniqueName(SECONDARY_SPONSOR_POOLS[tier], usedNames);
};

const createSponsorContract = (
  team: Team,
  slot: SponsorSlot,
  plan: SponsorPlan,
  currentYear: number,
  usedNames: Set<string>,
): SponsorContract => {
  const contractLength = 1 + Math.floor(Math.random() * 5);
  const name = buildSponsorName(team, slot, plan.tier, usedNames);

  return {
    id: Math.random().toString(36).slice(2, 11),
    name,
    slot,
    seasonPayment: plan.payment,
    contractLength,
    contractStartYear: currentYear,
    contractEndYear: currentYear + contractLength - 1,
    goalType: plan.goalType,
    goalTarget: plan.goalTarget,
    goalDescription: plan.goalDescription,
    tier: plan.tier,
    lastSeasonGoalMet: true,
  };
};

const evaluateSponsorGoal = (team: Team, sponsor: SponsorContract, teams: Team[]) => {
  const context = getPerformanceContext(team, teams);

  switch (sponsor.goalType) {
    case 'AVOID_RELEGATION':
      return context.avoidRelegation;
    case 'TOP_4':
      return context.top4;
    case 'WIN_REGIONAL':
      return context.wonRegional;
    case 'CUP_QUARTER_FINAL':
      return context.reachedCupQuarterFinal;
    case 'PROMOTION':
      return context.promotion;
    case 'SCORE_GOALS':
      return context.goalsScored >= (sponsor.goalTarget ?? 0);
    case 'FINANCIAL_STABILITY':
      return context.financialStability;
    case 'CONTINENTAL_QUALIFICATION':
      return context.continentalQualification;
    default:
      return false;
  }
};

const shouldReplaceSponsor = (
  sponsor: SponsorContract | undefined,
  plan: SponsorPlan,
  team: Team,
  teams: Team[],
  nextYear: number,
) => {
  if (!sponsor) return true;

  const goalMet = evaluateSponsorGoal(team, sponsor, teams);
  const expired = sponsor.contractEndYear < nextYear;
  const context = getPerformanceContext(team, teams);
  let leaveChance = expired ? 0.3 : 0.08;

  if (!goalMet) leaveChance += 0.5;
  if (context.performanceIndex < 0.3) leaveChance += 0.14;
  if (context.performanceIndex > 0.82) leaveChance -= 0.08;
  if (plan.tier < sponsor.tier && context.performanceIndex > 0.78) leaveChance += 0.25;
  if (plan.tier > sponsor.tier && context.performanceIndex < 0.28) leaveChance += 0.22;

  return Math.random() < clamp(leaveChance, 0.02, 0.92);
};

const renewSponsor = (
  sponsor: SponsorContract,
  plan: SponsorPlan,
  team: Team,
  teams: Team[],
  nextYear: number,
): SponsorContract => {
  const goalMet = evaluateSponsorGoal(team, sponsor, teams);
  const expired = sponsor.contractEndYear < nextYear;

  if (!expired) {
    return {
      ...sponsor,
      lastSeasonGoalMet: goalMet,
    };
  }

  const contractLength = 1 + Math.floor(Math.random() * 4);

  return {
    ...sponsor,
    seasonPayment: plan.payment,
    contractLength,
    contractStartYear: nextYear,
    contractEndYear: nextYear + contractLength - 1,
    goalType: plan.goalType,
    goalTarget: plan.goalTarget,
    goalDescription: plan.goalDescription,
    tier: plan.tier,
    lastSeasonGoalMet: goalMet,
  };
};

const applySponsorCap = (team: Team) => {
  if (team.division <= 0 || !team.sponsors?.length) return team;

  const caps = DIVISION_SPONSOR_CAPS[team.division] ?? DIVISION_SPONSOR_CAPS[4];
  let sponsors = team.sponsors.map(sponsor => ({ ...sponsor }));
  const total = sponsors.reduce((sum, sponsor) => sum + sponsor.seasonPayment, 0);

  if (total > caps.max) {
    const scale = caps.max / total;
    sponsors = sponsors.map(sponsor => ({
      ...sponsor,
      seasonPayment: roundMoney(sponsor.seasonPayment * scale),
    }));
  } else if (total < caps.min) {
    const missing = caps.min - total;
    const slotWeights: Record<SponsorSlot, number> = { MAIN: 0.6, SECONDARY: 0.25, LOCAL: 0.15 };

    sponsors = sponsors.map(sponsor => ({
      ...sponsor,
      seasonPayment: roundMoney(sponsor.seasonPayment + missing * slotWeights[sponsor.slot]),
    }));
  }

  let adjustedTotal = sponsors.reduce((sum, sponsor) => sum + sponsor.seasonPayment, 0);

  if (adjustedTotal > caps.max) {
    let excess = adjustedTotal - caps.max;
    const orderedSponsors = [...sponsors].sort((sponsorA, sponsorB) => sponsorB.seasonPayment - sponsorA.seasonPayment);

    orderedSponsors.forEach(sponsor => {
      if (excess <= 0) return;
      const reduction = Math.min(excess, sponsor.seasonPayment);
      sponsor.seasonPayment = Math.max(1_000, sponsor.seasonPayment - reduction);
      excess -= reduction;
    });
  }

  adjustedTotal = sponsors.reduce((sum, sponsor) => sum + sponsor.seasonPayment, 0);
  if (adjustedTotal < caps.min) {
    const deficit = caps.min - adjustedTotal;
    const mainSponsor = sponsors.find(sponsor => sponsor.slot === 'MAIN');
    if (mainSponsor) {
      mainSponsor.seasonPayment += deficit;
    }
  }

  sponsors = sponsors.map(sponsor => ({ ...sponsor, seasonPayment: roundMoney(sponsor.seasonPayment) }));

  adjustedTotal = sponsors.reduce((sum, sponsor) => sum + sponsor.seasonPayment, 0);
  if (adjustedTotal > caps.max) {
    let excess = adjustedTotal - caps.max;
    const mainSponsor = sponsors.find(sponsor => sponsor.slot === 'MAIN') ?? sponsors[0];
    if (mainSponsor) {
      mainSponsor.seasonPayment = Math.max(1_000, mainSponsor.seasonPayment - excess);
    }
  }

  adjustedTotal = sponsors.reduce((sum, sponsor) => sum + sponsor.seasonPayment, 0);
  if (adjustedTotal < caps.min) {
    const deficit = caps.min - adjustedTotal;
    const mainSponsor = sponsors.find(sponsor => sponsor.slot === 'MAIN') ?? sponsors[0];
    if (mainSponsor) {
      mainSponsor.seasonPayment += deficit;
    }
  }

  team.sponsors = sponsors;
  return team;
};

export const getSponsorSlotLabel = (slot: SponsorSlot) => SLOT_LABELS[slot];

export const getTeamSponsorIncome = (team: Team) =>
  (team.sponsors ?? []).reduce((sum, sponsor) => sum + sponsor.seasonPayment, 0);

export const ensureTeamSponsors = (team: Team, currentYear: number, allTeams: Team[] = [team]) => {
  if (team.division <= 0) return team;

  const normalizedTeam: Team = {
    ...team,
    sponsors: [...(team.sponsors ?? [])],
  };
  const { plans } = buildSponsorBudgetPlan(normalizedTeam, allTeams);
  const usedNames = new Set((normalizedTeam.sponsors ?? []).map(sponsor => sponsor.name));
  const sponsorsBySlot = new Map((normalizedTeam.sponsors ?? []).map(sponsor => [sponsor.slot, sponsor]));

  normalizedTeam.sponsors = SLOT_ORDER.map(slot => {
    const existingSponsor = sponsorsBySlot.get(slot);
    const plan = plans.find(currentPlan => currentPlan.slot === slot)!;
    return (
      existingSponsor ?? createSponsorContract(normalizedTeam, slot, plan, currentYear, usedNames)
    );
  });

  return applySponsorCap(normalizedTeam);
};

export const refreshSponsorsForNewSeason = (teams: Team[], nextYear: number) => {
  const normalizedTeams = teams.map(team => ensureTeamSponsors(team, nextYear - 1, teams));

  return normalizedTeams.map(team => {
    if (team.division <= 0) return team;

    const { plans } = buildSponsorBudgetPlan(team, normalizedTeams);
    const sponsorsBySlot = new Map((team.sponsors ?? []).map(sponsor => [sponsor.slot, sponsor]));
    const usedNames = new Set((team.sponsors ?? []).map(sponsor => sponsor.name));

    const sponsors = SLOT_ORDER.map(slot => {
      const plan = plans.find(currentPlan => currentPlan.slot === slot)!;
      const currentSponsor = sponsorsBySlot.get(slot);

      if (shouldReplaceSponsor(currentSponsor, plan, team, normalizedTeams, nextYear)) {
        return createSponsorContract(team, slot, plan, nextYear, usedNames);
      }

      return renewSponsor(currentSponsor!, plan, team, normalizedTeams, nextYear);
    });

    const updatedTeam = applySponsorCap({
      ...team,
      sponsors,
    });

    return {
      ...updatedTeam,
      finances: updatedTeam.finances + getTeamSponsorIncome(updatedTeam),
    };
  });
};
