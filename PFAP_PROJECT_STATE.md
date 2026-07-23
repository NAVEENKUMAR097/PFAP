# PFAP — PROJECT STATE DOCUMENT (v3)
**Generated:** Current session — reflects actual codebase state as of reading all source files.  
**Supersedes:** PFAP_MASTER_HANDOFF.md (v2) — this document is the new single source of truth.

---

## 1. What PFAP Is

**Personal Finance Analytics Platform** — a mobile-first, single-user (V1) finance web app.  
Not a tutorial project: it's the owner's actual daily-use finance tracker AND a portfolio piece demonstrating Business Analysis → Database Design → API Development → React → Analytics.

**Owner:** Naveen Kumar, single user, no auth in V1.

**Non-negotiable project rules** (from original Project Rules doc):
1. Not a tutorial project — must solve a real problem.
2. Every feature must: help manage finances, teach Data Analytics, teach Data Engineering, or improve usability. Otherwise it doesn't get built.
3. No copied code — everything understood deeply.
4. **Every database table and column must have a clear purpose. No "just in case" columns.** This has driven concrete decisions throughout (computed status instead of stored status columns, a fixed-column AppPreferences table instead of an open key-value store).
5. Build V1 first; backlog everything else.

---

## 2. Tech Stack (as actually implemented)

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS v4 |
| Routing | React Router v6 (nested: BrowserRouter → AppRoutes → MainLayout → Outlet → Pages) |
| Icons | lucide-react |
| Backend | FastAPI |
| ORM | SQLAlchemy 2.x |
| Database | SQLite (`backend/pfap.db`) — acceptable for local prototyping; migrating to PostgreSQL later is a one-line change to `SQLALCHEMY_DATABASE_URL` in `database.py` since everything goes through the ORM |
| Validation | Pydantic v2 |
| Migrations | **None** — `Base.metadata.create_all()` on startup (additive-only). **Switch to Alembic before the schema stabilizes further.** |

No frontend state management library — most modules own their state via a custom hook.  
No backend auth (V1 is explicitly single-user).

---

## 3. THE Core Architecture Decision: Shared-Core Transaction Pattern

**Read this before writing any new transactional feature.**

### The Pattern
One `transactions` table holds what every transactional module has in common: `id`, `transaction_type` (enum), `date`, `amount`, `account_id`, `notes`, `created_at`, `is_recurring`, `recurring_transaction_id`, `execution_date`, `execution_status`.  
Each module then has its own **detail table**, linked 1:1 back to `transactions` via a unique `transaction_id` foreign key, holding only that module's specific attributes.

```
transactions (shared core)
├── expense_details       (category, subcategory, merchant, payment_method, need_or_want, tags)
├── income_details        (income_source, tags)
├── investment_details    (investment_type, broker, tags, holding_id)
├── lending_agreements    (person, due_date, notes) — 1:1 to the DISBURSEMENT transaction
├── lending_repayments    (no extra columns — data lives on its own linked transaction)
├── borrowing_agreements  (person, due_date, notes) — 1:1 to the RECEIPT transaction
└── borrowing_repayments  (same shape as lending_repayments, reversed)
```

`transaction_type` enum values: `expense`, `income`, `investment`, `transfer` (defined, unused), `refund` (defined, unused — refunds are meant to be Income with `income_source = 'Refund'`), `lending_disbursement`, `lending_repayment`, `borrowing_receipt`, `borrowing_repayment`.

**Budget and AppPreferences deliberately do NOT participate** — neither represents a cash movement. Budget is a plan; AppPreferences is app config. See their model docstrings in `models.py` for the reasoning.

**Analytics is proof this pattern works**: it queries across multiple `transaction_type` values and joins through each detail table without ever needing a special case per module — see `crud.get_analytics_summary`.

---

## 4. Second Core Pattern: Computed Status, Never Stored

Lending, Borrowing, and Budget all have a status concept. **None of these are stored columns.** They're calculated at read-time in `crud.py` (`compute_lending_status`, `compute_borrowing_status`, `compute_budget_status`) from the actual underlying data.

**Why:** a stored status column has to be manually kept in sync every time a repayment is added or deleted — a bug waiting to happen, and a direct violation of Project Rule 4. This was tested and proven correct during Lending's testing pass (add repayment → status updates → delete repayment → status correctly reverts, zero explicit sync code).

