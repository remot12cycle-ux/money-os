# Research notes — Money OS (Phase 2)

## ui-ux-pro-max results (verified queries)
- Product match: "Personal Finance Tracker" palette → dark navy canvas, trust blue + profit green. Decision: keep the *idea* (dark canvas, green = profit) but drop the slate-blue `#0F172A` canvas (over-used) and the blue primary (money apps are green/red semantic first).
- Typography matches: "Dashboard Data" (mono for data + sans for labels) and "Modern Dark Cinema" (single Inter precision system, tracking rules). Decision: single-family precision system with a mono for numbers → **Geist Sans + Geist Mono** (shipped with Next.js, no external font request, tabular figures).
- Charts: trend over time → line/area, <6 series; proportion/progress → ring or stacked-100 bar, never colour alone (add label + pattern/value).
- Style match "Glassmorphism" rejected: blur layers hurt legibility on dense numeric UI and are a 2021 tell. Use flat surfaces with 1px hairline borders.
- Motion tier Standard: 300–450ms stagger on load; never `back.out` overshoot on data tables.
- UX rules to carry: 44px touch targets, visible labels (no placeholder-only), error next to field, bottom nav ≤5, reduced-motion, 16px base, 4.5:1 contrast on dark.

## Reference patterns (bundled craft knowledge; Refero MCP not connected)
1. **Net worth hero** (Copilot/Monarch style): one huge tabular number, secondary currency under it, delta chip, 90-day sparkline bleeding behind — no card box.
2. **Transaction list** (Mercury/Linear style): day-grouped rows, hairline separators, entity chip + category, amount right-aligned mono, hover reveals actions.
3. **Progress ring** (Apple Fitness/Monarch): thick ring with rounded caps, value centered, remaining under; colour = brand accent, over-target = same accent (never red for success).
4. **Task list** (Things/Linear): checkbox 20px, title, due chip, priority dot; completing strikes through and fades out after 600ms.
5. **Committed money**: pattern from Mercury "Scheduled" — a separate ledger lane, amount shown with dashed/outlined treatment to signal "not yet moved".

## Anti-slop decisions (refero-design/anti-ai-slop.md)
- No indigo/violet. Accent is mint-green (profit) with coral (expense) and amber (committed/pending).
- Cards only where interactive (account tiles, goals, committed rows). Sections + dividers elsewhere.
- Dark default is a deliberate brief choice (approved by owner), full light mode shipped too.
- Lucide icons only, no emoji. ALL CAPS labels get letter-spacing.
- One memorable detail: the net-worth number and the "Available vs Committed" split bar on the dashboard.
