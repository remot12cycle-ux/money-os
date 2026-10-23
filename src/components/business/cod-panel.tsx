import type { CodStats } from "@/lib/data/businesses";
import { formatMoney, formatPercent, type Currency } from "@/lib/money";
import { Section, Stat } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function CodPanel({ stats: cod, base, title }: { stats: CodStats; base: Currency; title: string }) {
  return (
    <Section title={title}>
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
  );
}