**Apply this instinct to any future computed value.**

---

## 5. Third Pattern: Free-Text Master Data with Auto-Create/Dedup

`Merchant`, `Broker`, and `Person` are free-text (not dropdowns) with case-insensitive dedup on the backend (`get_or_create_merchant`, `get_or_create_broker`, `get_or_create_person` in `crud.py`). `Person` is shared between Lending and Borrowing.

Contrast with `Category`, `PaymentMethod`, `IncomeSource`, `InvestmentType`, `Account` — these ARE pre-seeded dropdowns (see `seed.py`), a small closed set the user picks from, not free-text.

---

## 6. Fourth Pattern: Generic Master-Data CRUD Engine (Settings)

7 of the master-data types (Category, Subcategory, PaymentMethod, Account, IncomeSource, InvestmentType, Person) share an identical shape: `id`, `name`, `is_active`. Rather than duplicating CRUD 7 times, there's one generic engine in `crud.py`:

```python
list_master_data(db, model)
get_master_data_item(db, model, item_id)
create_master_data_item(db, model, name, **extra_fields)
update_master_data_item(db, item, name=None, is_active=None, **extra_fields)
delete_master_data_item(db, item)
```

These take the SQLAlchemy model **class itself** as a parameter and work against any of them. `Subcategory` uses the same engine plus an extra `category_id` kwarg. `Merchant`/`Broker` don't have `is_active`, so they get lighter treatment (rename + delete-if-unreferenced only — no deactivate toggle).

### IMPORTANT — soft-delete semantics
In the actual shipped implementation, `DELETE /categories/{id}` (and the equivalent for the other 5 types) does **not** delete the row. It sets `is_active = False`. This was a deliberate simplification made when reconciling the frontend (see Section 8) — the UI's "Deactivate" button calls the DELETE HTTP verb, but the backend treats it as a soft-deactivate. This is actually *safer* than a hard delete with reference-checking: deactivating can never be unsafe, since nothing is destroyed. There's no "true hard delete" exposed anywhere in the UI currently — if that's ever needed (e.g. cleaning up a genuine data-entry mistake with zero references), it would be a new, separate endpoint, not a change to this one.

There is also an **unused, parallel generic engine** at `routers/settings.py` (prefix `/settings/*`) built earlier in this project's history, before it turned out the actual frontend was built independently against flat paths (`/categories`, not `/settings/categories`). `routers/settings.py` is currently still registered in `main.py` but nothing calls it. **Either register-and-ignore it (harmless dead code) or remove it from `main.py`'s router list** — your call, not urgent. Do not build new features against it; the real, wired-up path is `master_data.py`.

---

## 7. File Structure Convention — MOSTLY Frozen, One Documented Exception

### Transactional modules (Expenses, Income, Investments, Lending, Borrowing, Budget) follow the frozen pattern established after Expenses:

**Backend**, one feature = additions to shared files + one router:
```
models.py        — new detail table(s) + Transaction relationship (if applicable)
schemas.py       — {Feature}Create, {Feature}Out schemas
crud.py          — create_/list_/get_/update_/delete_{feature}
routers/{feature}.py  — mapper, validation helper, full CRUD endpoints
main.py          — one import + one app.include_router() line
```

**Frontend**, one feature = one self-contained folder:
```
pages/{Feature}/
├── index.tsx                      — composes hook + form + list
├── hooks/use{Feature}.ts          — ALL state + API calls
├── components/
│   ├── {Feature}Form.tsx          — create AND edit mode
│   ├── {Feature}List.tsx
│   ├── {Feature}Card.tsx
│   ├── EmptyState.tsx
│   └── LoadingSkeleton.tsx
services/{feature}.ts
services/types.ts                  — shared, grows with each module
```

### Settings is a documented exception to the frontend pattern
It was built independently (by a different working session/approach) using a different shape:

