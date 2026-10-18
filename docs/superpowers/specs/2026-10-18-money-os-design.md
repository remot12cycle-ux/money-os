# Money OS — Design Spec

Date: 2026-10-18
Owner: single user (the founder). Private tool, not multi-tenant.

## 1. Purpose

One place to see and control all of the owner's money: personal spending, salary, and
four business lines (COD Africa, SaaS, Digital Products, Salary job). Starting tracked
capital is **$5,000**; the app's job is to show whether that capital is growing, what is
really available to spend (after committed payables), and whether the monthly target is
being hit. Plus a to-do system so nothing is forgotten.

Success looks like: the owner opens the dashboard on phone or laptop, and within 5 seconds
knows (a) net worth vs $5k start, (b) available cash after commitments, (c) progress on the
monthly target, (d) what each business made this month, (e) what to do today.

## 2. Decisions (from brief)

| Topic | Decision |
|---|---|
| Hosting | Next.js (App Router) on Vercel, Supabase (Postgres + Auth) |
| UI language | English |
| Currencies | USD (base for totals) + MAD. Manual exchange rate in Settings, with a "refresh" that fetches a live rate. |
| Auth | Supabase email + password. Public signup disabled; one account. RLS on every table: `owner_id = auth.uid()`. |
| Starting capital | $5,000 seeded as an "Opening balance" transaction on the first account. Editable in Settings. |
| Monthly target | One editable number (USD). Metric selectable: `net_profit` (default) or `revenue`. |
| Committed payables | Separate table. Shown everywhere as "Committed"; **Available = Σ account balances − Σ open committed**. Marking one "Paid" creates a real expense transaction and closes the commitment. |
| Integrations | `POST /api/ingest` secured by per-key bearer token (hashed in DB). Creates transactions. Payload documented in Settings → Integrations. |
| Out of scope (v1) | Multi-user, bank sync, native mobile app, invoicing, OCR receipts |

## 3. Domain model

All tables have `id uuid pk default gen_random_uuid()`, `owner_id uuid not null references auth.users`, `created_at timestamptz default now()`, `updated_at`.

- **profiles** — `id` (= auth user id), `base_currency` ('USD'), `usd_to_mad numeric(10,4)`, `rate_updated_at`, `starting_capital numeric(14,2)` (5000), `monthly_target numeric(14,2)`, `target_metric` ('net_profit'|'revenue'), `theme` ('dark'|'light'|'system').
- **accounts** — `name`, `type` ('cash'|'bank'|'wallet'|'card'|'other'), `currency` ('USD'|'MAD'), `color`, `icon`, `is_archived`, `sort_order`. Balance is derived = Σ transactions (not stored).
- **entities** — the "where does this money belong" dimension. `name`, `slug`, `kind` ('personal'|'business'|'salary'), `color`, `icon`, `is_archived`. Seeded: Personal, COD Africa, SaaS, Digital Products, Salary.
- **categories** — `name`, `kind` ('income'|'expense'), `entity_id nullable` (null = global), `color`, `icon`, `is_archived`. Seeded sensible defaults (Food, Transport, Rent, Subscriptions, Ads, Product cost, Shipping, Tools/Software, Salary income, Sales, Refunds…).
- **transactions** — `type` ('income'|'expense'|'transfer'), `amount numeric(14,2)` (always positive), `currency`, `fx_rate_to_base numeric(12,6)` (snapshotted at entry), `amount_base numeric(14,2)` (generated), `account_id`, `to_account_id nullable` (transfer), `category_id nullable`, `entity_id`, `occurred_on date`, `note`, `source` ('manual'|'ingest'|'committed'|'recurring'|'opening'), `external_id` (idempotency for ingest), `meta jsonb` (COD extras: `ad_spend`, `product_cost`, `units`, `delivered`, `returned`, `country`).
- **committed_payables** — `title`, `amount`, `currency`, `entity_id`, `category_id nullable`, `account_id nullable` (which wallet it will leave), `due_on nullable`, `status` ('open'|'paid'|'cancelled'), `paid_transaction_id nullable`, `note`.
- **recurring_rules** — `title`, `type`, `amount`, `currency`, `account_id`, `category_id`, `entity_id`, `cadence` ('monthly'|'weekly'|'yearly'), `day_of_month`, `next_run_on`, `is_active`. A "Run due recurring" action (button + Vercel cron) materialises transactions.
- **budgets** — `category_id`, `month date` (first day), `amount_base`. Spent is derived.
- **goals** — `title`, `target_amount_base`, `current_amount_base` (manual contributions), `deadline nullable`, `color`, `is_done`.
- **debts** — `counterparty`, `direction` ('owed_to_me'|'i_owe'), `principal`, `currency`, `due_on nullable`, `note`, `status` ('open'|'settled'). **debt_payments** — `debt_id`, `amount`, `paid_on`, `transaction_id nullable`.
- **tasks** — `title`, `notes`, `entity_id nullable` (null = General), `priority` ('low'|'medium'|'high'), `due_on nullable`, `status` ('todo'|'doing'|'done'), `done_at`, `sort_order`.
- **api_keys** — `name`, `key_hash` (sha256), `key_prefix` (first 8 chars for display), `last_used_at`, `revoked_at`.

