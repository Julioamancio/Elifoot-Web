import { Match, Team, MatchEvent, Competition } from '../types/game';

// Helper to generate round-robin schedule for a group of teams
const generateGroupSchedule = (teams: Team[], startWeek: number, competition: Competition, doubleRound: boolean = true): Match[] => {
  const matches: Match[] = [];
  if (teams.length < 2) return matches;

  const teamIds = teams.map(t => t.id);
  if (teamIds.length % 2 !== 0) {
    teamIds.push('BYE');
  }

  const numRounds = teamIds.length - 1;
  const halfSize = teamIds.length / 2;

  let currentWeek = startWeek;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const home = teamIds[i];
      const away = teamIds[teamIds.length - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          week: currentWeek,
          played: false,
          events: [],
          competition
        });
      }
    }
    teamIds.splice(1, 0, teamIds.pop()!);
    currentWeek++;
  }

  if (doubleRound) {
    for (let round = 0; round < numRounds; round++) {
      for (let i = 0; i < halfSize; i++) {
        const home = teamIds[i];
        const away = teamIds[teamIds.length - 1 - i];

        if (home !== 'BYE' && away !== 'BYE') {
          matches.push({
            id: Math.random().toString(36).substr(2, 9),
            homeTeamId: away, // Swap home/away
            awayTeamId: home,
            homeScore: 0,
            awayScore: 0,
            week: currentWeek,
            played: false,
            events: [],
            competition
          });
        }
      }
      teamIds.splice(1, 0, teamIds.pop()!);
      currentWeek++;
    }
  }

  return matches;
};

export const generateSchedule = (teams: Team[]): Match[] => {
  const allMatches: Match[] = [];
  let currentWeek = 1;

  // PHASE 1: REGIONAL (State for SA, Country for EU)
  const regionalGroups: Record<string, Team[]> = {};
  teams.forEach(t => {
    const key = t.continent === 'SA' ? t.state : t.country;
    if (!regionalGroups[key]) regionalGroups[key] = [];
    regionalGroups[key].push(t);
  });

  let maxRegionalWeeks = 0;
  Object.values(regionalGroups).forEach(group => {
    const groupMatches = generateGroupSchedule(group, currentWeek, 'REGIONAL', true); // Double round robin for regionals
    allMatches.push(...groupMatches);
    const weeks = Math.max(...groupMatches.map(m => m.week));
    if (weeks > maxRegionalWeeks) maxRegionalWeeks = weeks;
  });

  currentWeek = maxRegionalWeeks + 1;

  // PHASE 2: LEAGUE (Divisions 1-4)
  const leagueGroups: Record<string, Team[]> = {};
  teams.forEach(t => {
    const key = `${t.continent}_DIV${t.division}`;
    if (!leagueGroups[key]) leagueGroups[key] = [];
    leagueGroups[key].push(t);
  });

  let maxLeagueWeeks = 0;
  Object.values(leagueGroups).forEach(group => {
    const groupMatches = generateGroupSchedule(group, currentWeek, 'LEAGUE', true); // Double round robin
    allMatches.push(...groupMatches);
    const weeks = Math.max(...groupMatches.map(m => m.week));
    if (weeks > maxLeagueWeeks) maxLeagueWeeks = weeks;
  });

  currentWeek = maxLeagueWeeks + 1;

  // PHASE 3: NATIONAL CUP (All divisions per country)
  const cupGroups: Record<string, Team[]> = {};
  teams.forEach(t => {
    const key = t.country;
    if (!cupGroups[key]) cupGroups[key] = [];
    cupGroups[key].push(t);
  });

  let maxCupWeeks = 0;
  Object.values(cupGroups).forEach(group => {
    // Single round robin for cup to save weeks
    const groupMatches = generateGroupSchedule(group, currentWeek, 'NATIONAL_CUP', false);
    allMatches.push(...groupMatches);
    const weeks = Math.max(...groupMatches.map(m => m.week));
    if (weeks > maxCupWeeks) maxCupWeeks = weeks;
  });

  currentWeek = maxCupWeeks + 1;

  // PHASE 4: CONTINENTAL (Libertadores / Champions)
  // Top 4 from Div 1 of each continent
  const saDiv1 = teams.filter(t => t.continent === 'SA' && t.division === 1).slice(0, 4);
  const euDiv1 = teams.filter(t => t.continent === 'EU' && t.division === 1).slice(0, 4);

  const saMatches = generateGroupSchedule(saDiv1, currentWeek, 'CONTINENTAL', true);
  const euMatches = generateGroupSchedule(euDiv1, currentWeek, 'CONTINENTAL', true);
  
  allMatches.push(...saMatches, ...euMatches);
  
  // PHASE 5: CONTINENTAL SECONDARY (Sul-Americana / Europa League)
  // Top 4 from Div 2 of each continent
  const saDiv2 = teams.filter(t => t.continent === 'SA' && t.division === 2).slice(0, 4);
  const euDiv2 = teams.filter(t => t.continent === 'EU' && t.division === 2).slice(0, 4);

  const saSecMatches = generateGroupSchedule(saDiv2, currentWeek, 'CONTINENTAL_SECONDARY', true);
  const euSecMatches = generateGroupSchedule(euDiv2, currentWeek, 'CONTINENTAL_SECONDARY', true);
  
  allMatches.push(...saSecMatches, ...euSecMatches);

  return allMatches.sort((a, b) => a.week - b.week);
};

