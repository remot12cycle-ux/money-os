import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMoney, type Currency, type FormatOptions } from "@/lib/money";
import { entityVars } from "@/lib/colors";

/* ─────────── Page header ─────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ─────────── Section (no card chrome) ─────────── */
export function Section({
  title,
  aside,
  children,
  className,
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      {title || aside ? (
        <div className="flex items-center justify-between gap-3">
          {title ? <h2 className="label">{title}</h2> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ─────────── Tile — the only card. Interactive container. ─────────── */
export function Tile({
  className,
  interactive,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-surface p-4",
        interactive && "transition-colors duration-150 hover:bg-raised cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

/* ─────────── Entity dot (theme-aware colour) ─────────── */
export function EntityDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("entity-dot inline-block size-2 shrink-0 rounded-full", className)}
      style={entityVars(color)}
    />
  );
}

/* ─────────── Chip ─────────── */
export function Chip({
  children,
  color,
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & {
  color?: string | null;
  tone?: "mint" | "coral" | "amber" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium uppercase tracking-[0.06em]",
        tone === "mint" && "bg-mint-soft text-mint",
        tone === "coral" && "bg-coral-soft text-coral",
        tone === "amber" && "bg-amber-soft text-amber",
        (!tone || tone === "neutral") && "bg-raised text-ink-2",
        className,
      )}
      {...props}
    >
      {color ? <EntityDot color={color} /> : null}
      {children}
    </span>
  );
}

/* ─────────── Money ─────────── */
export function Money({
  amount,
  currency,
  tone = "auto",
  className,
  ...opts
}: {
  amount: number;
  currency: Currency;
  tone?: "auto" | "neutral" | "mint" | "coral" | "amber";
  className?: string;
} & FormatOptions) {
  const t =
    tone === "auto" ? (amount > 0 ? "mint" : amount < 0 ? "coral" : "neutral") : tone;
  return (
    <span
      className={cn(
        "num",
        t === "mint" && "text-mint",
        t === "coral" && "text-coral",
        t === "amber" && "text-amber",
        t === "neutral" && "text-ink",
        className,
      )}
    >
      {formatMoney(amount, currency, opts)}
    </span>
  );
}

/* ─────────── Progress bar ─────────── */
export function ProgressBar({
  ratio,
  tone = "mint",
  className,
  track,
}: {
  ratio: number;
  tone?: "mint" | "coral" | "amber";
  className?: string;
  track?: string;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-hairline", track, className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "mint" && "bg-mint",
          tone === "coral" && "bg-coral",
          tone === "amber" && "bg-amber",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─────────── Empty state ─────────── */
export function Empty({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline-strong px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-ink-3 [&_svg]:size-6">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {body ? <p className="max-w-sm text-sm text-ink-2">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ─────────── Skeleton ─────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-raised", className)} />;
}

/* ─────────── Stat ─────────── */
export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="label">{label}</span>
      <span className="num text-xl font-medium tracking-[-0.02em]">{value}</span>
      {sub ? <span className="text-xs text-ink-2">{sub}</span> : null}
    </div>
  );
}

/* ─────────── Divider row list helpers ─────────── */
export function Rows({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-hairline", className)}>{children}</div>;
}
