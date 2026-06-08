import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileWithOrg } from "@/lib/types";

/** מחזיר את משתמש ה-auth המחובר (ללא קריאה לפרופיל), או null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** מחזיר את הפרופיל המלא בכל סטטוס (לשימוש מסך ההתחברות לזיהוי חסום). */
export async function getProfileAnyStatus(userId: string): Promise<ProfileWithOrg | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, organization:organizations(id, name)")
    .eq("id", userId)
    .single();
  return (data as ProfileWithOrg) ?? null;
}

/**
 * מחזיר את הפרופיל של המשתמש המחובר (כולל הארגון), או null אם אין session/אינו פעיל.
 */
export async function getCurrentProfile(): Promise<ProfileWithOrg | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, organization:organizations(id, name)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  if (data.status !== "active") return null;
  return data as ProfileWithOrg;
}

/** דורש משתמש מחובר ופעיל; אחרת מפנה למסך ההתחברות. */
export async function requireUser(): Promise<ProfileWithOrg> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** דורש משתמש מנהל; משתמש רגיל מופנה לדף הראשי, אורח להתחברות. */
export async function requireAdmin(): Promise<ProfileWithOrg> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");
  return profile;
}
