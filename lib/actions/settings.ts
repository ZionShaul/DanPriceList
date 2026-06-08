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
