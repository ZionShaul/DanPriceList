import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import PurchasesTable, { type PurchaseDisplayRow } from "@/components/PurchasesTable";
import ClickSenseButton from "@/components/ClickSenseButton";
import ActivePricelistBanner from "@/components/ActivePricelistBanner";
import { getActiveUpload, activeUploadLabel } from "@/lib/activeUpload";
import { formatCurrencyWhole, formatNumberWhole } from "@/lib/format";

export const metadata = { title: "הרכישות שלי - מחירון משקי דן" };

export default async function MyPurchasesPage() {
  const profile = await requireUser();
  const supabase = await createClient();
  const settings = await getSystemSettings();
  const activeUpload = await getActiveUpload();

  // עיגון מפורש לטעינה הפעילה ולארגון המשתמש — כדי שגם מנהל (שעוקף RLS)
  // לא יראה רכישות מטעינות אחרות/ארגונים אחרים (מניעת כפילויות בתצוגה).
  let rows: PurchaseDisplayRow[] = [];
  if (activeUpload?.id) {
    let q = supabase
      .from("purchase_rows")
      .select(
        "id, supplier, sku, product_description, quantity, unit_price, total_price, purchase_date, invoice_number, material:materials_catalog(canonical_name)",
      )
      .eq("upload_id", activeUpload.id)
      .order("purchase_date", { ascending: false });
    // משתמש רגיל משויך לארגון; מנהל ללא ארגון רואה תצוגה מקדימה של הטעינה הפעילה.
    if (profile.organization_id) q = q.eq("organization_id", profile.organization_id);
    const { data } = await q;
    rows = (data as unknown as PurchaseDisplayRow[] | null) ?? [];
  }
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_price || 0), 0);
  const totalQty = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);

  return (
    <div className="space-y-5">
      <ActivePricelistBanner label={activeUploadLabel(activeUpload)} />

      <div>
        <h1 className="text-xl font-bold text-brand-ink">הרכישות שלי</h1>
        {profile.organization?.name && (
          <p className="mt-0.5 text-sm text-brand-muted">{profile.organization.name}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Summary label="סך רכישות החודש" value={formatCurrencyWhole(totalAmount)} />
        <Summary label="מספר שורות" value={formatNumberWhole(rows.length)} />
        <Summary label="סך כמות" value={formatNumberWhole(totalQty)} />
      </div>

      <PurchasesTable rows={rows} showMaterial />

      <ClickSenseButton url={settings.clicksense_url} enabled={settings.clicksense_enabled} />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-line bg-brand-surface px-2 py-3 text-center">
      <div className="text-xs text-brand-muted">{label}</div>
      <div
        className="mt-1 text-sm font-bold leading-tight text-brand-ink tabular-nums sm:text-base"
        dir="ltr"
      >
        {value}
      </div>
    </div>
  );
}
