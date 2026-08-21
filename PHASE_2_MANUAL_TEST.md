# Phase 2 Manual Test Guide

This guide provides step-by-step instructions for developers to manually verify the automatic categorization and user-learning features introduced in Phase 1 and Phase 2.

## Prerequisites

1. Ensure the backend and frontend are running (`docker-compose up -d` and `npm run dev`).
2. Log into the application (or register a new user).
3. Open the main **ExpenseFlow** dashboard.

---

### Test A — Global Automatic Classification

**Goal**: Verify that built-in global rules automatically classify known terms correctly.

1. Create a new transaction with description: `shawarma` and amount `100`.
   - **Expected**: Instantly categorized as **Food**.
2. Create a new transaction with description: `train ticket` and amount `500`.
   - **Expected**: Instantly categorized as **Transport**.
3. Create a new transaction with description: `honda` and amount `200`.
   - **Expected**: Instantly categorized as **Vehicle**.
4. Create a new transaction with description: `shoe` and amount `1000`.
   - **Expected**: Instantly categorized as **Shopping**.
5. Create a new transaction with description: `house maintenance` and amount `3000`.
   - **Expected**: Instantly categorized as **Household**.

---

### Test B — Uncategorized Transaction

**Goal**: Verify that unknown terms fall back to Uncategorized and trigger the review prompt.

1. Create a transaction with description: `ivy` and amount `50`.
   - **Expected**: Appears as **Uncategorized** in the transaction list.
2. Navigate to the **Analytics** page.
   - **Expected**: You should see a banner stating **"✨ Teach Expensio 1 thing"** (or a similar prompt indicating transactions need review).

---

### Test C — User Mapping

**Goal**: Verify that a user can map an unknown term to a specific category, and that it retroactively and proactively applies.

1. Click on the **"Teach Expensio"** prompt on the Analytics page.
2. In the Review Modal, locate the `ivy` term.
3. Select **Travel** from the category dropdown for `ivy`.
4. Click **Save Mappings**.
5. **Verify**:
   - `ivy` disappears from the review modal.
   - The banner on the Analytics page disappears (or count decreases).
   - In your transaction list, historical `ivy` transactions now show as **Travel**.
6. **Proactive Test**: Create a new transaction with description `ivy` and amount `20`.
   - **Expected**: Instantly categorized as **Travel**.

---

### Test D — Ignore

**Goal**: Verify that a user can choose to ignore a term, which hides it from future reviews without applying a specific category.

1. Create a transaction with description: `randomword` and amount `99`.
2. Navigate to the Analytics page and click the review prompt.
3. For `randomword`, open the dropdown and select **Ignore (Don't ask again)**.
4. Click **Save Mappings**.
5. **Verify**:
   - `randomword` disappears from the review modal.
   - Refresh the page and confirm `randomword` does not reappear.
6. **Persistence Test**: Create another transaction with description `randomword` and amount `10`.
   - **Expected**: It is categorized as **Uncategorized**, but it does **not** trigger a new "Teach Expensio" prompt.

---

### Test E — User Mapping Overrides Global Rule

**Goal**: Verify that personal mappings take precedence over global defaults.

1. Create a transaction with description: `maintenance` and amount `500`.
   - **Expected**: It is categorized as **Household** (the global default).
2. For testing purposes, we need to map it manually using the backend API since it's not in the "needs-review" queue. 
   *(Alternatively, if you run the DB query to set it to Uncategorized, it will appear in the UI.)*
   - Using your REST client, make a `POST /api/v1/transactions/mappings/bulk` request with payload:
     ```json
     { "mappings": [{ "normalizedTerm": "maintenance", "category": "Vehicle" }] }
     ```
3. Create a **new** transaction with description: `maintenance` and amount `100`.
   - **Expected**: It is now categorized as **Vehicle**, overriding the global rule.

---

### Test F — User Isolation

**Goal**: Verify that mappings are strictly isolated per user.

1. Open an incognito window and register a **User B** (or use another test account).
2. Log in as **User B**.
3. Create a transaction with description: `ivy` and amount `50`.
   - **Expected**: It is categorized as **Uncategorized** (User B does not inherit User A's `Travel` mapping).
4. Verify the Analytics page shows the review prompt for `ivy` for User B.

---

### Test G — Normalization

**Goal**: Verify that variations in casing and spacing are treated as the same underlying term.

1. For **User A** (who mapped `ivy` to Travel), create transactions with the following descriptions:
   - `Ivy`
   - ` IVY`
   - `  ivy`
   - `train  ticket` (assuming global rule is `train ticket`)
2. **Expected**: All `ivy` variants resolve to **Travel**. The `train  ticket` variant resolves to **Transport**.

---

### Test H — Offline Sync

**Goal**: Verify that the classification engine works securely with the offline-first sync queue.

1. In the browser, disconnect your network (e.g., use Chrome DevTools Network tab -> "Offline").
2. Create a transaction with description: `ivy` and amount `75`.
   - **Expected**: The transaction appears in the UI instantly (queued in IndexedDB).
3. Restore the network connection ("No throttling").
4. **Expected**: 
   - The sync engine automatically flushes the queue to the backend.
   - The backend applies the user's existing `ivy` → **Travel** mapping during the sync.
   - The transaction in the UI refreshes to show the **Travel** category, while keeping its original description text exactly as entered.
