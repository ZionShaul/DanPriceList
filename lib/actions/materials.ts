"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** יצירת חומר תקני חדש (סעיף 8). */
export async function createMaterial(name: string): Promise<ActionResult> {
  await requireAdmin();
  const canonical = name.trim();
  if (!canonical) return { ok: false, error: "שם חומר חסר" };
  const db = createAdminClient();
  const { error } = await db
    .from("materials_catalog")
    .insert({ canonical_name: canonical, status: "active" });
  if (error) return { ok: false, error: "שגיאה ביצירת חומר: " + error.message };
  revalidatePath("/admin/materials");
  return { ok: true };
}

/** עדכון שם חומר תקני. */
export async function renameMaterial(id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const canonical = name.trim();
  if (!canonical) return { ok: false, error: "שם חומר חסר" };
  const db = createAdminClient();
  const { error } = await db
    .from("materials_catalog")
    .update({ canonical_name: canonical, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "שגיאה בעדכון: " + error.message };
  revalidatePath("/admin/materials");
  return { ok: true };
}

/**
 * מיפוי שם/מק"ט מהאקסל לחומר תקני (סעיף 8.2) + עדכון רטרואקטיבי של השורות
 * שטרם מופו, כך שהחומר יוצג מאוחד גם בטעינות קיימות.
 */
export async function mapAliasToMaterial(
  materialId: string,
  aliasName: string,
  sku?: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const alias = aliasName.trim();
  if (!materialId || !alias) return { ok: false, error: "חסר חומר או שם לשיוך" };

  const db = createAdminClient();
  const { error: aliasErr } = await db
    .from("material_aliases")
    .insert({ material_id: materialId, alias_name: alias, sku: sku?.trim() || null });
  if (aliasErr) return { ok: false, error: "שגיאה בשיוך: " + aliasErr.message };

  // עדכון שורות לא ממופות שתואמות לשם זה
  await db
    .from("purchase_rows")
    .update({ material_id: materialId })
    .is("material_id", null)
    .eq("product_description", alias);

  if (sku?.trim()) {
    await db
      .from("purchase_rows")
      .update({ material_id: materialId })
      .is("material_id", null)
      .eq("sku", sku.trim());
  }

  revalidatePath("/admin/materials");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** יצירת חומר תקני חדש ישירות מתוך שם לא ממופה. */
export async function createMaterialFromUnmapped(
  description: string,
  sku?: string | null,
): Promise<ActionResult> {
  await requireAdmin();
  const name = description.trim();
  if (!name) return { ok: false, error: "שם חומר חסר" };

  const db = createAdminClient();
  const { data: material, error } = await db
    .from("materials_catalog")
    .insert({ canonical_name: name, status: "active" })
    .select("id")
    .single();
  if (error || !material) {
    return { ok: false, error: "שגיאה ביצירת חומר: " + (error?.message ?? "") };
  }
  return mapAliasToMaterial(material.id, name, sku ?? null);
}
