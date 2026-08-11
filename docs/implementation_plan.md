# Implementation Plan: Advanced Engineering Foundations (Phase 1.2)

Your assessment is spot-on. Solidifying these foundational patterns—code quality barriers, OpenAPI generation, event-driven decoupling, and centralized types—will exponentially speed up feature development later and prevent massive technical debt.

We will immediately implement Phase 1.2 as requested.

---

## User Review Required

> [!IMPORTANT]
> **API Client Generation Tooling**
> To fulfill the OpenAPI -> Frontend TypeScript Client generation, I propose utilizing `@hey-api/openapi-ts` or `orval` inside our Turborepo pipeline. We will add a script in `apps/web/package.json` that fetches the Fastify OpenAPI JSON output and generates standard React Query hooks. 
> 
> *Are you comfortable with `orval` for React Query generation, or do you have another generator preference?*

> [!WARNING]
> **Git Hooks Initialization**
> Husky requires a `git` repository to be initialized to register its pre-commit hooks. If `git init` hasn't been run locally in this folder, the Husky installation steps during execution will automatically execute it.

---

## Proposed Changes

### 1. Code Quality & Git Enforcement (Root)
*   **Husky & lint-staged**: Configure `husky` to intercept Git commits. `lint-staged` will automatically run type checking (`tsc --noEmit`), ESLint, and Prettier on modified files only.
*   **Commitlint**: Install `@commitlint/cli` and `@commitlint/config-conventional`. Add a `commit-msg` Husky hook that forcibly rejects commits that don't adhere to the `type(scope): subject` format.

### 2. Documentation Architecture (`docs/`)
*   **Architectural Decision Records (ADRs)**: Author the baseline records in `docs/adr/`:
    *   `ADR-001-use-fastify.md`
    *   `ADR-002-use-drizzle.md`
    *   `ADR-003-use-ulid.md`
    *   `ADR-004-offline-first.md`
    *   `ADR-005-monorepo.md`
*   **Background Sync Architecture**: Write a comprehensive engineering document at `docs/architecture/offline-sync.md` detailing the exact flow (IndexedDB -> Outbox -> Sync Queue -> Conflict Resolver -> Mark Synced).

### 3. Shared Library Patterns (`packages/shared/`)
*   **Central Error Codes**: Create `packages/shared/src/errors/error-codes.ts` declaring constant dictionary maps of all application errors (`INVALID_TOKEN`, `BUDGET_EXCEEDED`, etc.) so the frontend and API can reference strict Enums rather than magic strings.

### 4. Backend Enhancements (`apps/api/`)
*   **OpenAPI Support**: Install `@fastify/swagger` and `@fastify/swagger-ui`. Configure Fastify to automatically serve a Swagger playground at `/api/docs` mapping all Zod schemas into an OpenAPI 3.0 specification.
*   **In-Process Domain Events**: Scaffold `apps/api/src/common/events/event-bus.ts` wrapping Node's `EventEmitter`. This establishes the Pub/Sub architecture immediately without requiring Kafka setup, allowing us to decouple services immediately (e.g. `eventBus.emit('transaction.created', payload)`).
*   **Deep Observability Mocking**: Inject placeholders for `deviceId`, `ip`, `platform`, and `memory` into the Pino logging hooks to ensure logs are fully enriched from Day 1.

### 5. Dependency Rules (`packages/eslint-config/`)
*   **Strict Import Boundaries**: Author a custom ESLint configuration using `eslint-plugin-import` that enforces directional architecture flows, failing CI pipelines if an API Repository imports an API Service, or if a Frontend Layout imports an internal Feature component unlawfully.

---

## Verification Plan (Phase 1.2)

### Automated Verification
*   **Commit Hook Test**: Execute a malformed commit (`git commit -m "update things"`) to verify Commitlint forcibly rejects the commit.
*   **OpenAPI Build Check**: Boot Fastify and request `http://localhost:4000/api/docs/json` to verify the Swagger JSON builds correctly.

---

# Roadmap & Product Philosophy: Frictionless Capture (Phase 1.3+)

