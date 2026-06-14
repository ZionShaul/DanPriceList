"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  // קישור תקין, רצוי https (סעיף 11.6)
  url: z.string().trim().url("יש להזין כתובת URL תקינה").startsWith("https://", "מומלץ קישור https"),
  enabled: z.boolean(),
});

/** עדכון קישור קליקסנס בהגדרות המערכת (סעיף 11.6). */
export async function updateClickSense(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const enabled = formData.get("enabled") === "on";
  const url = String(formData.get("url") || "").trim();

  // אם מבטלים – אפשר לשמור ללא קישור
  if (!enabled && url === "") {
    const db = createAdminClient();
    await db
      .from("system_settings")
      .update({ clicksense_url: null, clicksense_enabled: false })
      .eq("id", 1);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const parsed = schema.safeParse({ url, enabled });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "נתונים שגויים" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("system_settings")
    .update({ clicksense_url: parsed.data.url, clicksense_enabled: parsed.data.enabled })
    .eq("id", 1);
  if (error) return { ok: false, error: "שגיאה בשמירה: " + error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

const registrationSchema = z.object({
  url: z.string().trim().url("יש להזין כתובת URL תקינה"),
  enabled: z.boolean(),
});

/** עדכון קישור "בקשה לרישום משתמש" המוצג במסך ההתחברות. */
export async function updateRegistration(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const enabled = formData.get("enabled") === "on";
  const url = String(formData.get("url") || "").trim();

  if (!enabled && url === "") {
    const db = createAdminClient();
    await db
      .from("system_settings")
      .update({ registration_url: null, registration_enabled: false })
      .eq("id", 1);
    revalidatePath("/login");
    return { ok: true };
  }

  const parsed = registrationSchema.safeParse({ url, enabled });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "נתונים שגויים" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("system_settings")
    .update({ registration_url: parsed.data.url, registration_enabled: parsed.data.enabled })
    .eq("id", 1);
  if (error) return { ok: false, error: "שגיאה בשמירה: " + error.message };

  revalidatePath("/login");
  revalidatePath("/", "layout");
  return { ok: true };
}

const whatsappSchema = z.object({
  // פורמט בינלאומי, ספרות בלבד (לדוגמה 9725XXXXXXXX)
  number: z.string().regex(/^\d{8,15}$/, "מספר לא תקין – ספרות בלבד בפורמט בינלאומי (למשל 9725...)"),
  message: z.string().trim().max(1000).optional(),
  enabled: z.boolean(),
});

/** עדכון כפתור התמיכה בוואטסאפ (מספר + הודעת ברירת מחדל). */
export async function updateWhatsApp(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const enabled = formData.get("enabled") === "on";
  // משאירים רק ספרות (מנקה +, רווחים, מקפים)
  const number = String(formData.get("number") || "").replace(/\D/g, "");
  const message = String(formData.get("message") || "").trim();

  // ביטול ללא מספר – שמירה ריקה
  if (!enabled && number === "") {
    const db = createAdminClient();
    await db
      .from("system_settings")
      .update({ whatsapp_number: null, whatsapp_message: message || null, whatsapp_enabled: false })
      .eq("id", 1);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const parsed = whatsappSchema.safeParse({ number, message, enabled });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "נתונים שגויים" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("system_settings")
    .update({
      whatsapp_number: parsed.data.number,
      whatsapp_message: parsed.data.message || null,
      whatsapp_enabled: parsed.data.enabled,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: "שגיאה בשמירה: " + error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
