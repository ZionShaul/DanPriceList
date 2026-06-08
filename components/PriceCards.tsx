import { formatCurrency, formatNumber } from "@/lib/format";
import type { MaterialPrice } from "@/lib/types";

// כרטיסי מחיר: נמוך / ממוצע משוקלל / גבוה + מספר רכישות וסך כמות (סעיף 9, 10.1)
export default function PriceCards({ price }: { price: MaterialPrice }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Card label="מחיר נמוך" value={formatCurrency(price.low_price)} tone="low" />
        <Card label="ממוצע משוקלל" value={formatCurrency(price.weighted_avg)} tone="avg" />
        <Card label="מחיר גבוה" value={formatCurrency(price.high_price)} tone="high" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniStat label="מספר רכישות" value={formatNumber(price.purchase_count)} />
        <MiniStat label="סך כמות" value={formatNumber(price.total_quantity)} />
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  low: "border-brand-low/30 bg-brand-low/5 text-brand-low",
  avg: "border-brand-avg/30 bg-brand-avg/5 text-brand-avg",
  high: "border-brand-high/30 bg-brand-high/5 text-brand-high",
};

function Card({ label, value, tone }: { label: string; value: string; tone: keyof typeof TONE }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${TONE[tone]}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-1 text-lg font-bold leading-tight sm:text-xl" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-line bg-brand-surface p-3 text-center">
      <div className="text-xs text-brand-muted">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-brand-ink">{value}</div>
    </div>
  );
}
