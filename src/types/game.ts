export type Position = 'GK' | 'DEF' | 'MID' | 'ATK';
export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'OFFSIDE' | 'INJURY';
export type Competition = 'LEAGUE' | 'REGIONAL' | 'NATIONAL_CUP' | 'CONTINENTAL' | 'CONTINENTAL_SECONDARY' | 'WORLD_CUP' | 'OLYMPICS';
export type GameMode = 'manager' | 'player';
export type SponsorSlot = 'MAIN' | 'SECONDARY' | 'LOCAL';
export type NewsType = 'MATCH' | 'INJURY' | 'TRANSFER' | 'CONTRACT' | 'SEASON' | 'GENERAL';
export type InjurySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type SponsorGoalType =
  | 'AVOID_RELEGATION'
  | 'TOP_4'
  | 'WIN_REGIONAL'
  | 'CUP_QUARTER_FINAL'
  | 'PROMOTION'
  | 'SCORE_GOALS'
  | 'FINANCIAL_STABILITY'
  | 'CONTINENTAL_QUALIFICATION';
export type ContractRole = 'STAR' | 'STARTER' | 'ROTATION' | 'PROSPECT';
export type RenewalPreference = 'LOW' | 'NEUTRAL' | 'HIGH';
export type ContractGoalMetric =
  | 'GOALS'
  | 'ASSISTS'
  | 'AVERAGE_RATING'
  | 'KEY_PASSES'
  | 'TACKLES'
  | 'INTERCEPTIONS'
  | 'CLEAN_SHEETS'
  | 'SAVES'
  | 'SAVE_PERCENTAGE'
  | 'TITLES'
  | 'PROMOTION'
  | 'AVOID_RELEGATION';
export type PlayerStatus = 'ACTIVE' | 'RETIRED';

export interface CompetitionHistoryEntry {
  year: number;
  championTeamId: string;
  championName: string;
}

export interface PlayerContractGoal {
  metric: ContractGoalMetric;
  target: number;
  description: string;
}

export interface PlayerContract {
  startYear: number;
  endYear: number;
  durationYears: number;
  salary: number;
  bonus: number;
  releaseClause: number;
  role: ContractRole;
  performanceGoals: PlayerContractGoal[];
  renewalPreference: RenewalPreference;
  requestedSalaryIncrease?: boolean;
  requestedTransfer?: boolean;
  lastSeasonGoalsMet?: boolean;
}

export interface RetiredPlayerRecord {
  id: string;
  name: string;
  position: Position;
  nationality?: string;
  retiredYear: number;
  age: number;
  careerGoals: number;
  careerAssists: number;
  careerMatches: number;
  cleanSheets: number;
  titlesWon: number;
}

export interface PlayerDisciplinaryRecord {
  yellowCards: number;
  redCards: number;
  accumulatedYellows: number;
  suspendedMatches: number;
  matchesSuspended: number;
}

export interface PlayerInjury {
  type: string;
  severity: InjurySeverity;
  startWeek: number;
  expectedRecoveryWeek: number;
  weeksRemaining: number;
}

export interface Stadium {
  name: string;
  capacity: number;
  ticketPrice: number;
  foodLevel: number; // 0-5
  merchLevel: number; // 0-5
}

export interface WeeklyCommercialReport {
  week: number;
  demandScore: number;
  shirtsRevenue: number;
  accessoriesRevenue: number;
  membershipsRevenue: number;
  digitalRevenue: number;
  totalRevenue: number;
}

export interface CommercialProfile {
  shirtPrice: number;
  accessoryPrice: number;
  membershipPrice: number;
  digitalPrice: number;
  lastWeeklyReport?: WeeklyCommercialReport | null;
}

