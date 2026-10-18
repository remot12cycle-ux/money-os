"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { formatMoney, type Currency, type FormatOptions } from "@/lib/money";

/** Animates a money figure from 0 (or its previous value) to `value` on mount/change. */
export function CountUp({
  value,
  currency,
  className,
  duration = 700,
  ...opts
}: { value: number; currency: Currency; className?: string; duration?: number } & FormatOptions) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return (
    <span className={className} aria-label={formatMoney(value, currency, opts)}>
      {formatMoney(shown, currency, opts)}
    </span>
  );
}
