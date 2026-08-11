import { eq, desc, isNull, and } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { transactions } from '../../database/schema/transactions.js';

export const transactionsRepository = {
  async getUserTransactions(userId: string) {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt)
        )
      )
      .orderBy(desc(transactions.spentAt));
  },

  async update(id: string, userId: string, data: Partial<typeof transactions.$inferInsert>) {
    const [updated] = await db
      .update(transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt)
        )
      )
      .returning();
    return updated;
  },

  async softDelete(id: string, userId: string) {
    const [deleted] = await db
      .update(transactions)
      .set({ deletedAt: new Date(), status: 'deleted', updatedAt: new Date() })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId)
        )
      )
      .returning();
    return deleted;
  }
};
