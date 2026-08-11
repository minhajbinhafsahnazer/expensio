import { pgTable, text, numeric, varchar, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { expenseSessions } from './expense_sessions';

export const transactionTypeEnum = pgEnum('transaction_type', ['expense', 'income']);

/**
 * transactions
 *
 * Design decisions:
 * - Core business table — one row = one expense item
 * - user_id is denormalized (also available via session_id → user_id) for direct RLS filtering
 *   without a join. Critical for Row Level Security policies.
 * - category stored as TEXT (not FK to a categories table):
 *     → ExpenseFlow has a fixed small set of categories in the UI
 *     → Avoids a join on every transaction read
 *     → Categories table can be added later if users need custom/colored categories
 * - currency per-transaction (not just per-user) supports future multi-currency tracking
 * - amount: NUMERIC(12,2) — up to 9,999,999,999.99, correct for financial data (no float rounding)
 * - spent_at: user-defined timestamp of when the expense occurred (not created_at)
 * - status: pending (offline) → synced (confirmed) → deleted (soft delete via status)
 * - deleted_at: soft delete column for audit trail and offline sync conflict resolution
 *
 * Indexes:
 * - user_id: most queries filter by user
 * - spent_at DESC: timeline/history queries
 * - (user_id, spent_at): composite for user-scoped timeline — most common query pattern
 */
export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(), // ULID

    sessionId: text('session_id')
      .notNull()
      .references(() => expenseSessions.id),

    userId: text('user_id')
      .notNull()
      .references(() => users.id), // Denormalized for RLS + fast filtering

    // Financial
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(), // ISO 4217
    type: transactionTypeEnum('type').notNull().default('expense'),

    // Classification
    category: text('category').notNull(),  // e.g. "food", "transport", "utilities"
    note: text('note'),                    // Optional free-text memo

    // Timing
    spentAt: timestamp('spent_at', { withTimezone: true }).notNull(), // When expense occurred

    // Sync state (offline-first)
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | synced | deleted

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  },
  (table) => ({
    userIdIdx:       index('transactions_user_id_idx').on(table.userId),
    spentAtIdx:      index('transactions_spent_at_idx').on(table.spentAt),
    userSpentAtIdx:  index('transactions_user_spent_at_idx').on(table.userId, table.spentAt),
  }),
);