export interface SponsorContract {
  id: string;
  name: string;
  slot: SponsorSlot;
  seasonPayment: number;
  contractLength: number;
  contractStartYear: number;
  contractEndYear: number;
  goalType: SponsorGoalType;
  goalTarget?: number;
  goalDescription: string;
  tier: 1 | 2 | 3 | 4;
  lastSeasonGoalMet?: boolean;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  overall: number;
  age: number;
  energy: number;
  isStarter: boolean;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  value: number;
  salary: number;
  potential?: number;
  status?: PlayerStatus;
  // New fields for Career Mode
  nationality?: string;
  preferredFoot?: 'Left' | 'Right' | 'Both';
  height?: number; // in cm
  weight?: number; // in kg
  jerseyNumber?: number;
  nationalTeamId?: string | null;
  careerGoals?: number;
  careerAssists?: number;
  careerMatches?: number;
  seasonMinutes?: number;
  averageRating?: number;
  ratingTotal?: number;
  ratingSamples?: number;
  form?: number;
  nationalCaps?: number;
  nationalGoals?: number;
  nationalCallUpHistory?: number[];
  nationalTournamentHistory?: string[];
  yellowCardsSeason?: number;
  redCardsSeason?: number;
  disciplinary?: Partial<Record<Competition, PlayerDisciplinaryRecord>>;
  injury?: PlayerInjury | null;
  cleanSheets?: number;
  saves?: number;
  savePercentage?: number;
  keyPasses?: number;
  tackles?: number;
  interceptions?: number;
  passAccuracy?: number;
  titlesWon?: number;
  contract?: PlayerContract;
  youthProspect?: boolean;
}

export interface TeamStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Team {
  id: string;
  name: string;
  overall: number;
  isUserControlled: boolean;
  players: Player[];
  finances: number;
  historicalPoints: number;
  fanBase?: number;
  stadium?: Stadium;
  commercial?: CommercialProfile;
  sponsors?: SponsorContract[];
  academyPlayers?: Player[];
  
  // New fields for multi-league support
  division: number; // 1, 2, 3, 4
  country: string; // 'BR', 'ENG', 'ESP', etc.
  state: string; // 'SP', 'RJ', etc.
  continent: 'SA' | 'EU' | 'NA';
  regionalDivision?: number;
  competitionSquads?: Partial<Record<Competition, Player[]>>;
  
  // Stats per competition
  stats: Record<Competition, TeamStats>;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerId: string;
  assistPlayerId?: string;
  reason?: string;
}

export interface NewsItem {
  id: string;
  type: NewsType;
  title: string;
  body: string;
  week: number;
  year: number;
  teamId?: string;
  playerId?: string;
  createdAt: number;
}

export interface RoundSummaryMatch {
  matchId: string;
  competition: Competition;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  userControlledTeamName?: string;
}

export interface WeekSummary {
  week: number;
  year: number;
  hiddenMatchesCount: number;
  userResults: RoundSummaryMatch[];
  headlines: string[];
}

export interface SeasonMovement {
  country: string;
  teamId: string;
  teamName: string;
  fromDivision: number;
  toDivision: number;
}

export interface SeasonReview {
  year: number;
  leagueChampions: Array<{
    country: string;
    division: number;
    teamId: string;
    teamName: string;
  }>;
  promoted: SeasonMovement[];
  relegated: SeasonMovement[];
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  week: number;
  played: boolean;
  events: MatchEvent[];
  competition: Competition;
  isKnockout?: boolean;
  winnerTeamId?: string | null;
  wentToPenalties?: boolean;
  stage?: string | null;
  roundSize?: number | null;
  tournamentId?: string | null;
  tournamentName?: string | null;
  seasonYear?: number | null;
  groupName?: string | null;
}

export interface GameState {
  schemaVersion?: number;
  teams: Team[];
  matches: Match[];
  currentWeek: number;
  userTeamId: string | null;
  userPlayerId: string | null;
  gameMode: GameMode | null;
  isGameOver: boolean;
  marketPlayers: Player[];
  activeMatchId: string | null;
  managerReputation: number; // 0 to 100
  jobOffers: string[]; // Array of team IDs
  currentYear?: number;
  competitionHistory?: Partial<Record<Competition, CompetitionHistoryEntry[]>>;
  retiredPlayersHistory?: RetiredPlayerRecord[];
  newsFeed?: NewsItem[];
  recentRoundSummary?: WeekSummary | null;
  seasonReview?: SeasonReview | null;
}
