# ExpenseFlow Product Philosophy & UI Architecture

## 1. The Product Promise
ExpenseFlow promises that recording an expense will always be:
* **Fast**
* **Predictable**
* **Offline-capable**
* **Recoverable**
* **Interruptible**
* **Simple**

If a new feature compromises **any** of these six promises, it must be redesigned or postponed. We do not build an "expense tracker" or accounting software; we build an ultra-fast **capture tool** that feels closer to writing on paper than navigating a database.

---

## 2. Core Vision & The Guiding Question
We do not measure success by feature count or visual ornamentation. We measure success by cognitive ease, predictability, and capture speed.

Every design and engineering decision must justify itself against a single, uncompromising question:
> **"Does this reduce the time or effort needed to capture an expense?"**

If the answer is no, it does not belong in the core experience.

---

## 3. The "Notes App" Mental Model & UX Commandments
ExpenseFlow is **not a banking app or a fintech dashboard**. It is a **note-taking app for money**—sharing the design DNA of **Apple Notes, Google Keep, and Apple Reminders**.

### Key Design Mandates:
* **No Banking Clutter**: No fake credit cards, no "Send/Request/Add Fund" buttons, no decorative wallet widgets.
* **The "+" Button is the Hero**: The primary capture trigger dominates the interface.
* **Group by Day with Daily Totals**: Expenses are grouped cleanly under day headers (`Today ₹670`, `Yesterday ₹180`).
* **Whitespace over Borders**: Eliminate unnecessary boxes, cards, and borders. Let whitespace and typography create hierarchy.
* **Big Amounts, Minimal Metadata**: Amounts (`₹220`) are visually dominant. No long descriptions or paragraphs.

### The 10 UX Commandments:
1. **Never interrupt the user.** No blocking confirmation modals or intrusive prompts.
2. **Never make users wait for network requests.** Optimistic updates and local-first IndexedDB outbox queues are mandatory.
3. **Never require more than one screen for recording expenses.**
4. **Every repeated action should become faster over time.**
5. **Remember previous choices whenever appropriate** (e.g., last used currency, frequently selected Quick Choices, common amounts).
6. **Optimize for thumb use.** The hero `+` button floats comfortably at the bottom of the screen.
7. **Prioritize speed over decoration.** No glassmorphism, heavy blur rendering, or decorative clutter.
8. **Make common actions effortless; keep rare actions available but unobtrusive.**
9. **Build for interruption.** If the user types an amount and their phone rings or the app closes, reopening must restore their draft instantly—down to cursor position when practical.
10. **Make offline mode invisible.** Never display yellow warning banners like *"Offline"* or *"Syncing..."*. The app must "just work" silently.

---

## 4. Objective Success Metrics
To guarantee a lightning-fast utility, our engineering implementation is evaluated against these hard metrics:

| Metric | Target | Verification Method |
| :--- | :---: | :--- |
| **Time from launch to first editable input** | `< 1 second` | **The most critical UX metric.** Instant local boot to active keypad |
| **Time to open Capture Sheet** | `< 100 ms` | Zero network calls on mount, smooth CSS hardware acceleration |
| **Time to save an expense** | `< 3 seconds` | From tap to completion, including keyboard entry |
| **Interaction count** | **Minimum practical** | Optimize for cognitive obviousness over raw tap counting (5 obvious taps feel faster than 3 confusing ones) |
| **App startup (warm load)** | `< 500 ms` | Cached local state via Dexie / IndexedDB |
| **Offline entry capability** | `100% reliable` | Unconditional local persistence in airplane mode |
| **Initial JS bundle size** | `< 150 KB` (gzipped) | Tree-shaking Lucide icons, no bloated UI framework libraries |

---

## 5. Single Screen Architecture: The Home Screen
We reject the word "Dashboard" (which evokes charts, reports, admin panels, and complexity). We operate on a **Single Screen Architecture** centered around the **Home Screen** (or Expense Timeline).

