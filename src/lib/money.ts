/**
 * Money helpers. Amounts travel through the app as plain numbers in major units
 * (e.g. 12.5 USD) because Postgres `numeric(14,2)` already guarantees 2dp. All
 * arithmetic goes through `round2` to avoid float drift, and `toCents` is used
 * wherever exact integer comparison matters.
 */

export type Currency = "USD" | "MAD";
export const CURRENCIES: Currency[] = ["USD", "MAD"];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  MAD: "MAD",
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toCents(n: number): number {
  return Math.round(n * 100);
}

export function fromCents(c: number): number {
  return c / 100;
}

export function sum(values: Iterable<number>): number {
  let cents = 0;
  for (const v of values) cents += toCents(v);
  return fromCents(cents);
}

/** Convert `amount` in `from` to `base` using a USD→MAD rate. */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  usdToMad: number,
): number {
  if (from === to) return round2(amount);
  if (from === "USD" && to === "MAD") return round2(amount * usdToMad);
  if (from === "MAD" && to === "USD") return round2(amount / usdToMad);
  return round2(amount);
}

/** Rate multiplier to go from `from` into `base`. Stored on each transaction. */
export function rateToBase(from: Currency, base: Currency, usdToMad: number): number {
  if (from === base) return 1;
  if (from === "USD" && base === "MAD") return usdToMad;
  if (from === "MAD" && base === "USD") return 1 / usdToMad;
  return 1;
}

export type FormatOptions = {
  /** show +/− sign explicitly */
  sign?: boolean;
  /** drop decimals when the value is a whole number */
  compactDecimals?: boolean;
  /** abbreviate thousands (12.4k) */
  abbreviate?: boolean;
};

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const usdFmt0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const madFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const madFmt0 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatMoney(
  amount: number,
  currency: Currency,
  opts: FormatOptions = {},
): string {
  const abs = Math.abs(amount);
  const whole = Number.isInteger(round2(abs));
  const useZero = opts.compactDecimals && whole;

  let body: string;
  if (opts.abbreviate && abs >= 10_000) {
    const k = abs / 1000;
    const kStr = k >= 100 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "");
    body = currency === "USD" ? `$${kStr}k` : `${kStr}k MAD`;
  } else if (currency === "USD") {
    body = (useZero ? usdFmt0 : usdFmt).format(abs);
  } else {
    body = `${(useZero ? madFmt0 : madFmt).format(abs)} MAD`;
  }

  if (amount < 0) return `−${body}`;
  if (opts.sign && amount > 0) return `+${body}`;
  return body;
}

export function formatPercent(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function signOf(n: number): "pos" | "neg" | "zero" {
  if (n > 0) return "pos";
  if (n < 0) return "neg";
  return "zero";
}
