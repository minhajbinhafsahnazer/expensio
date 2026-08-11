import { z } from 'zod';

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const TransactionCreateSchema = z.object({
  clientGeneratedId: z.string().min(1, 'ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
  category: z.string().min(1, 'Category is required'),
  note: z.string().optional(),
  spentAt: z.string().datetime({ offset: true }).or(z.string()), // Accept ISO string
  status: z.enum(['pending', 'synced']).default('synced'),
  /**
   * Transaction semantic type.
   * - 'expense' (default): reduces available balance (money spent)
   * - 'income': increases available balance (money received)
   * Goal deductions that return money to the user's balance are 'income'.
   * Goal deductions that represent actual spending are 'expense'.
   */
  type: z.enum(['expense', 'income']).default('expense'),
});

export const ExpenseSessionCreateSchema = z.object({
  transactions: z.array(TransactionCreateSchema).min(1, 'At least one transaction is required'),
});

// ─── Response Schemas ─────────────────────────────────────────────────────────

export const TransactionPublicSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  amount: z.string(), // numeric from DB usually stringified
  currency: z.string(),
  category: z.string(),
  note: z.string().nullable(),
  spentAt: z.date(),
  status: z.string(),
  type: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ExpenseSessionPublicSchema = z.object({
  id: z.string(),
  userId: z.string(),
  totalAmount: z.string(),
  itemCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  transactions: z.array(TransactionPublicSchema).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;
export type ExpenseSessionCreateInput = z.infer<typeof ExpenseSessionCreateSchema>;
export type ExpenseSessionPublicOutput = z.infer<typeof ExpenseSessionPublicSchema>;
