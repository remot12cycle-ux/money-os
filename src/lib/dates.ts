import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameYear,
  parseISO,
  setDate,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

export const ISO = "yyyy-MM-dd";

export function todayISO(): string {
  return format(new Date(), ISO);
}

export function toISO(d: Date): string {
  return format(d, ISO);
}

/*
 * Finance periods. A period is keyed by "yyyy-MM" — the month it STARTS in.
 * With startDay = 1 that is the calendar month; with startDay = 25 the key
 * "2026-10" means 25 Oct → 24 Nov. startDay is clamped to 1–28.
 */
const clampDay = (d: number | null | undefined) => Math.min(28, Math.max(1, Math.trunc(Number(d) || 1)));

/** "2026-10" → { from: "2026-10-01", to: "2026-10-31" } (or 25 Oct → 24 Nov when startDay = 25) */
export function monthRange(month: string, startDay = 1): { from: string; to: string } {
  const s = clampDay(startDay);
  const first = parseISO(`${month}-01`);
  if (s === 1) return { from: toISO(startOfMonth(first)), to: toISO(endOfMonth(first)) };
  const from = setDate(first, s);
  return { from: toISO(from), to: toISO(subDays(addMonths(from, 1), 1)) };
}

/** Key of the period that contains `day` (default: today). */
export function periodOf(day: Date, startDay = 1): string {
  const s = clampDay(startDay);
  const d = day.getDate() >= s ? day : subMonths(day, 1);
  return format(d, "yyyy-MM");
}

export function currentMonth(startDay = 1): string {
  return periodOf(new Date(), startDay);
}

export function shiftMonth(month: string, by: number): string {
  return format(addMonths(parseISO(`${month}-01`), by), "yyyy-MM");
}

/** "October 2026", or "25 Oct – 24 Nov 2026" for a custom start day. */
export function monthLabel(month: string, startDay = 1): string {
  if (clampDay(startDay) === 1) return format(parseISO(`${month}-01`), "MMMM yyyy");
  const { from, to } = monthRange(month, startDay);
  const a = parseISO(from), b = parseISO(to);
  return isSameYear(a, b)
    ? `${format(a, "d MMM")} – ${format(b, "d MMM yyyy")}`
    : `${format(a, "d MMM yyyy")} – ${format(b, "d MMM yyyy")}`;
}

/** Compact label for chart axes: "Oct" (period start month). */
export function monthShort(month: string): string {
  return format(parseISO(`${month}-01`), "MMM");
}

export function lastNDays(n: number): string[] {
  const end = new Date();
  const start = subDays(end, n - 1);
  return eachDayOfInterval({ start, end }).map(toISO);
}

export function lastNMonths(n: number, startDay = 1): string[] {
  const now = currentMonth(startDay);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(now, -i));
  return out;
}

/** Days left in the period, counting today. */
export function daysLeftInMonth(month: string, startDay = 1): number {
  const { from, to } = monthRange(month, startDay);
  const today = todayISO();
  if (today > to) return 0;
  const startFrom = today < from ? from : today;
  return Math.round((parseISO(to).getTime() - parseISO(startFrom).getTime()) / 86_400_000) + 1;
}

/** Validate a ?month= search param, falling back to the current period. */
export function monthParam(v: string | undefined, startDay = 1): string {
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : currentMonth(startDay);
}

/** Human date for lists: Today / Yesterday / Mon 12 Oct / 12 Oct 2025 */
export function humanDate(iso: string): string {
  const d = parseISO(iso);
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, subDays(now, 1))) return "Yesterday";
  if (isSameDay(d, addDays(now, 1))) return "Tomorrow";
  return isSameYear(d, now) ? format(d, "EEE d MMM") : format(d, "d MMM yyyy");
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), "d MMM");
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return iso < todayISO();
}
