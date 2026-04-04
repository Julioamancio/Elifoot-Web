const COUNTRY_ALIASES: Record<string, string> = {
  BRA: 'br',
  ARG: 'ar',
  URU: 'uy',
  CHI: 'cl',
  COL: 'co',
  PAR: 'py',
  ECU: 'ec',
  BOL: 'bo',
  VEN: 've',
  USA: 'us',
  ENG: 'gb',
  SCO: 'gb-sct',
  WAL: 'gb-wls',
  NIR: 'gb-nir',
  ESP: 'es',
  GER: 'de',
  ITA: 'it',
  FRA: 'fr',
  POR: 'pt',
  NED: 'nl',
  BEL: 'be',
  SUI: 'ch',
  AUT: 'at',
  CRO: 'hr',
  SRB: 'rs',
  MEX: 'mx',
  CAN: 'ca',
};

const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brazil',
  AR: 'Argentina',
  UY: 'Uruguay',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  EC: 'Ecuador',
  PY: 'Paraguay',
  BO: 'Bolivia',
  VE: 'Venezuela',
  US: 'United States',
  MX: 'Mexico',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  PT: 'Portugal',
  GB: 'England',
  ENG: 'England',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  HR: 'Croatia',
  RS: 'Serbia',
};

type SportsDbTeam = {
  strTeam?: string | null;
  strAlternate?: string | null;
  strTeamBadge?: string | null;
  strBadge?: string | null;
  strCountry?: string | null;
};

type WikipediaPage = {
  title?: string;
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
  terms?: {
    description?: string[];
  };
};

const TEAM_SEARCH_ALIASES: Record<string, string[]> = {
  'athletico-pr': ['Athletico Paranaense', 'Club Athletico Paranaense'],
  'athletic-mg': ['Athletic Club São João del-Rei', 'Athletic Club MG'],
  'atletico-go': ['Atlético Goianiense', 'Atletico Goianiense'],
  'botafogo-sp': ['Botafogo Futebol Clube SP', 'Botafogo Ribeirão Preto'],
  'clube atletico mineiro': ['Atlético Mineiro', 'Clube Atlético Mineiro', 'Atletico Mineiro'],
  'gremio': ['Grêmio', 'Grêmio Foot-Ball Porto Alegrense'],
  'crb': ['Clube de Regatas Brasil', 'CRB'],
  'csa': ['Centro Sportivo Alagoano', 'CSA'],
  'ceara': ['Ceará Sporting Club', 'Ceara Sporting Club'],
  'goias': ['Goiás Esporte Clube', 'Goias Esporte Clube'],
  'nautico': ['Clube Náutico Capibaribe', 'Nautico Capibaribe'],
  'sao bernardo': ['São Bernardo Futebol Clube', 'Sao Bernardo FC'],
  'sao paulo': ['São Paulo Futebol Clube', 'Sao Paulo FC'],
  'atletico tucuman': ['Atlético Tucumán', 'Club Atlético Tucumán'],
  'central cordoba': ['Central Córdoba', 'Central Córdoba de Santiago del Estero'],
  'estudiantes lp': ['Estudiantes de La Plata', 'Club Estudiantes de La Plata'],
  'gimnasia lp': ['Gimnasia y Esgrima La Plata'],
  'velez sarsfield': ['Vélez Sarsfield', 'Club Atlético Vélez Sarsfield'],
  'newells old boys': ["Newell's Old Boys", "Club Atlético Newell's Old Boys"],
  'mainz 05': ['1. FSV Mainz 05'],
  'wolfsburg': ['VfL Wolfsburg'],
  'strasbourg': ['RC Strasbourg Alsace'],
  'sevilla': ['Sevilla FC'],
  'inter': ['Inter Milan', 'FC Internazionale Milano'],
  'milan': ['AC Milan', 'Associazione Calcio Milan'],
  'paris saint germain': ['Paris Saint-Germain', 'Paris Saint-Germain FC'],
  'olympique lyon': ['Olympique Lyonnais'],
  'olympique marseille': ['Olympique de Marseille'],
};

