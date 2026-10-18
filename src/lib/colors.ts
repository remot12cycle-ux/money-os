import type { CSSProperties } from "react";

/** Inline CSS variable for the `.entity` CSS hooks (dot / text re-stepped per theme). */
export function entityVars(hex: string | null | undefined): CSSProperties {
  return { ["--entity" as string]: hex ?? "#788ED6" };
}

/* ───────── OKLCH math (for chart colours, where CSS relative colour isn't available) ───────── */

function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(c: number) {
  const x = Math.max(0, Math.min(1, c));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

export function hexToOklch(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = srgbToLinear(parseInt(h.slice(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(h.slice(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(h.slice(4, 6), 16) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

export function oklchToHex(L: number, C: number, H: number): string {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const to = (x: number) =>
    Math.round(linearToSrgb(x) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(bb)}`;
}

/** Entity colour re-stepped for the current theme (dark: L .62, light: L .52). */
export function entityColorFor(hex: string | null | undefined, dark: boolean): string {
  const [, C, H] = hexToOklch(hex ?? "#788ED6");
  return oklchToHex(dark ? 0.62 : 0.52, C, H);
}

export function useIsDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}
