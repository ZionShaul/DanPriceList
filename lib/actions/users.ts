"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseUsersExcel } from "@/lib/excel/parseUsers";
import type { UserRole, UserStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

type AdminDb = ReturnType<typeof createAdminClient>;

interface NewUserInput {
  full_name: string;
  email: string;
  phone: string;
  organization_id: string | null;
  role: UserRole;
  show_purchases?: boolean;
  show_my_purchases?: boolean;
}

/**
 * יצירת משתמש בודד (auth + profile). משותף ליצירה ידנית ולטעינה מאקסל.
 * מחזיר את ה-id החדש, או שגיאה.
 */
async function createUserRecord(
  db: AdminDb,
  input: NewUserInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return { ok: false, error: "שגיאה ביצירת המשתמש: " + (authErr?.message ?? "") };
  }

  const { error: profErr } = await db.from("profiles").insert({
    id: created.user.id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    organization_id: input.organization_id,
    role: input.role,
    status: "active",
    show_purchases: input.show_purchases ?? true,
    show_my_purchases: input.show_my_purchases ?? true,
  });
  if (profErr) {
    await db.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "שגיאה ביצירת הפרופיל: " + profErr.message };
  }
  return { ok: true, id: created.user.id };
}

const createSchema = z.object({
  full_name: z.string().trim().min(1, "שם מלא הוא שדה חובה"),
  email: z.string().trim().email("אימייל לא תקין"),
  phone: z.string().trim().min(1, "טלפון הוא שדה חובה"),
  organization_id: z.string().uuid().nullable(),
  role: z.enum(["user", "admin"]),
});

/** יצירת משתמש חדש ע"י מנהל (אין הרשמה עצמית – סעיף 4). */
export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const orgRaw = formData.get("organization_id");
  const parsed = createSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    organization_id: orgRaw && orgRaw !== "" ? orgRaw : null,
    role: formData.get("role") || "user",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "נתונים שגויים" };
  }
  const data = parsed.data;

  if (data.role === "user" && !data.organization_id) {
    return { ok: false, error: "יש לשייך משתמש רגיל לארגון." };
  }

  // הרשאות תצוגה (checkbox – נשלח 'on' רק כשמסומן)
  const show_purchases = formData.get("show_purchases") === "on";
  const show_my_purchases = formData.get("show_my_purchases") === "on";

  const db = createAdminClient();
  const res = await createUserRecord(db, { ...data, show_purchases, show_my_purchases });
  if (!res.ok) return res;

  revalidatePath("/admin/users");
  return { ok: true };
}

export type ImportUsersResult =
  | { ok: true; created: number; skipped: number; errors: string[] }
  | { ok: false; error: string };

/** טעינת משתמשים מרוכזת מקובץ אקסל (סעיף 5). */
export async function importUsers(formData: FormData): Promise<ImportUsersResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "לא נבחר קובץ." };
  }

  let parsed;
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    parsed = parseUsersExcel(buf);
  } catch {
    return { ok: false, error: "שגיאה בקריאת הקובץ. ודא/י שזהו קובץ אקסל תקין." };
  }
  if (parsed.totalRows === 0) {
    return { ok: false, error: "הקובץ ריק או שלא זוהו שורות נתונים." };
  }

  const db = createAdminClient();

  // התאמת ארגונים לפי שם (יצירה אם חסר)
  const orgNames = [...new Set(parsed.entries.map((e) => e.organization).filter(Boolean))] as string[];
  const orgMap = await resolveOrgsByName(db, orgNames);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // שורות שנפסלו בפרסור
  for (const inv of parsed.invalid) {
    skipped++;
    errors.push(inv.reason);
  }

  for (const e of parsed.entries) {
    const organization_id = e.organization ? orgMap.get(e.organization.toLowerCase()) ?? null : null;
    if (e.role === "user" && !organization_id) {
      skipped++;
      errors.push(`${e.email}: לא נמצא/נוצר ארגון`);
      continue;
    }
    const res = await createUserRecord(db, {
      full_name: e.full_name,
      email: e.email,
      phone: e.phone,
      organization_id,
      role: e.role,
      show_purchases: e.show_purchases,
      show_my_purchases: e.show_my_purchases,
    });
    if (res.ok) created++;
    else {
      skipped++;
      errors.push(`${e.email}: ${res.error}`);
    }
  }

  revalidatePath("/admin/users");
  return { ok: true, created, skipped, errors: errors.slice(0, 20) };
}

