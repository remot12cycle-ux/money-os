# Resume notes — where we stopped (2026-10-18 20:26 UTC)

## State
- Phases 1–6 done (spec, research, DESIGN.md, full build, motion, independent review + all fixes).
- `npm run typecheck`, `npm run lint`, `npm test` (15 tests) and `next build` all pass on the last commit.
- Phase 7 (launch) DONE: production deployment dpl_7fs1qHSfTSN8anoVyp8QzJvo5ANy is READY at https://money-os-sage-tau.vercel.app (alias money-os-mohamed-a6c0.vercel.app). The app shows /setup until the real Supabase env vars are added.

## Vercel
- Project created: `money-os` — id `prj_inbSc3kvjJTbk0hiM77p6BLeJN0H` (account team `team_ff9xSIGiWhlbGQ1rmLb3QHJS`, hobby plan).
  Call Vercel tools WITHOUT `teamId` (passing it returned 403).
- Vercel Authentication (SSO protection) disabled — the app has its own Supabase login.
- Placeholder env vars set: `NEXT_PUBLIC_SUPABASE_URL=https://REPLACE-ME.supabase.co`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=REPLACE-ME`
  (the app shows `/setup` until real values are added).
- Deployment plan: `upload_file` (base64 + sha1) for every file > 2.6 KB, then one `create_deployment`
  with `files: [{file, sha, size}]` for uploaded ones + inlined `{file, data, encoding:"utf-8"}` for the small ones,
  `projectSettings.framework = "nextjs"`, `target = "production"`, `project = "money-os"`.
  Excluded from deploy: docs/, DESIGN.md, AGENTS.md, README.md, .gitignore, *.test.ts, vitest.config.mts, .env.example,
  package-lock.json (Vercel installs from package.json), supabase/ (run manually in Supabase SQL editor).

### Files already uploaded to Vercel (sha1 of current content — re-upload only if the file changes)
package.json, next.config.ts, tsconfig.json, vercel.json, eslint.config.mjs, src/app/icon.svg, src/proxy.ts,
src/lib/utils.ts, src/components/ui/field.tsx, src/components/shell/nav.tsx, src/components/forms/task-sheet.tsx,
src/components/lists/task-item.tsx, src/components/lists/transaction-row.tsx, src/components/shell/app-shell.tsx,
src/app/(app)/budgets/target-editor.tsx, src/lib/data/core.ts, src/lib/actions/tasks.ts, src/lib/colors.ts,
src/lib/supabase/proxy.ts, src/lib/data/businesses.ts, src/app/setup/page.tsx, src/lib/actions/debts.ts,
src/lib/metrics.ts, src/lib/data/transactions.ts, src/lib/money.ts, src/lib/actions/committed.ts, src/lib/data/dashboard.ts

### Still to upload (big files)
src/app/api/cron/recurring/route.ts, src/lib/actions/budgets.ts, src/lib/actions/transactions.ts, src/app/globals.css,
src/app/api/ingest/route.ts, src/components/forms/committed-sheet.tsx, src/app/(app)/businesses/page.tsx,
src/components/ui/primitives.tsx, src/lib/db/types.ts, src/components/ui/sheet.tsx, src/components/shell/quick-add.tsx,
src/app/(app)/tasks/tasks-view.tsx, src/app/(app)/page.tsx, src/components/forms/transaction-sheet.tsx,
src/app/(app)/committed/committed-view.tsx, src/app/(app)/money/money-view.tsx, src/components/charts/charts.tsx,
src/lib/actions/settings.ts, src/app/(app)/debts/debts-view.tsx, src/app/(app)/budgets/budgets-view.tsx,
src/app/(app)/settings/settings-view.tsx (32 KB — print its base64 in two halves)
Then the 28 small files (≤ 2.6 KB) go inline in `create_deployment`.

Regenerate the exact list with: `node` snippet in the session history, or simply
`git ls-files` minus the exclusions above, hashing with sha1.

## Local preview stack (this workspace only)
- Postgres 16 cluster `main` with db `moneyos_dev` (migration applied, demo data seeded, roles anon/authenticated/service_role).
- PostgREST binary + proxy in the scratchpad `pgrst/` folder (ports 3001 / 54321); dev server `next dev -p 3000`.
- `.env.local` has `MONEYOS_PREVIEW_SUB` / `MONEYOS_PREVIEW_JWT_SECRET` for preview mode (development only).

## After deploy — owner's 5 steps (also in README.md and /setup page)
1. Create Supabase project → 2. run `supabase/migrations/0001_init.sql` in SQL editor →
3. disable sign-ups, add own user → 4. set env vars in Vercel (URL, publishable key, service role key, CRON_SECRET) → 5. redeploy.

## Nice-to-haves noted during review (not blocking)
- Owner can connect GitHub later and link the repo to the Vercel project for auto-deploys.
- `base_currency` is now fixed after setup by design; `starting_capital` edits also update the opening row.

## Supabase (done 2026-10-18)
- Project `money-os` ref `vfaaubpsiicvpnirkrhu` (us-east-1), migrations 0001 + 0002 applied, owner user remot12cycle@gmail.com created and seeded.
- Vercel env set: SUPABASE URL, publishable key, CRON_SECRET. Missing: SUPABASE_SERVICE_ROLE_KEY (owner must paste it; MCP cannot read secret keys) — needed only for /api/ingest and the daily cron.

## GitHub (done 2026-10-19)
- Private repo `remot12cycle-ux/money-os`, branch `main` pushed (no `.env*` tracked). Claude GitHub App installed → Claude can push.
- Vercel ↔ GitHub linked 2026-10-19 (via owner's Chrome). Every push to `main` deploys to production; other branches get previews.
  Manual MCP deploys are no longer needed — just commit + push.
