/**
 * core/sync/SyncEngine.tsx
 *
 * Offline-first sync engine for ExpenseFlow.
 *
 * Security guarantees:
 *   - All queue reads are scoped to the authenticated user's ID.
 *     User A's queued transactions are never visible to User B.
 *   - On logout, an AbortController cancels any in-flight HTTP request
 *     immediately. A stop flag prevents future flush() calls.
 *   - Queued data is PRESERVED on logout. Unsynced financial data is only
 *     discarded through the explicit "Reset Local Data" user action.
 *
 * Transaction flow:
 *   User logs expense
 *     → enqueue() → IndexedDB (instant, scoped to userId)
 *     → flush()   → API (if online and not stopped)
 *       → success: dequeue from IndexedDB, invalidate queries
 *       → fail:    keep in IndexedDB, retry on next flush
 *
 * Coordination with AuthContext:
 *   This provider registers its prepareForLogout() implementation in
 *   syncManager on mount. AuthContext calls it before clearing the token.
 *   No circular context dependency.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queue, type PendingTransaction } from './db';
import { client } from '../api/client';
import { useAuth } from '../providers/AuthContext';
import { syncManager } from './syncManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncContextValue {
  /** Number of the current user's transactions waiting to be synced */
  pendingCount: number;
  /** Current sync engine status */
  syncStatus: SyncStatus;
  /** Is the browser currently online? */
  isOnline: boolean;
  /** Queue a new transaction for sync (instant, never throws) */
  enqueue: (tx: Omit<PendingTransaction, 'queuedAt' | 'attempts' | 'userId'>) => Promise<void>;
  /** Queue multiple transactions for sync atomically */
  enqueueMany: (txs: Omit<PendingTransaction, 'queuedAt' | 'attempts' | 'userId'>[]) => Promise<void>;
  /** Manually trigger a flush attempt */
  flush: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SyncContext = createContext<SyncContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Guard: don't run concurrent flush operations.
  const isFlushing = useRef(false);

  // Stop flag: set by prepareForLogout(). Prevents new flush() calls
  // from starting after logout begins.
  const isStopped = useRef(false);

  // AbortController: cancelled by prepareForLogout() to abort any
  // fetch() call that is currently in-flight.
  const abortController = useRef<AbortController>(new AbortController());

  // ─── Reset engine state when userId changes ──────────────────────────────
  // When a new user logs in, reset the stop flag and create a fresh
  // AbortController so the engine can flush for the new user.
  useEffect(() => {
    isStopped.current = false;
    abortController.current = new AbortController();
    isFlushing.current = false;
  }, [userId]);

  // ─── Refresh pending count from IndexedDB ────────────────────────────────
  const refreshCount = useCallback(async () => {
    if (!userId) {
      setPendingCount(0);
      return;
    }
    const count = await queue.count(userId);
    setPendingCount(count);
  }, [userId]);

  // ─── Flush: drain the current user's IndexedDB queue to the server ───────
  const flush = useCallback(async () => {
    // Hard stops: no user, already flushing, offline, or stopped for logout.
    if (!userId || isFlushing.current || !navigator.onLine || isStopped.current) return;

    // Fast check if queue is empty before acquiring lock
    const initialPending = await queue.getAll(userId);
    if (initialPending.length === 0) {
      setSyncStatus('idle');
      return;
    }

    isFlushing.current = true;
    setSyncStatus('syncing');

    try {
      while (true) {
        if (!navigator.onLine || isStopped.current) break;

        const pending = await queue.getAll(userId);
        if (pending.length === 0) {
          break;
        }

        // Snapshot the current AbortController signal.
        const signal = abortController.current.signal;

        // Group by action
        const creates = pending.filter(tx => tx.action === 'CREATE' || !tx.action);
        const updates = pending.filter(tx => tx.action === 'UPDATE');
        const deletes = pending.filter(tx => tx.action === 'DELETE');

        // 1. Batch CREATEs via /expense-sessions
        if (creates.length > 0) {
          const payload = {
            transactions: creates.map(tx => ({
              clientGeneratedId: tx.clientGeneratedId,
              amount:           tx.amount,
              currency:         tx.currency,
              category:         tx.category,
              superiorCategory: tx.superiorCategory,
              note:             tx.note,
              spentAt:          tx.spentAt,
              type:             tx.type,
            })),
          };
          await client.post('/expense-sessions', payload, { signal });
          await queue.dequeueMany(creates.map(tx => tx.clientGeneratedId));
        }

        // 2. Process UPDATEs
        for (const tx of updates) {
          await client.put(`/transactions/${tx.clientGeneratedId}`, {
            amount:           tx.amount,
            currency:         tx.currency,
            category:         tx.category,
            superiorCategory: tx.superiorCategory,
            note:             tx.note,
            spentAt:          tx.spentAt,
            type:             tx.type,
          }, { signal });
          await queue.dequeue(tx.clientGeneratedId);
        }

        // 3. Process DELETEs
        for (const tx of deletes) {
          await client.delete(`/transactions/${tx.clientGeneratedId}`, { signal });
          await queue.dequeue(tx.clientGeneratedId);
        }
      }

      await refreshCount();

      // Only invalidate when the queue is fully drained.
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expense_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });

      setSyncStatus('idle');
    } catch (err) {
      // AbortError = logout fired mid-flush. Not a sync failure.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSyncStatus('idle');
        return;
      }
      // Network or server error — keep remaining items in queue, will retry.
      const remaining = await queue.getAll(userId);
      await Promise.all(
        remaining.map(tx => queue.incrementAttempts(tx.clientGeneratedId))
      );
      setSyncStatus('error');
    } finally {
      isFlushing.current = false;
    }
  }, [userId, queryClient, refreshCount]);

  // ─── Enqueue: add transaction to IndexedDB + attempt immediate flush ──────
  const enqueue = useCallback(async (
    tx: Omit<PendingTransaction, 'queuedAt' | 'attempts' | 'userId'>
  ) => {
    if (!userId) return; // Should never happen in practice (protected routes only)

    const existing = await queue.get(tx.clientGeneratedId);

    if (existing) {
      if (tx.action === 'DELETE' && existing.action === 'CREATE') {
        // Never synced — just remove from queue (no server op needed).
        await queue.dequeue(tx.clientGeneratedId);
      } else if (tx.action === 'DELETE') {
        await queue.enqueue({ ...tx, userId, action: 'DELETE', queuedAt: new Date().toISOString(), attempts: 0 });
      } else if (tx.action === 'UPDATE') {
        // Coalesce: preserve original action (CREATE if not yet synced).
        await queue.enqueue({ ...existing, ...tx, userId, action: existing.action, attempts: 0 });
      }
    } else {
      await queue.enqueue({ ...tx, userId, queuedAt: new Date().toISOString(), attempts: 0 });
    }

    await refreshCount();

    // Try to sync immediately if online and engine is running.
    if (!isStopped.current) flush();
  }, [userId, flush, refreshCount]);

  // ─── Enqueue Many: add multiple transactions in a single atomic transaction ──
  const enqueueMany = useCallback(async (
    txs: Omit<PendingTransaction, 'queuedAt' | 'attempts' | 'userId'>[]
  ) => {
    if (!userId || txs.length === 0) return;

    const queuedAt = new Date().toISOString();
    const newPending: PendingTransaction[] = txs.map(tx => ({
      ...tx,
      userId,
      queuedAt,
      attempts: 0
    }));

    // For simplicity, enqueueMany assumes mostly CREATEs (like the batch save modal).
    // If we need UPDATE/DELETE coalescing here, we'd iterate and check existing.
    await queue.enqueueMany(newPending);
    await refreshCount();

    if (!isStopped.current) flush();
  }, [userId, flush, refreshCount]);

  // ─── prepareForLogout — registered into syncManager ──────────────────────
  useEffect(() => {
    syncManager.prepareForLogout = async (_logoutUserId: string) => {
      // 1. Abort any in-flight HTTP request immediately.
      abortController.current.abort();
      // 2. Block future flush() calls.
      isStopped.current = true;
      // 3. Reset the flushing guard so the engine is in a clean state
      //    when the same or another user logs in next.
      isFlushing.current = false;
    };

    // Reset the registration to the no-op when this provider unmounts.
    return () => {
      syncManager.prepareForLogout = async () => {};
    };
  }, []); // Stable — refs don't need to be in deps

  // ─── Online / Offline event listeners ────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('idle');
      flush();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        flush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flush]);

  // ─── Background Polling: Retry pending transactions every 30s ────────────
  // Crucial for Render's free tier: if the first request fails due to a cold start
  // timeout (50s wake-up time), this interval will seamlessly retry until it goes through.
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingCount > 0 && navigator.onLine && !isFlushing.current && !isStopped.current) {
        flush();
      }
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [pendingCount, flush]);

  // ─── Initial load: flush leftover items from a previous session ───────────
  useEffect(() => {
    if (!userId) return;
    refreshCount().then(() => {
      if (navigator.onLine) flush();
    });
  }, [userId, flush, refreshCount]);

  const value: SyncContextValue = {
    pendingCount,
    syncStatus,
    isOnline,
    enqueue,
    enqueueMany,
    flush,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSyncEngine(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncEngine must be used inside <SyncProvider>');
  return ctx;
}
