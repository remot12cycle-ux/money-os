# Money OS

Private finance control room for one owner: personal money, salary and business lines
(COD Africa, SaaS, Digital Products), committed payables, budgets, goals, debts, tasks
and an ingest API for other apps.

Stack: Next.js 16 · React 19 · Tailwind v4 · Motion · Recharts · Supabase (Postgres + Auth) · Vercel.

## Setup (10 minutes)

1. **Supabase project** — create one at supabase.com.
2. **Migration** — SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
3. **Auth** — Authentication → Providers → Email → disable "Allow new users to sign up".
   Authentication → Users → Add user (your email + password, auto-confirm).
4. **Vercel env vars** (Project → Settings → Environment Variables):

   | Key | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same page (publishable / anon key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | same page, secret key — server only, powers `/api/ingest` |
   | `CRON_SECRET` | any long random string — protects the daily recurring-rules cron |

5. **Redeploy**. Sign in once; the first login seeds entities, categories, two accounts and the $5,000 opening balance.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

`npm test` runs the unit tests, `npm run typecheck` and `npm run lint` the static checks.

## Ingest API

`POST /api/ingest` with `Authorization: Bearer <key>` (create keys in Settings → Integrations).
Body: one object or an array (≤500). See Settings → Integrations in the app for the payload and rules.

## Design

See `DESIGN.md` — "The Ledger at Night": dark graphite canvas, Geist Mono for every number,
mint = money in, coral = money out, amber = committed.
