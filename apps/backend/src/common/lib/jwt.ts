import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/environment.js';

// ─── Token TTLs ──────────────────────────────────────────────────────────────
const ACCESS_TOKEN_TTL  = '15m';
const REFRESH_TOKEN_TTL = '7d';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── JWT Payload Types ────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;   // userId (ULID)
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;   // userId (ULID)
  type: 'refresh';
  iat?: number;
  exp?: number;
}

// ─── Sign ─────────────────────────────────────────────────────────────────────

/**
 * Signs an access token.
 * Payload includes sub (userId), email, and type: "access".
 * The `type` field prevents this token from being used where a refresh token is expected.
 */
export function signAccessToken(userId: string, email: string): string {
  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    email,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

/**
 * Signs a refresh token.
 * Intentionally does NOT include email — refresh tokens need minimal claims.
 * The `type` field prevents this token from being used as an access token.
 */
export function signRefreshToken(userId: string): string {
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    type: 'refresh',
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * Verifies an access token.
 * Throws if the token is expired, invalid, or not of type "access".
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: expected access');
  }
  return decoded;
}

/**
 * Verifies a refresh token.
 * Throws if the token is expired, invalid, or not of type "refresh".
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh');
  }
  return decoded;
}

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * Hashes a raw token string using SHA-256.
 * Used to store refresh tokens in the DB without storing the raw value.
 * If the DB is breached, hashed tokens are cryptographically useless.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
