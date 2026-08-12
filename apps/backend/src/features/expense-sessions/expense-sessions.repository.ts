import { db } from '../../database/client.js';
import { expenseSessions } from '../../database/schema/expense_sessions.js';
import { transactions } from '../../database/schema/transactions.js';
import { auditLogs } from '../../database/schema/audit_logs.js';
import { eq } from 'drizzle-orm';
import { AppError } from '../../common/errors/index.js';

export type CreateSessionPayload = {
  id: string;
  userId: string;
  totalAmount: string;
  itemCount: number;
};

export type CreateTransactionPayload = {
  id: string;
  sessionId: string;
  userId: string;
  amount: string;
  currency: string;
  category: string;
  superiorCategory?: string | null;
  note?: string;
  spentAt: Date;
  status: string;
  /** 'expense' (default) | 'income' — determines balance effect */
  type: 'expense' | 'income';
};

export const expenseSessionsRepository = {
  /**
   * Creates an expense session, all its transactions, and an audit log atomically.
   */
  async createSessionWithTransactions(
    sessionData: CreateSessionPayload,
    transactionsData: CreateTransactionPayload[],
    ipAddress?: string,
    userAgent?: string
  ) {
    return await db.transaction(async (tx) => {
      // 1. Insert the session
      const [session] = await tx
        .insert(expenseSessions)
        .values({
          id: sessionData.id,
          userId: sessionData.userId,
          totalAmount: sessionData.totalAmount,
          itemCount: sessionData.itemCount,
        })
        .returning();

      // 2. Insert all transactions
      // Handle idempotency: ON CONFLICT DO NOTHING (if ID exists)
      // transactionsData already includes the `type` field from the payload.
      // The DB enum default is 'expense', but we pass it explicitly so that
      // income transactions (e.g., goal withdrawals) are stored correctly.
      const insertedTransactions = await tx
        .insert(transactions)
        .values(transactionsData)
        .onConflictDoNothing({ target: transactions.id })
        .returning();

      // 3. Insert audit log
      const auditLogId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      await tx.insert(auditLogs).values({
        id: auditLogId,
        userId: sessionData.userId,
        action: 'expense_session_created',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });

      return { session, transactions: insertedTransactions };
    });
  }
};
