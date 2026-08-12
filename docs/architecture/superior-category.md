# Superior Categories Architecture

## 1. Overview & Business Value

In personal finance tracking, users often input specific item labels as transaction categories (e.g. *Burger*, *Pizza*, *Sandwich*, *Uber*, *Petrol*). 

Without high-level grouping, analytics pie charts become fragmented into unhelpful micro-percentages (*Burger 2%*, *Pizza 3%*, *Sandwich 1%*).

**Superior Categories** solve this problem by introducing an optional high-level analytical grouping dimension (e.g. *Food & Dining*, *Transportation*) while preserving the granular transaction category label.

```
Individual Transactions             Analytical Breakdown
├── Burger  (superior: Food & Dining) ───┐
├── Pizza   (superior: Food & Dining) ───┼──> Food & Dining (50%)
└── Sandwich(superior: Food & Dining) ───┘
```

---

## 2. Feature Flag & Account Settings Architecture

To maintain a minimal, friction-free transaction capture modal for power users who prefer basic tracking, Superior Categories is an **account-level opt-in feature**.

### Key Rules
- **Default State**: `false` (Disabled by default).
- **Persistence**: Persisted in PostgreSQL (`users.superior_categories_enabled`).
- **Source of Truth**: Backend PostgreSQL user record (`/auth/me`). `localStorage` is used purely for optimistic fallback rendering prior to session hydration.
- **Account Security**: Toggling the feature in `/profile` requires explicit confirmation by typing `CONFIRM` into a confirmation dialog to prevent accidental setting state toggles.

---

## 3. Data Model & Database Schema

The `superior_category` column is designed to be completely optional and non-intrusive.

### Drizzle ORM Schema (`transactions.ts`)
```typescript
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => expenseSessions.id),
  userId: text('user_id').notNull().references(() => users.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  type: transactionTypeEnum('type').notNull().default('expense'),
  
  // Classification
  category: text('category').notNull(),         // e.g. "Burger"
  superiorCategory: text('superior_category'),  // Optional high-level grouping, e.g. "Food & Dining"
  note: text('note'),

  spentAt: timestamp('spent_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

### Historical Data Preservation
- Existing transactions have `superior_category = NULL`.
- Disabling Superior Categories does **NOT** delete or clear stored `superior_category` values in PostgreSQL.
- Re-enabling the feature immediately restores analytics rollups for historical transactions that have a stored `superior_category`.

---

## 4. Backend Analytics Aggregation Engine

Analytics calculations are server-authoritative and enforced inside `analytics.service.ts`.

### Category Aggregation Rule (`getAnalyticsCategoryKey`)
```typescript
export function getAnalyticsCategoryKey(
  transaction: { category: string; superiorCategory?: string | null },
  isSuperiorCategoriesEnabled: boolean,
): string {
  if (isSuperiorCategoriesEnabled && transaction.superiorCategory?.trim()) {
    return transaction.superiorCategory.trim();
  }
  return transaction.category;
}
```

### Breakdown Behavior
1. **Feature OFF (`superiorCategoriesEnabled === false`)**:
   - Analytics strictly uses `transaction.category`.
   - `superiorCategory` is completely ignored during aggregation.
2. **Feature ON (`superiorCategoriesEnabled === true`)**:
   - If `superiorCategory` is valid & non-empty, analytics groups by `superiorCategory.trim()`.
   - If `superiorCategory` is `null` or whitespace, analytics falls back to `transaction.category`.

---

## 5. Offline Sync & Idempotency Pipeline

The Superior Category field is fully supported across ExpenseFlow's offline-first queue and synchronization engine.

```
UI Capture Sheet
     │
     ▼
React Query Cache (Optimistic UI)
     │
     ▼
IndexedDB Queue (PendingTransaction.superiorCategory)
     │
     ▼
SyncEngine Worker
     ├── CREATE ──> POST /expense-sessions (TransactionCreateSchema)
     └── UPDATE ──> PUT /transactions/:id (transactionsService.updateTransaction)
     │
     ▼
PostgreSQL Database (transactions.superior_category)
```

- **Creating Offline**: `PendingTransaction` stores `superiorCategory`.
- **Sync Flushes**: `SyncEngine` includes `superiorCategory` in `/expense-sessions` and `/transactions/:id` payloads.
- **Idempotency**: Client-generated ULID (`clientGeneratedId`) ensures transactions sync without duplicates across network drops or PWA restarts.

---

## 6. UI / UX Integration

1. **Transaction Modal (`home.tsx`)**:
   - Rendered **only** when `user.superiorCategoriesEnabled === true`.
   - Searchable/Selectable Combobox supporting preset categories (*Food & Dining*, *Transportation*, *Housing & Bills*, *Shopping*, *Health & Wellness*, *Entertainment*, *Travel*, *Education*, *Personal & Lifestyle*, *Financial*, *Other*).
   - Allows custom text entry or clearing (`null`).
2. **Settings Toggle (`profile.tsx`)**:
   - Advanced Settings toggle with descriptive subtext and inline help info button (`<Info />`).
   - Interactive modal explaining Superior Category rollups with visual examples.
