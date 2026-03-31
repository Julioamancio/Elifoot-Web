import { create } from 'zustand';
import { GameState, Team, Player, Match, GameMode } from '../types/game';
import { generateTeams } from '../game/generator';
import { generateSchedule, simulateMatch } from '../game/engine';

interface GameStore extends GameState {
  startNewGame: (name: string, mode: GameMode, teamName?: string) => void;
  playWeek: () => void;
  updateLineup: (teamId: string, starters: string[]) => void;
  toggleStarter: (playerId: string) => void;
  setGameState: (state: GameState) => void;
  resetGame: () => void;
  generateMarket: () => void;
  buyPlayer: (playerId: string) => void;
  sellPlayer: (playerId: string) => void;
  distributePrizeMoney: () => void;
  upgradeStadium: (type: 'capacity' | 'food' | 'merch' | 'build') => void;
  trainPlayer: () => { success: boolean, improved: boolean, message: string } | undefined;
}

const initialState: GameState = {
  teams: [],
  matches: [],
  currentWeek: 1,
  userTeamId: null,
  userPlayerId: null,
  gameMode: null,
  isGameOver: false,
  marketPlayers: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setGameState: (state) => set(state),

  resetGame: () => set(initialState),

  generateMarket: () => {
    const { teams } = get();
    const market: Player[] = [];
    // Randomly select players from other teams to put on the market
    teams.forEach(team => {
      if (!team.isUserControlled) {
        const randomPlayer = team.players[Math.floor(Math.random() * team.players.length)];
        if (!randomPlayer.isStarter && Math.random() > 0.8) {
          market.push(randomPlayer);
        }
      }
    });
    set({ marketPlayers: market });
  },

  buyPlayer: (playerId) => {
    const { teams, userTeamId, marketPlayers } = get();
    if (!userTeamId) return;

    const userTeam = teams.find(t => t.id === userTeamId);
    if (!userTeam) return;

    const playerToBuy = marketPlayers.find(p => p.id === playerId);
    if (!playerToBuy) return;

    if (userTeam.finances >= playerToBuy.value) {
      set(state => ({
        teams: state.teams.map(team => {
          if (team.id === userTeamId) {
            return {
              ...team,
              finances: team.finances - playerToBuy.value,
              players: [...team.players, { ...playerToBuy, isStarter: false }]
            };
          }
          // Remove from original team
          if (team.players.some(p => p.id === playerId)) {
            return {
              ...team,
              finances: team.finances + playerToBuy.value,
              players: team.players.filter(p => p.id !== playerId)
            };
          }
          return team;
        }),
        marketPlayers: state.marketPlayers.filter(p => p.id !== playerId)
      }));
    }
  },

  sellPlayer: (playerId) => {
    const { teams, userTeamId } = get();
    if (!userTeamId) return;

    const userTeam = teams.find(t => t.id === userTeamId);
    if (!userTeam) return;

    const playerToSell = userTeam.players.find(p => p.id === playerId);
    if (!playerToSell) return;

    set(state => ({
      teams: state.teams.map(team => {
        if (team.id === userTeamId) {
          return {
            ...team,
            finances: team.finances + playerToSell.value,
            players: team.players.filter(p => p.id !== playerId)
          };
        }
        return team;
      }),
      marketPlayers: [...state.marketPlayers, playerToSell]
    }));
  },

  startNewGame: (name, mode, teamName) => {
    const teams = generateTeams();
    let userTeamId = null;
    let userPlayerId = null;

    if (mode === 'manager' && teamName) {
      const userTeam = teams.find(t => t.name === teamName);
      if (userTeam) {
        userTeam.isUserControlled = true;
        userTeamId = userTeam.id;
      }
    } else if (mode === 'player') {
      // Create a player and assign to a random div 4 team
      const div4Teams = teams.filter(t => t.division === 4);
      const randomTeam = div4Teams[Math.floor(Math.random() * div4Teams.length)];
      
      const newPlayer: Player = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        position: 'ATK', // Default for now
        overall: 65,
        age: 18,
        energy: 100,
        isStarter: true,
        value: 1000000,
        salary: 10000,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0
      };

      randomTeam.players.push(newPlayer);
      userTeamId = randomTeam.id;
      userPlayerId = newPlayer.id;
    }

    const matches = generateSchedule(teams);

    set({
      teams,
      matches,
      currentWeek: 1,
      userTeamId,
      userPlayerId,
      gameMode: mode,
      isGameOver: false,
      marketPlayers: [],
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

  playWeek: (userMatchResult?: { matchId: string, homeScore: number, awayScore: number, events: MatchEvent[] }) => {
    const { matches, teams, currentWeek } = get();
    
    const weekMatches = matches.filter(m => m.week === currentWeek && !m.played);
    if (weekMatches.length === 0) {
      // Check if game is over (no more matches)
      const hasMoreMatches = matches.some(m => m.week > currentWeek);
      if (!hasMoreMatches) {
        get().distributePrizeMoney();
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

    const updatedTeams = [...teams];
    const updatedMatches = [...matches];

    // AI Tactical Decision: Update Lineups for non-user teams
    updatedTeams.forEach(team => {
      if (!team.isUserControlled) {
        const sortedPlayers = [...team.players].sort((a, b) => {
          const scoreA = a.overall * (0.5 + a.energy / 200);
          const scoreB = b.overall * (0.5 + b.energy / 200);
          return scoreB - scoreA;
        });

        let gk = 0, def = 0, mid = 0, atk = 0;
        team.players.forEach(p => p.isStarter = false);

        sortedPlayers.forEach(p => {
          const playerRef = team.players.find(tp => tp.id === p.id)!;
          if (p.position === 'GK' && gk < 1) { playerRef.isStarter = true; gk++; }
          else if (p.position === 'DEF' && def < 4) { playerRef.isStarter = true; def++; }
          else if (p.position === 'MID' && mid < 4) { playerRef.isStarter = true; mid++; }
          else if (p.position === 'ATK' && atk < 2) { playerRef.isStarter = true; atk++; }
        });
      }
    });

    // Deduct weekly salaries (simplified: monthly salary / 4)
    updatedTeams.forEach(team => {
      const weeklySalary = team.players.reduce((sum, p) => sum + p.salary, 0) / 4;
      team.finances -= weeklySalary;
    });

    const playedPlayerIds = new Set<string>();

    weekMatches.forEach(match => {
      const home = updatedTeams.find(t => t.id === match.homeTeamId)!;
      const away = updatedTeams.find(t => t.id === match.awayTeamId)!;

      // Calculate Matchday Income for Home Team
      if (home.stadium) {
        const attendance = Math.floor(home.stadium.capacity * (0.4 + Math.random() * 0.6));
        const ticketRev = attendance * home.stadium.ticketPrice;
        const foodRev = attendance * home.stadium.foodLevel * 15;
        const merchRev = attendance * home.stadium.merchLevel * 25;
        home.finances += ticketRev + foodRev + merchRev;
      }

      let result;
      if (userMatchResult && match.id === userMatchResult.matchId) {
        result = userMatchResult;
      } else {
        result = simulateMatch(home, away);
      }
      
      const matchIndex = updatedMatches.findIndex(m => m.id === match.id);
      updatedMatches[matchIndex] = {
        ...match,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        played: true,
        events: result.events.map(e => ({ ...e, matchId: match.id }))
      };

      // Collect players who played
      home.players.filter(p => p.isStarter).forEach(p => playedPlayerIds.add(p.id));
      away.players.filter(p => p.isStarter).forEach(p => playedPlayerIds.add(p.id));
      result.events.forEach(event => {
        if (event.type === 'SUBSTITUTION') {
          playedPlayerIds.add(event.playerId);
        }
      });

      // Update teams stats based on competition
      const homeIndex = updatedTeams.findIndex(t => t.id === home.id);
      const awayIndex = updatedTeams.findIndex(t => t.id === away.id);
      const comp = match.competition;

      updatedTeams[homeIndex].stats[comp].goalsFor += result.homeScore;
      updatedTeams[homeIndex].stats[comp].goalsAgainst += result.awayScore;
      updatedTeams[homeIndex].stats[comp].played += 1;
      
      updatedTeams[awayIndex].stats[comp].goalsFor += result.awayScore;
      updatedTeams[awayIndex].stats[comp].goalsAgainst += result.homeScore;
      updatedTeams[awayIndex].stats[comp].played += 1;

      if (result.homeScore > result.awayScore) {
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

      // Update player stats
      result.events.forEach(event => {
        const teamIndex = updatedTeams.findIndex(t => t.id === event.teamId);
        const playerIndex = updatedTeams[teamIndex].players.findIndex(p => p.id === event.playerId);
        
        if (playerIndex !== -1) {
          if (event.type === 'GOAL') updatedTeams[teamIndex].players[playerIndex].goals += 1;
          if (event.type === 'YELLOW_CARD') updatedTeams[teamIndex].players[playerIndex].yellowCards += 1;
          if (event.type === 'RED_CARD') updatedTeams[teamIndex].players[playerIndex].redCards += 1;
        }

        if (event.assistPlayerId) {
          const assistIndex = updatedTeams[teamIndex].players.findIndex(p => p.id === event.assistPlayerId);
          if (assistIndex !== -1) {
            updatedTeams[teamIndex].players[assistIndex].assists += 1;
          }
        }
      });

      // Update matches played for starters
      home.players.filter(p => p.isStarter).forEach(p => {
        const pIdx = updatedTeams[homeIndex].players.findIndex(up => up.id === p.id);
        updatedTeams[homeIndex].players[pIdx].matchesPlayed += 1;
      });
      away.players.filter(p => p.isStarter).forEach(p => {
        const pIdx = updatedTeams[awayIndex].players.findIndex(up => up.id === p.id);
        updatedTeams[awayIndex].players[pIdx].matchesPlayed += 1;
      });
    });

    // Update Energy
    updatedTeams.forEach(team => {
      team.players.forEach(player => {
        if (playedPlayerIds.has(player.id)) {
          // Played: lose energy
          player.energy = Math.max(0, Math.round(player.energy - (15 + Math.random() * 15)));
        } else {
          // Rested: gain energy
          player.energy = Math.min(100, Math.round(player.energy + (20 + Math.random() * 10)));
        }
      });
    });

    set({
      teams: updatedTeams,
      matches: updatedMatches,
      currentWeek: currentWeek + 1
    });
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
      const { userTeamId, teams } = state;
      if (!userTeamId) return state;

      const userTeam = teams.find(t => t.id === userTeamId);
      if (!userTeam) return state;

      const player = userTeam.players.find(p => p.id === playerId);
      if (!player) return state;

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

  trainPlayer: () => {
    const { teams, userPlayerId } = get();
    if (!userPlayerId) return undefined;

    let result = { success: false, improved: false, message: 'Não foi possível treinar.' };

    set(state => ({
      teams: state.teams.map(team => {
        const playerIndex = team.players.findIndex(p => p.id === userPlayerId);
        if (playerIndex !== -1) {
          const newTeam = { ...team };
          const player = newTeam.players[playerIndex];
          if (player.energy >= 20) {
            player.energy -= 20;
            result.success = true;
            result.message = 'Treino concluído! Você gastou 20 de energia.';
            // Small chance to increase overall
            if (Math.random() > 0.7 && player.overall < 99) {
              player.overall += 1;
              player.value = Math.round((Math.pow(player.overall, 3) * 10 * (player.age < 23 ? 1.5 : 1)) / 10000) * 10000;
              player.salary = Math.round(player.value * 0.01 / 1000) * 1000;
              result.improved = true;
              result.message = 'Treino excelente! Seu overall aumentou em +1.';
            }
          } else {
            result.message = 'Energia insuficiente para treinar.';
          }
          return newTeam;
        }
        return team;
      })
    }));

    return result;
  }
}));
