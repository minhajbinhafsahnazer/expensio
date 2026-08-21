import { pgTable, text, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * users
 *
 * Design decisions:
 * - ULID as PK: sortable, URL-safe, no sequential ID leakage
 * - full_name instead of first/last: simpler for a personal app, avoids cultural assumptions
 * - currency/theme/timezone/locale stored here for fast single-query personalization
 * - No avatar, phone, address — not needed for MVP expense tracking
 * - TIMESTAMPTZ on all timestamps: timezone-aware, correct for global users
 * - is_active for soft-disable without full deletion
 * - RLS-ready: user_id on child tables references this id
 */
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // ULID

    // Auth
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),

    // Profile
    fullName: varchar('full_name', { length: 255 }),
    phoneNumber: varchar('phone_number', { length: 30 }),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'), // ISO 4217
    theme: varchar('theme', { length: 10 }).notNull().default('system'),   // light | dark | system
    timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Kolkata'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-IN'),

    // Status
    superiorCategoriesEnabled: boolean('superior_categories_enabled').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  }),
);
