/**
 * auth.repository.ts
 *
 * Pure database access layer for the auth feature.
 * Zero business logic here — only Drizzle queries.
 *
 * This is the ONLY layer that imports `db` or knows about Drizzle.
 * Services call these functions; they never touch the ORM directly.
 */

import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { db } from '../../database/client.js';
import {
  users,
  refreshTokens,
  auditLogs,
} from '../../database/schema/index.js';
import type { UserPublic, RequestMeta } from './auth.types.js';

// ─── User Queries ─────────────────────────────────────────────────────────────

/** Find a user by email. Returns null if not found. */
export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

/** Find a user by ID. Returns null if not found. */
export async function findUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

/** Insert a new user. Returns the created row. */
export async function createUser(data: {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string | null;
  currency: string;
  theme: string;
  timezone: string;
  locale: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

/** Update last_login_at to now for the given user. */
export async function updateLastLogin(userId: string) {
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Update user profile fields/settings. */
export async function updateUser(userId: string, data: Partial<typeof users.$inferInsert>) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

// ─── Refresh Token Queries ────────────────────────────────────────────────────

/** Insert a new refresh token row. Returns the created row.
 *  ON CONFLICT DO NOTHING guards against duplicate hash from race-condition
 *  double-submits (e.g. React StrictMode double-mount or network retries).
 */
export async function createRefreshToken(data: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const [token] = await db
    .insert(refreshTokens)
    .values(data)
    .onConflictDoNothing()
    .returning();
  return token;
}

/**
 * Find a refresh token by its hash.
 * Only returns active (non-revoked, non-expired) tokens.
 */
export async function findActiveRefreshToken(tokenHash: string) {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return token ?? null;
}

/** Revoke a specific token by hash. Also records last_used_at. */
export async function revokeRefreshToken(tokenHash: string) {
  const now = new Date();
  await db
    .update(refreshTokens)
    .set({ revokedAt: now, lastUsedAt: now })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

/** Revoke ALL active refresh tokens for a user (logout everywhere). */
export async function revokeAllRefreshTokens(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
      ),
    );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

/**
 * Insert an audit log entry.
 * Supported actions: register | login | logout | password_change | refresh_token
 */
export async function createAuditLog(data: {
  id: string;
  userId: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  await db.insert(auditLogs).values(data);
}

// ─── Token Cleanup ────────────────────────────────────────────────────────────

/**
 * Delete stale refresh token rows from the database.
 *
 * Removes:
 *   1. Tokens past their expiry date (expired and never cleaned up).
 *   2. Tokens that were revoked more than 7 days ago (safe to discard).
 *
 * Called on a 24-hour interval by the cleanup scheduler in server.ts.
 * No business logic — pure housekeeping.
 *
 * Returns the number of rows deleted.
 */
export async function deleteExpiredRefreshTokens(): Promise<number> {
  const now = new Date();
  const revocationRetentionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(refreshTokens)
    .where(
      // expires_at < NOW  (expired)
      // OR (revoked_at IS NOT NULL AND revoked_at < now - 7 days)
      sql`
        ${refreshTokens.expiresAt} < ${now}
        OR (
          ${refreshTokens.revokedAt} IS NOT NULL
          AND ${refreshTokens.revokedAt} < ${revocationRetentionCutoff}
        )
      `,
    )
    .returning({ id: refreshTokens.id });

  return result.length;
}
