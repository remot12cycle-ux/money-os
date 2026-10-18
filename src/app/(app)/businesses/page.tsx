import type { Metadata } from "next";
import Link from "next/link";
import { getRefData } from "@/lib/data/core";
import { codStats, getEntityReport } from "@/lib/data/businesses";
import { currentMonth } from "@/lib/dates";
import { formatMoney, formatPercent } from "@/lib/money";
import { MonthPicker } from "@/components/month-picker";
import { CategoryBars, IncomeExpenseChart } from "@/components/charts/charts";
import { Empty, EntityDot, Money, PageHeader, Rows, Section, Stat } from "@/components/ui/primitives";
import { TxRow } from "@/components/lists/transaction-row";
import { EntityAddButton } from "./entity-add";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Businesses" };

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const ref = await getRefData();
  const list = ref.entities.filter((e) => !e.is_archived && e.kind !== "personal");
  const entity = list.find((e) => e.id === sp.entity) ?? list[0];
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth();

  if (!entity) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Businesses" />
        <Empty title="No business entities" body="Add one in Settings → Entities." />
      </div>
    );
  }

  const report = await getEntityReport(entity.id, month);
  const catNames = new Map(ref.categories.map((c) => [c.id, c.name]));
  const isCod = entity.slug === "cod-africa";
  const cod = isCod ? codStats(report.monthRows, catNames) : null;
  const catRows = report.byCategory
    .map(([id, value]) => ({ name: (id && catNames.get(id)) || "Uncategorised", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const base = report.base;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Businesses" actions={<MonthPicker month={month} />} />

      {/* entity tabs */}
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 md:mx-0 md:px-0" role="tablist">
        {list.map((e) => {
          const active = e.id === entity.id;
          return (
            <Link
              key={e.id}
              href={{ pathname: "/businesses", query: { entity: e.id, ...(sp.month ? { month: sp.month } : {}) } }}
              role="tab"
              aria-selected={active}
              className={cn(
                "relative flex h-10 shrink-0 items-center gap-2 px-3 text-sm transition-colors",
                active ? "text-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              <EntityDot color={e.color} />
              {e.name}
              {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" /> : null}
            </Link>
          );
        })}
      </div>

      {/* month headline */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="Revenue" value={<Money amount={report.monthPnl.income} currency={base} tone="mint" compactDecimals />} />
        <Stat label="Costs" value={<Money amount={-report.monthPnl.expenses} currency={base} tone="coral" compactDecimals />} />
        <Stat label="Profit" value={<Money amount={report.monthPnl.net} currency={base} sign compactDecimals />} />
        <Stat
          label="Margin"
          value={<span className={cn(report.monthPnl.margin < 0 && "text-coral")}>{report.monthPnl.income ? formatPercent(report.monthPnl.margin) : "—"}</span>}
        />
      </div>

      {cod ? (
        <Section title="COD performance · this month">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-hairline p-4 md:grid-cols-4">
            <Stat label="Ad spend" value={formatMoney(cod.adSpend, base, { compactDecimals: true })} sub="category: Ads" />
            <Stat label="ROAS" value={cod.adSpend ? `${cod.roas.toFixed(2)}×` : "—"} sub="revenue ÷ ad spend" />
            <Stat label="Product cost" value={formatMoney(cod.productCost, base, { compactDecimals: true })} />
            <Stat label="Shipping" value={formatMoney(cod.shipping, base, { compactDecimals: true })} />
            <Stat label="Units" value={cod.units || "—"} />
            <Stat label="Delivered" value={cod.delivered || "—"} sub={cod.units ? `${formatPercent(cod.deliveryRate)} delivery rate` : undefined} />
            <Stat label="Returned" value={<span className={cn(cod.returned && "text-coral")}>{cod.returned || "—"}</span>} />
            <Stat label="Profit / delivered" value={cod.delivered ? formatMoney(cod.profitPerDelivered, base) : "—"} />
          </div>
          <p className="text-xs text-ink-3">
            Units, delivered and returned come from the COD details on each transaction. Ad spend sent by your other app lands here automatically.
          </p>
        </Section>
      ) : null}

      <div className="grid gap-8 md:grid-cols-12">
        <Section title="12-month trend" className="md:col-span-7">
          <IncomeExpenseChart data={report.trend} currency={base} />
        </Section>
        <Section title="Where the money went" className="md:col-span-5">
          {catRows.length ? <CategoryBars rows={catRows} currency={base} /> : <Empty title="No costs this month" />}
        </Section>
      </div>

      <Section
        title={`Transactions · ${entity.name}`}
        aside={<EntityAddButton entityId={entity.id} />}
      >
        {report.monthRows.length ? (
          <Rows>
            {report.monthRows.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </Rows>
        ) : (
          <Empty title="Nothing recorded this month" body="Add a sale or a cost for this entity." action={<EntityAddButton entityId={entity.id} primary />} />
        )}
      </Section>
    </div>
  );
}
