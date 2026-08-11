import { eq, and } from 'drizzle-orm';
import { db } from '../../database/client';
import { budgets } from '../../database/schema/budgets';
import { ulid } from 'ulid';

export const budgetsService = {
  async setBudget(userId: string, monthKey: string, amount: number) {
    const existing = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.monthKey, monthKey)))
      .limit(1);

    if (existing.length > 0) {
      // Update
      const [updated] = await db
        .update(budgets)
        .set({ amount: amount.toString(), updatedAt: new Date() })
        .where(eq(budgets.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Insert
      const [inserted] = await db
        .insert(budgets)
        .values({
          id: ulid(),
          userId,
          monthKey,
          amount: amount.toString(),
        })
        .returning();
      return inserted;
    }
  },

  async getBudget(userId: string, monthKey: string) {
    const result = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.monthKey, monthKey)))
      .limit(1);

    return result[0] || null;
  }
};
