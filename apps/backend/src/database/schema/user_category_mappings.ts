import { pgTable, text, timestamp, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userCategoryMappings = pgTable(
  'user_category_mappings',
  {
    id: text('id').primaryKey(), // ULID
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    normalizedTerm: text('normalized_term').notNull(),
    category: text('category').notNull(),
    ignored: boolean('ignored').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('user_category_mappings_user_id_idx').on(table.userId),
    userTermIdx: uniqueIndex('user_category_mappings_user_term_idx').on(table.userId, table.normalizedTerm),
  })
);
