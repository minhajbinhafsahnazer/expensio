# ADR 005: Monorepo Architecture
**Date**: 2026-07-17
**Status**: Accepted

## Context
We have multiple apps (web, api) that share logic and types.

## Decision
We will use a Turborepo Monorepo with pnpm workspaces.

## Consequences
- Prevents duplicated types and validation logic.
- Faster CI/CD pipelines via caching.
