import { eq, desc, isNull, and, gte, lt, sql } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { transactions } from '../../database/schema/transactions.js';

export const transactionsRepository = {
  async getUserTransactions(userId: string, monthKey?: string) {
    let dateFilter = undefined;
    if (monthKey) {
      const year = parseInt(monthKey.split('-')[0], 10);
      const month = parseInt(monthKey.split('-')[1], 10);
      
      if (!isNaN(year) && !isNaN(month)) {
        const startOfMonth = new Date(year, month - 1, 1);
        const startOfNextMonth = new Date(year, month, 1);
        
        dateFilter = and(
          gte(transactions.spentAt, startOfMonth),
          lt(transactions.spentAt, startOfNextMonth)
        );
      }
    }

    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          dateFilter
        )
      )
      .orderBy(desc(transactions.spentAt));
  },

  async getMonthlySummary(userId: string) {
    const monthSql = sql<string>`TO_CHAR(DATE_TRUNC('month', ${transactions.spentAt}), 'YYYY-MM')`;
    
    return await db
      .select({
        monthKey: monthSql,
        total: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' OR ${transactions.type} IS NULL THEN CAST(${transactions.amount} AS DECIMAL) ELSE 0 END)`,
        transactionCount: sql<number>`CAST(COUNT(*) AS INT)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt)
        )
      )
      .groupBy(monthSql)
      .orderBy(desc(monthSql));
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
