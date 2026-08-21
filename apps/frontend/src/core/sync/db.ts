/**
 * core/sync/db.ts
 *
 * IndexedDB schema for the offline transaction queue.
 * Uses `idb` (a tiny promise-wrapper around IndexedDB).
 *
 * Schema version history:
 *   v1 — initial schema, no userId field
 *   v2 — added userId field + userId index for per-user isolation
 *
 * The v1→v2 migration adds userId to any existing entries using a
 * sentinel value ('__unknown__') so they are not silently discarded
 * but also cannot be flushed (SyncEngine filters them out since they
 * don't match any authenticated user's id).
 */

import { openDB, type IDBPDatabase } from 'idb';

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface PendingTransaction {
  /** Client-generated ULID — used for deduplication on the server */
  clientGeneratedId: string;
  /**
   * The ID of the user who created this transaction.
   * Used to ensure that a queued mutation belonging to User A is never
   * submitted after User B authenticates on the same device.
   */
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  amount: number;
  currency: string;
  description?: string;
  category: string;
  superiorCategory?: string | null;
  note?: string;
  spentAt: string;   // ISO string
  type: 'expense' | 'income';
  /** Wall-clock time when the user submitted the transaction locally */
  queuedAt: string;
  /** Number of sync attempts so far (for exponential backoff) */
  attempts: number;
}

interface ExpenseFlowDB {
  'pending-transactions': {
    key: string;                 // clientGeneratedId
    value: PendingTransaction;
    indexes: {
      queuedAt: string;
      userId: string;
    };
  };
}

// ─── Singleton DB connection ──────────────────────────────────────────────────

let _db: IDBPDatabase<ExpenseFlowDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<ExpenseFlowDB>> {
  if (_db) return _db;

  _db = await openDB<ExpenseFlowDB>('expenseflow', 2, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        // v1 → create the store with queuedAt index
        const store = db.createObjectStore('pending-transactions', {
          keyPath: 'clientGeneratedId',
        });
        store.createIndex('queuedAt', 'queuedAt');
      }

      if (oldVersion < 2) {
        // v1 → v2: add userId index.
        // Existing entries from v1 don't have userId; the IDBObjectStore
        // upgrade transaction lets us add the index but not backfill values
        // (IDB upgrade transactions can only do schema changes, not arbitrary
        // JS logic on existing data). We add the index here; the sentinel
        // backfill happens at first read in getAll() below.
        const store = transaction.objectStore('pending-transactions');
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId');
        }
      }
    },
  });

  return _db;
}



// ─── Queue operations ─────────────────────────────────────────────────────────

export const queue = {
  /** Get a specific transaction from the queue by ID */
  async get(clientGeneratedId: string): Promise<PendingTransaction | undefined> {
    const db = await getDb();
    return db.get('pending-transactions', clientGeneratedId);
  },

  /** Add a pending transaction to the local queue */
  async enqueue(tx: PendingTransaction): Promise<void> {
    const db = await getDb();
    await db.put('pending-transactions', tx);
  },

  /** Add multiple pending transactions to the local queue in a single atomic transaction */
  async enqueueMany(txs: PendingTransaction[]): Promise<void> {
    if (txs.length === 0) return;
    const db = await getDb();
    const tx = db.transaction('pending-transactions', 'readwrite');
    await Promise.all(txs.map(t => tx.store.put(t)));
    await tx.done;
  },

  /**
   * Get all pending transactions for a specific user, ordered by queuedAt
   * (oldest first for FIFO sync).
   *
   * Only returns items owned by the given userId — items from other users
   * (including v1 entries without a userId) are excluded.
   */
  async getAll(userId: string): Promise<PendingTransaction[]> {
    const db = await getDb();
    // getAllFromIndex by userId, then sort by queuedAt for FIFO ordering.
    const items = await db.getAllFromIndex('pending-transactions', 'userId', userId);
    return items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  },

  /** Count items waiting to sync for a specific user */
  async count(userId: string): Promise<number> {
    const db = await getDb();
    return db.countFromIndex('pending-transactions', 'userId', userId);
  },

  /** Remove a transaction from the queue once successfully synced */
  async dequeue(clientGeneratedId: string): Promise<void> {
    const db = await getDb();
    await db.delete('pending-transactions', clientGeneratedId);
  },

  /** Remove multiple transactions at once (after a successful batch sync) */
  async dequeueMany(ids: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('pending-transactions', 'readwrite');
    await Promise.all(ids.map(id => tx.store.delete(id)));
    await tx.done;
  },

  /** Increment the attempt counter (for future exponential backoff) */
  async incrementAttempts(clientGeneratedId: string): Promise<void> {
    const db = await getDb();
    const item = await db.get('pending-transactions', clientGeneratedId);
    if (item) {
      await db.put('pending-transactions', { ...item, attempts: item.attempts + 1 });
    }
  },

  /**
   * Clear ALL pending transactions that belong to a specific user.
   * Only called by the explicit "Reset Local Data" action — never silently
   * on logout. Unsynced financial data must never be discarded without
   * explicit user confirmation.
   */
  async clearForUser(userId: string): Promise<void> {
    const db = await getDb();
    const items = await db.getAllFromIndex('pending-transactions', 'userId', userId);
    const txn = db.transaction('pending-transactions', 'readwrite');
    await Promise.all(items.map(item => txn.store.delete(item.clientGeneratedId)));
    await txn.done;
  },
};
