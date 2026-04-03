import type { GameMode, GameState } from '../types/game';

const TOKEN_STORAGE_KEY = 'elifoot_auth_token';
const APP_BASE_PATH = (() => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  if (baseUrl === '/') return '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
})();

function withBasePath(path: string) {
  return `${APP_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface AuthUser {
  id: number;
  username: string;
}

export interface SaveSlotSummary {
  id: number;
  slotName: string;
  gameMode: GameMode | null;
  careerLabel: string;
  teamName: string | null;
  playerName: string | null;
  currentYear: number | null;
  currentWeek: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface LoadGameResponse {
  slot: SaveSlotSummary | null;
  gameState: GameState;
  updatedAt: string;
}

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getStoredToken();

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredToken();
    }

    const message =
      typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || 'Ocorreu um erro na comunicação com o servidor.';

    throw new Error(message);
  }

  return payload as T;
}

export async function registerWithPassword(username: string, password: string) {
  const response = await apiRequest<AuthResponse>(withBasePath('/api/auth/register'), {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  setStoredToken(response.token);
  return response.user;
}

export async function loginWithPassword(username: string, password: string) {
  const response = await apiRequest<AuthResponse>(withBasePath('/api/auth/login'), {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  setStoredToken(response.token);
  return response.user;
}

export async function getCurrentUser() {
  if (!getStoredToken()) {
    return null;
  }

  try {
    const response = await apiRequest<{ user: AuthUser }>(withBasePath('/api/auth/me'));
    return response.user;
  } catch {
    return null;
  }
}

export async function listSaveSlots() {
  return apiRequest<{ slots: SaveSlotSummary[] }>(withBasePath('/api/saves'));
}

export async function saveGameState(
  gameState: GameState,
  options?: { slotId?: number; slotName?: string },
) {
  return apiRequest<{ message: string; slot: SaveSlotSummary | null; updatedAt: string | null }>(withBasePath('/api/save'), {
    method: 'PUT',
    body: JSON.stringify({
      gameState,
      slotId: options?.slotId,
      slotName: options?.slotName,
    }),
  });
}

export async function loadGameState(slotId?: number) {
  const query = slotId ? `?slotId=${slotId}` : '';
  return apiRequest<LoadGameResponse>(withBasePath(`/api/save${query}`));
}

export async function renameSaveSlot(slotId: number, slotName: string) {
  return apiRequest<{ message: string; slot: SaveSlotSummary | null }>(withBasePath(`/api/saves/${slotId}`), {
    method: 'PATCH',
    body: JSON.stringify({ slotName }),
  });
}

export async function deleteSaveSlot(slotId: number) {
  return apiRequest<{ message: string }>(withBasePath(`/api/saves/${slotId}`), {
    method: 'DELETE',
  });
}
