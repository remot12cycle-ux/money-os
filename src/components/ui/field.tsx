import * as React from "react";
import { cn } from "@/lib/utils";

/* ─────────── Field wrapper: label always visible, error under the control ─────────── */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-coral" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full h-10 rounded-md border border-hairline bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30 disabled:opacity-50 aria-[invalid=true]:border-coral";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlBase, "h-auto min-h-20 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(controlBase, "appearance-none pr-9 cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ─────────── Segmented control ─────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
  name,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; tone?: "mint" | "coral" | "amber" | "neutral" }[];
  className?: string;
  size?: "sm" | "md";
  name?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center rounded-md border border-hairline bg-surface p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        const tone = o.tone ?? "neutral";
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            name={name}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[7px] font-medium transition-colors duration-150",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              active
                ? tone === "mint"
                  ? "bg-mint-soft text-mint"
                  : tone === "coral"
                    ? "bg-coral-soft text-coral"
                    : tone === "amber"
                      ? "bg-amber-soft text-amber"
                      : "bg-raised text-ink"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
