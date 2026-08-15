import { pgTable, text, numeric, varchar, timestamp, index, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const debtTypeEnum = pgEnum('debt_type', ['lent', 'borrowed']);

export const debts = pgTable(
  'debts',
  {
    id: text('id').primaryKey(), // ULID

    userId: text('user_id')
      .notNull()
      .references(() => users.id),

    name: text('name').notNull(),
    
    // Financial: numeric with 12,2 precision matches transactions schema
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    type: debtTypeEnum('type').notNull(),
    
    note: text('note'),

    // Due date (no time component needed strictly, but timestamp for consistency)
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Status flags
    isSettled: boolean('is_settled').notNull().default(false),
    hasReminder: boolean('has_reminder').notNull().default(false),

    // Audit and Soft Delete
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('debts_user_id_idx').on(table.userId),
  }),
);
