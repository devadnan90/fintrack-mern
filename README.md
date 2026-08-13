# FinTrack (MERN)

Personal finance management platform — Phase 1 (Foundation) build.
Matches the accompanying SRS: `FinTrack_SRS_v1.docx`.

## What's in this phase

- **Server** (`/server`): Express + MongoDB API with JWT auth (register,
  login, refresh-token rotation via httpOnly cookie, logout), password
  hashing, protected-route middleware, centralized error handling, and a
  profile/password-update endpoint.
- **Client** (`/client`): Vite + React app with Redux Toolkit auth state,
  an axios instance that auto-refreshes expired access tokens, protected
  routing, and Login / Register / Dashboard pages. Tailwind CSS is wired
  in. Accounts, Transactions, Budgets, Goals, Bills, and Reports are
  stubbed as "Coming soon" — those are the next build phases.

## Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, Docker, or a free MongoDB Atlas
  cluster)

## Setup

```bash
# from the project root
npm run install:all

# server config
cp server/.env.example server/.env
# edit server/.env: set MONGO_URI and replace both JWT secrets with
# long random strings, e.g. `openssl rand -hex 32`

# client config
cp client/.env.example client/.env
```

## Run

```bash
# from the project root — runs API (port 5000) and client (port 5173) together
npm run dev
```

Or run each independently:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

Visit http://localhost:5173.

## API endpoints (Phase 1)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account, returns access token + sets refresh cookie |
| POST | `/api/auth/login` | Public | Log in |
| POST | `/api/auth/refresh` | Refresh cookie | Rotate refresh token, issue new access token |
| POST | `/api/auth/logout` | Public | Revoke refresh token |
| GET | `/api/auth/me` | Bearer token | Current user |
| PUT | `/api/users/me` | Bearer token | Update profile |
| PUT | `/api/users/me/password` | Bearer token | Change password |
| GET | `/api/health` | Public | Liveness check |

## Verified

- All server files pass `node --check` (syntax) and the Express app boots
  and routes correctly without a live DB connection (validated with a
  smoke test — health check 200, invalid-body register 400, unknown route
  404).
- Client builds cleanly with `vite build` and the dev server serves the
  app without console/module errors.

## Next build phases (per the SRS's Section 6 roadmap)

1. Accounts & Transactions — CRUD, filtering/search, CSV import
2. Categories & Budgets — category management, budget progress logic
3. Dashboard & Reports — real aggregation queries, charts, export
4. Goals & Bills — goal tracking, recurring bill reminders (node-cron)
5. Polish — notifications, settings, responsive/loading states
6. Deploy — Atlas, Render/Railway, Vercel

## Phase 2: Accounts, Categories & Transactions

Added on top of Phase 1's foundation:

- **Accounts** — full CRUD, archive/restore, and a live balance computed
  from the transaction ledger (never a stored value that can drift).
- **Categories** — default income/expense categories are seeded
  automatically on registration; custom categories support icons, colors,
  and optional subcategories. Deleting a category in use is blocked unless
  you pass a replacement to reassign its transactions to.
- **Transactions** — full CRUD with income/expense/transfer types,
  filtering (account, category, type, search) with pagination, and CSV
  bulk import (`POST /api/transactions/import`, multipart field `file`,
  columns: `date,description,amount,type,category,account`) with
  duplicate detection and a per-row error report.

### New API endpoints

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/accounts` | List / create accounts |
| GET/PUT/DELETE | `/api/accounts/:id` | Account detail (+ recent transactions) / edit / delete |
| GET/POST | `/api/categories` | List / create categories |
| PUT/DELETE | `/api/categories/:id` | Edit / delete (`?reassignTo=` to move transactions first) |
| GET/POST | `/api/transactions` | List (filterable, paginated) / create |
| GET/PUT/DELETE | `/api/transactions/:id` | Detail / edit / delete |
| POST | `/api/transactions/import` | CSV bulk import |

### Verification note

This sandbox can't run a real MongoDB instance (no `mongod` binary, and
`mongodb-memory-server`'s downloader is blocked on this ARM64 sandbox), so
Phase 2 was verified via: syntax-checking all 23 server files
(`node --check`), an Express wiring smoke test confirming every new route
is correctly protected and mounted, and a clean `vite build` of the
client. The balance-aggregation and CSV-import logic is written carefully
and matches the SRS, but **run it against a real MongoDB locally and
click through create/edit/delete/import flows before trusting it in
production.**

## Phase 3: Differentiator APIs

Four integrations that go beyond a basic CRUD tracker — all free, and all
degrade gracefully with zero API keys configured:

- **Live currency conversion** — `GET /api/reports/net-worth` converts
  balances across accounts in different currencies into your base
  currency using the free, keyless Frankfurter API (ECB rates). Powers
  the real Net Worth card on the Dashboard. If the provider is
  unreachable for a currency, that currency's accounts are excluded from
  the total (and flagged) rather than breaking the whole dashboard.
- **Receipt OCR** — the "Scan receipt" button on the Transactions page
  runs Tesseract.js entirely in the browser (no API key, no server round
  trip) to pull the amount, date, and merchant off a photo and prefill
  the add-transaction form. Heuristic, not exact — always double-check
  before saving.
- **Investments** — new module (`/investments`) with live crypto prices
  via CoinGecko (free, no key) and manual valuation for stocks/other
  assets. Add `ALPHA_VANTAGE_API_KEY` to `server/.env` to switch stock
  holdings to live prices too.
- **AI Insights** — new module (`/insights`): a monthly spending summary
  and a chat box for questions like "how much did I spend on food?".
  Works immediately with rule-based summaries/answers built from your
  actual transaction data. Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to
  `server/.env` to upgrade to real LLM-generated answers — no code
  changes needed, it switches automatically.

### New API endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/reports/net-worth` | Multi-currency net worth |
| GET/POST | `/api/investments` | List / create holdings |
| PUT/DELETE | `/api/investments/:id` | Edit (incl. manual price) / delete |
| GET | `/api/insights/summary` | Monthly summary (AI or rule-based) |
| POST | `/api/insights/ask` | Ask a question about your spending |

