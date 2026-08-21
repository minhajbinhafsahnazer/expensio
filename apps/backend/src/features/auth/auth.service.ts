/**
 * auth.service.ts
 *
 * Business logic layer for authentication.
 * Orchestrates repository calls, enforces business rules, and throws typed errors.
 *
 * Rules:
 * - Never import `db` or Drizzle directly — use repository functions.
 * - Never throw Fastify's HTTPException — throw AppError subclasses.
 * - Never log passwords, raw tokens, or password hashes.
 */

import { generateId }      from '../../common/lib/ulid.js';
import { hashPassword, verifyPassword } from '../../common/lib/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} from '../../common/lib/jwt.js';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/index.js';
import * as repo from './auth.repository.js';
import type { UserPublic, TokenPair, RegisterBody, LoginBody, RequestMeta, UpdateMeBody } from './auth.types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip password_hash and return a safe user object. */
function toUserPublic(user: {
  id: string;
  email: string;
  fullName: string | null;
  currency: string;
  theme: string;
  timezone: string;
  locale: string;
  superiorCategoriesEnabled: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserPublic {
  return {
    id:                        user.id,
    email:                     user.email,
    fullName:                  user.fullName,
    currency:                  user.currency,
    theme:                     user.theme,
    timezone:                  user.timezone,
    locale:                    user.locale,
    superiorCategoriesEnabled: user.superiorCategoriesEnabled,
    isActive:                  user.isActive,
    lastLoginAt:               user.lastLoginAt,
    createdAt:                 user.createdAt,
    updatedAt:                 user.updatedAt,
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Create a new user account.
 * Checks for duplicate email, hashes password, inserts user + audit log.
 */
export async function register(
  body: RegisterBody,
  meta: RequestMeta,
): Promise<UserPublic> {
  // 1. Check for existing email
  const existing = await repo.findUserByEmail(body.email);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // 2. Hash password
  const passwordHash = await hashPassword(body.password);

  // 3. Create user
  const user = await repo.createUser({
    id:           generateId(),
    email:        body.email,
    passwordHash,
    fullName:     body.fullName ?? null,
    currency:     body.currency ?? 'INR',
    theme:        'system',
    timezone:     'Asia/Kolkata',
    locale:       'en-IN',
  });

  // 4. Audit log
  await repo.createAuditLog({
    id:        generateId(),
    userId:    user.id,
    action:    'register',
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  return toUserPublic(user);
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user and issue access + refresh tokens.
 *
 * Security: always use the same generic error message for bad email
 * AND bad password to prevent email enumeration.
 * Even runs bcrypt.compare when user is not found (dummy hash) to
 * ensure consistent response times.
 */
const DUMMY_HASH = '$2a$12$invalidhashtopreventtimingattacksXXXXXXXXXXXXXXXXXXXX';

export async function login(
  body: LoginBody,
  meta: RequestMeta,
): Promise<{ tokens: TokenPair; user: UserPublic }> {
  const user = await repo.findUserByEmail(body.email);

  // Always run bcrypt.compare to prevent timing-based enumeration
  const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
  const passwordValid = await verifyPassword(body.password, hashToCheck);

  if (!user || !passwordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Issue tokens
  const accessToken  = signAccessToken(user.id, user.email);
  const rawRefresh   = signRefreshToken(user.id);
  const tokenHash    = hashToken(rawRefresh);
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // Persist hashed refresh token
  await repo.createRefreshToken({
    id:        generateId(),
    userId:    user.id,
    tokenHash,
    expiresAt,
  });

  // Update last login + audit log
  await repo.updateLastLogin(user.id);
  await repo.createAuditLog({
    id:        generateId(),
    userId:    user.id,
    action:    'login',
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  return {
    tokens: { accessToken, refreshToken: rawRefresh },
    user:   toUserPublic(user),
  };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

/**
 * Rotate a refresh token.
 *
 * Verifies the JWT signature, looks up the hash in DB,
 * revokes the old token, and issues a new token pair.
 * If the token is already revoked → possible theft → throw 401.
 */
export async function refresh(
  rawRefreshToken: string,
): Promise<{ accessToken: string; rawRefreshToken: string }> {
  // 1. Verify JWT signature + type claim
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // 2. Look up hash in DB
  const tokenHash = hashToken(rawRefreshToken);
  const dbToken   = await repo.findActiveRefreshToken(tokenHash);

  if (!dbToken) {
    // Token is expired, revoked, or not found — possible theft
    throw new UnauthorizedError('Refresh token is invalid or has been revoked');
  }

  // 3. Revoke old token (token rotation)
  await repo.revokeRefreshToken(tokenHash);

  // 4. Fetch user to get email for new access token
  const user = await repo.findUserById(payload.sub);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  // 5. Issue new token pair
  const newAccessToken  = signAccessToken(user.id, user.email);
  const newRawRefresh   = signRefreshToken(user.id);
  const newHash         = hashToken(newRawRefresh);
  const expiresAt       = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await repo.createRefreshToken({
    id:        generateId(),
    userId:    user.id,
    tokenHash: newHash,
    expiresAt,
  });

  return { accessToken: newAccessToken, rawRefreshToken: newRawRefresh };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Revoke the current refresh token.
 * Graceful: if the token is already revoked or not found, still succeeds.
 */
export async function logout(
  rawRefreshToken: string,
  userId: string,
  meta: RequestMeta,
): Promise<void> {
  // Best-effort revocation — don't throw if token not found
  try {
    const tokenHash = hashToken(rawRefreshToken);
    await repo.revokeRefreshToken(tokenHash);
  } catch {
    // Silently ignore — token already revoked or not found
  }

  await repo.createAuditLog({
    id:        generateId(),
    userId,
    action:    'logout',
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
}

// ─── Get Me ───────────────────────────────────────────────────────────────────

/** Fetch the current user's public profile by ID. */
export async function getMe(userId: string): Promise<UserPublic> {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toUserPublic(user);
}

/** Update the current user's preferences/settings. */
export async function updateMe(
  userId: string,
  body: UpdateMeBody,
): Promise<UserPublic> {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const updated = await repo.updateUser(userId, body);
  return toUserPublic(updated);
}