Users do not think *"I am opening my dashboard"*; they think *"I am opening my expense app."*
The Home Screen combines everything needed at a glance:
* **Current Balance & Timeline Summary**
* **Recent Activity Feed**
* **Primary Interaction Button (PIB)**

### Screen Flow (No Splash Screen)
We eliminate decorative splash screens that delay time-to-value:
$$\text{Launch} \longrightarrow \text{Home Screen (Immediate Access)}$$
$$\text{Launch (If Logged Out)} \longrightarrow \text{Login} \longrightarrow \text{Home Screen}$$

### Unobtrusive Empty States
When a user has zero expenses, we do not dominate the screen with loud *"No Expenses Yet / Start Adding!"* illustrations. The timeline remains clean and calm, with the Primary Interaction Button immediately ready for action.

---

## 6. Core Product Components & Unique Capture Features

### 1. The Capture Sheet & Receipt Mode (Today's Receipt)
Instead of a single-use modal form, our bottom sheet acts like a familiar shopping cart—enabling **Receipt Mode** (or **Today's Receipt**). When returning from a supermarket or trip, users capture multiple expenses in rapid succession without closing the sheet:
```text
Today's Receipt
☕ Coffee      ₹220
🍔 Burger      ₹450
🚕 Taxi        ₹180
----------------
Total          ₹850

[ + Add Another ]   [ Done ]
```
* **Opens Instantly**: `<100ms` transition.
* **Auto-Focused**: Numeric keypad opens immediately without requiring an extra tap.
* **Ending the Session**: We do not use the label *"Save All"*. The local draft is already saved; tapping **Done** or **Add Expenses** simply concludes the capture session.

### 2. The Undo Pattern (No Confirmation Dialogs)
We reject blocking confirmation dialogs (*"Are you sure?"* or *"Expense Saved Successfully!"* modals). Instead, we use Apple's non-blocking **Undo Pattern**:
* When an expense session finishes or an item is deleted, a lightweight toast appears at the bottom for 5 seconds:
  ```text
  Expense saved.  [ Undo ]
  ```

### 3. Predictive Frequency Matching & Smart Defaults
The app actively predicts user intent without heavy AI:
* **Frequency Matching**: If the user types `220` and their most frequent `220` expense is `☕ Coffee`, the app immediately highlights `☕ Coffee` as the top suggestion.
* **Smart Defaults**: New entries inherit the last used currency, last selected Quick Choice, and frequent amount patterns so the user feels: *"The app already knows what I want."*

### 4. CurrencyField (The 80% Input)
Users spend 80% of their time interacting with this input; it receives our highest engineering rigor:
* **Numeric Keypad Always Opens**: Standard text keyboards are strictly forbidden here.
* **Auto-Focused Cursor**: Pre-selected instantly on sheet open.
* **Fixed Currency Symbol**: Positioned cleanly without typography shift.
* **Live Thousand Separators**: Formats automatically while typing (e.g., `1,800`).
* **Zero-Friction Paste**: Gracefully strips and handles pasted currency strings or commas.
* **Sticky Focus & Interruption Proof**: Never loses focus during Quick Choice selection, and preserves uncommitted text across unexpected app backgrounding.

### 5. Quick Choices (Not "Categories")
We rename categories internally and conceptually to **Quick Choices**. Users do not think *"I need to select a category"*; they think *"This was coffee."*
```text
[ 🍔 Food ]  [ ☕ Coffee ]  [ 🚕 Travel ]  [ 🛒 Shopping ]  [ ⚡ Utilities ]
```
* **One Tap & Done**: Tapping a Quick Choice pill associates the item immediately without dropdown menus.

### 6. TransactionCard (Simplified Timeline Row)
We strip out tags, accounts, descriptions, and metadata clutter from timeline rows. We keep it radically clean:
```text
☕ Coffee                           ₹220
2:15 PM
```
* Secondary details expand only when the row is explicitly tapped.

### 7. Minimalist Profile & Settings
We reject sprawling settings pages. Settings are condensed into a single, lightweight profile view:
* **Profile / Account**
* **Default Currency**
* **Theme (Light / Dark / System)**
* **Export Data (CSV / JSON)**
* **Sign Out**

---

## 7. Design System Tokens & Guidelines

### Touch Target Minimums
* Every clickable element (Quick Choices, buttons, timeline rows, tabs) MUST have a minimum interactive hit target of **44px × 44px** (with **48px × 48px** preferred for primary actions).

### Spacing Scale (4px Baseline Grid)
| Token | Size | Typical Usage |
| :--- | :---: | :--- |
| `space-1` | 4px | Micro-gaps between Quick Choice icons and labels |
| `space-2` | 8px | Compact gaps, tag padding |
| `space-3` | 12px | Internal card spacing, input padding |
| `space-4` | 16px | Standard screen margins, timeline gaps |
| `space-6` | 24px | Section separations |
| `space-8` | 32px | Major layout breathing room |
| `space-12`| 48px | Bottom navigation clearance |

### Border Radius
* **Standard (`radius-md` / `12px`)**: Applied to Cards, CurrencyFields, Buttons, and Quick Choice pills.
* **Large (`radius-lg` / `16px`)**: Applied to the Capture Sheet and Modals.
* **Pill (`radius-full` / `9999px`)**: Applied to badges, avatars, and the Primary Interaction Button.

### Typography Hierarchy (System Fonts)
Using native system fonts (`-apple-system`, `Inter`, `Roboto`) for zero-latency font loading.
* **Heading 1 (`24px`/Bold)**: Primary Home Screen balance.
* **Heading 2 (`20px`/SemiBold)**: Section titles, Today's Receipt total.
* **Heading 3 (`16px`/SemiBold)**: Card titles, sheet headers.
* **Text (`15px`/Regular or Medium)**: Timeline item names, body copy.
* **Caption (`13px`/Regular)**: Timestamps, hints, secondary metadata.
* **Label (`13px`/Medium)**: Quick Choice text, form labels.

### Color & Elevation Strategy
* **Light Mode Only**: The interface is built exclusively for a crisp, high-clarity light aesthetic (`#f8f8fa` soft background, `#ffffff` cards, `#0f172a` text). No dark mode toggles or unnecessary complexity.
* **Flat Default**: UI elements sit flat with a crisp 1px border (`border-slate-200/60`).
* **Primary Accent**: Slate 950 (`#020617`) for primary controls & navigation, with Emerald (`#10b981`) indicating positive financial actions.
* **Elevated Exceptions (`shadow-xl`)**: Reserved for floating bottom navigation, cards, and bottom capture sheets.

---

## 8. Component-to-Screen Parallel Roadmap
We build components in `packages/ui` strictly on-demand in this revised, product-first sequence:

### Stage 1: The Core Capture Loop (Priority 1)
1. **`CaptureSheet`** (Bottom sheet container with swipe-to-dismiss, instant <100ms mount, & Receipt Mode support).
2. **`CurrencyField`** (Auto-formatting numeric input with auto-focus and interruption-proof persistence).
3. **`QuickChoiceChip`** (Large, tactile one-tap selection pills).
4. **`ReceiptSessionList`** (Today's Receipt multi-item summary view with `+ Add Another`).
5. **`PrimaryInteractionButton`** (PIB — the core launch trigger on the Home Screen).

### Stage 2: Home Screen & Timeline Display (Priority 2)
6. **`TransactionCard`** (Minimalist timeline row display: Icon + Title + Amount + Time).
7. **`BalanceDisplay`** (Large Heading 1 typography with monthly indicator).
8. **`EmptyState` & `Skeleton`** (Unobtrusive loading and clean zero-item timeline views).
9. **`Toast`** (Lightweight non-blocking toast implementing the `[ Undo ]` pattern).

### Stage 3: Secondary Views & Support (Priority 3)
10. **`TopBar`**, **`StandardButton`**, **`IconButton`**, **`TextField`**, and **`Select`** (For minimal profile & login flows).
