import { Player, Team, Position, Competition, TeamStats } from '../types/game';

const FIRST_NAMES = ['João', 'Pedro', 'Lucas', 'Mateus', 'Gabriel', 'Enzo', 'Valentim', 'Arthur', 'Carlos', 'Eduardo', 'Luis', 'Fernando', 'Rafael', 'Diego', 'Marcelo', 'Alex', 'Bruno', 'Thiago', 'Felipe', 'Gustavo', 'John', 'David', 'Michael', 'Chris', 'James', 'Robert', 'William', 'Joseph', 'Thomas', 'Charles'];
const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Gomes', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const generateName = () => {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
};

const generatePlayer = (position: Position, baseOverall: number, isStarter: boolean): Player => {
  const age = Math.floor(Math.random() * 15) + 18; // 18 to 32
  const overall = Math.max(40, Math.min(99, baseOverall + Math.floor(Math.random() * 10) - 5));
  
  // Calculate value based on overall and age (younger = more expensive)
  const baseValue = Math.pow(overall, 3) * 10;
  const ageMultiplier = age < 23 ? 1.5 : age > 29 ? 0.6 : 1;
  const value = Math.round((baseValue * ageMultiplier) / 10000) * 10000; // Round to 10k
  
  // Salary is roughly 1% of value per year, divided by 12 for monthly, simplified here
  const salary = Math.round(value * 0.01 / 1000) * 1000;

  return {
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
    salary
  };
};

const generateSquad = (baseOverall: number): Player[] => {
  const squad: Player[] = [];
  
  // Starters (11)
  squad.push(generatePlayer('GK', baseOverall, true));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('DEF', baseOverall, true));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('MID', baseOverall, true));
  for (let i = 0; i < 2; i++) squad.push(generatePlayer('ATK', baseOverall, true));
  
  // Reserves (11)
  squad.push(generatePlayer('GK', baseOverall - 5, false));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('DEF', baseOverall - 5, false));
  for (let i = 0; i < 4; i++) squad.push(generatePlayer('MID', baseOverall - 5, false));
  for (let i = 0; i < 2; i++) squad.push(generatePlayer('ATK', baseOverall - 5, false));

  return squad;
};

const emptyStats = (): TeamStats => ({ played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });

