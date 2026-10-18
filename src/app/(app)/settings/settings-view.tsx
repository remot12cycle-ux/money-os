"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Download, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Tabs } from "radix-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select } from "@/components/ui/field";
import { Sheet, ConfirmDialog } from "@/components/ui/sheet";
import { Empty, EntityDot, Rows, Section, Tile } from "@/components/ui/primitives";
import type { RefData } from "@/components/ref-provider";
import {
  createApiKey, deleteAccount, deleteCategory, deleteEntity, deleteRecurring, refreshRate, revokeApiKey,
  saveAccount, saveCategory, saveEntity, saveProfile, saveRecurring,
} from "@/lib/actions/settings";
import type { AccountRow, CategoryRow, EntityRow, RecurringRow } from "@/lib/db/types";
import { formatMoney } from "@/lib/money";
import { humanDate, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

type ApiKeyLite = { id: string; name: string; key_prefix: string; last_used_at: string | null; revoked_at: string | null; created_at: string };

const TABS = [
  { id: "general", label: "General" },
  { id: "entities", label: "Entities" },
  { id: "categories", label: "Categories" },
  { id: "accounts", label: "Accounts" },
  { id: "recurring", label: "Recurring" },
  { id: "integrations", label: "Integrations" },
] as const;

export function SettingsView({ apiKeys, recurring, refData }: { apiKeys: ApiKeyLite[]; recurring: RecurringRow[]; refData: RefData }) {
  return (
    <Tabs.Root defaultValue="general" className="flex flex-col gap-6">
      <Tabs.List className="-mx-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 md:mx-0 md:px-0" aria-label="Settings sections">
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="relative h-10 shrink-0 px-3 text-sm text-ink-2 transition-colors hover:text-ink data-[state=active]:text-ink data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-mint"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="general"><GeneralTab ref_={refData} /></Tabs.Content>
      <Tabs.Content value="entities"><EntitiesTab entities={refData.entities} /></Tabs.Content>
      <Tabs.Content value="categories"><CategoriesTab categories={refData.categories} entities={refData.entities} /></Tabs.Content>
      <Tabs.Content value="accounts"><AccountsTab accounts={refData.accounts} /></Tabs.Content>
      <Tabs.Content value="recurring"><RecurringTab rules={recurring} ref_={refData} /></Tabs.Content>
      <Tabs.Content value="integrations"><IntegrationsTab keys={apiKeys} ref_={refData} /></Tabs.Content>
    </Tabs.Root>
  );
}

/* ─────────── General ─────────── */
function GeneralTab({ ref_ }: { ref_: RefData }) {
  const p = ref_.profile;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    display_name: p.display_name ?? "",
    base_currency: p.base_currency,
    starting_capital: String(p.starting_capital),
    monthly_target: String(p.monthly_target),
    target_metric: p.target_metric,
    usd_to_mad: String(p.usd_to_mad),
  });

  function save() {
    start(async () => {
      const r = await saveProfile({ ...form, starting_capital: Number(form.starting_capital), monthly_target: Number(form.monthly_target), usd_to_mad: Number(form.usd_to_mad) });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Saved");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Section title="Profile & capital">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Display name" htmlFor="s_name"><Input id="s_name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></Field>
          <Field label="Base currency" htmlFor="s_base" hint="All totals, charts and targets are shown in this currency.">
            <Segmented value={form.base_currency} onChange={(v) => setForm({ ...form, base_currency: v })} options={[{ value: "USD", label: "USD" }, { value: "MAD", label: "MAD" }]} />
          </Field>
          <Field label={`Starting capital (${form.base_currency})`} htmlFor="s_cap" hint="Net worth growth is measured against this number.">
            <Input id="s_cap" type="number" inputMode="decimal" value={form.starting_capital} onChange={(e) => setForm({ ...form, starting_capital: e.target.value })} className="num" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Monthly target (${form.base_currency})`} htmlFor="s_target">
              <Input id="s_target" type="number" inputMode="decimal" value={form.monthly_target} onChange={(e) => setForm({ ...form, monthly_target: e.target.value })} className="num" />
            </Field>
            <Field label="Measured as" htmlFor="s_metric">
              <Select id="s_metric" value={form.target_metric} onChange={(e) => setForm({ ...form, target_metric: e.target.value as "net_profit" | "revenue" })}>
                <option value="net_profit">Net profit</option>
                <option value="revenue">Revenue</option>
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="primary" loading={pending} className="self-start">Save</Button>
        </form>
      </Section>

      <Section title="Exchange rate">
        <div className="flex flex-col gap-4">
          <Field label="1 USD =" htmlFor="s_rate" hint={p.rate_updated_at ? `Last updated ${humanDate(p.rate_updated_at.slice(0, 10))}` : "Set manually or refresh from the live market rate."}>
            <div className="flex items-center gap-2">
              <Input id="s_rate" type="number" inputMode="decimal" step="0.0001" value={form.usd_to_mad} onChange={(e) => setForm({ ...form, usd_to_mad: e.target.value })} className="num" />
              <span className="text-sm text-ink-2">MAD</span>
            </div>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => start(async () => { const r = await refreshRate(); if (!r.ok) return void toast.error(r.error); setForm((f) => ({ ...f, usd_to_mad: String(r.data.rate) })); toast.success(`Live rate: 1 USD = ${r.data.rate} MAD`); router.refresh(); })} loading={pending}>
              <RefreshCw /> Refresh live rate
            </Button>
            <Button variant="primary" onClick={save} loading={pending}>Save rate</Button>
          </div>
          <p className="text-xs text-ink-3">New transactions snapshot the rate at the moment they are added, so past totals don&apos;t shift when the rate moves.</p>
        </div>
        <ExportCard />
      </Section>
    </div>
  );
}

function ExportCard() {
  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-hairline pt-6">
      <h3 className="label">Export</h3>
      <p className="text-sm text-ink-2">Download all transactions as CSV for Excel or an accountant.</p>
      <Button asChild variant="outline" className="self-start">
        <a href="/api/export/transactions.csv" download>
          <Download /> transactions.csv
        </a>
      </Button>
    </div>
  );
}

/* ─────────── Entities ─────────── */
function EntitiesTab({ entities }: { entities: EntityRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<EntityRow | null | "new">(null);
  const [form, setForm] = useState({ name: "", kind: "business" as EntityRow["kind"], color: "#5BB5F5" });
  const [confirm, setConfirm] = useState<EntityRow | null>(null);

  function open(e: EntityRow | "new") {
    setForm(e === "new" ? { name: "", kind: "business", color: "#0098D4" } : { name: e.name, kind: e.kind, color: e.color });
    setEdit(e);
  }
  function save() {
    start(async () => {
      const r = await saveEntity({ id: edit !== "new" && edit ? edit.id : undefined, ...form, is_archived: edit !== "new" && edit ? edit.is_archived : false });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Saved");
      setEdit(null);
      router.refresh();
    });
  }
  function archive(e: EntityRow) {
    start(async () => {
      const r = await saveEntity({ id: e.id, name: e.name, kind: e.kind, color: e.color, is_archived: !e.is_archived });
      if (!r.ok) return void toast.error(r.error);
      router.refresh();
    });
  }

  return (
    <Section title="Where your money belongs" aside={<Button size="sm" variant="secondary" onClick={() => open("new")}><Plus /> Add entity</Button>}>
      <p className="text-sm text-ink-2 -mt-1">Each transaction belongs to one entity: Personal, a business, or your salary. Businesses get their own P&L page.</p>
      <Rows>
        {entities.map((e) => (
          <div key={e.id} className={cn("flex items-center gap-3 py-3", e.is_archived && "opacity-50")}>
            <EntityDot color={e.color} className="size-3" />
            <button type="button" className="flex-1 text-left text-sm font-medium hover:underline" onClick={() => open(e)}>{e.name}</button>
            <span className="label">{e.kind}</span>
            <Button size="icon-sm" variant="ghost" aria-label={e.is_archived ? "Unarchive" : "Archive"} onClick={() => archive(e)} title={e.is_archived ? "Unarchive" : "Archive"}><Archive /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setConfirm(e)} className="hover:text-coral"><Trash2 /></Button>
          </div>
        ))}
      </Rows>
      <Sheet open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "New entity" : "Edit entity"} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save} loading={pending}>Save</Button></>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Name" htmlFor="e_name"><Input id="e_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Kind" htmlFor="e_kind"><Select id="e_kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EntityRow["kind"] })}><option value="business">Business</option><option value="salary">Salary / job</option><option value="personal">Personal</option></Select></Field>
          <Field label="Colour" htmlFor="e_color" hint="Shown as a dot and in charts.">
            <div className="flex items-center gap-2">
              <input id="e_color" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} className="h-10 w-14 cursor-pointer rounded-md border border-hairline bg-surface p-1" />
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="num w-32" />
            </div>
          </Field>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>
      <ConfirmDialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)} title={`Delete ${confirm?.name}?`} description="Transactions keep their amounts but lose this entity. Prefer archiving if you might need it again." loading={pending} onConfirm={() => confirm && start(async () => { const r = await deleteEntity(confirm.id); if (!r.ok) toast.error(r.error); else toast.success("Deleted"); setConfirm(null); router.refresh(); })} />
    </Section>
  );
}

/* ─────────── Categories ─────────── */
function CategoriesTab({ categories, entities }: { categories: CategoryRow[]; entities: EntityRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<CategoryRow | null | "new">(null);
  const [form, setForm] = useState({ name: "", kind: "expense" as CategoryRow["kind"], entity_id: "" });

  function open(c: CategoryRow | "new", kind?: CategoryRow["kind"]) {
    setForm(c === "new" ? { name: "", kind: kind ?? "expense", entity_id: "" } : { name: c.name, kind: c.kind, entity_id: c.entity_id ?? "" });
    setEdit(c);
  }
  function save() {
    start(async () => {
      const r = await saveCategory({ id: edit !== "new" && edit ? edit.id : undefined, name: form.name, kind: form.kind, entity_id: form.entity_id || null });
      if (!r.ok) return void toast.error(r.error);
      setEdit(null);
      router.refresh();
    });
  }
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {(["expense", "income"] as const).map((kind) => (
        <CategoryList
          key={kind}
          kind={kind}
          categories={categories}
          entities={entities}
          open={open}
          onToggleArchive={(c) => start(async () => { await saveCategory({ id: c.id, name: c.name, kind: c.kind, entity_id: c.entity_id, is_archived: !c.is_archived }); router.refresh(); })}
          onDelete={(c) => start(async () => { const r = await deleteCategory(c.id); if (!r.ok) toast.error(r.error); router.refresh(); })}
        />
      ))}
      <Sheet open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "New category" : "Edit category"} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save} loading={pending}>Save</Button></>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Name" htmlFor="c_name"><Input id="c_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Kind" htmlFor="c_kind"><Segmented value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={[{ value: "expense", label: "Expense", tone: "coral" }, { value: "income", label: "Income", tone: "mint" }]} /></Field>
          <Field label="Only for entity" htmlFor="c_ent" hint="Leave on 'All' to use it everywhere."><Select id="c_ent" value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })}><option value="">All entities</option>{entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>
    </div>
  );
}

function CategoryList({
kind, categories, entities, open, onToggleArchive, onDelete,
}: {
kind: CategoryRow["kind"];
categories: CategoryRow[];
entities: EntityRow[];
open: (c: CategoryRow | "new", kind?: CategoryRow["kind"]) => void;
onToggleArchive: (c: CategoryRow) => void;
onDelete: (c: CategoryRow) => void;
}) {
return (
  <Section title={kind === "income" ? "Income categories" : "Expense categories"} aside={<Button size="sm" variant="ghost" onClick={() => open("new", kind)}><Plus /> Add</Button>}>
    <Rows>
      {categories.filter((c) => c.kind === kind).map((c) => {
        const ent = entities.find((e) => e.id === c.entity_id);
        return (
          <div key={c.id} className={cn("flex items-center gap-3 py-2.5", c.is_archived && "opacity-50")}>
            <button type="button" className="flex-1 text-left text-sm hover:underline" onClick={() => open(c)}>{c.name}</button>
            {ent ? <span className="flex items-center gap-1 text-xs text-ink-3"><EntityDot color={ent.color} />{ent.name}</span> : <span className="text-xs text-ink-3">All entities</span>}
            <Button size="icon-sm" variant="ghost" aria-label="Archive" onClick={() => onToggleArchive(c)}><Archive /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete" className="hover:text-coral" onClick={() => onDelete(c)}><Trash2 /></Button>
          </div>
        );
      })}
    </Rows>
  </Section>
);
}

/* ─────────── Accounts ─────────── */
function AccountsTab({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<AccountRow | null | "new">(null);
  const [form, setForm] = useState({ name: "", type: "bank" as AccountRow["type"], currency: "USD" as AccountRow["currency"] });
  function open(a: AccountRow | "new") {
    setForm(a === "new" ? { name: "", type: "bank", currency: "USD" } : { name: a.name, type: a.type, currency: a.currency });
    setEdit(a);
  }
  function save() {
    start(async () => {
      const r = await saveAccount({ id: edit !== "new" && edit ? edit.id : undefined, ...form, is_archived: edit !== "new" && edit ? edit.is_archived : false });
      if (!r.ok) return void toast.error(r.error);
      setEdit(null);
      router.refresh();
    });
  }
  return (
    <Section title="Accounts & wallets" aside={<Button size="sm" variant="secondary" onClick={() => open("new")}><Plus /> Add account</Button>}>
      <p className="-mt-1 text-sm text-ink-2">Bank accounts, cash, Payoneer, PayPal, cards… each in its own currency. Balances are computed from transactions.</p>
      <Rows>
        {accounts.map((a) => (
          <div key={a.id} className={cn("flex items-center gap-3 py-3", a.is_archived && "opacity-50")}>
            <button type="button" className="flex-1 text-left text-sm font-medium hover:underline" onClick={() => open(a)}>{a.name}</button>
            <span className="label">{a.type}</span>
            <span className="num text-xs text-ink-2">{a.currency}</span>
            <Button size="icon-sm" variant="ghost" aria-label={a.is_archived ? "Unarchive" : "Archive"} onClick={() => start(async () => { await saveAccount({ id: a.id, name: a.name, type: a.type, currency: a.currency, is_archived: !a.is_archived }); router.refresh(); })}><Archive /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Delete" className="hover:text-coral" onClick={() => start(async () => { const r = await deleteAccount(a.id); if (!r.ok) toast.error(r.error); router.refresh(); })}><Trash2 /></Button>
          </div>
        ))}
      </Rows>
      <Sheet open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "New account" : "Edit account"} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save} loading={pending}>Save</Button></>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Name" htmlFor="a_name"><Input id="a_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="e.g. Payoneer" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="a_type"><Select id="a_type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountRow["type"] })}><option value="bank">Bank</option><option value="cash">Cash</option><option value="wallet">Wallet (PayPal, Payoneer…)</option><option value="card">Card</option><option value="other">Other</option></Select></Field>
            <Field label="Currency" htmlFor="a_cur"><Segmented value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={[{ value: "USD", label: "USD" }, { value: "MAD", label: "MAD" }]} /></Field>
          </div>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>
    </Section>
  );
}

/* ─────────── Recurring ─────────── */
function RecurringTab({ rules, ref_ }: { rules: RecurringRow[]; ref_: RefData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<RecurringRow | null | "new">(null);
  const first = ref_.accounts[0];
  const blank = { title: "", type: "expense" as RecurringRow["type"], amount: "", currency: (first?.currency ?? "USD") as RecurringRow["currency"], account_id: first?.id ?? "", category_id: "", entity_id: ref_.entities.find((e) => e.kind === "personal")?.id ?? "", cadence: "monthly" as RecurringRow["cadence"], next_run_on: todayISO() };
  const [form, setForm] = useState(blank);
  function open(r: RecurringRow | "new") {
    setForm(r === "new" ? blank : { title: r.title, type: r.type, amount: String(r.amount), currency: r.currency, account_id: r.account_id, category_id: r.category_id ?? "", entity_id: r.entity_id ?? "", cadence: r.cadence, next_run_on: r.next_run_on });
    setEdit(r);
  }
  function save() {
    start(async () => {
      const r = await saveRecurring({ id: edit !== "new" && edit ? edit.id : undefined, ...form, amount: Number(form.amount), category_id: form.category_id || null, entity_id: form.entity_id || null, is_active: edit !== "new" && edit ? edit.is_active : true });
      if (!r.ok) return void toast.error(r.error);
      setEdit(null);
      router.refresh();
    });
  }
  const cats = ref_.categories.filter((c) => c.kind === form.type && !c.is_archived);
  return (
    <Section title="Recurring income & charges" aside={<Button size="sm" variant="secondary" onClick={() => open("new")}><Plus /> Add rule</Button>}>
      <p className="-mt-1 text-sm text-ink-2">Salary, rent, servers, subscriptions. Due rules are turned into transactions automatically every day (and you can run them now).</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => start(async () => { const res = await fetch("/api/cron/recurring", { method: "POST" }); const j = await res.json().catch(() => ({})); if (!res.ok) return void toast.error(j.error ?? "Failed"); toast.success(`Created ${j.created ?? 0} transaction${j.created === 1 ? "" : "s"}`); router.refresh(); })} loading={pending}>
          <RefreshCw /> Run due rules now
        </Button>
      </div>
      {rules.length ? (
        <Rows>
          {rules.map((r) => {
            const acc = ref_.accounts.find((a) => a.id === r.account_id);
            return (
              <div key={r.id} className={cn("flex items-center gap-3 py-3", !r.is_active && "opacity-50")}>
                <span className={cn("size-2 rounded-full", r.type === "income" ? "bg-mint" : "bg-coral")} />
                <button type="button" className="flex-1 text-left text-sm font-medium hover:underline" onClick={() => open(r)}>{r.title}</button>
                <span className="text-xs text-ink-3">{r.cadence} · next {humanDate(r.next_run_on)} · {acc?.name}</span>
                <span className="num text-sm">{formatMoney(Number(r.amount), r.currency)}</span>
                <Button size="icon-sm" variant="ghost" aria-label={r.is_active ? "Pause" : "Resume"} onClick={() => start(async () => { await saveRecurring({ id: r.id, title: r.title, type: r.type, amount: Number(r.amount), currency: r.currency, account_id: r.account_id, category_id: r.category_id, entity_id: r.entity_id, cadence: r.cadence, next_run_on: r.next_run_on, is_active: !r.is_active }); router.refresh(); })}><Archive /></Button>
                <Button size="icon-sm" variant="ghost" aria-label="Delete" className="hover:text-coral" onClick={() => start(async () => { const x = await deleteRecurring(r.id); if (!x.ok) toast.error(x.error); router.refresh(); })}><Trash2 /></Button>
              </div>
            );
          })}
        </Rows>
      ) : (
        <Empty title="No recurring rules" body="Add your salary and fixed charges so they book themselves." />
      )}
      <Sheet open={Boolean(edit)} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "New recurring rule" : "Edit rule"} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" onClick={save} loading={pending}>Save</Button></>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Segmented value={form.type} onChange={(v) => setForm({ ...form, type: v, category_id: "" })} className="w-full [&>button]:flex-1" options={[{ value: "expense", label: "Expense", tone: "coral" }, { value: "income", label: "Income", tone: "mint" }]} />
          <Field label="Title" htmlFor="r_title"><Input id="r_title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus placeholder="e.g. Salary, Office rent, Vercel" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount" htmlFor="r_amount"><Input id="r_amount" type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="num" /></Field>
            <Field label="Currency" htmlFor="r_cur"><Segmented value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} options={[{ value: "USD", label: "USD" }, { value: "MAD", label: "MAD" }]} /></Field>
            <Field label="Account" htmlFor="r_acc"><Select id="r_acc" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>{ref_.accounts.filter((a) => !a.is_archived).map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</Select></Field>
            <Field label="Entity" htmlFor="r_ent"><Select id="r_ent" value={form.entity_id} onChange={(e) => setForm({ ...form, entity_id: e.target.value })}>{ref_.entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
            <Field label="Category" htmlFor="r_cat"><Select id="r_cat" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Cadence" htmlFor="r_cad"><Select id="r_cad" value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value as RecurringRow["cadence"] })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
          </div>
          <Field label="Next run" htmlFor="r_next" hint="The first date it should be booked; it then repeats."><Input id="r_next" type="date" value={form.next_run_on} onChange={(e) => setForm({ ...form, next_run_on: e.target.value })} /></Field>
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Sheet>
    </Section>
  );
}

/* ─────────── Integrations ─────────── */
function IntegrationsTab({ keys, ref_ }: { keys: ApiKeyLite[]; ref_: RefData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app";
  const cod = ref_.entities.find((e) => e.slug === "cod-africa");
  const usdAcc = ref_.accounts.find((a) => a.currency === "USD");

  const example = JSON.stringify(
    {
      external_id: "fb_2026-10-18_act_123",
      type: "expense",
      amount: 120.5,
      currency: "USD",
      occurred_on: todayISO(),
      entity: cod?.slug ?? "cod-africa",
      category: "Ads",
      account: usdAcc?.name ?? "Main USD",
      note: "Facebook Ads daily spend",
      meta: { source: "facebook_ads", campaign: "SN - Product A" },
    },
    null,
    2,
  );

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied"));
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Section title="API keys">
        <p className="-mt-1 text-sm text-ink-2">Let your other apps push income and spend here (Facebook ad spend, Shopify orders, …). Each key is shown once.</p>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createApiKey(name); if (!r.ok) return void toast.error(r.error); setFresh(r.data.key); setName(""); router.refresh(); }); }}>
          <Input placeholder="Key name, e.g. Facebook ads bot" value={name} onChange={(e) => setName(e.target.value)} aria-label="Key name" />
          <Button type="submit" variant="primary" loading={pending} disabled={!name.trim()}><KeyRound /> Create</Button>
        </form>
        {fresh ? (
          <Tile className="border-mint/50">
            <p className="label mb-2 text-mint">New key — copy it now, it won&apos;t be shown again</p>
            <div className="flex items-center gap-2">
              <code className="num flex-1 break-all rounded-md bg-canvas px-2 py-1.5 text-xs">{fresh}</code>
              <Button size="icon-sm" variant="secondary" aria-label="Copy key" onClick={() => copy(fresh)}><Copy /></Button>
            </div>
          </Tile>
        ) : null}
        <Rows>
          {keys.map((k) => (
            <div key={k.id} className={cn("flex items-center gap-3 py-3", k.revoked_at && "opacity-50")}>
              <KeyRound className="size-4 text-ink-3" />
              <div className="flex-1">
                <div className="text-sm font-medium">{k.name}</div>
                <div className="num text-xs text-ink-3">{k.key_prefix}… · {k.revoked_at ? "revoked" : k.last_used_at ? `last used ${humanDate(k.last_used_at.slice(0, 10))}` : "never used"}</div>
              </div>
              {!k.revoked_at ? <Button size="sm" variant="ghost" className="hover:text-coral" onClick={() => start(async () => { const r = await revokeApiKey(k.id); if (!r.ok) toast.error(r.error); router.refresh(); })}>Revoke</Button> : null}
            </div>
          ))}
        </Rows>
        {!keys.length ? <Empty title="No keys yet" /> : null}
      </Section>

      <Section title="How to send data">
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="label mb-1">Endpoint</p>
            <div className="flex items-center gap-2">
              <code className="num flex-1 rounded-md bg-surface px-2 py-1.5 text-xs">POST {origin}/api/ingest</code>
              <Button size="icon-sm" variant="ghost" aria-label="Copy endpoint" onClick={() => copy(`${origin}/api/ingest`)}><Copy /></Button>
            </div>
          </div>
          <div>
            <p className="label mb-1">Headers</p>
            <code className="num block rounded-md bg-surface px-2 py-1.5 text-xs">Authorization: Bearer mos_…{"\n"}Content-Type: application/json</code>
          </div>
          <div>
            <p className="label mb-1">Body (one object or an array of up to 500)</p>
            <div className="relative">
              <pre className="num overflow-x-auto rounded-md bg-surface p-3 text-xs leading-relaxed">{example}</pre>
              <Button size="icon-sm" variant="ghost" className="absolute right-1.5 top-1.5" aria-label="Copy example" onClick={() => copy(example)}><Copy /></Button>
            </div>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-ink-2">
            <li><code>external_id</code> makes the call idempotent — send the same id twice and the row is updated, not duplicated.</li>
            <li><code>entity</code>, <code>category</code> and <code>account</code> match by slug or name (case-insensitive). Unknown categories are created.</li>
            <li><code>type</code> is <code>income</code> or <code>expense</code>. <code>meta</code> is any JSON you want to keep (campaign, units, delivered…).</li>
            <li>Responses: <code>201</code> created, <code>200</code> updated, <code>401</code> bad key, <code>422</code> validation errors per item.</li>
          </ul>
        </div>
      </Section>
    </div>
  );
}
