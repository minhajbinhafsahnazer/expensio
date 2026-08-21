import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userCategories = pgTable(
  'user_categories',
  {
    id: text('id').primaryKey(), // ULID
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(), // Preserves capitalization
    normalizedName: text('normalized_name').notNull(), // Lowercased and trimmed for unique constraint
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_categories_user_id_idx').on(table.userId),
    userNormalizedNameIdx: uniqueIndex('user_categories_user_normalized_name_idx').on(table.userId, table.normalizedName),
  })
);
