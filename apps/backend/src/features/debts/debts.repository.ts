import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database/client';
import { debts } from '../../database/schema';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type Debt = InferSelectModel<typeof debts>;
export type NewDebt = InferInsertModel<typeof debts>;

export const debtsRepository = {
  async create(data: NewDebt): Promise<Debt> {
    const [result] = await db.insert(debts).values(data).returning();
    return result;
  },

  async findByUserId(userId: string): Promise<Debt[]> {
    return db
      .select()
      .from(debts)
      .where(and(eq(debts.userId, userId), isNull(debts.deletedAt)))
      .orderBy(debts.createdAt);
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Debt | undefined> {
    const [result] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)));
    return result;
  },

  async update(id: string, userId: string, data: Partial<NewDebt>): Promise<Debt | undefined> {
    const [result] = await db
      .update(debts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .returning();
    return result;
  },

  async softDelete(id: string, userId: string): Promise<Debt | undefined> {
    const [result] = await db
      .update(debts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(debts.id, id), eq(debts.userId, userId), isNull(debts.deletedAt)))
      .returning();
    return result;
  },
};
