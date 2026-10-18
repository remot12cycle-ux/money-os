"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { Sheet, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { AmountInput } from "./amount-input";
import { useRef_ } from "@/components/ref-provider";
import { saveTransaction, type TxInput } from "@/lib/actions/transactions";
import type { TransactionRow, TxType } from "@/lib/db/types";
import type { Currency } from "@/lib/money";
import { todayISO } from "@/lib/dates";

type Meta = {
  ad_spend?: number;
  product_cost?: number;
  units?: number;
  delivered?: number;
  returned?: number;
  country?: string;
};

type Defaults = Partial<Pick<TxInput, "type" | "entity_id" | "account_id" | "currency">>;

export function TransactionSheet({
  open,
  onOpenChange,
  initial,
  defaults,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** editing an existing row */
  initial?: TransactionRow | null;
  /** presets for a new row (e.g. from the Businesses page) */
  defaults?: Defaults;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={initial ? "Edit transaction" : "Add transaction"}>
      {/* The form mounts fresh every time the sheet opens, so state resets for free. */}
      <TransactionForm key={initial?.id ?? "new"} initial={initial ?? null} defaults={defaults} close={() => onOpenChange(false)} />
    </Sheet>
  );
}

function TransactionForm({
  initial,
  defaults,
  close,
}: {
  initial: TransactionRow | null;
  defaults?: Defaults;
  close: () => void;
}) {
  const { accounts, categories, entities, profile } = useRef_();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const firstAccount = activeAccounts[0];

  const [type, setType] = useState<TxType>(initial?.type ?? defaults?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [accountId, setAccountId] = useState(initial?.account_id ?? defaults?.account_id ?? firstAccount?.id ?? "");
  // The account owns the currency (enforced server-side too).
  const currency: Currency =
    accounts.find((a) => a.id === accountId)?.currency ?? initial?.currency ?? firstAccount?.currency ?? profile.base_currency;
  const [toAccountId, setToAccountId] = useState(initial?.to_account_id ?? "");
  const [entityId, setEntityId] = useState(
    initial?.entity_id ?? defaults?.entity_id ?? entities.find((e) => e.kind === "personal")?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [date, setDate] = useState(initial?.occurred_on ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? "");
  const [meta, setMeta] = useState<Meta>((initial?.meta as Meta) ?? {});


  const entity = entities.find((e) => e.id === entityId);
  const isCod = entity?.slug === "cod-africa";

  const cats = useMemo(
    () =>
      categories.filter(
        (c) =>
          !c.is_archived &&
          c.kind === (type === "income" ? "income" : "expense") &&
          (!c.entity_id || c.entity_id === entityId),
      ),
    [categories, type, entityId],
  );

  function submit() {
    setErrors({});
    const payload: TxInput = {
      id: initial?.id,
      type,
      amount: Number(amount),
      currency,
      account_id: accountId,
      to_account_id: type === "transfer" ? toAccountId || null : null,
      category_id: type === "transfer" ? null : categoryId || null,
      entity_id: entityId || null,
      occurred_on: date,
      note: note || null,
      // Only send meta when the COD block was shown; otherwise the server keeps what's stored.
      meta: isCod ? meta : undefined,
    };
    start(async () => {
      const res = await saveTransaction(payload);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Transaction updated" : "Transaction added");
      close();
      router.refresh();
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
        <Segmented
          value={type}
          onChange={setType}
          className="w-full [&>button]:flex-1"
          options={[
            { value: "expense", label: "Expense", tone: "coral" },
            { value: "income", label: "Income", tone: "mint" },
            { value: "transfer", label: "Transfer", tone: "neutral" },
          ]}
        />

        <AmountInput
          value={amount}
          onChange={setAmount}
          currency={currency}
          onCurrencyChange={() => {}}
          locked
          autoFocus
          error={errors.amount}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label={type === "transfer" ? "From account" : "Account"} htmlFor="account" error={errors.account_id}>
            <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </Select>
          </Field>
          {type === "transfer" ? (
            <Field label="To account" htmlFor="to_account" error={errors.to_account_id}>
              <Select id="to_account" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Choose…</option>
                {activeAccounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </option>
                  ))}
              </Select>
            </Field>
          ) : (
            <Field label="Date" htmlFor="date" error={errors.occurred_on}>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}
        </div>

        {type !== "transfer" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entity" htmlFor="entity">
              <Select id="entity" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                {entities
                  .filter((e) => !e.is_archived)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="category">
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <Field label="Date" htmlFor="date2">
            <Input id="date2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}

        {isCod && type !== "transfer" ? (
          <fieldset className="rounded-lg border border-hairline p-3">
            <legend className="label px-1">COD details (optional)</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Units" htmlFor="units">
                <Input
                  id="units"
                  type="number"
                  inputMode="numeric"
                  value={meta.units ?? ""}
                  onChange={(e) => setMeta({ ...meta, units: e.target.value ? Number(e.target.value) : undefined })}
                />
              </Field>
              <Field label="Delivered" htmlFor="delivered">
                <Input
                  id="delivered"
                  type="number"
                  inputMode="numeric"
                  value={meta.delivered ?? ""}
                  onChange={(e) => setMeta({ ...meta, delivered: e.target.value ? Number(e.target.value) : undefined })}
                />
              </Field>
              <Field label="Returned" htmlFor="returned">
                <Input
                  id="returned"
                  type="number"
                  inputMode="numeric"
                  value={meta.returned ?? ""}
                  onChange={(e) => setMeta({ ...meta, returned: e.target.value ? Number(e.target.value) : undefined })}
                />
              </Field>
              <Field label="Country" htmlFor="country" className="col-span-2 sm:col-span-3">
                <Input
                  id="country"
                  placeholder="e.g. Senegal"
                  value={meta.country ?? ""}
                  onChange={(e) => setMeta({ ...meta, country: e.target.value || undefined })}
                />
              </Field>
            </div>
          </fieldset>
        ) : null}

        <Field label="Note" htmlFor="note">
          <Textarea
            id="note"
            placeholder="What was this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-16"
          />
        </Field>
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {initial ? "Save changes" : "Add"}
        </Button>
      </SheetFooter>
    </form>
  );
}
