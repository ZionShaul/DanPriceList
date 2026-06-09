"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCatalogExcel } from "@/lib/excel/parseCatalog";

export type CatalogImportResult =
  | {
      ok: true;
      materialsCreated: number;
      aliasesCreated: number;
      remapped: number;
      skipped: number;
    }
  | { ok: false; error: string };

/**
 * ייבוא קטלוג חומרים מאקסל (סעיף 3): יצירת חומרים תקניים + שמות חלופיים/מק"ט,
 * ומיפוי רטרואקטיבי של רכישות שטרם מופו. אינו תלוי בטעינה פעילה.
 */
export async function importCatalog(formData: FormData): Promise<CatalogImportResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "לא נבחר קובץ." };
  }

  let parsed;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    parsed = parseCatalogExcel(buf);
  } catch {
    return { ok: false, error: "שגיאה בקריאת הקובץ. ודא/י שזהו קובץ אקסל תקין." };
  }

  if (parsed.totalRows === 0 || parsed.canonicals.length === 0) {
    return { ok: false, error: "הקובץ ריק או שלא זוהתה עמודת 'שם תקני'." };
  }

  const db = createAdminClient();

  // 1) טעינת חומרים קיימים (canonical) ושמות חלופיים קיימים (למניעת כפילויות)
  const { data: existingMaterials } = await db
    .from("materials_catalog")
    .select("id, canonical_name");
  const byCanonical = new Map<string, string>();
  for (const m of existingMaterials ?? []) {
    byCanonical.set(String(m.canonical_name).toLowerCase(), m.id);
  }

  const { data: existingAliases } = await db.from("material_aliases").select("alias_name");
  const aliasSeen = new Set<string>();
  for (const a of existingAliases ?? []) aliasSeen.add(String(a.alias_name).toLowerCase());

  // 2) יצירת חומרים תקניים חדשים
  const toCreate = parsed.canonicals.filter((c) => !byCanonical.has(c.toLowerCase()));
  let materialsCreated = 0;
  if (toCreate.length) {
    const { data: created, error } = await db
      .from("materials_catalog")
      .insert(toCreate.map((canonical_name) => ({ canonical_name, status: "active" })))
      .select("id, canonical_name");
    if (error) return { ok: false, error: "שגיאה ביצירת חומרים: " + error.message };
    for (const m of created ?? []) {
      byCanonical.set(String(m.canonical_name).toLowerCase(), m.id);
      materialsCreated++;
    }
  }

  // 3) בניית שמות חלופיים לשיוך (כולל מק"ט שצורף לשם התקני עצמו)
  type AliasRow = { material_id: string; alias_name: string; sku: string | null };
  const aliasRows: AliasRow[] = [];
  for (const e of parsed.entries) {
    const materialId = byCanonical.get(e.canonical.toLowerCase());
    if (!materialId) continue;
    const aliasName = e.alias?.trim() || e.canonical; // אם אין שם חלופי – נרשום את השם התקני עם המק"ט
    const key = aliasName.toLowerCase();
    // מדלגים על שם חלופי שכבר קיים, או כשהוא זהה לשם התקני וללא מק"ט (מיותר)
    if (aliasSeen.has(key)) continue;
    if (aliasName.toLowerCase() === e.canonical.toLowerCase() && !e.sku) continue;
    aliasSeen.add(key);
    aliasRows.push({ material_id: materialId, alias_name: aliasName, sku: e.sku });
  }

  let aliasesCreated = 0;
  if (aliasRows.length) {
    const { error } = await db.from("material_aliases").insert(aliasRows);
    if (error) return { ok: false, error: "שגיאה בשיוך שמות חלופיים: " + error.message };
    aliasesCreated = aliasRows.length;
  }

  // 4) מיפוי רטרואקטיבי של רכישות לא ממופות לפי שם / מק"ט
  let remapped = 0;
  const remapByName = async (name: string, materialId: string) => {
    const { data } = await db
      .from("purchase_rows")
      .update({ material_id: materialId })
      .is("material_id", null)
      .eq("product_description", name)
      .select("id");
    remapped += data?.length ?? 0;
  };
  const remapBySku = async (sku: string, materialId: string) => {
    const { data } = await db
      .from("purchase_rows")
      .update({ material_id: materialId })
      .is("material_id", null)
      .eq("sku", sku)
      .select("id");
    remapped += data?.length ?? 0;
  };
  for (const e of parsed.entries) {
    const materialId = byCanonical.get(e.canonical.toLowerCase());
    if (!materialId) continue;
    await remapByName(e.canonical, materialId);
    if (e.alias?.trim()) await remapByName(e.alias.trim(), materialId);
    if (e.sku) await remapBySku(e.sku, materialId);
  }

  revalidatePath("/admin/materials");
  revalidatePath("/", "layout");
  return { ok: true, materialsCreated, aliasesCreated, remapped, skipped: parsed.skipped };
}