Derived values (SQL views or server functions): account balances, net worth (base), committed total, available, month P&L per entity, category spend vs budget, target progress.

## 4. Screens

Sidebar (desktop) / bottom tabs (mobile): Dashboard · Money · Businesses · Committed · Budgets & Goals · Debts · Tasks · Settings. Global **Quick Add** (⌘K / floating button): add transaction, committed, task.

1. **Dashboard** — Net worth card (big number USD, MAD below, Δ vs $5k start with %, 90-day sparkline). Available card (balance − committed, with committed amount shown). Monthly target ring (progress %, remaining, days left). Income vs Expenses bar chart (last 6 months). P&L by entity this month (horizontal bars). Today's tasks (top 5, checkable). Recent transactions (8).
2. **Money** — Account cards row (balance per account, native currency + base). Transaction list: filters (entity, account, type, category, date range, search), grouped by day, inline edit, delete with undo. Add/edit transaction sheet: type toggle, amount + currency, account, entity, category, date, note, optional COD extras when entity is COD.
3. **Businesses** — Entity tabs. Per entity: revenue, costs, profit, margin for month + trend (12 months), top categories, transaction list filtered. COD Africa adds: ad spend, product cost, ROAS, delivered vs returned, profit per unit (from `meta`).
4. **Committed** — Open list (title, amount, due, entity, wallet) with total; "Mark paid" → picks account/date, creates expense; paid/cancelled history tab.
5. **Budgets & Goals** — Monthly target editor (amount + metric). Budgets per category for the selected month with progress bars and over-budget warnings. Savings goals with contribution button and progress.
6. **Debts** — Two lists: Owed to me / I owe; per debt remaining, due; record payment (optionally creates a transaction).
7. **Tasks** — Groups: General + each entity. Filters: today, overdue, this week, done. Keyboard quick-add. Drag to reorder.
8. **Settings** — Profile (starting capital, base currency, FX rate + refresh), Entities, Categories, Accounts, Recurring rules, Integrations (API keys + payload docs + "test call" curl), Export CSV, Theme.
9. **Login** — email + password only.

## 5. Integration API

`POST /api/ingest` — `Authorization: Bearer <key>`.

```json
{
  "external_id": "fb_2026-10-18_act123",
  "type": "expense",
  "amount": 120.5,
  "currency": "USD",
  "occurred_on": "2026-10-18",
  "entity": "cod-africa",
  "category": "Ads",
  "account": "Payoneer USD",
  "note": "Facebook Ads daily spend",
  "meta": { "source": "facebook_ads", "campaign": "..." }
}
```

Rules: upsert by `(owner_id, external_id)`; entity/category/account matched by slug or name (case-insensitive), auto-create category if missing; fx snapshot from profile; respond `201 {id}` or `200 {id, updated:true}`; `401` bad key; `422` validation errors. Batch: body may be an array (≤500).

## 6. Architecture

- Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui primitives (Radix), `motion` for animation, Recharts for charts, `@supabase/ssr` for auth cookies, Zod for validation, `date-fns`.
- Data access: Server Components read via Supabase server client; mutations via Server Actions (`'use server'`) returning typed results; optimistic UI where cheap (task toggle, transaction add).
- Supabase: migrations in `supabase/migrations/*.sql`; RLS on all tables; `seed.sql` for entities/categories; a `setup_owner()` function run on first login to seed profile + defaults + opening balance.
- Money math: all stored as `numeric`, handled in JS as integer cents via a small `money.ts` helper; base conversion uses the snapshotted `fx_rate_to_base`.
- Theme: dark default with light mode; tokens in CSS variables; `prefers-reduced-motion` respected.

## 7. Error handling

- Server actions return `{ok:true,data}|{ok:false,error}`; UI shows toast; never silent.
- Ingest: validation errors list each field; idempotent retries safe.
- FX refresh failure keeps last rate and shows "rate from <date>".
- Delete = soft confirm with 5s undo toast for transactions/tasks; hard delete for everything else behind a confirm dialog.

## 8. Testing

- Unit (Vitest): money math, fx conversion, target progress, available calc, ingest payload validation.
- Integration: ingest route handler with mocked Supabase client.
- `next build` + `tsc --noEmit` must pass before deploy.

## 9. Deploy

- Vercel project `money-os`; env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, ingest), `CRON_SECRET`.
- Supabase project created by the owner; SQL migrations applied via dashboard or CLI; signups disabled in Auth settings; owner creates own user in dashboard.
- Vercel cron hits `/api/cron/recurring` daily.
