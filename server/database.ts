import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const defaultDatabasePath = path.join(process.cwd(), 'data', 'elifoot.sqlite');
const configuredDatabasePath = process.env.DATABASE_PATH?.trim();
const databasePath = configuredDatabasePath
  ? path.isAbsolute(configuredDatabasePath)
    ? configuredDatabasePath
    : path.join(process.cwd(), configuredDatabasePath)
  : defaultDatabasePath;

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saves (
    user_id INTEGER PRIMARY KEY,
    game_state TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS save_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slot_name TEXT NOT NULL COLLATE NOCASE,
    game_mode TEXT,
    career_label TEXT NOT NULL,
    team_name TEXT,
    player_name TEXT,
    current_year INTEGER,
    current_week INTEGER,
    game_state TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, slot_name)
  );
`);

const ensureColumn = (tableName: string, columnName: string, definition: string) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some(column => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

ensureColumn('save_slots', 'team_name', 'TEXT');
ensureColumn('save_slots', 'player_name', 'TEXT');
ensureColumn('save_slots', 'current_year', 'INTEGER');
ensureColumn('save_slots', 'current_week', 'INTEGER');

type LegacySaveRow = {
  user_id: number;
  game_state: string;
  updated_at: string;
};

type SaveSlotRow = {
  id: number;
  user_id: number;
  slot_name: string;
  game_mode: string | null;
  career_label: string;
  team_name: string | null;
  player_name: string | null;
  current_year: number | null;
  current_week: number | null;
  game_state: string;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  total: number;
};

type SlotMetadata = {
  slotName: string;
  gameMode: 'manager' | 'player';
  careerLabel: string;
  teamName: string | null;
  playerName: string | null;
  currentYear: number | null;
  currentWeek: number | null;
};

const listLegacySaves = db.prepare<[], LegacySaveRow>('SELECT user_id, game_state, updated_at FROM saves');
const countSaveSlotsByUserId = db.prepare<[number], CountRow>('SELECT COUNT(*) as total FROM save_slots WHERE user_id = ?');
const insertMigratedSlot = db.prepare<
  [number, string, string | null, string, string | null, string | null, number | null, number | null, string, string, string]
>(`
  INSERT INTO save_slots (
    user_id,
    slot_name,
    game_mode,
    career_label,
    team_name,
    player_name,
    current_year,
    current_week,
    game_state,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const listSlotsMissingSummary = db.prepare<[], SaveSlotRow>(`
  SELECT id, user_id, slot_name, game_mode, career_label, team_name, player_name, current_year, current_week, game_state, created_at, updated_at
  FROM save_slots
  WHERE team_name IS NULL OR current_year IS NULL OR current_week IS NULL
`);

const updateSlotSummary = db.prepare<[string | null, string | null, number | null, number | null, string, string | null, number]>(`
  UPDATE save_slots
  SET team_name = ?, player_name = ?, current_year = ?, current_week = ?, career_label = ?, game_mode = ?
  WHERE id = ?
`);

const deriveSlotMetadata = (serializedState: string): SlotMetadata => {
  try {
    const parsedState = JSON.parse(serializedState) as {
      gameMode?: 'manager' | 'player' | null;
      userTeamId?: string | null;
      userPlayerId?: string | null;
      currentYear?: number;
      currentWeek?: number;
      teams?: Array<{
        id: string;
        name: string;
        players?: Array<{ id: string; name: string }>;
      }>;
    };

    const gameMode = parsedState.gameMode ?? 'manager';
    const userTeam = parsedState.teams?.find(team => team.id === parsedState.userTeamId);
    const userPlayer = userTeam?.players?.find(player => player.id === parsedState.userPlayerId);
    const currentYear = parsedState.currentYear ?? 2026;
    const currentWeek = parsedState.currentWeek ?? 1;

    if (gameMode === 'player' && userPlayer && userTeam) {
      return {
        slotName: `Jogador - ${userPlayer.name}`,
        gameMode,
        careerLabel: `${userPlayer.name} • ${userTeam.name}`,
        teamName: userTeam.name,
        playerName: userPlayer.name,
        currentYear,
        currentWeek,
      };
    }

    if (userTeam) {
      return {
        slotName: `Técnico - ${userTeam.name}`,
        gameMode,
        careerLabel: userTeam.name,
        teamName: userTeam.name,
        playerName: null,
        currentYear,
        currentWeek,
      };
    }
  } catch {
    // fallback below
  }

  return {
    slotName: 'Carreira principal',
    gameMode: 'manager',
    careerLabel: 'Carreira principal',
    teamName: null,
    playerName: null,
    currentYear: 2026,
    currentWeek: 1,
  };
};

const migrateLegacySaves = () => {
  const legacySaves = listLegacySaves.all();

  legacySaves.forEach(legacySave => {
    const existingSlots = countSaveSlotsByUserId.get(legacySave.user_id)?.total ?? 0;
    if (existingSlots > 0) return;

    const metadata = deriveSlotMetadata(legacySave.game_state);
    insertMigratedSlot.run(
      legacySave.user_id,
      metadata.slotName,
      metadata.gameMode,
      metadata.careerLabel,
      metadata.teamName,
      metadata.playerName,
      metadata.currentYear,
      metadata.currentWeek,
      legacySave.game_state,
      legacySave.updated_at,
      legacySave.updated_at,
    );
  });
};

const backfillSlotSummaries = () => {
  const rows = listSlotsMissingSummary.all();
  rows.forEach(row => {
    const metadata = deriveSlotMetadata(row.game_state);
    updateSlotSummary.run(
      metadata.teamName,
      metadata.playerName,
      metadata.currentYear,
      metadata.currentWeek,
      metadata.careerLabel,
      metadata.gameMode,
      row.id,
    );
  });
};

migrateLegacySaves();
backfillSlotSummaries();

export default db;