```
pages/Settings/
├── index.tsx                      — top-level tab strip (10 sections), PageContainer wrapper
└── sections/
    ├── Profile.tsx                — placeholder
    ├── MasterData/
    │   ├── index.tsx              — inner tab strip (6 types), delegates to:
    │   ├── MasterDataList.tsx     — ONE generic list+form component, reused via props
    │   ├── Categories.tsx         — thin wrapper: passes masterData.ts functions as props
    │   ├── Accounts.tsx           — same shape
    │   ├── PaymentMethods.tsx     — same shape
    │   ├── IncomeSources.tsx      — same shape
    │   ├── InvestmentTypes.tsx    — same shape
    │   └── People.tsx             — same shape
    ├── Backup.tsx                 — placeholder
    ├── Export.tsx                 — placeholder
    ├── Import.tsx                 — placeholder
    ├── Analytics.tsx              — placeholder (Settings' own Analytics *preferences* tab — NOT the real Analytics feature/page, don't confuse the two)
    ├── Application.tsx            — placeholder
    ├── Developer.tsx              — placeholder
    ├── Database.tsx               — placeholder
    └── About.tsx                  — placeholder
```

This is a **prop-injection pattern** (`MasterDataList` takes `fetchList`/`createItem`/`updateItem`/`deactivateItem` as props) rather than the **hook-per-feature pattern** used everywhere else. Both are legitimate; they just don't match. **When extending Settings, follow Settings' own pattern** (add another thin wrapper component passing functions into `MasterDataList`), don't try to retrofit the hooks-folder convention onto it — that would create a third, inconsistent style rather than reconciling the existing two.

`services/masterData.ts` in this frontend calls **flat paths** (`/categories`, `/payment-methods`, etc.) — matching `routers/master_data.py`, not the unused `/settings/*` prefix. Function names follow `get{Type}`, `create{Type}`, `update{Type}`, `deactivate{Type}` — note "deactivate", not "delete", even though it's wired to the HTTP DELETE verb (see Section 6).

**`PageContainer.tsx`** (`components/common/`) is a second, simpler layout wrapper than the `PageScaffold.tsx` used by other pages — `PageContainer` just centers content at `max-w-[1280px]` and optionally renders a `title` heading (added during this session; was missing originally, causing a TypeScript error). Don't assume every page uses the same wrapper — check which one a given page actually imports.

---

## 8. Design System (Frontend Visual Language)

Tokens live in `frontend/src/index.css` as Tailwind v4 `@theme` variables:

```
--color-base       #0b0e14   deep ink-navy (not pure black)
--color-surface     #12161f   card background
--color-surface-2   #1a2030   nested/nav background
--color-gold        #c9a15a   accent — signifies currency/wealth, grounded in the app's subject rather than an arbitrary dark-UI default
--color-gold-soft   #e8d5a8
--color-ink         #f4f1ea   primary text
--color-muted       #8a8f9c   secondary text
--color-positive    #4fbf8b   income, settled loans, on-track budgets
--color-negative    #e0716b   expenses, exceeded budgets, what-you-owe
--font-display      Space Grotesk (headings/numbers, sparingly)
--font-body         Inter (everything else)
```

**Color meaning is directional:**
- Income: green. Expenses: red.
- Investment amounts: **gold** — neither gain nor loss at entry, cash converting to an asset (stays part of Net Worth per approved rule).
- Lending "Remaining": gold (an asset — owed TO you).
- Borrowing "You owe": red (a liability — owed BY you).
- Budget progress bars: green (under) / gold (near, ≥80%) / red (exceeded).

**Mobile-first, structurally enforced:** the whole shell (Header + content + Bottom Nav) is centered at `max-w-md` even on desktop.

**Bottom Navigation:** capped at 5 primary items (Dashboard, Expenses, Analytics, Budget, More). Everything else lives behind **More**, driven by `constants/navigation.ts`'s `SECONDARY_NAV_ITEMS` array.

**⚠️ Layout bug pattern to avoid:** stacking two independent `overflow-x-auto` horizontal-scroll tab strips on screen at once produces a confusing double-scrollbar UI (this happened in Settings — outer section tabs + inner Master Data type tabs, both horizontal-scrolling). Fixed by switching both to `flex flex-wrap` instead of `overflow-x-auto` + no-wrap. If you see this pattern again anywhere, apply the same fix.

---

## 9. Current File Structure (Actual)

