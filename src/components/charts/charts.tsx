"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "motion/react";
import { formatMoney, type Currency } from "@/lib/money";
import { entityColorFor } from "@/lib/colors";
import { cn } from "@/lib/utils";

/* ───────── theme hook for chart colours ───────── */
export function useThemeColors() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const css = (v: string) =>
    typeof window === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return {
    dark,
    mint: css("--mint") || (dark ? "#2fe3a5" : "#0f9d6e"),
    coral: css("--coral") || (dark ? "#f4645f" : "#d9403b"),
    amber: css("--amber") || (dark ? "#f2b544" : "#b9780c"),
    ink2: css("--ink-2") || (dark ? "#a4abb6" : "#5b6472"),
    ink3: css("--ink-3") || (dark ? "#6b7280" : "#8a93a1"),
    hairline: dark ? "rgba(255,255,255,0.08)" : "rgba(16,20,28,0.08)",
    raised: css("--raised") || (dark ? "#171b21" : "#f1f3f6"),
  };
}

/* ───────── Tooltip ───────── */
function TipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-md border border-hairline bg-raised px-3 py-2 text-xs shadow-float">
      <div className="mb-1 font-medium text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 text-ink-2">
          <span className="flex items-center gap-1.5">
            {r.color ? <span className="size-2 rounded-full" style={{ background: r.color }} /> : null}
            {r.label}
          </span>
          <span className="num text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────── Sparkline ───────── */
export function Sparkline({
  data,
  currency,
  className,
}: {
  data: { date: string; value: number }[];
  currency: Currency;
  className?: string;
}) {
  const c = useThemeColors();
  const id = "spark-fill";
  const last = data.at(-1)?.value ?? 0;
  const first = data[0]?.value ?? 0;
  const tone = last >= first ? c.mint : c.coral;
  return (
    <div className={cn("h-full w-full", className)} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity={0.22} />
              <stop offset="100%" stopColor={tone} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            cursor={{ stroke: c.ink3, strokeWidth: 1, strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox
                  title={String(payload[0]!.payload.date)}
                  rows={[{ label: "Net worth", value: formatMoney(Number(payload[0]!.value), currency) }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={tone}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: c.raised }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ───────── Income vs expenses (grouped bars) ───────── */
export function IncomeExpenseChart({
  data,
  currency,
}: {
  data: { month: string; income: number; expenses: number; net: number }[];
  currency: Currency;
}) {
  const c = useThemeColors();
  const label = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleString("en", { month: "short" });
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={2} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={c.hairline} />
          <XAxis
            dataKey="month"
            tickFormatter={label}
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.ink2, fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: c.ink3, fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v) => formatMoney(Number(v), currency, { abbreviate: true, compactDecimals: true })}
          />
          <Tooltip
            cursor={{ fill: c.hairline }}
            content={({ active, payload, label: l }) =>
              active && payload?.length ? (
                <TipBox
                  title={new Date(`${l}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" })}
                  rows={[
                    { label: "Income", value: formatMoney(Number(payload[0]?.value ?? 0), currency), color: c.mint },
                    { label: "Expenses", value: formatMoney(Number(payload[1]?.value ?? 0), currency), color: c.coral },
                    {
                      label: "Net",
                      value: formatMoney(Number(payload[0]?.payload.net ?? 0), currency, { sign: true }),
                    },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="income" fill={c.mint} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="expenses" fill={c.coral} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center gap-4 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: c.mint }} /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: c.coral }} /> Expenses
        </span>
      </div>
    </div>
  );
}

/* ───────── Entity P&L horizontal bars ───────── */
export function EntityBars({
  rows,
  currency,
}: {
  rows: { name: string; color: string; income: number; expenses: number; net: number }[];
  currency: Currency;
}) {
  const c = useThemeColors();
  const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expenses)));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const col = entityColorFor(r.color, c.dark);
        return (
          <li key={r.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: col }} />
                {r.name}
              </span>
              <span className={cn("num text-[13px]", r.net > 0 ? "text-mint" : r.net < 0 ? "text-coral" : "text-ink-2")}>
                {formatMoney(r.net, currency, { sign: true, compactDecimals: true })}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="h-1.5 w-full rounded-full bg-hairline">
                <div className="h-full rounded-full" style={{ width: `${(r.income / max) * 100}%`, background: col }} />
              </div>
              <div className="h-1.5 w-full rounded-full bg-hairline">
                <div className="h-full rounded-full" style={{ width: `${(r.expenses / max) * 100}%`, background: col, opacity: 0.4 }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────── Target ring ───────── */
export function TargetRing({
  ratio,
  size = 148,
  stroke = 12,
  children,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--mint)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ───────── Category spend (simple) ───────── */
export function CategoryBars({
  rows,
  currency,
}: {
  rows: { name: string; value: number }[];
  currency: Currency;
}) {
  const c = useThemeColors();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fill: c.ink2, fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: c.hairline }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TipBox title={String(payload[0]!.payload.name)} rows={[{ label: "Spent", value: formatMoney(Number(payload[0]!.value), currency) }]} />
              ) : null
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((_, i) => (
              <Cell key={i} fill={c.coral} fillOpacity={0.9 - i * 0.08} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
