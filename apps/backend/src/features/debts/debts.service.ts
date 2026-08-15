import { debtsRepository } from './debts.repository';
import type { NewDebt, Debt } from './debts.repository';
import { db } from '../../database/client';
import { debts } from '../../database/schema/debts';
import { auditLogs } from '../../database/schema/audit_logs';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// In Expensio, ULIDs are used often. We'll use a simple fallback if no ULID lib is present,
// but UUID or a custom string is fine based on schema (`id: text('id')`).
// Let's use a time-sorted string for basic ULID-like behavior.
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

export const debtsService = {
  async createDebt(
    userId: string, 
    data: Pick<NewDebt, 'name' | 'amount' | 'type' | 'note' | 'dueDate' | 'hasReminder' | 'isSettled'>,
    ip?: string, 
    ua?: string
  ): Promise<Debt> {
    const id = generateId();
    const newDebt: NewDebt = {
      ...data,
      id,
      userId,
    };

    return db.transaction(async (tx) => {
      const [debt] = await tx.insert(debts).values(newDebt).returning();
      
      await tx.insert(auditLogs).values({
        id: generateId(),
        userId,
        action: 'debt_created',
        metadata: { debtId: id, amount: data.amount, type: data.type },
        ipAddress: ip || '127.0.0.1',
        userAgent: ua || 'system',
      });

      return debt;
    });
  },

  async getDebts(userId: string): Promise<Debt[]> {
    return debtsRepository.findByUserId(userId);
  },

  async updateDebt(
    id: string, 
    userId: string, 
    data: Partial<Pick<NewDebt, 'name' | 'amount' | 'type' | 'note' | 'dueDate' | 'hasReminder' | 'isSettled'>>, 
    ip?: string, 
    ua?: string
  ): Promise<Debt | undefined> {
    const existing = await debtsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new Error('Debt not found or unauthorized');
    }

    return db.transaction(async (tx) => {
      const [updated] = await tx.update(debts)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(debts.id, id), eq(debts.userId, userId)))
        .returning();

      let action = 'debt_updated';
      if ('isSettled' in data) {
        action = data.isSettled ? 'debt_settled' : 'debt_reopened';
      }

      await tx.insert(auditLogs).values({
        id: generateId(),
        userId,
        action,
        metadata: { debtId: id, changes: Object.keys(data) },
        ipAddress: ip || '127.0.0.1',
        userAgent: ua || 'system',
      });

      return updated;
    });
  },

  async deleteDebt(id: string, userId: string, ip?: string, ua?: string): Promise<boolean> {
    const existing = await debtsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new Error('Debt not found or unauthorized');
    }

    await db.transaction(async (tx) => {
      await tx.update(debts)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(debts.id, id), eq(debts.userId, userId)));

      await tx.insert(auditLogs).values({
        id: generateId(),
        userId,
        action: 'debt_deleted',
        metadata: { debtId: id },
        ipAddress: ip || '127.0.0.1',
        userAgent: ua || 'system',
      });
    });

    return true;
  },
};