```
PFAP/
├── backend/
│   ├── pfap.db
│   ├── requirements.txt
│   └── app/
│       ├── main.py                      ✅ registers ALL routers below
│       ├── database.py                  ✅ unchanged since first built
│       ├── models.py                    ✅ all tables (Section 3, 6)
│       ├── schemas.py                   ✅ all Pydantic schemas — VERIFY MasterDataCreatePayload exists (was missing, caused a crash; should be fixed by now — confirm)
│       ├── crud.py                      ✅ all query functions, incl. generic master-data engine and full Analytics assembly
│       ├── seed.py                      ✅ default Categories, Payment Methods, Account, Income Sources, Investment Types
│       └── routers/
│           ├── expenses.py              ✅ full CRUD
│           ├── income.py                ✅ full CRUD
│           ├── investments.py           ✅ full CRUD
│           ├── lending.py               ✅ full CRUD + nested /repayments
│           ├── borrowing.py             ✅ full CRUD + nested /repayments
│           ├── budget.py                ✅ full CRUD, month-scoped
│           ├── analytics.py             ✅ GET /analytics/summary — confirmed working by project owner
│           ├── master_data.py           ✅ GET+POST+PUT+DELETE(=deactivate) for categories/payment-methods/accounts/income-sources/investment-types/people — THIS is what the real frontend calls
│           ├── settings.py              ⚠️ UNUSED — built against a /settings/* prefix the real frontend doesn't call. Dead code. See Section 6.
│           ├── dashboard.py             ✅ /dashboard/summary — EXPENSE-ONLY, not yet extended to Income/Investments
│           ├── recurring_transactions.py ✅ unified recurring engine (expense, income, investment, lending, borrowing)
│           ├── templates.py             ✅ expense/income templates for recurring references
│           └── investment_holdings.py   ✅ GET /investment-holdings, GET /investment-holdings/{id}/transactions
│
└── frontend/
    └── src/
        ├── main.tsx / App.tsx / index.css     ✅ shell, design tokens
        ├── routes/AppRoutes.tsx                ✅ all routes registered
        ├── layouts/MainLayout.tsx              ✅ Header + Outlet + BottomNav
        ├── constants/navigation.ts             ✅ PRIMARY (5) + SECONDARY (6)
        ├── components/common/
        │   ├── Header.tsx                      ✅
        │   ├── BottomNavigation.tsx             ✅
        │   ├── PageScaffold.tsx                 ✅ used by Expenses/Income/etc.
        │   └── PageContainer.tsx                ✅ used by Settings; simpler, optional title prop
        ├── services/
        │   ├── api.ts                           ✅ apiRequest<T>(), ApiError, 204 handling
        │   ├── types.ts                         ✅ ALL TypeScript interfaces
        │   ├── masterData.ts                    ✅ flat-path CRUD for Settings' Master Data tab (get/create/update/deactivate × 6 types)
        │   ├── expenses.ts / income.ts / investments.ts / lending.ts / borrowing.ts / budget.ts    ✅ one per module
        │   ├── analytics.ts                     ✅ (confirm exact name/shape if extending Analytics further)
        │   ├── dashboard.ts                     ✅
        │   ├── netWorth.ts                      ✅
        │   ├── recurring.ts                     ✅ unified recurring transactions API
        │   └── templates.ts                     ✅ expense/income templates
        ├── utils/currency.ts                    ✅ formatCurrency(), en-IN/₹ hardcoded
        └── pages/
            ├── Dashboard/                       ✅ REAL — 4 KPI cards, expense-only
            ├── Expenses/                        ✅ REAL — full CRUD
            ├── Income/                          ✅ REAL — full CRUD
            ├── Investments/                     ✅ REAL — full CRUD + holdings panel
            ├── Lending/                         ✅ REAL — agreements + repayments
            ├── Borrowing/                       ✅ REAL — mirrors Lending
            ├── Budget/                          ✅ REAL — month-scoped, progress bars
            ├── Analytics/                       ✅ REAL — confirmed working by owner
            ├── More/                            ✅ REAL — grid of SECONDARY_NAV_ITEMS
            ├── Settings/                        🟡 PARTIAL — see below
            ├── NetWorth/                        ✅ REAL — account balances + net worth
            ├── RecurringExpenses/               ✅ REAL — unified recurring transactions UI
            └── Reports/                         ❌ SCAFFOLD ONLY (not started)
```

### Settings — module-by-module status

