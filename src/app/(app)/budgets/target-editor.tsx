"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { saveMonthlyTarget } from "@/lib/actions/settings";
import type { TargetMetric } from "@/lib/db/types";
import type { Currency } from "@/lib/money";

export function TargetEditor({
  amount,
  metric,
  base,
  compact,
}: {
  amount: number;
  metric: TargetMetric;
  base: Currency;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(amount ? String(amount) : "");
  const [m, setM] = useState<TargetMetric>(metric);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      const res = await saveMonthlyTarget({ monthly_target: Number(value || 0), target_metric: m });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Monthly target updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={compact ? "ghost" : "secondary"}
        size="sm"
        onClick={() => {
          setValue(amount ? String(amount) : "");
          setM(metric);
          setOpen(true);
        }}
        className={compact ? "-ml-2 self-start" : undefined}
      >
        <Pencil /> {amount > 0 ? "Change target" : "Set target"}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Monthly target"
        description="The number you want to hit every month. Change it whenever your ambition does."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={pending}>
              Save target
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label={`Target (${base})`} htmlFor="target">
            <Input
              id="target"
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="num text-xl h-12"
              autoFocus
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-2">Measure</span>
            <Segmented
              value={m}
              onChange={setM}
              className="w-full [&>button]:flex-1"
              options={[
                { value: "net_profit", label: "Net profit", tone: "mint" },
                { value: "revenue", label: "Revenue" },
              ]}
            />
            <p className="text-xs text-ink-3">
              Net profit = income − expenses across all entities (salary included). Revenue = income only.
            </p>
          </div>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>
    </>
  );
}
