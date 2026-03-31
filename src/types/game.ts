export type Position = 'GK' | 'DEF' | 'MID' | 'ATK';
export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'OFFSIDE';
export type Competition = 'LEAGUE' | 'REGIONAL' | 'NATIONAL_CUP' | 'CONTINENTAL' | 'CONTINENTAL_SECONDARY' | 'WORLD_CUP';
export type GameMode = 'manager' | 'player';

export interface Stadium {
  name: string;
  capacity: number;
  ticketPrice: number;
  foodLevel: number; // 0-5
  merchLevel: number; // 0-5
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
  stadium?: Stadium;
  
  // New fields for multi-league support
  division: number; // 1, 2, 3, 4
  country: string; // 'BR', 'ENG', 'ESP', etc.
  state: string; // 'SP', 'RJ', etc.
  continent: 'SA' | 'EU' | 'NA';
  
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
}

export interface GameState {
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
}