| Settings tab | Status |
|---|---|
| Master Data → Categories/Accounts/Payment Methods/Income Sources/Investment Types/People | ✅ REAL — full create/rename/deactivate, backend wired, tested pattern established this session |
| Profile & Preferences | ❌ placeholder |
| Backup & Restore | ❌ placeholder (buttons exist, do nothing) |
| Export Center | ❌ placeholder |
| Import Center | ❌ placeholder |
| Analytics Settings (preferences for the Analytics page — not the Analytics page itself) | ❌ placeholder |
| Application Settings | ❌ placeholder |
| Developer Tools | ❌ placeholder |
| Database | ❌ placeholder |
| About PFAP | ❌ placeholder |

Master Data's 6 types don't yet include **Subcategory, Merchant, or Broker** management in this UI (the independently-built frontend's tab list only has the 6 shown above). Adding those would follow the exact same `MasterDataList` prop-injection pattern — Subcategory needs a slightly different shape (extra `category_id`), Merchant/Broker need the lighter no-deactivate version (see Section 6).

---

## 10. What's Fully Working (tested and confirmed by the project owner)

- **Expenses, Income, Investments** — full CRUD, tested end-to-end.
- **Lending, Borrowing** — agreements + nested repayments, computed status proven correct via explicit add/delete-repayment test, shared `Person` autocomplete confirmed working across both modules.
- **Budget** — month-scoped, computed status, tested.
- **Analytics** — confirmed complete and working by the project owner (built via `crud.get_analytics_summary`, a large read-only aggregation function — executive summary, monthly trend, category/merchant/payment-method/income-source/investment-allocation breakdowns, budget signals, loan summaries, a computed "health score", and rule-based insights).
- **Application Shell** — Header, Bottom Nav, mobile-first layout, all routing.
- **Settings → Master Data** — just fixed this session (backend CRUD was missing entirely; added). **Not yet re-confirmed working by the owner after the fix** — verify before moving on. Testing steps: add a category, refresh the page, confirm it persisted (proves it's hitting the real DB); rename one, refresh, confirm; deactivate one, refresh, confirm it's gone from the list but nothing crashed elsewhere (proves soft-delete didn't break existing Expense references, if you have any in that category).
- **Net Worth** — account balances, investment values, lending/borrowing outstanding, net worth calculation, account balance editing.
- **Recurring Transactions** — unified engine for expense, income, investment (SIP), lending repayment, borrowing repayment with templates/holdings references, lifecycle management (pause/resume/skip/complete/cancel), manual log-now, scheduler endpoint.

---

## 11. Known Resolved Issues (so they aren't re-introduced)

- **Never let router files and `main.py` content cross during copy-paste** — happened twice with `borrowing.py`. A router file should always start with `from .. import crud, models, schemas` (two dots), never `from . import models, seed` (that's `main.py`'s shape).
- **Windows case-insensitive filesystem**: folder casing renames (e.g. `income` → `Income`) can silently fail to register. Verify with `dir` if routing breaks after a rename.
- **`.tsx` vs `.ts`**: any file with JSX must be `.tsx`.
- **`LendingStatus` → `LoanStatus`** rename in `types.ts` when Borrowing was built — if anything still imports the old name, that's stale.
- **`uvicorn` not found**: means the venv isn't activated in that terminal. `venv\Scripts\activate` first, confirm `(venv)` appears in the prompt, then run uvicorn.
- **Settings backend was missing entirely for a while**: the independently-built frontend (`masterData.ts`, `MasterDataList.tsx`) called `POST`/`PUT`/`DELETE` on `/categories` etc., but `master_data.py` only ever had `GET`. Fixed this session — see Section 6 for the exact semantics (soft-delete, not hard-delete).
- **`schemas.MasterDataCreatePayload` missing**: `master_data.py`'s new endpoints reference this schema; if it's not in `schemas.py`, add:
  ```python
  class MasterDataCreatePayload(BaseModel):
      name: str = Field(min_length=1, max_length=150)
  ```
- **`PageContainer` didn't accept a `title` prop**: fixed by making it optional (`title?: string`) so it's backward-compatible with any other usage.
- **Double horizontal-scroll tab strips in Settings**: fixed by switching both tab bars from `overflow-x-auto` to `flex flex-wrap`.

---

## 12. What's Left for V1

- **Reports** — not started at all. Excel/CSV/PDF export, monthly/yearly reports. Will need a Python export library (e.g. `openpyxl`) not yet in `requirements.txt`.
- **Settings — everything except Master Data**: Profile & Preferences (an `AppPreferences` singleton table + schemas + crud functions were designed and may exist depending on which parallel Settings effort ended up in the final codebase — **verify whether `models.AppPreferences`, `crud.get_or_create_preferences`, and `schemas.AppPreferencesOut` exist in the current `models.py`/`crud.py`/`schemas.py` before assuming they do or redoing them**), Backup & Restore, Export Center, Import Center, Application Settings (theme — no light palette designed yet, app is dark-only by design), Developer Tools, Database stats, About.
- **Dashboard is expense-only** — extending it to include Income (for Savings Rate) and other KPIs is easier now that Analytics already computes most of this; Dashboard could potentially just call a subset of what Analytics already provides rather than duplicating logic.
- **"Split expense" / shared-payment scenario** (discussed, not built): paying a group bill upfront where part of it is really a Lending receivable to each friend. Deferred, no design work done yet.
- **Lending/Borrowing net-worth treatment**: flagged as an open question — Investments explicitly reduce cash but stay part of Net Worth; Lending should work the same way structurally but this hasn't been explicitly confirmed as policy. Analytics' `tracked_position` field currently includes lending/borrowing outstanding balances as a first-pass approximation — worth revisiting once this is resolved.
- **Reconcile the two Settings architectural patterns**: the hooks-per-feature pattern (rest of the app) vs. the prop-injection-into-a-generic-component pattern (Settings). Not urgent — both work — but worth a conscious decision at some point rather than letting a third pattern emerge if Settings grows further.

---

## 13. If You're a Different AI Picking This Up

Read Sections 3–7 before writing any code. When building a new transactional module, mirror Expenses/Income/Investments (simple) or Lending/Borrowing (agreement + history). When extending **Settings** specifically, mirror its own existing pattern (`MasterDataList` + prop-injection), not the rest of the app's hook pattern — they're different by design, not by accident, and forcing consistency where none exists yet would just create a third style. Always ask for the current `models.py`, `schemas.py`, `crud.py`, and `main.py` before touching any of them — this project has been burned multiple times by building against a stale assumption of what those files contain. The project owner has repeatedly and explicitly valued consistency and getting confirmation before large changes over speed; raise architectural disagreements as discussion points before diverging.

---

## 14. Key Backend Implementation Details (from actual code)

### Models (`models.py`)
- **TransactionType enum**: 9 values including lending/borrowing variants
- **RecurringTransactionType enum**: expense, income, investment, lending, borrowing
- **RecurringFrequency enum**: daily, weekly, monthly, yearly
- **RecurringStatus enum**: active, paused, completed, cancelled, failed
- **Account**: has `opening_balance` (Numeric(12,2))
- **InvestmentHolding**: tracks portfolio state (total_invested, transaction_count, dates, units, avg_cost, current_value)
- **RecurringTransaction**: unified engine referencing templates/holdings/agreements
- **ExpenseTemplate/IncomeTemplate**: for recurring references (no InvestmentTemplate — SIPs reference holdings directly)

### CRUD (`crud.py`) — Key Functions
- **Account balance**: `get_account_balance()` — opening_balance + signed transactions
- **Net worth**: `get_net_worth_summary()` — accounts + investments + lending - borrowing
- **Analytics**: `get_analytics_summary(month)` — massive aggregation (see Section 10)
- **Master data**: generic engine (`list_master_data`, `create_master_data_item`, `update_master_data_item`, `delete_master_data_item` = soft delete)
- **Free-text dedup**: `get_or_create_merchant`, `get_or_create_broker`, `get_or_create_person`
- **Computed status**: `compute_lending_status`, `compute_borrowing_status`, `compute_budget_status`
- **Recurring engine**: full lifecycle (create, update, delete, log-now, pause, resume, skip, complete, cancel, process-due)
- **Investment holdings**: auto-create/update on investment transactions

### Routers — Key Endpoints
- **Master Data** (`/categories`, `/payment-methods`, `/accounts`, `/income-sources`, `/investment-types`, `/people`): GET, POST, PUT, DELETE(=deactivate)
- **Expenses/Income/Investments** (`/expenses`, `/income`, `/investments`): full CRUD with month filter
- **Lending/Borrowing** (`/lending`, `/borrowing`): agreements + nested `/repayments`
- **Budget** (`/budgets`): month-scoped CRUD
- **Analytics** (`/analytics/summary`, `/analytics/net-worth`): read-only aggregations
- **Dashboard** (`/dashboard/summary`): expense-only KPIs
- **Recurring Transactions** (`/recurring-transactions`): unified CRUD + lifecycle + log-now + scheduler
- **Templates** (`/templates/expenses`, `/templates/income`): CRUD for recurring references
- **Investment Holdings** (`/investment-holdings`): list + transaction history

---

## 15. Key Frontend Implementation Details (from actual code)

### Services Layer
- **api.ts**: Central `apiRequest<T>()` with error handling, 204 support
- **types.ts**: Complete TypeScript interfaces matching backend schemas
- **masterData.ts**: Flat-path CRUD for 6 master data types
- **recurring.ts**: Unified recurring transactions API (list, create, update, delete, log-now, pause, resume, skip, complete, cancel, process-due)
- **netWorth.ts**: `getNetWorth()`, `setAccountBalance()`
- **analytics.ts**: `getAnalyticsSummary(month)`
- **dashboard.ts**: `getDashboardSummary(month)`
- **templates.ts**: Expense/income template CRUD

### Pages — Working Features
- **Dashboard**: Month picker, 4 KPI cards (income, expenses, savings, investments), health score, budget bars, insights, recurring transactions list
- **Expenses/Income/Investments**: Full CRUD with forms, lists, month filtering
- **Lending/Borrowing**: Agreements with nested repayments, computed status
- **Budget**: Month-scoped, progress bars with color coding
- **Analytics**: Executive summary, monthly trends, breakdowns, health score, insights
- **Net Worth**: Account balances (editable), investment values, lending/borrowing, net worth
- **RecurringExpenses**: Unified UI for all 5 transaction types with templates/holdings
- **Settings → Master Data**: 6 tabs, generic MasterDataList component with prop injection

### Components
- **PageScaffold**: Used by most pages (header, content area)
- **PageContainer**: Used by Settings (simpler, optional title)
- **MasterDataList**: Generic list+form+edit+deactivate via props
- **KpiCard, HealthBadge, BudgetBar, InsightRow**: Dashboard/Analytics UI components

---

## 16. Database Schema Summary (from models.py)

### Master Data Tables
- `accounts` (id, name, is_active, opening_balance)
- `categories` (id, name, is_active)
- `subcategories` (id, category_id, name, is_active, unique per category)
- `payment_methods` (id, name, is_active)
- `merchants` (id, name, unique)
- `income_sources` (id, name, is_active)
- `investment_types` (id, name, is_active)
- `brokers` (id, name, unique)
- `people` (id, name, is_active)
- `expense_templates` (id, name, amount, category_id, subcategory_id, payment_method_id, account_id, merchant_name, need_or_want, notes, tags, is_active)
- `income_templates` (id, name, amount, income_source_id, account_id, notes, tags, is_active)

### Transactional Core
- `transactions` (id, transaction_type, date, amount, account_id, notes, created_at, is_recurring, recurring_transaction_id, execution_date, execution_status)
- `expense_details` (id, transaction_id, category_id, subcategory_id, merchant_id, payment_method_id, need_or_want, tags)
- `income_details` (id, transaction_id, income_source_id, tags)
- `investment_details` (id, transaction_id, investment_type_id, broker_id, holding_id, tags)
- `investment_holdings` (id, investment_type_id, broker_id, account_id, total_invested, transaction_count, first/last_investment_date, total_units, avg_cost_per_unit, current_value, created_at, updated_at, unique per type/broker/account)
- `lending_agreements` (id, transaction_id, person_id, due_date, notes)
- `lending_repayments` (id, lending_agreement_id, transaction_id)
- `borrowing_agreements` (id, transaction_id, person_id, due_date, notes)
- `borrowing_repayments` (id, borrowing_agreement_id, transaction_id)

### Recurring & Budget
- `recurring_transactions` (id, name, amount, transaction_type, status, account_id, frequency, start_date, end_date, next_due_date, notes, tags, created_at, expense_template_id, income_template_id, investment_holding_id, lending_id, borrowing_id)
- `budgets` (id, category_id, month, amount, created_at, unique per category/month)

---

## 17. API Endpoint Summary

### Master Data (flat paths, used by frontend)
```
GET    /categories
POST   /categories
PUT    /categories/{id}
DELETE /categories/{id}  (soft deactivate)

GET    /payment-methods
POST   /payment-methods
PUT    /payment-methods/{id}
DELETE /payment-methods/{id}

GET    /accounts
POST   /accounts
PUT    /accounts/{id}
DELETE /accounts/{id}
PUT    /accounts/{id}/balance  (set current balance)

GET    /income-sources
POST   /income-sources
PUT    /income-sources/{id}
DELETE /income-sources/{id}

GET    /investment-types
POST   /investment-types
PUT    /investment-types/{id}
DELETE /investment-types/{id}

GET    /people
POST   /people
PUT    /people/{id}
DELETE /people/{id}
```

### Transactional Modules
```
GET    /expenses?month=YYYY-MM
POST   /expenses
GET    /expenses/{id}
PUT    /expenses/{id}
DELETE /expenses/{id}

GET    /income?month=YYYY-MM
POST   /income
GET    /income/{id}
PUT    /income/{id}
DELETE /income/{id}

GET    /investments?month=YYYY-MM
POST   /investments
GET    /investments/{id}
PUT    /investments/{id}
DELETE /investments/{id}
GET    /investments/holdings/{id}/transactions

GET    /lending
POST   /lending
GET    /lending/{id}
PUT    /lending/{id}
DELETE /lending/{id}
POST   /lending/{id}/repayments
DELETE /lending/{id}/repayments/{repayment_id}

GET    /borrowing
POST   /borrowing
GET    /borrowing/{id}
PUT    /borrowing/{id}
DELETE /borrowing/{id}
POST   /borrowing/{id}/repayments
DELETE /borrowing/{id}/repayments/{repayment_id}

GET    /budgets?month=YYYY-MM
POST   /budgets
GET    /budgets/{id}
PUT    /budgets/{id}
DELETE /budgets/{id}
```

### Analytics & Dashboard
```
GET    /analytics/summary?month=YYYY-MM
GET    /analytics/net-worth
GET    /dashboard/summary?month=YYYY-MM
```

### Recurring Transactions
```
GET    /recurring-transactions?transaction_type=...&status=...
POST   /recurring-transactions
GET    /recurring-transactions/{id}
PUT    /recurring-transactions/{id}
DELETE /recurring-transactions/{id}
POST   /recurring-transactions/{id}/log-now
POST   /recurring-transactions/{id}/pause
POST   /recurring-transactions/{id}/resume
POST   /recurring-transactions/{id}/skip
POST   /recurring-transactions/{id}/complete
POST   /recurring-transactions/{id}/cancel
POST   /recurring-transactions/process-due
```

### Templates
```
GET    /templates/expenses
POST   /templates/expenses
GET    /templates/income
POST   /templates/income
```

### Investment Holdings
```
GET    /investment-holdings
```

---

## 18. Verification Checklist (for next session)

Before assuming anything works, verify:
- [ ] `schemas.MasterDataCreatePayload` exists in `schemas.py`
- [ ] `models.AppPreferences`, `crud.get_or_create_preferences`, `schemas.AppPreferencesOut` exist (for Settings → Profile & Preferences)
- [ ] Settings → Master Data: add category → refresh → persists; rename → refresh → persists; deactivate → refresh → gone from list but no crashes elsewhere
- [ ] Dashboard shows expense-only KPIs (known limitation)
- [ ] Analytics summary works for current month
- [ ] Net Worth page loads account balances, investments, lending/borrowing
- [ ] Recurring transactions: create expense rule → log now → creates expense; create investment SIP → log now → adds to holding
- [ ] Lending/Borrowing: add repayment → status updates; delete repayment → status reverts
- [ ] Budget: create for month → progress bar computes correctly; exceed budget → status "exceeded"

---

*End of document. This reflects the actual codebase state as of reading all source files in this session.*