---
name: Money OS
description: A private, single-owner finance control room — dark ledger, mint for money in, coral for money out.
colors:
  graphite-night: "#0B0D10"
  graphite-surface: "#111418"
  graphite-raised: "#171B21"
  hairline-dark: "rgba(255,255,255,0.08)"
  ink-on-dark: "#F3F5F7"
  ink-secondary-dark: "#A4ABB6"
  ink-tertiary-dark: "#6B7280"
  paper-light: "#F7F8FA"
  paper-surface: "#FFFFFF"
  paper-raised: "#F1F3F6"
  hairline-light: "rgba(16,20,28,0.08)"
  ink-on-light: "#0F1217"
  ink-secondary-light: "#5B6472"
  ink-tertiary-light: "#8A93A1"
  ledger-mint: "#2FE3A5"
  ledger-mint-deep: "#0F9D6E"
  on-mint: "#05261A"
  signal-coral: "#F4645F"
  signal-coral-deep: "#D9403B"
  pending-amber: "#F2B544"
  pending-amber-deep: "#B9780C"
  entity-personal: "#8B93A7"
  entity-cod: "#F28C38"
  entity-saas: "#5BB5F5"
  entity-digital: "#E36BB1"
  entity-salary: "#38C7B4"
typography:
  display:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(2.25rem, 5vw, 3.25rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum, ss01"
  headline:
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  number:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
  label:
    fontFamily: "Geist Sans, Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
components:
  button-primary:
    backgroundColor: "{colors.ledger-mint}"
    textColor: "{colors.on-mint}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.ink-on-dark}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary-dark}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 10px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.signal-coral}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  input:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.ink-on-dark}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  chip:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.ink-secondary-dark}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  tile:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.ink-on-dark}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Money OS

## Overview

**Creative North Star: "The Ledger at Night"**

Money OS is a control room for one person's money, used several times a day on a laptop and from a phone between meetings. The world is a dark, matte ledger: a near-black graphite canvas with the numbers themselves as the brightest things on screen. Chrome recedes; figures advance. Nothing glows, nothing floats, nothing is glassy — depth is tonal (three graphite steps and one hairline), and colour is reserved for meaning: mint when money comes in, coral when it goes out, amber when money is spoken for but has not moved yet.

Density is dashboard-grade (8–32px rhythm) but every number gets room to be read at a glance. Typography does the branding: all money is set in a tabular monospace so columns align and deltas read instantly, while labels and copy use a quiet grotesk. The one memorable detail is the dashboard's net-worth figure — huge, mono, uncontained — with the "Available vs Committed" split bar directly under it.

Light mode is a full peer (paper surfaces, deeper mint/coral for contrast), not an afterthought.

**Key Characteristics:**
- Dark matte ledger, tonal depth, single hairline border weight (1px).
- Mono for every number; sans for everything else.
- Semantic colour only: mint = in, coral = out, amber = committed, entity hues = ownership.
- Cards only where you can act on the thing; otherwise sections and dividers.
- Motion is brief and physical: 150–250ms eases, springs for sheets, count-ups for key figures.

## Colors

A graphite neutral ramp carrying three semantic signals and five muted entity hues.

### Primary
- **Ledger Mint** (`{colors.ledger-mint}`): the single brand accent. Primary buttons, income amounts, positive deltas, target-progress ring, focused rings. On light surfaces, switch to **Ledger Mint Deep** for text contrast.

### Secondary
- **Signal Coral** (`{colors.signal-coral}` / deep on light): expenses, negative deltas, destructive actions, over-budget. Never used as decoration.
- **Pending Amber** (`{colors.pending-amber}` / deep on light): committed payables, overdue tasks/debts, "rate is stale" notices — anything waiting.

### Tertiary — Entity hues
- **Personal** slate, **COD Africa** burnt orange, **SaaS** sky, **Digital Products** rose, **Salary** teal. Used as 8px dots, chip text and chart series only. They never fill large surfaces.

### Neutral
- **Graphite Night / Surface / Raised**: canvas, sunken panels and inputs, raised interactive tiles. Light mode mirrors with Paper Light / Surface / Raised.
- **Ink on dark** (primary text), **Ink secondary** (labels, metadata), **Ink tertiary** (placeholders, disabled).
- **Hairline**: the only border. 1px, 8% white on dark, 8% ink on light.

### Named Rules
**The Signal Rule.** Mint, coral and amber only ever mean in, out and pending. If a colour on screen can't be read as one of those three, it must be a neutral or an entity dot.
**The 10% Rule.** Ledger Mint covers at most ~10% of any screen. Its rarity is what makes the primary action and the income column pop.

## Typography

**Display / Number Font:** Geist Mono (with ui-monospace fallback) — tabular figures on.
**Body Font:** Geist Sans (with Inter / system-ui fallback)

**Character:** A quiet grotesk carrying the words, a crisp monospace carrying the money. The pairing says "precise and current" without shouting.

### Hierarchy
- **Display** (500, clamp 36–52px, 1.0, −0.03em, mono): the net-worth figure and per-entity hero totals only. Currency symbol at 60% size, superscripted; minor units at 60% opacity.
- **Headline** (600, 24px, 1.2, −0.02em): page titles.
- **Title** (600, 16px, 1.35): section headers, sheet titles, account names.
- **Body** (400, 15px, 1.5): copy, notes, list titles. Max 65ch.
- **Number** (500, 15px, mono, tnum): every amount in lists and tables. Right-aligned. Sign shown explicitly (+/−).
- **Label** (500, 11px, 0.08em, UPPERCASE): column heads, eyebrow labels, chip text.

### Named Rules
**The Mono Money Rule.** Any string that is an amount, percentage, count or date column is set in Geist Mono with tabular figures. No exceptions, including inside buttons and chips.

## Layout

Desktop (≥1024px): a 240px fixed sidebar with the eight sections, a 56px top bar carrying page title, month picker and the Quick Add button, content in a 1200px max container with 24px gutters and a 12-column grid (16px gap). Tablet (768–1023px): sidebar collapses to 64px icon rail. Mobile (<768px): bottom tab bar with 5 items (Dashboard, Money, Tasks, Committed, More), 16px gutters, single column, Quick Add becomes a 56px floating button above the tab bar. Spacing rhythm is 4/8/12/16/24/32; vertical section gap 32px desktop, 24px mobile. Lists are full-bleed within the container with 1px hairline row separators and 44px minimum row height.

## Elevation & Depth

Flat by default. Depth is tonal: Night (canvas) → Surface (sunken: inputs, chart wells, the committed lane) → Raised (interactive tiles: account cards, goal tiles, buttons). Only transient layers cast a shadow.

### Shadow Vocabulary
- **Floating** (`box-shadow: 0 20px 60px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset`): sheets, dialogs, command palette, popovers — on dark. On light: `0 20px 60px rgba(16,20,28,0.18)`.

### Named Rules
**The Flat-At-Rest Rule.** Nothing on the page casts a shadow at rest. If it has a shadow, it is temporary and can be dismissed.

## Shapes

Softly rounded, never pill-shaped except chips and the progress ring caps. Tiles and sheets 14px; buttons, inputs and menus 10px; chips pill; checkbox 6px; tiny dots and swatches 4px or circular. Borders are always the single 1px hairline; no 2px borders, no double borders. Progress rings use round line caps; progress bars are 6px tall with 999px radius and a hairline-filled track.

## Components

### Buttons
- **Shape:** gently rounded (10px), 36px tall on desktop, 44px on touch.
- **Primary:** Ledger Mint fill, On-Mint text, 14px horizontal padding, 500 weight. One per view.
- **Hover / Focus:** hover brightens fill 6%; active scales to 0.98 for 120ms; focus-visible shows a 2px mint ring offset 2px. Transitions 150ms ease-out.
- **Secondary:** Raised graphite fill, primary ink. **Ghost:** transparent, secondary ink, hover shows raised fill. **Danger:** ghost with coral text; fills coral on hover.

### Chips
- **Style:** pill, 24px tall, raised fill, label typography (11px caps). Entity chips prefix an 8px dot in the entity hue.
- **State:** selected filter chips invert to mint fill / on-mint text.

### Tiles (the only cards)
- **Corner Style:** 14px.
- **Background:** Surface at rest, Raised on hover when clickable.
- **Shadow Strategy:** none (Flat-At-Rest).
- **Border:** hairline.
- **Internal Padding:** 16px.
- Used for: account balances, goals, committed items, entity summaries. Never for grouping text.

### Inputs / Fields
- **Style:** Surface fill, hairline border, 10px radius, 40px tall, label above (always visible), helper/error below in 12px.
- **Focus:** border becomes mint, 2px mint ring at 30% alpha, 150ms.
- **Error / Disabled:** coral border + coral helper; disabled drops to 50% opacity, no hover.
- **Amount input:** mono, 24px, currency toggle (USD/MAD) as a segmented control on the right.

### Navigation
- Sidebar items: 36px rows, 10px radius, Lucide icon 18px + title. Active = raised fill + primary ink + 3px mint bar on the left edge (the bar carries meaning: current location). Hover = raised fill. Mobile tab bar: 56px + safe area, icon 22px + 11px label, active in mint.

### Signature — Net-worth figure + split bar
Display mono figure (USD), MAD line under it in secondary ink, delta chip (mint/coral) with "vs $5,000 start". Directly below, a 6px split bar: mint segment = available, amber segment = committed, with the two amounts labelled under each segment. A 90-day sparkline in 20% mint runs behind the figure, clipped to the section.

### Signature — Committed lane
Committed items render with a dashed hairline left-to-right under the amount and an amber dot, signalling "allocated, not moved". "Mark paid" turns the row solid, briefly flashes coral, then it slides to history.

## Do's and Don'ts

### Do:
- **Do** set every amount in Geist Mono with `font-variant-numeric: tabular-nums` and an explicit sign.
- **Do** use the three semantic colours strictly as in / out / pending.
- **Do** keep one primary (mint) button per screen.
- **Do** respect `prefers-reduced-motion`: swap count-ups and slides for instant state with a 120ms opacity fade.
- **Do** keep touch targets ≥44px and show visible labels on all fields.

### Don't:
- **Don't** use indigo/violet, gradients, glassmorphism or glows.
- **Don't** wrap text groupings in tiles; use spacing and hairlines.
- **Don't** add decorative accent stripes; the sidebar active bar is the only one.
- **Don't** use emoji as icons; Lucide only.
- **Don't** use red for "over target" when the target is a goal being exceeded — exceeding a positive target stays mint.
