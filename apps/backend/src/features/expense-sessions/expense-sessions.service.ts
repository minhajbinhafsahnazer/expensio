import { ulid } from 'ulid';
import { expenseSessionsRepository } from './expense-sessions.repository.js';
import type { ExpenseSessionCreateInput } from './expense-sessions.schemas.js';

export const expenseSessionsService = {
  async createSession(
    userId: string,
    data: ExpenseSessionCreateInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const sessionId = ulid();
    
    let totalAmount = 0;
    const transactionsData = data.transactions.map((t) => {
      totalAmount += t.amount;
      
      return {
        // Use client generated ID directly if it's a ULID, otherwise generate a new one
        // Wait, for strict idempotency, we should just use the client ID.
        // Assuming the client uses ULID generation. If not, it will just insert as string.
        id: t.clientGeneratedId,
        sessionId,
        userId,
        amount: t.amount.toString(), // Convert numeric to string for postgres NUMERIC
        currency: t.currency,
        category: t.category,
        note: t.note,
        spentAt: new Date(t.spentAt),
        status: t.status,
      };
    });

    const sessionData = {
      id: sessionId,
      userId,
      totalAmount: totalAmount.toFixed(2),
      itemCount: transactionsData.length,
    };

    const result = await expenseSessionsRepository.createSessionWithTransactions(
      sessionData,
      transactionsData,
      ipAddress,
      userAgent
    );

    return result;
  }
};
