import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './server/database';
import {
  AuthError,
  loginUser,
  registerUser,
  requireAuth,
  type AuthenticatedRequest,
} from './server/auth';

interface SaveSlotRow {
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
}

interface SaveSlotSummaryRow {
  id: number;
  slot_name: string;
  game_mode: string | null;
  career_label: string;
  team_name: string | null;
  player_name: string | null;
  current_year: number | null;
  current_week: number | null;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  total: number;
}

const listSaveSlotsByUserId = db.prepare<[number], SaveSlotSummaryRow>(`
  SELECT id, slot_name, game_mode, career_label, team_name, player_name, current_year, current_week, created_at, updated_at
  FROM save_slots
  WHERE user_id = ?
  ORDER BY datetime(updated_at) DESC, id DESC
`);

const loadSaveSlotById = db.prepare<[number, number], SaveSlotRow>(`
  SELECT id, user_id, slot_name, game_mode, career_label, team_name, player_name, current_year, current_week, game_state, created_at, updated_at
  FROM save_slots
  WHERE user_id = ? AND id = ?
`);

const loadMostRecentSaveSlotByUserId = db.prepare<[number], SaveSlotRow>(`
  SELECT id, user_id, slot_name, game_mode, career_label, team_name, player_name, current_year, current_week, game_state, created_at, updated_at
  FROM save_slots
  WHERE user_id = ?
  ORDER BY datetime(updated_at) DESC, id DESC
  LIMIT 1
`);

const insertSaveSlot = db.prepare<
  [number, string, string | null, string, string | null, string | null, number | null, number | null, string]
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
    game_state
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateSaveSlotById = db.prepare<
  [string, string | null, string, string | null, string | null, number | null, number | null, string, number, number]
>(`
  UPDATE save_slots
  SET
    slot_name = ?,
    game_mode = ?,
    career_label = ?,
    team_name = ?,
    player_name = ?,
    current_year = ?,
    current_week = ?,
    game_state = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ? AND user_id = ?
`);

const renameSaveSlotById = db.prepare<[string, number, number]>(`
  UPDATE save_slots
  SET slot_name = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ? AND user_id = ?
`);

const deleteSaveSlotById = db.prepare<[number, number]>(`
  DELETE FROM save_slots
  WHERE id = ? AND user_id = ?
`);

const slotNameExistsForUser = db.prepare<[number, string, number], CountRow>(`
  SELECT COUNT(*) as total
  FROM save_slots
  WHERE user_id = ? AND slot_name = ? AND id != ?
`);

const slotNameExistsForNewSlot = db.prepare<[number, string], CountRow>(`
  SELECT COUNT(*) as total
  FROM save_slots
  WHERE user_id = ? AND slot_name = ?
`);

type SerializedGameState = {
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

const normalizeSlotName = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, 60);

const deriveSaveMetadata = (gameState: SerializedGameState) => {
  const userTeam = gameState.teams?.find(team => team.id === gameState.userTeamId);
  const userPlayer = userTeam?.players?.find(player => player.id === gameState.userPlayerId);
  const gameMode = gameState.gameMode ?? 'manager';
  const currentYear = gameState.currentYear ?? 2026;
  const currentWeek = gameState.currentWeek ?? 1;

  if (gameMode === 'player' && userPlayer && userTeam) {
    return {
      gameMode,
      careerLabel: `${userPlayer.name} • ${userTeam.name}`,
      defaultSlotName: `Jogador - ${userPlayer.name}`,
      teamName: userTeam.name,
      playerName: userPlayer.name,
      currentYear,
      currentWeek,
    };
  }

  if (userTeam) {
    return {
      gameMode,
      careerLabel: userTeam.name,
      defaultSlotName: `Técnico - ${userTeam.name}`,
      teamName: userTeam.name,
      playerName: null,
      currentYear,
      currentWeek,
    };
  }

  return {
    gameMode,
    careerLabel: 'Carreira sem nome',
    defaultSlotName: 'Nova carreira',
    teamName: null,
    playerName: null,
    currentYear,
    currentWeek,
  };
};

const mapSlotSummary = (slot: SaveSlotSummaryRow | SaveSlotRow) => ({
  id: slot.id,
  slotName: slot.slot_name,
  gameMode: slot.game_mode,
  careerLabel: slot.career_label,
  teamName: slot.team_name,
  playerName: slot.player_name,
  currentYear: slot.current_year,
  currentWeek: slot.current_week,
  createdAt: slot.created_at,
  updatedAt: slot.updated_at,
});

