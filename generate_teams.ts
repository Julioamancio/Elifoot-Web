import * as fs from 'fs';

const data: Record<string, Record<string, string[]>> = {
  "Brasil": {
    "Série A": ["Flamengo", "Palmeiras", "Cruzeiro", "Mirassol", "Fluminense", "Bahia", "Botafogo", "São Paulo", "Red Bull Bragantino", "Corinthians", "Grêmio", "Vasco", "Clube Atlético Mineiro", "Santos", "Vitória", "Internacional", "Coritiba", "Athletico-PR", "Chapecoense", "Remo"],
    "Série B": ["Ceará", "Fortaleza", "Juventude", "Sport", "Ponte Preta", "Londrina", "Náutico", "São Bernardo", "Criciúma", "Goiás", "Novorizontino", "CRB", "Avaí", "Cuiabá", "Atlético-GO", "Operário-PR", "Vila Nova", "América-MG", "Athletic-MG", "Botafogo-SP"],
    "Série C": ["Inter de Limeira-SP", "Floresta-CE", "Ituano-SP", "Anápolis-GO", "Brusque-SC", "Caxias-RS", "Confiança-SE", "Amazonas-AM", "Maranhão-MA", "Guarani-SP", "Volta Redonda-RJ", "Paysandu-PA", "Maringá-PR", "Ferroviária-SP", "Ypiranga-RS", "Figueirense-SC", "Santa Cruz-PE", "Itabaiana-SE", "Botafogo-PB", "Barra-SC"],
    "Série D": ["ABC", "Retrô", "Tombense", "CSA", "Independência", "Galvez", "ASA", "CSE", "Trem", "Oratório", "Nacional-AM", "Manaus", "Atlético-BA", "Jacuipense", "Porto-BA", "Tirol", "Ferroviário", "Maracanã", "Capital-DF", "Gama", "Rio Branco-ES", "Vitória-ES", "CRAC", "Abecat", "Inhumas", "Imperatriz", "IAPE", "Primavera-MT", "Mixto-MT", "Operário-MS", "Pantanal", "Betim", "Democrata GV", "Uberlândia", "Tuna Luso", "Águia de Marabá", "Sousa", "Serra Branca", "Azuriz", "São Joseense", "Cianorte", "Maguary", "Decisão", "Piauí", "Fluminense-PI", "Madureira", "America-RJ", "Sampaio Corrêa-RJ", "Laguna", "América-RN", "Brasil de Pelotas", "São Luiz", "Guarany de Bagé", "Porto Velho", "Guaporé", "GAS", "Monte Roraima", "Joinville", "Santa Catarina", "Blumenau", "Portuguesa", "Velo Clube", "Noroeste", "XV de Piracicaba", "Lagarto", "Sergipe", "Araguaína", "Tocantinópolis", "Manauara", "Juazeirense", "Ceilândia", "Aparecidense", "Goiatuba", "Sampaio Corrêa-MA", "Luverdense", "FC Cascavel", "Central", "Altos", "Maricá", "São José-RS", "Marcílio Dias", "Água Santa", "Nova Iguaçu", "Brasiliense", "Pouso Alegre", "Portuguesa-RJ", "Humaitá", "São Raimundo-RR", "Iguatu", "União Rondonópolis", "Real Noroeste", "Treze", "Atlético-CE", "Operário VG", "Moto Club", "Parnahyba"]
  },
  "Argentina": {
    "Primera División": ["River Plate", "Boca Juniors", "Racing Club", "Independiente", "San Lorenzo", "Huracán", "Vélez Sarsfield", "Estudiantes LP", "Gimnasia LP", "Rosario Central", "Newell's Old Boys", "Lanús", "Banfield", "Defensa y Justicia", "Talleres", "Belgrano", "Instituto", "Central Córdoba", "Atlético Tucumán", "Unión", "Platense", "Tigre", "Argentinos Juniors", "Barracas Central", "Sarmiento", "Independiente Rivadavia", "Deportivo Riestra", "Aldosivi", "Gimnasia Mendoza", "Estudiantes Río Cuarto"],
    "Primera Nacional": ["All Boys", "Almagro", "Almirante Brown", "Atlanta", "Chacarita Juniors", "Chaco For Ever", "Colón", "Defensores de Belgrano", "Defensores Unidos", "Deportivo Madryn", "Deportivo Maipú", "Deportivo Morón", "Estudiantes BA", "Ferro Carril Oeste", "Gimnasia y Tiro", "Gimnasia Jujuy", "Los Andes", "Mitre", "Nueva Chicago", "Patronato", "Quilmes", "Racing Córdoba", "San Martín Tucumán", "San Martín San Juan", "San Miguel", "San Telmo", "Temperley", "Tristán Suárez", "Agropecuario", "Brown de Adrogué", "Güemes", "Arsenal de Sarandí", "Ciudad de Bolívar", "Central Norte", "Acassuso", "Colegiales"]
  },
  "Uruguai": {
    "Primera División": ["Peñarol", "Nacional", "Defensor Sporting", "Danubio", "Liverpool Montevideo", "Montevideo City Torque", "Boston River", "Cerro Largo", "Cerro", "Juventud", "Albion", "Progreso", "Central Español", "Deportivo Maldonado", "Racing Montevideo", "Wanderers"],
    "Segunda División": ["Atenas", "Cerrito", "Colón", "Fénix", "Huracán", "La Luz", "Miramar Misiones", "Oriental", "Paysandú", "Plaza Colonia", "Rentistas", "River Plate Montevideo", "Tacuarembó", "Uruguay Montevideo"],
    "Divisional C": ["Basáñez", "Bella Vista", "Alto Perú", "Villa Teresa", "Canadian", "Deportivo Colonia", "Cooper", "Villa Española", "Huracán Buceo", "Huracán Paso de la Arena", "Mar de Fondo", "Paysandú FC", "Platense Montevideo", "Rocha", "Sud América"]
  },
  "Paraguai": {
    "Primera División": ["Olimpia", "Cerro Porteño", "Libertad", "Guaraní", "Nacional", "Sportivo Luqueño", "Sportivo Ameliano", "Sportivo Trinidense", "2 de Mayo", "Rubio Ñu", "Deportivo Recoleta", "San Lorenzo"],
    "División Intermedia": ["Sol de América", "Tacuary", "Independiente FBC", "Fernando de la Mora", "Sportivo Carapeguá", "3 de Noviembre", "Atlético Tembetary", "Benjamín Aceval", "Deportivo Capiatá", "Deportivo Santaní", "Encarnación FC", "General Caballero JLM", "Guaireña", "Resistencia", "Paraguarí AC", "12 de Junio"],
    "Primera B Metropolitana": ["Atlético Colegiales", "Cristóbal Colón", "3 de Febrero", "24 de Septiembre", "Olimpia de Itá", "Sport Colombia", "Sportivo Limpeño", "Sportivo Iteño", "Presidente Hayes", "Tacuary B", "Benjamín Aceval B", "Deportivo Recoleta B", "Cerro Corá", "General Caballero ZC", "12 de Octubre de Itauguá", "Pilcomayo", "Silvio Pettirossi"]
  },
  "Chile": {
    "Liga de Primera": ["Colo-Colo", "Universidad de Chile", "Universidad Católica", "Coquimbo Unido", "Unión Española", "Unión La Calera", "Huachipato", "Palestino", "Cobresal", "O'Higgins", "Everton de Viña del Mar", "Ñublense", "Deportes Iquique", "Universidad de Concepción", "Audax Italiano", "Deportes Limache"],
    "Liga de Ascenso": ["Cobreloa", "Santiago Wanderers", "Magallanes", "San Marcos de Arica", "Curicó Unido", "Rangers de Talca", "Deportes Antofagasta", "Deportes Copiapó", "Deportes Recoleta", "Deportes Santa Cruz", "Deportes Temuco", "Deportes Puerto Montt", "Unión San Felipe", "Santiago Morning", "San Luis de Quillota", "Barnechea"]
  },
  "Estados Unidos": {
    "MLS": ["Atlanta United", "Austin FC", "Charlotte FC", "Chicago Fire", "FC Cincinnati", "Colorado Rapids", "Columbus Crew", "D.C. United", "FC Dallas", "Houston Dynamo", "Inter Miami", "LA Galaxy", "Los Angeles FC", "Minnesota United", "CF Montréal", "Nashville SC", "New England Revolution", "New York City FC", "New York Red Bulls", "Orlando City", "Philadelphia Union", "Portland Timbers", "Real Salt Lake", "San Diego FC", "San Jose Earthquakes", "Seattle Sounders", "Sporting Kansas City", "St. Louis City SC", "Toronto FC", "Vancouver Whitecaps"],
    "USL Championship": ["Birmingham Legion", "Charleston Battery", "Colorado Springs Switchbacks", "Detroit City FC", "El Paso Locomotive", "FC Tulsa", "Hartford Athletic", "Indy Eleven", "Lexington SC", "Loudoun United", "Louisville City", "Memphis 901", "Miami FC", "Monterey Bay", "New Mexico United", "North Carolina FC", "Oakland Roots", "Orange County SC", "Phoenix Rising", "Pittsburgh Riverhounds", "Rhode Island FC", "Sacramento Republic", "San Antonio FC", "Tampa Bay Rowdies", "Las Vegas Lights"],
    "USL League One": ["AV Alta FC", "Athletic Club Boise", "Charlotte Independence", "Corpus Christi FC", "FC Naples", "Forward Madison", "Fort Wayne FC", "Greenville Triumph", "New York Cosmos", "One Knoxville", "Portland Hearts of Pine", "Richmond Kickers", "Sarasota Paradise", "Spokane Velocity", "Union Omaha", "Westchester SC", "Chattanooga Red Wolves"]
  },
  "Itália": {
    "Serie A": ["Atalanta", "Bologna", "Cagliari", "Como", "Cremonese", "Fiorentina", "Genoa", "Hellas Verona", "Inter", "Juventus", "Lazio", "Lecce", "Milan", "Napoli", "Parma", "Pisa", "Roma", "Sassuolo", "Torino", "Udinese"],
    "Serie B": ["Avellino", "Bari", "Carrarese", "Catanzaro", "Cesena", "Empoli", "Frosinone", "Juve Stabia", "Mantova", "Modena", "Monza", "Padova", "Palermo", "Pescara", "Reggiana", "Sampdoria", "Spezia", "Südtirol", "Virtus Entella", "Venezia"]
  },
  "França": {
    "Ligue 1": ["Paris Saint-Germain", "Olympique Marseille", "Olympique Lyon", "AS Monaco", "LOSC Lille", "OGC Nice", "RC Lens", "Stade Rennais", "Toulouse", "Strasbourg", "Brest", "Nantes", "Montpellier", "Le Havre", "Auxerre", "Paris FC", "Metz", "Saint-Étienne"],
    "Ligue 2": ["Troyes", "Reims", "Le Mans", "Red Star", "Nancy", "Clermont", "Rodez", "Amiens", "Dunkerque", "Laval", "Annecy", "Pau", "Grenoble", "Montpellier B", "Guingamp", "Bastia", "Boulogne", "Caen"]
  },
  "Alemanha": {
    "Bundesliga": ["Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "RB Leipzig", "Eintracht Frankfurt", "VfB Stuttgart", "SC Freiburg", "Werder Bremen", "Wolfsburg", "Mainz 05", "Union Berlin", "Borussia Mönchengladbach", "FC Augsburg", "FC Köln", "Hamburger SV", "St. Pauli", "Heidenheim", "Hoffenheim"],
    "2. Bundesliga": ["Hertha Berlin", "Schalke 04", "Hannover 96", "Fortuna Düsseldorf", "Karlsruher SC", "Nürnberg", "Kaiserslautern", "Magdeburg", "Paderborn", "Greuther Fürth", "Darmstadt 98", "Bochum", "Holstein Kiel", "Arminia Bielefeld", "Dynamo Dresden", "Eintracht Braunschweig", "Preußen Münster", "Elversberg"],
    "3. Liga": ["Alemannia Aachen", "Erzgebirge Aue", "Energie Cottbus", "MSV Duisburg", "Rot-Weiss Essen", "1860 Munich", "Saarbrücken", "Osnabrück", "Sandhausen", "Jahn Regensburg", "Hansa Rostock", "Viktoria Köln", "Waldhof Mannheim", "Wehen Wiesbaden", "TSV Havelse", "Schweinfurt", "Hoffenheim II", "Borussia Dortmund II", "Hannover 96 II", "Stuttgart II"]
  },
  "Espanha": {
    "La Liga": ["Real Madrid", "Barcelona", "Atlético Madrid", "Athletic Club", "Real Sociedad", "Villarreal", "Real Betis", "Sevilla", "Valencia", "Celta Vigo", "Osasuna", "Getafe", "Mallorca", "Girona", "Espanyol", "Rayo Vallecano", "Alavés", "Levante", "Oviedo", "Elche"],
    "Segunda División": ["Almería", "Granada", "Cádiz", "Huesca", "Málaga", "Deportivo La Coruña", "Sporting Gijón", "Real Zaragoza", "Eibar", "Mirandés", "Racing Santander", "Burgos", "Castellón", "Córdoba", "Albacete", "Tenerife", "Leganés", "Las Palmas", "Valladolid", "Ceuta", "Andorra", "Cultural Leonesa"]
  }
};

const countryCodes: Record<string, string> = {
  "Brasil": "BR",
  "Argentina": "AR",
  "Uruguai": "UY",
  "Paraguai": "PY",
  "Chile": "CL",
  "Estados Unidos": "US",
  "Itália": "IT",
  "França": "FR",
  "Alemanha": "DE",
  "Espanha": "ES"
};

const continents: Record<string, string> = {
  "Brasil": "SA",
  "Argentina": "SA",
  "Uruguai": "SA",
  "Paraguai": "SA",
  "Chile": "SA",
  "Estados Unidos": "NA",
  "Itália": "EU",
  "França": "EU",
  "Alemanha": "EU",
  "Espanha": "EU"
};

const baseStr: Record<string, number[]> = {
  "Brasil": [85, 75, 65, 55],
  "Argentina": [82, 72, 62],
  "Uruguai": [78, 68, 58],
  "Paraguai": [75, 65, 55],
  "Chile": [76, 66],
  "Estados Unidos": [78, 68, 58],
  "Itália": [88, 78],
  "França": [86, 76],
  "Alemanha": [88, 78, 68],
  "Espanha": [89, 79]
};

let output = 'export const TEAM_TEMPLATES = [\n';

for (const country in data) {
  output += `  // ${country.toUpperCase()}\n`;
  let divIndex = 0;
  for (const division in data[country]) {
    const teams = data[country][division];
    const strBase = baseStr[country][divIndex] || 50;
    
    teams.forEach(teamName => {
      // Randomize strength slightly around the base for the division
      const str = Math.max(40, Math.min(99, strBase + Math.floor(Math.random() * 6) - 3));
      output += `  { name: '${teamName.replace(/'/g, "\\'")}', div: ${divIndex + 1}, country: '${countryCodes[country]}', state: '', cont: '${continents[country]}', str: ${str} },\n`;
    });
    divIndex++;
  }
  output += '\n';
}

output += '];\n';

fs.writeFileSync('teams_output.ts', output);
