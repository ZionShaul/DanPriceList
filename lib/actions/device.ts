"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeviceStatus = { status: "ok" | "blocked" | "exempt" };

/**
 * אימות קשירת מכשיר (סעיף "מכשיר אחד לחשבון").
 * מדיניות "המכשיר הראשון מנצח": אם החשבון לא קשור עדיין – נקשר למכשיר הנוכחי;
 * אם קשור למכשיר אחר – חסום. מנהלים פטורים.
 */
export async function verifyDevice(deviceId: string, label: string): Promise<DeviceStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "blocked" };

  if (typeof deviceId !== "string" || deviceId.length < 10 || deviceId.length > 100) {
    return { status: "blocked" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active_device_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { status: "blocked" };
  if (profile.role === "admin") return { status: "exempt" };

  const bound = profile.active_device_id as string | null;
  if (bound && bound === deviceId) return { status: "ok" };
  if (bound && bound !== deviceId) return { status: "blocked" };

  // לא קשור עדיין – קושר את המכשיר הנוכחי עם הגנת מרוץ (.is null)
  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({
      active_device_id: deviceId,
      active_device_label: (label || "").slice(0, 120),
      device_bound_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .is("active_device_id", null);
  if (error) return { status: "blocked" };

  // אישור: ודא שאנחנו אכן המכשיר הקשור (ולא מכשיר אחר שניצח במרוץ)
  const { data: after } = await db
    .from("profiles")
    .select("active_device_id")
    .eq("id", user.id)
    .single();
  return (after?.active_device_id as string | null) === deviceId
    ? { status: "ok" }
    : { status: "blocked" };
}