const TEAM_TEMPLATES = [
  // BRAZIL (SA)
  { name: 'Flamengo', div: 1, country: 'BR', state: 'RJ', cont: 'SA', str: 85 },
  { name: 'Palmeiras', div: 1, country: 'BR', state: 'SP', cont: 'SA', str: 85 },
  { name: 'São Paulo', div: 1, country: 'BR', state: 'SP', cont: 'SA', str: 82 },
  { name: 'Fluminense', div: 1, country: 'BR', state: 'RJ', cont: 'SA', str: 81 },
  { name: 'Atlético-MG', div: 1, country: 'BR', state: 'MG', cont: 'SA', str: 83 },
  { name: 'Grêmio', div: 1, country: 'BR', state: 'RS', cont: 'SA', str: 80 },
  { name: 'Internacional', div: 1, country: 'BR', state: 'RS', cont: 'SA', str: 80 },
  { name: 'Cruzeiro', div: 1, country: 'BR', state: 'MG', cont: 'SA', str: 78 },
  
  { name: 'Santos', div: 2, country: 'BR', state: 'SP', cont: 'SA', str: 76 },
  { name: 'Vasco', div: 2, country: 'BR', state: 'RJ', cont: 'SA', str: 75 },
  { name: 'Botafogo', div: 2, country: 'BR', state: 'RJ', cont: 'SA', str: 77 },
  { name: 'Corinthians', div: 2, country: 'BR', state: 'SP', cont: 'SA', str: 76 },
  { name: 'Bahia', div: 2, country: 'BR', state: 'BA', cont: 'SA', str: 74 },
  { name: 'Fortaleza', div: 2, country: 'BR', state: 'CE', cont: 'SA', str: 75 },
  { name: 'Athletico-PR', div: 2, country: 'BR', state: 'PR', cont: 'SA', str: 76 },
  { name: 'Coritiba', div: 2, country: 'BR', state: 'PR', cont: 'SA', str: 72 },

  { name: 'Sport', div: 3, country: 'BR', state: 'PE', cont: 'SA', str: 70 },
  { name: 'Vitória', div: 3, country: 'BR', state: 'BA', cont: 'SA', str: 69 },
  { name: 'Ceará', div: 3, country: 'BR', state: 'CE', cont: 'SA', str: 70 },
  { name: 'Goiás', div: 3, country: 'BR', state: 'GO', cont: 'SA', str: 68 },
  { name: 'Vila Nova', div: 3, country: 'BR', state: 'GO', cont: 'SA', str: 65 },
  { name: 'Guarani', div: 3, country: 'BR', state: 'SP', cont: 'SA', str: 66 },
  { name: 'Ponte Preta', div: 3, country: 'BR', state: 'SP', cont: 'SA', str: 66 },
  { name: 'Juventude', div: 3, country: 'BR', state: 'RS', cont: 'SA', str: 67 },

  { name: 'Santa Cruz', div: 4, country: 'BR', state: 'PE', cont: 'SA', str: 62 },
  { name: 'Paraná', div: 4, country: 'BR', state: 'PR', cont: 'SA', str: 60 },
  { name: 'Figueirense', div: 4, country: 'BR', state: 'SC', cont: 'SA', str: 63 },
  { name: 'Avaí', div: 4, country: 'BR', state: 'SC', cont: 'SA', str: 64 },
  { name: 'Náutico', div: 4, country: 'BR', state: 'PE', cont: 'SA', str: 61 },
  { name: 'Paysandu', div: 4, country: 'BR', state: 'PA', cont: 'SA', str: 59 },
  { name: 'Remo', div: 4, country: 'BR', state: 'PA', cont: 'SA', str: 58 },
  { name: 'ABC', div: 4, country: 'BR', state: 'RN', cont: 'SA', str: 57 },

  // EUROPE (EU)
  { name: 'Real Madrid', div: 1, country: 'ESP', state: 'MAD', cont: 'EU', str: 92 },
  { name: 'Barcelona', div: 1, country: 'ESP', state: 'CAT', cont: 'EU', str: 90 },
  { name: 'Man City', div: 1, country: 'ENG', state: 'MAN', cont: 'EU', str: 93 },
  { name: 'Arsenal', div: 1, country: 'ENG', state: 'LON', cont: 'EU', str: 88 },
  { name: 'Bayern', div: 1, country: 'GER', state: 'BAV', cont: 'EU', str: 91 },
  { name: 'Dortmund', div: 1, country: 'GER', state: 'NRW', cont: 'EU', str: 86 },
  { name: 'Inter', div: 1, country: 'ITA', state: 'LOM', cont: 'EU', str: 87 },
  { name: 'Juventus', div: 1, country: 'ITA', state: 'PIE', cont: 'EU', str: 85 },

  { name: 'Liverpool', div: 2, country: 'ENG', state: 'MER', cont: 'EU', str: 88 },
  { name: 'Man United', div: 2, country: 'ENG', state: 'MAN', cont: 'EU', str: 84 },
  { name: 'AC Milan', div: 2, country: 'ITA', state: 'LOM', cont: 'EU', str: 85 },
  { name: 'Napoli', div: 2, country: 'ITA', state: 'CAM', cont: 'EU', str: 84 },
  { name: 'Atletico Madrid', div: 2, country: 'ESP', state: 'MAD', cont: 'EU', str: 86 },
  { name: 'Sevilla', div: 2, country: 'ESP', state: 'AND', cont: 'EU', str: 82 },
  { name: 'Leverkusen', div: 2, country: 'GER', state: 'NRW', cont: 'EU', str: 85 },
  { name: 'Leipzig', div: 2, country: 'GER', state: 'SAC', cont: 'EU', str: 83 },

  { name: 'Chelsea', div: 3, country: 'ENG', state: 'LON', cont: 'EU', str: 83 },
  { name: 'Tottenham', div: 3, country: 'ENG', state: 'LON', cont: 'EU', str: 82 },
  { name: 'Roma', div: 3, country: 'ITA', state: 'LAZ', cont: 'EU', str: 81 },
  { name: 'Lazio', div: 3, country: 'ITA', state: 'LAZ', cont: 'EU', str: 80 },
  { name: 'Betis', div: 3, country: 'ESP', state: 'AND', cont: 'EU', str: 79 },
  { name: 'Real Sociedad', div: 3, country: 'ESP', state: 'BAS', cont: 'EU', str: 80 },
  { name: 'Frankfurt', div: 3, country: 'GER', state: 'HES', cont: 'EU', str: 78 },
  { name: 'Wolfsburg', div: 3, country: 'GER', state: 'NDS', cont: 'EU', str: 77 },

  { name: 'Aston Villa', div: 4, country: 'ENG', state: 'WMI', cont: 'EU', str: 81 },
  { name: 'Newcastle', div: 4, country: 'ENG', state: 'TYN', cont: 'EU', str: 82 },
  { name: 'Fiorentina', div: 4, country: 'ITA', state: 'TUS', cont: 'EU', str: 78 },
  { name: 'Atalanta', div: 4, country: 'ITA', state: 'LOM', cont: 'EU', str: 81 },
  { name: 'Villarreal', div: 4, country: 'ESP', state: 'VAL', cont: 'EU', str: 79 },
  { name: 'Athletic Bilbao', div: 4, country: 'ESP', state: 'BAS', cont: 'EU', str: 80 },
  { name: 'Monchengladbach', div: 4, country: 'GER', state: 'NRW', cont: 'EU', str: 76 },
  { name: 'Stuttgart', div: 4, country: 'GER', state: 'BW', cont: 'EU', str: 79 },
];

export const generateTeams = (): Team[] => {
  return TEAM_TEMPLATES.map(t => {
    const players = generateSquad(t.str);
    const overall = Math.round(players.filter(p => p.isStarter).reduce((acc, p) => acc + p.overall, 0) / 11);
    
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
      state: t.state,
      continent: t.cont as 'SA' | 'EU',
      stats: {
        LEAGUE: emptyStats(),
        REGIONAL: emptyStats(),
        NATIONAL_CUP: emptyStats(),
        CONTINENTAL: emptyStats(),
        CONTINENTAL_SECONDARY: emptyStats()
      }
    };
  });
};
