import { db, type OutboxEntry } from '../db/database';

export const outboxService = {
  async enqueue(entry: Omit<OutboxEntry, 'retryCount'>) {
    await db.outbox.add({
      ...entry,
      retryCount: 0
    });
    // Trigger sync engine here (e.g., dispatch event or call sync function)
  },

  async getPending() {
    return await db.outbox.orderBy('timestamp').toArray();
  },

  async markProcessed(id: string) {
    await db.outbox.delete(id);
  },

  async incrementRetry(id: string) {
    const entry = await db.outbox.get(id);
    if (entry) {
      await db.outbox.update(id, { retryCount: entry.retryCount + 1 });
    }
  }
};