### Verification note

Same sandbox limitation as before: I can't reach `api.frankfurter.app`,
`api.coingecko.com`, `alphavantage.co`, or the OpenAI/Anthropic APIs from
this sandbox (network allowlist), so these were verified via unit tests
on the pure logic (currency conversion math, rule-based summary/Q&A
matching — all passed, including two bugs the tests caught and fixed:
a "SUBTOTAL" vs "TOTAL" false match in the receipt parser, a timezone
off-by-one in date parsing, and a category-matching order bug in the
Q&A fallback) plus Express wiring smoke tests confirming every new route
is protected and mounted correctly. The actual external API calls need
to be exercised locally against the real internet.

## Phase 4: Budgets, Goals, Bills & Reports

The remaining core modules from the SRS:

- **Budgets** — one budget per category, weekly or monthly, with live
  progress computed from actual transactions (no stored/stale totals).
  Optional rollover carries unused budget into the next period. Visual
  status: on-track / approaching (80%+) / exceeded (100%+), per FR-BUD-03.
- **Goals** — target amount + optional target date, manual contribution
  logging, automatic "achieved" detection with a celebratory toast when a
  goal is hit (FR-GOAL-04).
- **Bills & Reminders** — one-time or recurring (weekly/monthly/yearly)
  bills. Marking a bill paid creates the corresponding expense
  transaction and, for recurring bills, advances the same document to
  its next due date (FR-BILL-02, FR-BILL-05). Status (upcoming/overdue/
  paid) is computed live from today's date, not stored.
  Note: FR-BILL-04's scheduled email/push reminders (via node-cron) were
  intentionally left out of this pass — the overdue/upcoming status is
  visual-only for now. Flag if you want the cron-based reminder emails
  built next.
- **Reports & Analytics** — spending-by-category pie chart and a 6-month
  income-vs-expense bar chart (Recharts), plus CSV export
  (`GET /api/reports/export.csv`) using the same column layout the CSV
  importer accepts, so exports round-trip.

### New API endpoints

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/budgets` | List (with live progress) / create |
| PUT/DELETE | `/api/budgets/:id` | Edit / delete |
| GET/POST | `/api/goals` | List / create |
| PUT/DELETE | `/api/goals/:id` | Edit / delete |
| POST | `/api/goals/:id/contributions` | Log a contribution |
| GET/POST | `/api/bills` | List / create |
| PUT/DELETE | `/api/bills/:id` | Edit / delete |
| POST | `/api/bills/:id/pay` | Mark paid (creates transaction, advances recurrence) |
| GET | `/api/reports/spending-by-category` | Category breakdown |
| GET | `/api/reports/trend` | Monthly income/expense trend |
| GET | `/api/reports/export.csv` | CSV export |

### Verification note

47 server files pass `node --check`; every route across all 10 modules
(auth, users, accounts, categories, transactions, reports, investments,
insights, budgets, goals, bills) confirmed correctly mounted and
auth-protected via an Express wiring smoke test. Period-boundary math
(weekly/monthly budget windows) and recurrence math (including the
Jan 31 → Feb 28 month-end edge case) were unit-tested directly. Client
builds cleanly with `vite build`. As with earlier phases, the actual
business logic (budget progress against real transactions, bill payment
creating real transactions, chart rendering against real data) needs to
be exercised locally against your MongoDB — this sandbox still can't
reach it.
