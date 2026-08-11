import { pgTable, varchar, timestamp, numeric, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const financialGoals = pgTable('financial_goals', {
  id: varchar('id', { length: 26 }).primaryKey(),
  userId: varchar('user_id', { length: 26 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  targetAmount: numeric('target_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  currentAmount: numeric('current_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high
  targetDate: timestamp('target_date', { withTimezone: true }),
  color: varchar('color', { length: 50 }).notNull().default('default'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'), // ACTIVE, COMPLETED, ARCHIVED
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
