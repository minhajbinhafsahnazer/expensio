# Expensio Frontend Tech Stack

This document outlines the architecture and technology stack used in the Expensio frontend application (`apps/frontend`).

## Core Framework & Language
- **React 18**: The core UI library.
- **Vite**: The build tool and development server, replacing Webpack for significantly faster HMR and build times.
- **TypeScript**: Provides strict type safety across the entire application, ensuring robust and maintainable code.

## State Management & Data Fetching
- **React Query (`@tanstack/react-query`)**: Handles remote state management, caching, background refetching, and provides instant "optimistic updates" when mutations occur.
- **Dexie.js**: A robust wrapper around the browser's native IndexedDB. This powers the **Offline-First** engine, allowing the app to queue transactions locally when offline and sync them in the background via the `SyncEngine`.

## Styling & UI Components
- **Tailwind CSS**: Used for rapid, utility-first styling without leaving the component files.
- **Framer Motion**: Powers smooth micro-animations, expanding cards, progress bars, and page transitions.
- **Radix UI Primitives**: Used for accessible, unstyled UI components (like dropdowns, dialogs, and sheets) wrapped within the custom UI package.
- **Lucide React**: The clean, modern icon set used throughout the application.
- **`clsx` & `tailwind-merge`**: Used together in a utility function (`cn()`) to safely combine Tailwind classes and resolve style conflicts dynamically.

## Architecture & Monorepo Tooling
- **Turborepo & pnpm Workspaces**: The application is structured as a Monorepo. It is split into `apps/frontend`, `apps/backend`, and `packages/ui` (where reusable UI components live). This architecture enables code sharing across the stack seamlessly.
- **React Router v6**: Handles client-side navigation (Home, Analytics, Portfolio, Profile) efficiently without full page reloads.

## Form & Schema Validation
- **Zod**: Used for runtime schema validation, ensuring data integrity before sending payloads to the API.
