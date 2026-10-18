"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { formatMoney, type Currency, type FormatOptions } from "@/lib/money";

/** Animates a money figure from its previous value to `value`. */
export function CountUp({
  value,
  currency,
  className,
  duration = 0.7,
  ...opts
}: { value: number; currency: Currency; className?: string; duration?: number } & FormatOptions) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const fromRef = useRef(reduce ? value : 0);

  useEffect(() => {
    const controls = animate(fromRef.current, value, {
      duration: reduce ? 0 : duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
      onComplete: () => {
        fromRef.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className} aria-label={formatMoney(value, currency, opts)}>
      {formatMoney(shown, currency, opts)}
    </span>
  );
}