const TEAM_WIKIPEDIA_TITLE_OVERRIDES: Record<string, { title: string; language?: 'pt' | 'en' }> = {
  flamengo: { title: 'Clube_de_Regatas_do_Flamengo', language: 'pt' },
  palmeiras: { title: 'Sociedade_Esportiva_Palmeiras', language: 'pt' },
  cruzeiro: { title: 'Cruzeiro_Esporte_Clube', language: 'pt' },
  mirassol: { title: 'Mirassol_Futebol_Clube', language: 'pt' },
  fluminense: { title: 'Fluminense_Football_Club', language: 'pt' },
  bahia: { title: 'Esporte_Clube_Bahia', language: 'pt' },
  botafogo: { title: 'Botafogo_de_Futebol_e_Regatas', language: 'pt' },
  'sao paulo': { title: 'São_Paulo_Futebol_Clube', language: 'pt' },
  'red bull bragantino': { title: 'Red_Bull_Bragantino', language: 'pt' },
  corinthians: { title: 'Sport_Club_Corinthians_Paulista', language: 'pt' },
  gremio: { title: 'Grêmio_Foot-Ball_Porto_Alegrense', language: 'pt' },
  vasco: { title: 'Club_de_Regatas_Vasco_da_Gama', language: 'pt' },
  'clube atletico mineiro': { title: 'Clube_Atlético_Mineiro', language: 'pt' },
  santos: { title: 'Santos_Futebol_Clube', language: 'pt' },
  vitoria: { title: 'Esporte_Clube_Vitória', language: 'pt' },
  internacional: { title: 'Sport_Club_Internacional', language: 'pt' },
  coritiba: { title: 'Coritiba_Foot_Ball_Club', language: 'pt' },
  'athletico-pr': { title: 'Club_Athletico_Paranaense', language: 'pt' },
  chapecoense: { title: 'Associação_Chapecoense_de_Futebol', language: 'pt' },
  remo: { title: 'Clube_do_Remo', language: 'pt' },
  ceara: { title: 'Ceará_Sporting_Club', language: 'pt' },
  fortaleza: { title: 'Fortaleza_Esporte_Clube', language: 'pt' },
  juventude: { title: 'Esporte_Clube_Juventude', language: 'pt' },
  sport: { title: 'Sport_Club_do_Recife', language: 'pt' },
  'ponte preta': { title: 'Associação_Atlética_Ponte_Preta', language: 'pt' },
  londrina: { title: 'Londrina_Esporte_Clube', language: 'pt' },
  nautico: { title: 'Clube_Náutico_Capibaribe', language: 'pt' },
  'sao bernardo': { title: 'São_Bernardo_Futebol_Clube', language: 'pt' },
  criciuma: { title: 'Criciúma_Esporte_Clube', language: 'pt' },
  goias: { title: 'Goiás_Esporte_Clube', language: 'pt' },
  novorizontino: { title: 'Grêmio_Novorizontino', language: 'pt' },
  crb: { title: 'Clube_de_Regatas_Brasil', language: 'pt' },
  avai: { title: 'Avaí_Futebol_Clube', language: 'pt' },
  cuiaba: { title: 'Cuiabá_Esporte_Clube', language: 'pt' },
  'atletico-go': { title: 'Atlético_Clube_Goianiense', language: 'pt' },
  'operario-pr': { title: 'Operário_Ferroviário_Esporte_Clube', language: 'pt' },
  'vila nova': { title: 'Vila_Nova_Futebol_Clube', language: 'pt' },
  'america-mg': { title: 'América_Futebol_Clube_(Belo_Horizonte)', language: 'pt' },
  'athletic-mg': { title: 'Athletic_Club_(Minas_Gerais)', language: 'pt' },
  'botafogo-sp': { title: 'Botafogo_Futebol_Clube_(Ribeirão_Preto)', language: 'pt' },
  csa: { title: 'Centro_Sportivo_Alagoano', language: 'pt' },
};

const TEAM_BADGE_URL_OVERRIDES: Record<string, string> = {
  mirassol: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Mirassol_FC_logo.png/330px-Mirassol_FC_logo.png',
  cruzeiro:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg/langpt-330px-Cruzeiro_Esporte_Clube_%28logo%29.svg.png',
  'clube atletico mineiro':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Clube_Atl%C3%A9tico_Mineiro_logo.svg/330px-Clube_Atl%C3%A9tico_Mineiro_logo.svg.png',
  'clube atl tico mineiro':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Clube_Atl%C3%A9tico_Mineiro_logo.svg/330px-Clube_Atl%C3%A9tico_Mineiro_logo.svg.png',
  'atletico mineiro':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Clube_Atl%C3%A9tico_Mineiro_logo.svg/330px-Clube_Atl%C3%A9tico_Mineiro_logo.svg.png',
  'atletico-mg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Clube_Atl%C3%A9tico_Mineiro_logo.svg/330px-Clube_Atl%C3%A9tico_Mineiro_logo.svg.png',
  flamengo:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Clube_de_Regatas_do_Flamengo_logo.svg/langpt-330px-Clube_de_Regatas_do_Flamengo_logo.svg.png',
};

const BADGE_CACHE_KEY = 'futboss_team_badges_v6';
const badgeMemoryCache = new Map<string, string | null>();
const badgePromiseCache = new Map<string, Promise<string | null>>();
let storageHydrated = false;