Following the completion of foundational infrastructure in Phase 1.2, ExpenseFlow adopts an **80% product feature / 20% infrastructure** balance. Tooling complexity is capped to focus exclusively on delivering core user value.

## 1. Core Product Promise & Vision
* **The Product Promise**: Recording an expense will always be **Fast, Predictable, Offline-capable, Recoverable, Interruptible, and Simple**.
* **The Guiding Question**: *"Does this reduce the time or effort needed to capture an expense?"* If no, it does not belong in the core experience.
* **Single Screen Architecture (Home Screen)**: We reject the word "Dashboard". The app centers around the **Home Screen** (or Expense Timeline). It combines Balance, Recent Activity Feed, and the Primary Interaction Button (PIB).
* **No Splash Screen**: Immediate entry to time-to-value:
  $$\text{Launch} \longrightarrow \text{Home Screen (Immediate Access)}$$
  $$\text{Launch (If Logged Out)} \longrightarrow \text{Login} \longrightarrow \text{Home Screen}$$
* **Today's Receipt (Receipt Mode)**: Captures multiple items like a shopping cart (`☕ Coffee ₹220` + `🍔 Burger ₹450` -> `Done`) without repeatedly reopening modals.
* **Quick Choices**: We reject "Categories". Large, tactile one-tap pills (`🍔 Food`, `☕ Coffee`, `🚕 Travel`) associate items immediately.
* **The Undo Pattern**: No blocking confirmation dialogs. We use Apple's non-blocking 5-second toast: `Expense saved. [Undo]`.
* **Predictive Matching & Smart Defaults**: The app suggests items based on frequency (e.g. typing `220` suggests `☕ Coffee`) and remembers previous currency/choice selections.
* **Interruption Proof**: Uncommitted drafts persist across phone calls or unexpected app backgrounding—down to cursor position when practical.
* **Invisible Offline Mode**: No warning banners ("Offline" or "Syncing..."). It works silently in the background.

## 2. Component Implementation Order (`packages/ui` & `apps/web`)
We build components in strict alignment with what the capture loop requires:
1. **The Core Capture Loop (Priority 1)**:
   * `CaptureSheet` (Bottom sheet container with swipe-to-dismiss, Receipt Mode support, & instant <100ms mount)
   * `CurrencyField` (Auto-formatting numeric input with auto-focus, live thousand separators, & interruption-proof persistence)
   * `QuickChoiceChip` (Large, tactile one-tap selection pills)
   * `ReceiptSessionList` (Today's Receipt multi-item summary view with `+ Add Another`)
   * `PrimaryInteractionButton` (PIB — the core launch trigger on the Home Screen)
2. **Home Screen & Timeline Display (Priority 2)**:
   * `TransactionCard` (Minimalist timeline row display: Icon + Title + Amount + Time)
   * `BalanceDisplay` (Large Heading 1 typography with monthly indicator)
   * `EmptyState` & `Skeleton` (Unobtrusive loading and clean zero-item timeline views)
   * `Toast` (Lightweight non-blocking toast implementing the `[ Undo ]` pattern)
3. **Secondary Views & Support (Priority 3)**:
   * `TopBar`, `StandardButton`, `IconButton`, `TextField`, and `Select` (For minimal profile & login flows)
   * *(Note: `SearchField` is omitted from initial scope).*

## 3. Product Feature Execution Roadmap
* **Phase 1.3**: The Expense Capture Loop (`CaptureSheet`, `CurrencyField`, `QuickChoiceChip`, `PIB`) & `/dev/ui` Showcase
* **Phase 1.4**: Single Screen Home Timeline (`BalanceDisplay`, `TransactionCard`, `EmptyState`, `[Undo]` Toast)
* **Phase 1.5**: Invisible Offline-First Sync & Outbox Queue (IndexedDB instant commit & background sync)
* **Phase 1.6**: Lightweight Authentication & Session Management (Login -> Home Screen transition)
* **Phase 1.7**: Minimalist Profile Settings & Data Export (Profile, Currency, Theme, CSV Export)
