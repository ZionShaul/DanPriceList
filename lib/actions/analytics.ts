"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type PurgeResult = { ok: true; deleted: number } | { ok: false; error: string };

/** מחיקת כל האירועים שלפני תאריך נתון (ISO). */
export async function purgeAnalyticsBefore(beforeISO: string): Promise<PurgeResult> {
  await requireAdmin();
  if (!beforeISO) return { ok: false, error: "תאריך חסר" };
  const db = createAdminClient();
  const { error, count } = await db
    .from("analytics_events")
    .delete({ count: "exact" })
    .lt("created_at", beforeISO);
  if (error) return { ok: false, error: "שגיאה במחיקה: " + error.message };
  revalidatePath("/admin/analytics");
  return { ok: true, deleted: count ?? 0 };
}

/** מחיקת אירועים בטווח תאריכים (כולל). */
export async function purgeAnalyticsRange(fromISO: string, toISO: string): Promise<PurgeResult> {
  await requireAdmin();
  if (!fromISO || !toISO) return { ok: false, error: "טווח תאריכים חסר" };
  const db = createAdminClient();
  const { error, count } = await db
    .from("analytics_events")
    .delete({ count: "exact" })
    .gte("created_at", fromISO)
    .lte("created_at", toISO);
  if (error) return { ok: false, error: "שגיאה במחיקה: " + error.message };
  revalidatePath("/admin/analytics");
  return { ok: true, deleted: count ?? 0 };
}

/** מחיקת כל ההיסטוריה של משתמש ספציפי (מענה לבקשת מחיקה אישית). */
export async function purgeAnalyticsForUser(userId: string): Promise<PurgeResult> {
  await requireAdmin();
  if (!userId) return { ok: false, error: "משתמש חסר" };
  const db = createAdminClient();
  const { error, count } = await db
    .from("analytics_events")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  if (error) return { ok: false, error: "שגיאה במחיקה: " + error.message };
  revalidatePath("/admin/analytics");
  return { ok: true, deleted: count ?? 0 };
}
