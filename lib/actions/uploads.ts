"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseExcel, type RawPurchase } from "@/lib/excel/parse";

const BUCKET = process.env.SUPABASE_UPLOADS_BUCKET || "uploads";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type UploadActionResult =
  | { ok: true; uploadId: string }
  | { ok: false; error: string };

/**
 * טעינת קובץ אקסל: פרסור, מיפוי ארגון/חומר, כתיבת טיוטה (סעיף 11.2).
 * אינו משפיע על המשתמשים עד הפרסום.
 */
export async function uploadAndParse(formData: FormData): Promise<UploadActionResult> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "לא נבחר קובץ." };
  }

  // שם הטעינה כפי שיוצג למשתמשים (ברירת מחדל: שם הקובץ)
  const titleRaw = String(formData.get("title") ?? "").trim();
  const title = titleRaw || file.name;

  let result;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    result = parseExcel(buf);
  } catch {
    return { ok: false, error: "שגיאה בקריאת הקובץ. ודא/י שזהו קובץ אקסל תקין." };
  }

  if (result.totalRows === 0) {
    return { ok: false, error: "הקובץ ריק או שלא זוהו שורות נתונים." };
  }

  const db = createAdminClient();

  // 1) יצירת רשומת טעינה (טיוטה)
  const { data: upload, error: upErr } = await db
    .from("monthly_uploads")
    .insert({ file_name: file.name, title, status: "draft", uploaded_by: admin.id })
    .select("id")
    .single();
  if (upErr || !upload) {
    return { ok: false, error: "שגיאה ביצירת רשומת הטעינה: " + (upErr?.message ?? "") };
  }
  const uploadId = upload.id as string;

  // 2) שמירת הקובץ ב-Storage (לא חוסם במקרה כשל)
  let storagePath: string | null = null;
  try {
    const path = `${uploadId}/${file.name}`;
    const { error: stErr } = await db.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    if (!stErr) storagePath = path;
  } catch {
    /* התעלמות – הקובץ נשמר ב-DB ממילא */
  }

  // 3) מיפוי ארגונים לפי "לקוח"
  const orgMap = await resolveOrganizations(db, result.clients);

  // 4) מיפוי חומרים תקניים
  const { byName, bySku, canonicalByName } = await loadMaterialIndex(db);

  // 4א) "שם גנרי" (פורמט מצרפי) משמש כשם תקני בקטלוג – יצירת חומרים חסרים
  const genericNames = [
    ...new Set(result.valid.map((r) => r.generic).filter((g): g is string => !!g)),
  ];
  const toCreate = genericNames.filter((g) => !canonicalByName.has(g.toLowerCase()));
  if (toCreate.length) {
    const { data: created, error } = await db
      .from("materials_catalog")
      .insert(toCreate.map((canonical_name) => ({ canonical_name, status: "active" })))
      .select("id, canonical_name");
    if (error) return { ok: false, error: "שגיאה ביצירת חומרים מהשם הגנרי: " + error.message };
    for (const m of created ?? []) {
      const key = String(m.canonical_name).toLowerCase();
      canonicalByName.set(key, m.id);
      byName.set(key, m.id);
    }
  }

  // 4ב) שיוך השם הגולמי (תאור פריט) כשם חלופי לחומר הגנרי – כדי שגם בעתיד יתמפה
  const newAliases: { material_id: string; alias_name: string; sku: string | null }[] = [];
  const aliasSeen = new Set<string>();
  for (const r of result.valid) {
    if (!r.generic) continue;
    const matId = canonicalByName.get(r.generic.toLowerCase());
    if (!matId) continue;
    const descKey = r.description.toLowerCase();
    if (descKey === r.generic.toLowerCase() || byName.has(descKey) || aliasSeen.has(descKey)) {
      continue;
    }
    aliasSeen.add(descKey);
    newAliases.push({ material_id: matId, alias_name: r.description, sku: r.sku });
    byName.set(descKey, matId);
  }
  for (const part of chunk(newAliases, 500)) {
    if (part.length) await db.from("material_aliases").insert(part);
  }

  const materialKeys = new Set<string>();
  const unmapped = new Set<string>();

  const rows = result.valid.map((r: RawPurchase) => {
    const matId =
      (r.generic ? canonicalByName.get(r.generic.toLowerCase()) : undefined) ??
      byName.get(r.description.toLowerCase()) ??
      (r.sku ? bySku.get(r.sku) : undefined) ??
      null;
    if (matId) materialKeys.add("m:" + matId);
    else {
      materialKeys.add("d:" + r.description);
      unmapped.add(r.description);
    }
    return {
      upload_id: uploadId,
      organization_id: orgMap.get(r.client) ?? null,
      supplier: r.supplier,
      sku: r.sku,
      product_description: r.description,
      material_id: matId,
      quantity: r.quantity,
      unit_price: r.unitPrice,
      total_price: r.totalPrice,
      purchase_date: r.date,
      invoice_number: r.invoice,
    };
  });

  // 5) כתיבת שורות תקינות בקבוצות
  for (const part of chunk(rows, 500)) {
    const { error } = await db.from("purchase_rows").insert(part);
    if (error) return { ok: false, error: "שגיאה בשמירת שורות: " + error.message };
  }

  // 6) כתיבת שורות חריגות (לוג למנהל)
  const rejected = result.rejected.map((r) => ({
    upload_id: uploadId,
    reason: r.reason,
    raw_data: r.raw,
  }));
  for (const part of chunk(rejected, 500)) {
    if (part.length) await db.from("rejected_rows").insert(part);
  }

  // 7) עדכון ספירות סיכום (סעיף 11.3)
  await db
    .from("monthly_uploads")
    .update({
      storage_path: storagePath,
      total_rows: result.totalRows,
      valid_rows: result.valid.length,
      rejected_rows: result.rejected.length,
      organizations_count: new Set([...orgMap.values()]).size,
      materials_count: materialKeys.size,
      unmapped_count: unmapped.size,
    })
    .eq("id", uploadId);

  revalidatePath("/admin/upload");
  revalidatePath("/admin/history");
  return { ok: true, uploadId };
}

