"use client";

import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import { useRef_ } from "@/components/ref-provider";
import { EntityDot, Money } from "@/components/ui/primitives";
import type { TransactionRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export function TxRow({
  tx,
  onEdit,
  onDelete,
  compact,
}: {
  tx: TransactionRow;
  onEdit?: (tx: TransactionRow) => void;
  onDelete?: (tx: TransactionRow) => void;
  compact?: boolean;
}) {
  const { entities, categories, accounts } = useRef_();
  const entity = entities.find((e) => e.id === tx.entity_id);
  const category = categories.find((c) => c.id === tx.category_id);
  const account = accounts.find((a) => a.id === tx.account_id);
  const toAccount = accounts.find((a) => a.id === tx.to_account_id);

  const title =
    tx.note?.trim() ||
    (tx.type === "transfer"
      ? `${account?.name ?? "?"} → ${toAccount?.name ?? "?"}`
      : category?.name || (tx.type === "income" ? "Income" : "Expense"));

  const sub = [
    tx.type === "transfer" ? null : account?.name,
    tx.type !== "transfer" && tx.note?.trim() && category ? category.name : null,
    tx.source === "ingest" ? "via API" : tx.source === "committed" ? "committed → paid" : tx.source === "recurring" ? "recurring" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const amount = tx.type === "expense" ? -tx.amount : tx.amount;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 py-2.5",
        onEdit && "cursor-pointer hover:bg-raised/60 -mx-2 rounded-md px-2",
      )}
      onClick={onEdit ? () => onEdit(tx) : undefined}
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === "Enter") onEdit(tx);
            }
          : undefined
      }
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-md",
          tx.type === "income" && "bg-mint-soft text-mint",
          tx.type === "expense" && "bg-coral-soft text-coral",
          tx.type === "transfer" && "bg-raised text-ink-2",
        )}
        aria-hidden
      >
        {tx.type === "transfer" ? (
          <ArrowLeftRight className="size-4" />
        ) : (
          <span className="num text-sm font-semibold">{tx.type === "income" ? "+" : "−"}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {entity && !compact ? (
            <span className="hidden items-center gap-1.5 text-[11px] text-ink-3 sm:inline-flex">
              <EntityDot color={entity.color} />
              {entity.name}
            </span>
          ) : null}
        </div>
        {sub ? <div className="truncate text-xs text-ink-3">{sub}</div> : null}
      </div>
      <div className="flex flex-col items-end">
        <Money
          amount={amount}
          currency={tx.currency}
          tone={tx.type === "transfer" ? "neutral" : "auto"}
          sign
          className="text-sm font-medium"
        />
        {!compact ? <span className="num text-[11px] text-ink-3">{tx.occurred_on}</span> : null}
      </div>
      {onEdit || onDelete ? (
        <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
          {onEdit ? (
            <button
              type="button"
              className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-raised hover:text-ink"
              aria-label="Edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tx);
              }}
            >
              <Pencil className="size-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-coral-soft hover:text-coral"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tx);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
