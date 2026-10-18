# Money OS — Implementation Plan

Spec: `docs/superpowers/specs/2026-10-18-money-os-design.md`
Execution: inline (single session), build-playbook big-project mode.

## Phase 2 — Research
- [ ] ui-ux-pro-max: search styles/palettes/font pairings/UX rules for "personal finance dashboard, dark, premium, single user".
- [ ] refero-design: collect 3–5 reference patterns (net worth card, transaction list, progress ring, task list).
- Output: `docs/research.md`.

## Phase 3 — Art direction
- [ ] Lock palette, type, radius, spacing, motion rules → `DESIGN.md` (impeccable format).

## Phase 4 — Build
1. Scaffold: `create-next-app` (TS, Tailwind, App Router, src/), add deps: `@supabase/ssr @supabase/supabase-js zod date-fns motion recharts lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-*`, `vitest`.
2. Tokens + base UI primitives (Button, Card, Input, Select, Sheet/Dialog, Tabs, Toast, Progress, Badge, Skeleton).
3. Supabase: `supabase/migrations/0001_init.sql` (tables, RLS, views, `setup_owner()`), `seed` inside function. Types in `src/lib/db/types.ts`.
4. Auth: `middleware.ts`, `/login`, server + browser clients, `getUser()` guard in `(app)` layout; first-login seed.
5. Lib: `money.ts` (cents, format USD/MAD), `fx.ts`, `dates.ts`, `queries/*.ts` (balances, netWorth, available, monthPnl, targetProgress), with Vitest tests for pure functions.
6. App shell: sidebar / bottom tabs, header with month picker + Quick Add (⌘K), theme toggle.
7. Money: accounts row, transaction list + filters, add/edit sheet, server actions, undo delete.
8. Dashboard: cards + charts (Recharts, dataviz rules), today tasks, recent.
9. Businesses: entity tabs, P&L, COD extras.
10. Committed: list, mark paid flow, history.
11. Budgets & Goals: target editor, budgets grid, goals.
12. Debts: lists + payments.
13. Tasks: groups, quick add, filters, reorder.
14. Settings: profile/fx refresh, entities, categories, accounts, recurring, API keys, export CSV, theme.
15. API: `/api/ingest` (bearer key, zod, upsert), `/api/cron/recurring`.

## Phase 5 — Motion
- emil-design-eng pass: what moves (number count-up on dashboard, list item enter/exit, sheet spring, progress ring draw, task check), durations/easings; reduced motion.

## Phase 6 — Review
- `tsc --noEmit`, `vitest run`, `next build`; impeccable audit on screenshots (Dashboard, Money, Tasks mobile); fix list.

## Phase 7 — Launch
- Vercel project + deployment; `SETUP.md` for Supabase (create project → run migration → disable signups → create user → set env vars in Vercel → redeploy). Confirm live URL loads login.