/** פרסום טעינה – הופכת לפעילה היחידה (סעיף 11.2). */
export async function publishUpload(uploadId: string): Promise<UploadActionResult> {
  await requireAdmin();
  const supabase = await createClient(); // זהות המנהל – לצורך is_admin() ב-RPC
  const { error } = await supabase.rpc("publish_upload", { p_id: uploadId });
  if (error) return { ok: false, error: "שגיאה בפרסום: " + error.message };
  revalidatePath("/", "layout");
  return { ok: true, uploadId };
}

/** מחיקת טעינה היסטורית (לא ניתן למחוק את הפעילה – סעיף 17). */
export async function deleteUpload(uploadId: string): Promise<UploadActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db
    .from("monthly_uploads")
    .select("status")
    .eq("id", uploadId)
    .single();
  if (data?.status === "published") {
    return { ok: false, error: "לא ניתן למחוק את הטעינה הפעילה." };
  }
  const { error } = await db.from("monthly_uploads").delete().eq("id", uploadId);
  if (error) return { ok: false, error: "שגיאה במחיקה: " + error.message };
  revalidatePath("/admin/history");
  return { ok: true, uploadId };
}

// ---------- עזרי מיפוי ----------

type AdminDb = ReturnType<typeof createAdminClient>;

async function resolveOrganizations(db: AdminDb, clients: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (clients.length === 0) return map;

  const { data: existing } = await db
    .from("organizations")
    .select("id, excel_client_name");
  const byName = new Map<string, string>();
  for (const o of existing ?? []) byName.set(String(o.excel_client_name).toLowerCase(), o.id);

  const toCreate: string[] = [];
  for (const c of clients) {
    const id = byName.get(c.toLowerCase());
    if (id) map.set(c, id);
    else toCreate.push(c);
  }

  if (toCreate.length) {
    const { data: created } = await db
      .from("organizations")
      .insert(toCreate.map((name) => ({ name, excel_client_name: name, status: "active" })))
      .select("id, excel_client_name");
    for (const o of created ?? []) map.set(String(o.excel_client_name), o.id);
  }
  return map;
}

async function loadMaterialIndex(db: AdminDb) {
  const byName = new Map<string, string>();
  const bySku = new Map<string, string>();
  const canonicalByName = new Map<string, string>(); // שם תקני בלבד (לזיהוי/יצירה לפי שם גנרי)

  const { data: materials } = await db.from("materials_catalog").select("id, canonical_name");
  for (const m of materials ?? []) {
    const key = String(m.canonical_name).toLowerCase();
    byName.set(key, m.id);
    canonicalByName.set(key, m.id);
  }

  const { data: aliases } = await db
    .from("material_aliases")
    .select("material_id, alias_name, sku");
  for (const a of aliases ?? []) {
    byName.set(String(a.alias_name).toLowerCase(), a.material_id);
    if (a.sku) bySku.set(String(a.sku), a.material_id);
  }
  return { byName, bySku, canonicalByName };
}
