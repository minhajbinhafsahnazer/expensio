import { ulid } from 'ulid';
import { expenseSessionsRepository } from './expense-sessions.repository.js';
import type { ExpenseSessionCreateInput } from './expense-sessions.schemas.js';
import { TransactionClassifier } from '../transactions/classification.service.js';

export const expenseSessionsService = {
  async createSession(
    userId: string,
    data: ExpenseSessionCreateInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const sessionId = ulid();
    
    let totalAmount = 0;
    const transactionsData = await Promise.all(data.transactions.map(async (t) => {
      totalAmount += t.amount;

      // INVARIANT: description is the user's original text and must never be
      // derived from or substituted by category. The Zod schema upstream
      // already enforces description: z.string().min(1), so t.description is
      // guaranteed to be a non-empty string at this point.
      const description = t.description;
      const classification = await TransactionClassifier.classify(description, userId);
      
      return {
        id: t.clientGeneratedId,
        sessionId,
        userId,
        amount: t.amount.toString(),
        currency: t.currency,
        description: description,
        category: classification.category,
        categorySource: classification.categorySource,
        categoryConfidence: classification.categoryConfidence,
        superiorCategory: t.superiorCategory ? t.superiorCategory.trim() : null,
        note: t.note,
        spentAt: new Date(t.spentAt),
        status: t.status,
        type: t.type as 'expense' | 'income',
      };
    }));

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
