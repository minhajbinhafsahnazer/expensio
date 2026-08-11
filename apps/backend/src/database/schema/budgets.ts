import { pgTable, varchar, timestamp, numeric, unique, text } from 'drizzle-orm/pg-core';
import { users } from './users';
import { sql } from 'drizzle-orm';

export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(), // ULID
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  monthKey: varchar('month_key', { length: 7 }).notNull(), // Format: YYYY-MM
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => {
  return {
    userMonthUnique: unique('user_month_unique').on(table.userId, table.monthKey),
  };
});
