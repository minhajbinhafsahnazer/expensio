# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
# Installs all dependencies (including devDeps) and compiles TypeScript.
FROM node:20-slim AS builder

RUN npm install -g pnpm@9.1.0

WORKDIR /app

# Copy workspace manifests first — layer-cached until lockfile changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json   apps/backend/
COPY apps/frontend/package.json  apps/frontend/
COPY packages/ui/package.json    packages/ui/
COPY packages/eslint-config/package.json packages/eslint-config/ 2>/dev/null || true

# Install all deps (devDeps needed for tsc)
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Compile the backend TypeScript → dist/
RUN pnpm --filter expenseflow-backend run build

# ─── Stage 2: Production image ─────────────────────────────────────────────────
# Lean image — only the compiled output and production dependencies.
FROM node:20-slim AS production

RUN npm install -g pnpm@9.1.0

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json   apps/backend/
COPY apps/frontend/package.json  apps/frontend/
COPY packages/ui/package.json    packages/ui/
COPY packages/eslint-config/package.json packages/eslint-config/ 2>/dev/null || true

# Production-only install — no devDeps, no test tooling
RUN pnpm install --frozen-lockfile --prod

# Copy compiled backend from builder stage
COPY --from=builder /app/apps/backend/dist  apps/backend/dist

# Copy Drizzle migration files into dist/database/migrations so that
# the compiled dist/database/migrate.js finds them at the correct relative path.
COPY --from=builder /app/apps/backend/src/database/migrations \
                         apps/backend/dist/database/migrations

# Koyeb/Render inject PORT at runtime. Fall back to 4000 for local testing.
ENV PORT=4000
ENV NODE_ENV=production

EXPOSE $PORT

# Run migrations then start the server.
# Using sh -c so the shell expands $PORT correctly.
CMD ["sh", "-c", "node apps/backend/dist/database/migrate.js && node apps/backend/dist/server.js"]
