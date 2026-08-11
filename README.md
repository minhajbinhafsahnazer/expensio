# Expensio Monorepo

Welcome to the Expensio monorepo. This project is structured using `pnpm` workspaces and `Turborepo` to manage the frontend, backend, and shared code.

## 🏗️ Architecture

```text
GitHub
   │
   └── expensio monorepo
          │
          ├── apps/frontend (Vite + React)
          │       ↓
          │     Vercel
          │
          ├── apps/backend (Fastify + Node)
          │       ↓
          │     Render
          │
          └── packages/* (ui, shared, etc.)
                  ↓
             Shared Code
```

- **Frontend**: The user-facing application built with React and Vite. Independent deployment to Vercel.
- **Backend**: The API server built with Fastify. Independent deployment to Render.
- **Packages**: Shared code, UI components, types, and configurations reused across applications.

## 🚀 Local Setup

### Prerequisites
- Node.js (v20+)
- `pnpm` (v9+)
- Docker (for local database)

### Installation
1. Install dependencies from the root directory:
   ```bash
   pnpm install
   ```
2. Start the local database (if required by backend):
   ```bash
   docker-compose up -d
   ```
3. Set up environment variables:
   - Backend: Copy `apps/backend/.env.example` to `apps/backend/.env` and update values.
   - Frontend: Copy `apps/frontend/.env.example` to `apps/frontend/.env.local` and update values.

### Running Applications
To run both frontend and backend concurrently:
```bash
pnpm dev
```

Targeted execution:
- **Frontend Only**: `pnpm dev:frontend`
- **Backend Only**: `pnpm dev:backend`

### Building and Testing
- **Build Everything**: `pnpm build`
- **Typecheck**: `pnpm typecheck`
- **Test**: `pnpm test`
- **Lint**: `pnpm lint`

## 🌍 Deployment

### 1. Frontend (Vercel)
The frontend is designed to be deployed to Vercel with zero-configuration.
- **Framework Preset**: Vite
- **Root Directory**: `apps/frontend`
- **Build Command**: `pnpm turbo run build --filter expenseflow-frontend` (Vercel automatically detects Turbo)
- **Environment Variables**: Make sure to set `VITE_API_URL` to your production backend URL (e.g., `https://api.expensio.com/api/v1`).

### 2. Backend (Render)
The backend is configured via `render.yaml`.
- Connect your GitHub repository to Render and it will automatically detect the Blueprint (`render.yaml`).
- Make sure to populate all environment variables inside Render dashboard:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `COOKIE_SECRET`
  - `ALLOWED_ORIGIN` (Your Vercel URL)
