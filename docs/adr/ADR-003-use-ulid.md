# ADR 003: Use ULID for Primary Keys
**Date**: 2026-07-17
**Status**: Accepted

## Context
We need globally unique identifiers that scale well in databases.

## Decision
We will use ULID (Universally Unique Lexicographically Sortable Identifier).

## Consequences
- Sortable naturally by time.
- Better B-Tree indexing performance in PostgreSQL than UUIDv4.
- URL-safe and compact.
