import type { GameMode, GameState } from '../types/game';

const TOKEN_STORAGE_KEY = 'elifoot_auth_token';

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
  const response = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  setStoredToken(response.token);
  return response.user;
}

export async function loginWithPassword(username: string, password: string) {
  const response = await apiRequest<AuthResponse>('/api/auth/login', {
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
    const response = await apiRequest<{ user: AuthUser }>('/api/auth/me');
    return response.user;
  } catch {
    return null;
  }
}

export async function listSaveSlots() {
  return apiRequest<{ slots: SaveSlotSummary[] }>('/api/saves');
}

export async function saveGameState(
  gameState: GameState,
  options?: { slotId?: number; slotName?: string },
) {
  return apiRequest<{ message: string; slot: SaveSlotSummary | null; updatedAt: string | null }>('/api/save', {
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
  return apiRequest<LoadGameResponse>(`/api/save${query}`);
}

export async function renameSaveSlot(slotId: number, slotName: string) {
  return apiRequest<{ message: string; slot: SaveSlotSummary | null }>(`/api/saves/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify({ slotName }),
  });
}

export async function deleteSaveSlot(slotId: number) {
  return apiRequest<{ message: string }>(`/api/saves/${slotId}`, {
    method: 'DELETE',
  });
}