function repairMojibake(value: string) {
  if (!/[ÃÂ]/.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

export function normalizeCountryCode(country?: string | null) {
  if (!country) return null;

  const normalized = country.trim().toUpperCase();
  if (!normalized) return null;

  if (COUNTRY_ALIASES[normalized]) {
    return COUNTRY_ALIASES[normalized];
  }

  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized.toLowerCase();
  }

  return null;
}

export function getCountryFlagUrl(country?: string | null, width = 40) {
  const normalized = normalizeCountryCode(country);
  if (!normalized) return null;
  return `https://flagcdn.com/w${width}/${normalized}.png`;
}

function hydrateBadgeCache() {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;

  try {
    const raw = window.localStorage.getItem(BADGE_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    Object.entries(parsed).forEach(([key, value]) => badgeMemoryCache.set(key, value));
  } catch {
    // Ignore corrupted cache and keep runtime lookup working.
  }
}

function persistBadgeCache() {
  if (typeof window === 'undefined') return;

  try {
    const payload = Object.fromEntries(badgeMemoryCache.entries());
    window.localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function normalizeSearchValue(value: string) {
  return repairMojibake(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getAliasQueries(teamName: string) {
  return TEAM_SEARCH_ALIASES[normalizeSearchValue(teamName)] ?? [];
}

function getWikipediaOverride(teamName: string) {
  return TEAM_WIKIPEDIA_TITLE_OVERRIDES[normalizeSearchValue(repairMojibake(teamName))] ?? null;
}

function getBadgeUrlOverride(teamName: string) {
  return TEAM_BADGE_URL_OVERRIDES[normalizeSearchValue(repairMojibake(teamName))] ?? null;
}

function buildTeamQueries(teamName: string, country?: string | null) {
  const safeTeamName = repairMojibake(teamName);
  const normalized = normalizeSearchValue(safeTeamName);
  const countryName = resolveCountryName(country);
  const aliases = getAliasQueries(safeTeamName);
  const queries = new Set<string>([
    safeTeamName,
    normalized,
    safeTeamName.replace(/-/g, ' '),
    safeTeamName.replace(/\bII\b/g, '2'),
    safeTeamName.replace(/\s+[A-Z]{2}$/, ''),
    safeTeamName.replace(/-[A-Z]{2}$/, ''),
    ...aliases,
    countryName ? `${safeTeamName} ${countryName}` : '',
    ...aliases.map(alias => (countryName ? `${alias} ${countryName}` : alias)),
  ]);

  return [...queries]
    .map(value => value.trim())
    .filter(value => value.length >= 3);
}

function resolveCountryName(country?: string | null) {
  if (!country) return null;
  return COUNTRY_NAMES[country.toUpperCase()] ?? null;
}

function scoreBadgeCandidate(team: SportsDbTeam, teamName: string, country?: string | null) {
  const desiredName = normalizeSearchValue(teamName);
  const candidateName = normalizeSearchValue(team.strTeam ?? '');
  const candidateAlt = normalizeSearchValue(team.strAlternate ?? '');
  const desiredCountry = resolveCountryName(country);
  const candidateCountry = (team.strCountry ?? '').trim().toLowerCase();

  let score = 0;
  if (candidateName === desiredName) score += 100;
  if (candidateAlt === desiredName) score += 80;
  if (candidateName.includes(desiredName) || desiredName.includes(candidateName)) score += 40;
  if (candidateAlt && (candidateAlt.includes(desiredName) || desiredName.includes(candidateAlt))) score += 25;
  if (desiredCountry && candidateCountry === desiredCountry.toLowerCase()) score += 35;
  if (team.strBadge || team.strTeamBadge) score += 10;

  return score;
}

function scoreWikipediaCandidate(page: WikipediaPage, teamName: string, country?: string | null) {
  const desiredName = normalizeSearchValue(teamName);
  const candidateTitle = normalizeSearchValue(page.title ?? '');
  const description = normalizeSearchValue((page.terms?.description ?? []).join(' '));
  const desiredCountry = normalizeSearchValue(resolveCountryName(country) ?? '');

  let score = 0;
  if (candidateTitle === desiredName) score += 120;
  if (candidateTitle.includes(desiredName) || desiredName.includes(candidateTitle)) score += 60;
  if (description.includes('football club') || description.includes('soccer club')) score += 50;
  if (desiredCountry && description.includes(desiredCountry)) score += 30;
  if (page.thumbnail?.source || page.originalimage?.source) score += 20;

  return score;
}

async function fetchWikipediaSummary(title: string, language: 'pt' | 'en') {
  const response = await fetch(
    `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(repairMojibake(title))}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as WikipediaPage;
  if (!data.thumbnail?.source && !data.originalimage?.source) {
    return null;
  }

  return data;
}

async function searchWikipediaByTitles(teamName: string, language: 'pt' | 'en', country?: string | null) {
  const countryName = resolveCountryName(country);
  const queries = buildTeamQueries(teamName, country).map(query =>
    [query, language === 'pt' ? 'futebol clube' : 'football club', countryName].filter(Boolean).join(' '),
  );

  for (const query of queries) {
    const response = await fetch(
      `https://${language}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`,
    );

    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as {
      query?: {
        search?: Array<{ title?: string }>;
      };
    };

    const titles = (data.query?.search ?? []).map(item => item.title).filter(Boolean) as string[];
    if (titles.length === 0) continue;

    const summaries = await Promise.all(titles.map(title => fetchWikipediaSummary(title, language)));
    const candidates = summaries.filter(Boolean) as WikipediaPage[];
    if (candidates.length === 0) continue;

    const bestPage = [...candidates].sort(
      (pageA, pageB) => scoreWikipediaCandidate(pageB, teamName, country) - scoreWikipediaCandidate(pageA, teamName, country),
    )[0];

    const image = bestPage?.thumbnail?.source ?? bestPage?.originalimage?.source ?? null;
    if (image) {
      return image;
    }
  }

  return null;
}

async function searchTeamBadge(teamName: string, country?: string | null) {
  const queries = buildTeamQueries(teamName, country);

  for (const query of queries) {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as { teams?: SportsDbTeam[] | null };
    const candidates = (data.teams ?? []).filter(team => Boolean(team.strBadge || team.strTeamBadge));
    if (candidates.length === 0) continue;

    const bestCandidate = [...candidates].sort(
      (teamA, teamB) => scoreBadgeCandidate(teamB, teamName, country) - scoreBadgeCandidate(teamA, teamName, country),
    )[0];

    if (bestCandidate?.strBadge || bestCandidate?.strTeamBadge) {
      return bestCandidate.strBadge ?? bestCandidate.strTeamBadge ?? null;
    }
  }

  return null;
}

async function searchWikipediaBadge(teamName: string, country?: string | null) {
  const override = getWikipediaOverride(teamName);
  if (override) {
    const data = await fetchWikipediaSummary(override.title, override.language ?? 'en');
    const image = data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
    if (image) {
      return image;
    }
  }

  const ptResult = await searchWikipediaByTitles(teamName, 'pt', country);
  if (ptResult) {
    return ptResult;
  }

  const enResult = await searchWikipediaByTitles(teamName, 'en', country);
  if (enResult) {
    return enResult;
  }

  const countryName = resolveCountryName(country);
  const queries = buildTeamQueries(teamName, country).map(query =>
    [query, 'football club', countryName].filter(Boolean).join(' '),
  );

  for (const query of queries) {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=6&prop=pageimages|pageterms&piprop=thumbnail&pithumbsize=128&wbptterms=description&format=json&origin=*`,
    );

    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as {
      query?: {
        pages?: Record<string, WikipediaPage>;
      };
    };

    const pages = Object.values(data.query?.pages ?? {}).filter(page => Boolean(page.thumbnail?.source));
    if (pages.length === 0) continue;

    const bestPage = [...pages].sort(
      (pageA, pageB) => scoreWikipediaCandidate(pageB, teamName, country) - scoreWikipediaCandidate(pageA, teamName, country),
    )[0];

    if (bestPage?.thumbnail?.source) {
      return bestPage.thumbnail.source;
    }
  }

  return null;
}

export async function getTeamBadgeUrl(teamName?: string | null, country?: string | null) {
  if (!teamName) return null;

  hydrateBadgeCache();
  const safeTeamName = repairMojibake(teamName);
  const directOverride = getBadgeUrlOverride(safeTeamName);
  if (directOverride) {
    return directOverride;
  }
  const cacheKey = `${country ?? 'XX'}:${safeTeamName.trim().toLowerCase()}`;

  if (badgeMemoryCache.has(cacheKey)) {
    return badgeMemoryCache.get(cacheKey) ?? null;
  }

  if (badgePromiseCache.has(cacheKey)) {
    return badgePromiseCache.get(cacheKey)!;
  }

  const request = searchTeamBadge(safeTeamName, country)
    .then(result => result ?? searchWikipediaBadge(safeTeamName, country))
    .then(result => {
      badgeMemoryCache.set(cacheKey, result);
      persistBadgeCache();
      badgePromiseCache.delete(cacheKey);
      return result;
    })
    .catch(() => {
      badgeMemoryCache.set(cacheKey, null);
      persistBadgeCache();
      badgePromiseCache.delete(cacheKey);
      return null;
    });

  badgePromiseCache.set(cacheKey, request);
  return request;
}
