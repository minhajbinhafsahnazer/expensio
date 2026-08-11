# ADR 004: Offline-First Architecture
**Date**: 2026-07-17
**Status**: Accepted

## Context
Users need to log expenses immediately, even with poor cell reception.

## Decision
ExpenseFlow will be offline-first using IndexedDB and Background Sync.

## Consequences
- Requires complex conflict resolution.
- UI never blocks on network requests.
