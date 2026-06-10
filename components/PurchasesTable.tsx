import { formatCurrency, formatNumber, formatDate } from "@/lib/format";
import type { PurchaseRow, MaterialCatalog } from "@/lib/types";

export type PurchaseDisplayRow = Pick<
  PurchaseRow,
  | "id"
  | "supplier"
  | "sku"
  | "product_description"
  | "quantity"
  | "unit_price"
  | "total_price"
  | "purchase_date"
  | "invoice_number"
> & { material?: Pick<MaterialCatalog, "canonical_name"> | null };

// פירוט רכישות (סעיף 10.3) – כרטיסים רספונסיביים שנכנסים למסך ללא גלילה אופקית.
export default function PurchasesTable({
  rows,
  showMaterial = true,
}: {
  rows: PurchaseDisplayRow[];
  showMaterial?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-brand-line bg-brand-surface p-4 text-center text-sm text-brand-muted">
        אין רכישות להצגה.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-brand-line bg-brand-surface p-3 shadow-sm"
        >
          {showMaterial && (
            <div className="mb-1.5 font-semibold text-brand-ink">
              {r.material?.canonical_name ?? r.product_description}
            </div>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-brand-muted">{formatDate(r.purchase_date)}</span>
            <span className="text-brand-ink">{r.supplier ?? "—"}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-brand-muted">
              כמות:{" "}
              <span className="font-medium text-brand-ink" dir="ltr">
                {formatNumber(r.quantity)}
              </span>
            </span>
            <span className="text-brand-muted">
              מחיר ליחידה:{" "}
              <span className="font-semibold text-brand-ink" dir="ltr">
                {formatCurrency(r.unit_price)}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