/** התאמת ארגונים לפי שם (excel_client_name/name), יצירה אם חסר. מפתח המפה: שם באותיות קטנות. */
async function resolveOrgsByName(db: AdminDb, names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (names.length === 0) return map;

  const { data: existing } = await db.from("organizations").select("id, name, excel_client_name");
  for (const o of existing ?? []) {
    map.set(String(o.name).toLowerCase(), o.id);
    map.set(String(o.excel_client_name).toLowerCase(), o.id);
  }

  const toCreate = names.filter((n) => !map.has(n.toLowerCase()));
  if (toCreate.length) {
    const { data: createdOrgs } = await db
      .from("organizations")
      .insert(toCreate.map((name) => ({ name, excel_client_name: name, status: "active" })))
      .select("id, name");
    for (const o of createdOrgs ?? []) map.set(String(o.name).toLowerCase(), o.id);
  }
  return map;
}

/** עדכון פרטי משתמש קיים. */
export async function updateUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "מזהה משתמש חסר" };

  const orgRaw = formData.get("organization_id");
  const parsed = createSchema.omit({ email: true }).safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    organization_id: orgRaw && orgRaw !== "" ? orgRaw : null,
    role: formData.get("role") || "user",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "נתונים שגויים" };
  }
  const data = parsed.data;
  if (data.role === "user" && !data.organization_id) {
    return { ok: false, error: "יש לשייך משתמש רגיל לארגון." };
  }

  // הרשאות תצוגה (checkbox – נשלח 'on' רק כשמסומן)
  const show_purchases = formData.get("show_purchases") === "on";
  const show_my_purchases = formData.get("show_my_purchases") === "on";

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ ...data, show_purchases, show_my_purchases })
    .eq("id", id);
  if (error) return { ok: false, error: "שגיאה בעדכון: " + error.message };
  revalidatePath("/admin/users");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** מחיקת משתמש לצמיתות (auth + פרופיל נמחק ב-cascade). */
export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!id) return { ok: false, error: "מזהה משתמש חסר" };
  if (admin.id === id) {
    return { ok: false, error: "לא ניתן למחוק את המשתמש המחובר כעת." };
  }

  const db = createAdminClient();

  // מניעת מחיקת המנהל הפעיל האחרון (הגנה מפני נעילה מהמערכת)
  const { data: target } = await db.from("profiles").select("role").eq("id", id).single();
  if (target?.role === "admin") {
    const { count } = await db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "לא ניתן למחוק את מנהל המערכת הפעיל האחרון." };
    }
  }

  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return { ok: false, error: "שגיאה במחיקה: " + error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** הפעלה/חסימה של משתמש (סעיף 11.1). */
export async function setUserStatus(id: string, status: UserStatus): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ status }).eq("id", id);
  if (error) return { ok: false, error: "שגיאה בעדכון סטטוס: " + error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(id: string, role: UserRole): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ role }).eq("id", id);
  if (error) return { ok: false, error: "שגיאה בעדכון תפקיד: " + error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

/** איפוס קשירת המכשיר של משתמש – מאפשר היקשרות למכשיר חדש (סעיף קשירת מכשיר). */
export async function resetUserDevice(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return { ok: false, error: "מזהה משתמש חסר" };
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ active_device_id: null, active_device_label: null, device_bound_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: "שגיאה באיפוס מכשיר: " + error.message };

  // הקשחה (best-effort): ניתוק סשנים פעילים אם ה-API זמין
  try {
    const adminApi = db.auth.admin as unknown as {
      signOut?: (userId: string, scope?: string) => Promise<unknown>;
    };
    if (typeof adminApi.signOut === "function") await adminApi.signOut(id, "global");
  } catch {
    /* התעלמות – לא קריטי */
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

/** יצירת ארגון חדש (לשיוך משתמשים). */
export async function createOrganization(name: string): Promise<ActionResult> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "שם ארגון חסר" };
  const db = createAdminClient();
  const { error } = await db
    .from("organizations")
    .insert({ name: trimmed, excel_client_name: trimmed, status: "active" });
  if (error) return { ok: false, error: "שגיאה ביצירת ארגון: " + error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
