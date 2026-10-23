"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Sheet, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { AmountInput } from "./amount-input";
import { useRef_ } from "@/components/ref-provider";
import { saveCommitted } from "@/lib/actions/committed";
import type { CommittedRow } from "@/lib/db/types";
import type { Currency } from "@/lib/money";

export function CommittedSheet({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: CommittedRow | null;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit committed amount" : "Commit an amount"}
      description="Money you must pay later. It shows as committed and reduces what's available, without leaving your wallet yet."
    >
      <CommittedForm key={initial?.id ?? "new"} initial={initial ?? null} close={() => onOpenChange(false)} />
    </Sheet>
  );
}

function CommittedForm({ initial, close }: { initial: CommittedRow | null; close: () => void }) {
  const { accounts, categories, entities, profile } = useRef_();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? profile.base_currency);
  const [entityId, setEntityId] = useState(initial?.entity_id ?? entities.find((e) => e.slug === "cod-africa")?.id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [accountId, setAccountId] = useState(initial?.account_id ?? "");
  const [due, setDue] = useState(initial?.due_on ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  function submit() {
    start(async () => {
      const res = await saveCommitted({
        id: initial?.id,
        title,
        amount: Number(amount),
        currency,
        entity_id: entityId || null,
        category_id: categoryId || null,
        account_id: accountId || null,
        due_on: due || null,
        note: note || null,
      });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Updated" : "Committed amount added");
      close();
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <SheetBody className="flex flex-col gap-4">
        <Field label="Title" htmlFor="c_title" error={errors.title}>
          <Input id="c_title" placeholder="e.g. 200 units supplier invoice" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <AmountInput id="c_amount" value={amount} onChange={setAmount} currency={currency} onCurrencyChange={setCurrency} error={errors.amount} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entity" htmlFor="c_entity">
            <Select id="c_entity" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
              <option value="">None</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="c_cat">
            <Select id="c_cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories
                .filter((c) => c.kind === "expense" && !c.is_archived)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Will leave from" htmlFor="c_acc" hint="Optional">
            <Select id="c_acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Decide later</option>
              {accounts
                .filter((a) => !a.is_archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="c_due" hint="Optional">
            <Input id="c_due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" htmlFor="c_note">
          <Textarea id="c_note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16" />
        </Field>
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {initial ? "Save" : "Commit"}
        </Button>
      </SheetFooter>
    </form>
  );
}
