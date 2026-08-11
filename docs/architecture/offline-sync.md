# Offline Sync Architecture

## Overview
ExpenseFlow is an offline-first application. The local device acts as the primary source of truth for all immediate reads and writes.

## Flow Pipeline
1. **User Action**: User creates an expense.
2. **IndexedDB**: The transaction is saved to the local database immediately.
3. **UI Update**: The UI reflects the change instantly (Optimistic Update).
4. **Outbox**: The mutation payload is pushed to an offline `outbox` table.
5. **Sync Queue**: A background worker attempts to flush the outbox to the API.
6. **Retry & Conflict Resolver**: If it fails, it retries with exponential backoff. If a conflict occurs, Last-Write-Wins (LWW) is applied.
7. **API**: Backend commits the change.
8. **Mark Synced**: The item is marked as `synced: true` locally, and removed from the outbox.
