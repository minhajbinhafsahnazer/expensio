# ADR 002: Use Drizzle ORM
**Date**: 2026-07-17
**Status**: Accepted

## Context
We need a type-safe database layer.

## Decision
We will use Drizzle ORM instead of Prisma.

## Consequences
- No Rust engine required.
- Closer to raw SQL.
- Edge-ready for Cloudflare.
