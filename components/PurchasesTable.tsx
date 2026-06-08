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

// טבלת פירוט רכישות (סעיף 10.3) – מציגה את שורות הרכישה של הארגון בלבד.
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
    <div className="table-scroll rounded-xl border border-brand-line bg-brand-surface">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-brand-primary-light text-brand-primary-dark">
            <Th>תאריך</Th>
            {showMaterial && <Th>חומר</Th>}
            <Th>ספק</Th>
            <Th>כמות</Th>
            <Th>מחיר ליחידה</Th>
            <Th>סה״כ</Th>
            <Th>חשבונית</Th>
            <Th>מק״ט</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-brand-line/60">
              <Td>{formatDate(r.purchase_date)}</Td>
              {showMaterial && (
                <Td>{r.material?.canonical_name ?? r.product_description}</Td>
              )}
              <Td>{r.supplier ?? "—"}</Td>
              <Td dir="ltr">{formatNumber(r.quantity)}</Td>
              <Td dir="ltr">{formatCurrency(r.unit_price)}</Td>
              <Td dir="ltr">{formatCurrency(r.total_price)}</Td>
              <Td dir="ltr">{r.invoice_number ?? "—"}</Td>
              <Td dir="ltr">{r.sku ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">{children}</th>;
}
function Td({ children, dir }: { children: React.ReactNode; dir?: "ltr" | "rtl" }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right text-brand-ink" dir={dir}>
      {children}
    </td>
  );
}
