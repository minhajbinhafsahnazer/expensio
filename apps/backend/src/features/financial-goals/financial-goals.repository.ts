import { eq, and, isNull, asc } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { financialGoals } from '../../database/schema/financial_goals.js';

export const financialGoalsRepository = {
  async create(data: typeof financialGoals.$inferInsert) {
    const [goal] = await db.insert(financialGoals).values(data).returning();
    return goal;
  },

  async findAllByUser(userId: string) {
    return await db
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.userId, userId),
          isNull(financialGoals.deletedAt)
        )
      )
      .orderBy(asc(financialGoals.displayOrder));
  },

  async findById(id: string, userId: string) {
    const [goal] = await db
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, id),
          eq(financialGoals.userId, userId),
          isNull(financialGoals.deletedAt)
        )
      );
    return goal;
  },

  async update(id: string, userId: string, data: Partial<typeof financialGoals.$inferInsert>) {
    const [goal] = await db
      .update(financialGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(financialGoals.id, id),
          eq(financialGoals.userId, userId)
        )
      )
      .returning();
    return goal;
  },

  async softDelete(id: string, userId: string) {
    await db
      .update(financialGoals)
      .set({ deletedAt: new Date(), status: 'ARCHIVED' })
      .where(
        and(
          eq(financialGoals.id, id),
          eq(financialGoals.userId, userId)
        )
      );
  }
};
