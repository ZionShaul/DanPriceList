"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole, UserStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

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

  const db = createAdminClient();
  const { data: created, error: authErr } = await db.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return { ok: false, error: "שגיאה ביצירת המשתמש: " + (authErr?.message ?? "") };
  }

  const { error: profErr } = await db.from("profiles").insert({
    id: created.user.id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    organization_id: data.organization_id,
    role: data.role,
    status: "active",
  });
  if (profErr) {
    // ניקוי משתמש ה-auth אם יצירת הפרופיל נכשלה
    await db.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "שגיאה ביצירת הפרופיל: " + profErr.message };
  }

  revalidatePath("/admin/users");
  return { ok: true };
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

  const db = createAdminClient();
  const { error } = await db.from("profiles").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: "שגיאה בעדכון: " + error.message };
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
