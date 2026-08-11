import { pgTable, text, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * expense_sessions
 *
 * Design decisions:
 * - Represents one "capture workflow" — user opens app, adds N expenses, taps Done
 * - Enables batch creation, offline sync (sync whole session atomically), and future receipt imports
 * - total_amount + item_count are denormalized for fast reads — recalculated on transaction upsert
 * - No status column: a session is always open until the user commits (handled at API level)
 * - RLS: user_id FK ensures each session belongs to exactly one user
 */
export const expenseSessions = pgTable(
  'expense_sessions',
  {
    id: text('id').primaryKey(), // ULID

    userId: text('user_id')
      .notNull()
      .references(() => users.id),

    // Denormalized aggregates (updated on transaction insert/delete)
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    itemCount: integer('item_count').notNull().default(0),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('expense_sessions_user_id_idx').on(table.userId),
  }),
);
