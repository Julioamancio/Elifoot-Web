import type { NextFunction, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import db from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'elifoot-dev-secret-change-me';
const TOKEN_EXPIRATION: SignOptions['expiresIn'] = '7d';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface TokenPayload extends JwtPayload {
  userId: number;
  username: string;
}

export class AuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

const findUserByUsername = db.prepare<[string], UserRow>(
  'SELECT id, username, password_hash FROM users WHERE username = ?',
);

const insertUser = db.prepare<[string, string]>(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)',
);

function sanitizeUsername(username: string) {
  return username.trim();
}

function validateCredentials(username: string, password: string) {
  const cleanUsername = sanitizeUsername(username);

  if (cleanUsername.length < 3) {
    throw new AuthError(400, 'O usuário precisa ter pelo menos 3 caracteres.');
  }

  if (cleanUsername.length > 30) {
    throw new AuthError(400, 'O usuário pode ter no máximo 30 caracteres.');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
    throw new AuthError(400, 'Use apenas letras, números, ponto, hífen ou underscore no usuário.');
  }

  if (password.length < 6) {
    throw new AuthError(400, 'A senha precisa ter pelo menos 6 caracteres.');
  }

  return cleanUsername;
}

function buildSession(user: AuthUser) {
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION },
  );

  return { token, user };
}

export function registerUser(username: string, password: string) {
  const cleanUsername = validateCredentials(username, password);
  const existingUser = findUserByUsername.get(cleanUsername);

  if (existingUser) {
    throw new AuthError(409, 'Esse usuário já existe.');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = insertUser.run(cleanUsername, passwordHash);

  return buildSession({
    id: Number(result.lastInsertRowid),
    username: cleanUsername,
  });
}

export function loginUser(username: string, password: string) {
  const cleanUsername = sanitizeUsername(username);
  const user = findUserByUsername.get(cleanUsername);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AuthError(401, 'Usuário ou senha inválidos.');
  }

  return buildSession({
    id: user.id,
    username: user.username,
  });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    return;
  }

  const token = authorization.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === 'string' || !('userId' in decoded) || !('username' in decoded)) {
      throw new AuthError(401, 'Token inválido.');
    }

    const payload = decoded as TokenPayload;
    req.user = {
      id: Number(payload.userId),
      username: String(payload.username),
    };
    next();
  } catch (error) {
    const message = error instanceof AuthError ? error.message : 'Sessão inválida ou expirada.';
    res.status(401).json({ message });
  }
}
