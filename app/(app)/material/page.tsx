import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import PriceCards from "@/components/PriceCards";
import PurchasesTable, { type PurchaseDisplayRow } from "@/components/PurchasesTable";
import ClickSenseButton from "@/components/ClickSenseButton";
import { getSystemSettings } from "@/lib/settings";
import type { MaterialPrice } from "@/lib/types";

export default async function MaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  await requireUser();
  const { key } = await searchParams;

  if (!key) {
    return <BackOnly message="לא נבחר חומר." />;
  }

  const supabase = await createClient();
  const settings = await getSystemSettings();

  // מחירים מצרפיים כלליים (כל הארגונים) – דרך RPC ללא חשיפת שורות
  const { data: priceData } = await supabase.rpc("get_material_prices", { p_key: key });
  const price = (priceData as MaterialPrice[] | null)?.[0] ?? null;

  // רכישות אישיות של הארגון לחומר זה (RLS מגביל לארגון המשתמש ולטעינה הפעילה)
  let q = supabase
    .from("purchase_rows")
    .select(
      "id, supplier, sku, product_description, quantity, unit_price, total_price, purchase_date, invoice_number, material:materials_catalog(canonical_name)",
    )
    .order("purchase_date", { ascending: false });

  if (key.startsWith("desc:")) {
    q = q.is("material_id", null).eq("product_description", key.slice(5));
  } else {
    q = q.eq("material_id", key);
  }
  const { data: personal } = await q;
  const personalRows = (personal as unknown as PurchaseDisplayRow[] | null) ?? [];

  const displayName = price?.display_name ?? (key.startsWith("desc:") ? key.slice(5) : "חומר");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-brand-primary">
          ← חזרה לחיפוש
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-brand-ink">{displayName}</h1>
      </div>

      {price ? (
        <PriceCards price={price} />
      ) : (
        <p className="rounded-xl border border-brand-line bg-brand-surface p-4 text-center text-sm text-brand-muted">
          לא נמצאו נתוני מחיר לחומר זה בקובץ הפעיל.
        </p>
      )}

      <ClickSenseButton url={settings.clicksense_url} enabled={settings.clicksense_enabled} />

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-brand-ink">הרכישות שלי לחומר זה</h2>
        <PurchasesTable rows={personalRows} showMaterial={false} />
      </section>
    </div>
  );
}

function BackOnly({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-brand-primary">
        ← חזרה לחיפוש
      </Link>
      <p className="text-brand-muted">{message}</p>
    </div>
  );
}