function sendError(res: express.Response, error: unknown) {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error('API error:', error);
  res.status(500).json({ message: 'O servidor encontrou um erro inesperado.' });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '35mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'sqlite' });
  });

  app.post('/api/auth/register', (req, res) => {
    try {
      const { username = '', password = '' } = req.body ?? {};
      const session = registerUser(String(username), String(password));
      res.status(201).json(session);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username = '', password = '' } = req.body ?? {};
      const session = loginUser(String(username), String(password));
      res.json(session);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/saves', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const slots = listSaveSlotsByUserId.all(req.user!.id).map(mapSlotSummary);
      res.json({ slots });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/save', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const slotId = Number(req.query.slotId);
      const save =
        Number.isFinite(slotId) && slotId > 0
          ? loadSaveSlotById.get(req.user!.id, slotId)
          : loadMostRecentSaveSlotByUserId.get(req.user!.id);

      if (!save) {
        res.status(404).json({ message: 'Nenhuma carreira salva encontrada para este usuário.' });
        return;
      }

      res.json({
        slot: mapSlotSummary(save),
        gameState: JSON.parse(save.game_state),
        updatedAt: save.updated_at,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put('/api/save', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { gameState, slotId, slotName } = req.body ?? {};

      if (!gameState || typeof gameState !== 'object' || Array.isArray(gameState)) {
        throw new AuthError(400, 'O estado do jogo enviado é inválido.');
      }

      const metadata = deriveSaveMetadata(gameState as SerializedGameState);
      const parsedSlotId = Number(slotId);
      const normalizedSlotName = typeof slotName === 'string' ? normalizeSlotName(slotName) : '';
      let savedSlotId: number;

      if (Number.isFinite(parsedSlotId) && parsedSlotId > 0) {
        const existingSlot = loadSaveSlotById.get(req.user!.id, parsedSlotId);
        if (!existingSlot) {
          throw new AuthError(404, 'A carreira escolhida não foi encontrada.');
        }

        const finalSlotName = normalizedSlotName || existingSlot.slot_name;
        const nameConflict = slotNameExistsForUser.get(req.user!.id, finalSlotName, parsedSlotId)?.total ?? 0;
        if (nameConflict > 0) {
          throw new AuthError(409, 'Já existe outra carreira com esse nome.');
        }

        updateSaveSlotById.run(
          finalSlotName,
          metadata.gameMode,
          metadata.careerLabel,
          metadata.teamName,
          metadata.playerName,
          metadata.currentYear,
          metadata.currentWeek,
          JSON.stringify(gameState),
          parsedSlotId,
          req.user!.id,
        );
        savedSlotId = parsedSlotId;
      } else {
        const finalSlotName = normalizedSlotName || metadata.defaultSlotName;
        const nameConflict = slotNameExistsForNewSlot.get(req.user!.id, finalSlotName)?.total ?? 0;
        if (nameConflict > 0) {
          throw new AuthError(409, 'Já existe uma carreira com esse nome. Escolha outro nome ou salve em cima dela.');
        }

        const insertResult = insertSaveSlot.run(
          req.user!.id,
          finalSlotName,
          metadata.gameMode,
          metadata.careerLabel,
          metadata.teamName,
          metadata.playerName,
          metadata.currentYear,
          metadata.currentWeek,
          JSON.stringify(gameState),
        );
        savedSlotId = Number(insertResult.lastInsertRowid);
      }

      const savedSlot = loadSaveSlotById.get(req.user!.id, savedSlotId);

      res.json({
        message: 'Carreira salva com sucesso.',
        slot: savedSlot ? mapSlotSummary(savedSlot) : null,
        updatedAt: savedSlot?.updated_at ?? null,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.patch('/api/saves/:slotId', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const slotId = Number(req.params.slotId);
      const slotName = normalizeSlotName(String(req.body?.slotName ?? ''));

      if (!Number.isFinite(slotId) || slotId <= 0) {
        throw new AuthError(400, 'O slot informado é inválido.');
      }

      if (!slotName) {
        throw new AuthError(400, 'Informe um nome válido para a carreira.');
      }

      const existingSlot = loadSaveSlotById.get(req.user!.id, slotId);
      if (!existingSlot) {
        throw new AuthError(404, 'A carreira escolhida não foi encontrada.');
      }

      const nameConflict = slotNameExistsForUser.get(req.user!.id, slotName, slotId)?.total ?? 0;
      if (nameConflict > 0) {
        throw new AuthError(409, 'Já existe outra carreira com esse nome.');
      }

      renameSaveSlotById.run(slotName, slotId, req.user!.id);
      const renamedSlot = loadSaveSlotById.get(req.user!.id, slotId);

      res.json({
        message: 'Carreira renomeada com sucesso.',
        slot: renamedSlot ? mapSlotSummary(renamedSlot) : null,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/saves/:slotId', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const slotId = Number(req.params.slotId);
      if (!Number.isFinite(slotId) || slotId <= 0) {
        throw new AuthError(400, 'O slot informado é inválido.');
      }

      const existingSlot = loadSaveSlotById.get(req.user!.id, slotId);
      if (!existingSlot) {
        throw new AuthError(404, 'A carreira escolhida não foi encontrada.');
      }

      deleteSaveSlotById.run(slotId, req.user!.id);
      res.json({ message: 'Carreira excluída com sucesso.' });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parserError = error as { type?: string; status?: number };

    if (parserError?.type === 'entity.too.large' || parserError?.status === 413) {
      res.status(413).json({ message: 'O save está grande demais para ser processado pelo servidor.' });
      return;
    }

    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ message: 'O servidor recebeu um JSON inválido ao tentar salvar.' });
      return;
    }

    next(error);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
