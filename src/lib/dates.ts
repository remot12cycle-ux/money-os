import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameYear,
  parseISO,
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

/** "2026-10" → { from: "2026-10-01", to: "2026-10-31" } */
export function monthRange(month: string): { from: string; to: string } {
  const d = parseISO(`${month}-01`);
  return { from: toISO(startOfMonth(d)), to: toISO(endOfMonth(d)) };
}

export function currentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function shiftMonth(month: string, by: number): string {
  return format(addMonths(parseISO(`${month}-01`), by), "yyyy-MM");
}

export function monthLabel(month: string): string {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
}

export function lastNDays(n: number): string[] {
  const end = new Date();
  const start = subDays(end, n - 1);
  return eachDayOfInterval({ start, end }).map(toISO);
}

export function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(format(subMonths(now, i), "yyyy-MM"));
  return out;
}

export function daysLeftInMonth(month: string): number {
  const { to } = monthRange(month);
  const end = parseISO(to);
  const now = new Date();
  if (now > end) return 0;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
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
