"use client";

import { Segmented } from "@/components/ui/field";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

export function AmountInput({
  value,
  onChange,
  currency,
  onCurrencyChange,
  autoFocus,
  error,
  id = "amount",
  locked,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  autoFocus?: boolean;
  error?: string;
  id?: string;
  /** currency follows the selected account; show it instead of a toggle */
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        Amount
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-hairline bg-surface pl-3 pr-1.5 transition-[border-color,box-shadow] focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/30",
          error && "border-coral",
        )}
      >
        <span className="num text-xl text-ink-3">{currency === "USD" ? "$" : "DH"}</span>
        <input
          id={id}
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="num h-12 w-full bg-transparent text-2xl font-medium tracking-[-0.02em] text-ink outline-none placeholder:text-ink-3"
          aria-invalid={error ? true : undefined}
        />
        {locked ? (
          <span className="label mr-1.5 rounded-md bg-raised px-2 py-1" title="Currency follows the account">
            {currency}
          </span>
        ) : (
          <Segmented
            size="sm"
            value={currency}
            onChange={onCurrencyChange}
            options={[
              { value: "USD", label: "USD" },
              { value: "MAD", label: "MAD" },
            ]}
          />
        )}
      </div>
      {error ? (
        <p className="text-xs text-coral" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
