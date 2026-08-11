import { pgTable, text, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * audit_logs
 *
 * Design decisions:
 * - Auth-only audit trail: register, login, logout, password_change, refresh_token
 * - Intentionally minimal — not a full activity log (no expense edits, etc.)
 * - No updated_at: audit rows are append-only, never modified
 * - ip_address: varchar(45) supports both IPv4 (15 chars) and IPv6 (39 chars)
 * - user_agent: TEXT since browser strings can be long
 * - Future: can expand action enum or add metadata JSONB column if needed
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(), // ULID

    userId: text('user_id')
      .notNull()
      .references(() => users.id),

    // Event
    action: varchar('action', { length: 50 }).notNull(),
    // Supported: register | login | logout | password_change | refresh_token

    // Request context
    ipAddress: varchar('ip_address', { length: 45 }),  // IPv4 or IPv6
    userAgent: text('user_agent'),

    // Audit (no updated_at — rows are immutable)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  }),
);
