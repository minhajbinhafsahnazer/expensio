import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * refresh_tokens
 *
 * Design decisions:
 * - token_hash stores SHA-256(rawToken), never the raw token itself.
 *   If the DB is breached, hashed tokens are useless to an attacker.
 * - Raw token = a signed JWT (type: "refresh"). JWT signature is verified
 *   before the DB hash lookup, catching forgeries without a round-trip.
 * - UNIQUE on token_hash prevents duplicate storage bugs.
 * - revoked_at: NULL = active, set = revoked. Enables "logout everywhere".
 * - last_used_at: updated when token is consumed for a refresh.
 *   Useful for: active device listing, stale token cleanup, anomaly detection.
 * - No updated_at: rows are effectively append-only; revocation/usage sets
 *   dedicated columns rather than a generic updated_at.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(), // ULID

    userId: text('user_id')
      .notNull()
      .references(() => users.id),

    tokenHash: text('token_hash').notNull().unique(), // SHA-256 of raw JWT refresh token

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    lastUsedAt: timestamp('last_used_at', { withTimezone: true }), // NULL until first use

    revokedAt: timestamp('revoked_at', { withTimezone: true }),    // NULL = active

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx:    index('refresh_tokens_user_id_idx').on(table.userId),
    tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  }),
);