export const simulateMatch = (home: Team, away: Team): { homeScore: number, awayScore: number, events: MatchEvent[] } => {
  const events: MatchEvent[] = [];

  // Helper to get current strength based on active players and their energy
  const getTeamStrength = (team: Team, activePlayers: Set<string>) => {
    const players = team.players.filter(p => activePlayers.has(p.id));
    if (players.length === 0) return team.overall;
    // Energy affects performance (e.g., 50% energy means playing at 75% of overall)
    const avgOverall = players.reduce((sum, p) => sum + p.overall * (0.5 + (p.energy / 200)), 0) / players.length;
    return avgOverall;
  };

  let homeActive = new Set(home.players.filter(p => p.isStarter).map(p => p.id));
  let awayActive = new Set(away.players.filter(p => p.isStarter).map(p => p.id));

  // If no starters selected, fallback to first 11
  if (homeActive.size === 0) homeActive = new Set(home.players.slice(0, 11).map(p => p.id));
  if (awayActive.size === 0) awayActive = new Set(away.players.slice(0, 11).map(p => p.id));

  let homeScore = 0;
  let awayScore = 0;

  // Simulate in 10-minute chunks
  for (let minute = 1; minute <= 90; minute += 10) {
    // Tactical AI: Substitutions
    if (minute >= 60) {
      [home, away].forEach((team, index) => {
        const activeSet = index === 0 ? homeActive : awayActive;
        const activePlayers = team.players.filter(p => activeSet.has(p.id));
        // Find players who haven't played yet (not in activeSet and not subbed out)
        const subEvents = events.filter(e => e.type === 'SUBSTITUTION' && e.teamId === team.id);
        const subbedOutIds = new Set(subEvents.map(e => e.assistPlayerId));
        const subbedInIds = new Set(subEvents.map(e => e.playerId));
        
        const benchPlayers = team.players.filter(p => !activeSet.has(p.id) && !subbedOutIds.has(p.id) && !subbedInIds.has(p.id));
        
        // Find tired player
        const tiredPlayer = [...activePlayers].sort((a, b) => a.energy - b.energy)[0];
        if (tiredPlayer && tiredPlayer.energy < 65) {
          // Find replacement of same position with better energy
          const replacement = benchPlayers.find(p => p.position === tiredPlayer.position && p.energy > tiredPlayer.energy + 15);
          if (replacement && subEvents.length < 5) { // Max 5 subs
            activeSet.delete(tiredPlayer.id);
            activeSet.add(replacement.id);
            events.push({
              id: Math.random().toString(36).substr(2, 9),
              matchId: '',
              minute: minute + Math.floor(Math.random() * 9),
              type: 'SUBSTITUTION',
              teamId: team.id,
              playerId: replacement.id, // Player coming IN
              assistPlayerId: tiredPlayer.id // Player going OUT
            });
          }
        }
      });
    }

    const homeStrength = getTeamStrength(home, homeActive) + 5; // Home advantage
    const awayStrength = getTeamStrength(away, awayActive);
    const totalStrength = homeStrength + awayStrength;
    const homeProb = homeStrength / totalStrength;

    // Chance of event in this 10-minute window
    if (Math.random() < 0.6) { // Increased chance for events
      const isHomeChance = Math.random() < homeProb;
      const attackingTeam = isHomeChance ? home : away;
      const defendingTeam = isHomeChance ? away : home;
      const activeSet = isHomeChance ? homeActive : awayActive;
      const defendingSet = isHomeChance ? awayActive : homeActive;
      
      // Tactical: Offside Trap
      // If defending team has high overall, they might catch the attacker offside
      const defendingStrength = getTeamStrength(defendingTeam, defendingSet);
      const offsideChance = 0.1 + (defendingStrength / 200); // Max ~0.6 chance if very strong
      
      if (Math.random() < offsideChance) {
        // Offside event
        const activePlayers = attackingTeam.players.filter(p => activeSet.has(p.id));
        const attackers = activePlayers.filter(p => p.position === 'ATK' || p.position === 'MID');
        const offsidePlayer = attackers[Math.floor(Math.random() * attackers.length)] || activePlayers[0];
        
        events.push({
          id: Math.random().toString(36).substr(2, 9),
          matchId: '',
          minute: minute + Math.floor(Math.random() * 9),
          type: 'OFFSIDE',
          teamId: attackingTeam.id,
          playerId: offsidePlayer?.id || attackingTeam.players[0].id
        });
      } else if (Math.random() < 0.3) {
        // Goal event
        if (isHomeChance) homeScore++; else awayScore++;
        
        const activePlayers = attackingTeam.players.filter(p => activeSet.has(p.id));
        const scorers = activePlayers.filter(p => p.position === 'ATK' || p.position === 'MID');
        const scorer = scorers[Math.floor(Math.random() * scorers.length)] || activePlayers[0];
        
        const assisters = activePlayers.filter(p => p.id !== scorer?.id);
        const assister = Math.random() > 0.4 ? assisters[Math.floor(Math.random() * assisters.length)] : undefined;
        
        events.push({
          id: Math.random().toString(36).substr(2, 9),
          matchId: '',
          minute: minute + Math.floor(Math.random() * 9),
          type: 'GOAL',
          teamId: attackingTeam.id,
          playerId: scorer?.id || attackingTeam.players[0].id,
          assistPlayerId: assister?.id
        });
      }
    }

    // Cards (influenced by marking pressure)
    // Higher marking pressure (simulated by lower energy of defenders) increases card chance
    const homeDefEnergy = home.players.filter(p => homeActive.has(p.id) && p.position === 'DEF').reduce((sum, p) => sum + p.energy, 0) / 4;
    const awayDefEnergy = away.players.filter(p => awayActive.has(p.id) && p.position === 'DEF').reduce((sum, p) => sum + p.energy, 0) / 4;
    
    const baseCardChance = 0.15;
    const homeCardChance = baseCardChance + (100 - homeDefEnergy) / 500; // Tired defenders make more fouls
    const awayCardChance = baseCardChance + (100 - awayDefEnergy) / 500;

    if (Math.random() < (homeCardChance + awayCardChance) / 2) {
      const isHomeCard = Math.random() < (homeCardChance / (homeCardChance + awayCardChance));
      const cardTeam = isHomeCard ? home : away;
      const activeSet = isHomeCard ? homeActive : awayActive;
      const activePlayers = cardTeam.players.filter(p => activeSet.has(p.id));
      
      // Defenders and Midfielders are more likely to get cards
      const likelyCardPlayers = activePlayers.filter(p => p.position === 'DEF' || p.position === 'MID');
      const cardPlayer = likelyCardPlayers.length > 0 && Math.random() > 0.3 
        ? likelyCardPlayers[Math.floor(Math.random() * likelyCardPlayers.length)]
        : activePlayers[Math.floor(Math.random() * activePlayers.length)];
      
      if (cardPlayer) {
        events.push({
          id: Math.random().toString(36).substr(2, 9),
          matchId: '',
          minute: minute + Math.floor(Math.random() * 9),
          type: Math.random() > 0.9 ? 'RED_CARD' : 'YELLOW_CARD',
          teamId: cardTeam.id,
          playerId: cardPlayer.id
        });
      }
    }
  }

  events.sort((a, b) => a.minute - b.minute);
  
  return { homeScore, awayScore, events };
};
