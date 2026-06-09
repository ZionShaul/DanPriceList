import { createClient } from "@/lib/supabase/server";

export interface ActiveUpload {
  id: string;
  title: string | null;
  file_name: string;
  published_at: string | null;
}

/**
 * מחזיר את פרטי המחירון הפעיל (שם תצוגה ותאריך פרסום) לחשיפה למשתמש.
 * דרך RPC security definer, כי RLS על monthly_uploads מוגבל למנהל.
 * השם המוצג: title אם הוגדר, אחרת שם הקובץ.
 */
export async function getActiveUpload(): Promise<ActiveUpload | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_active_upload");
  const row = (data as ActiveUpload[] | null)?.[0] ?? null;
  return row;
}

/** שם המחירון הפעיל להצגה (title או שם הקובץ), או null אם אין מחירון פעיל. */
export function activeUploadLabel(upload: ActiveUpload | null): string | null {
  if (!upload) return null;
  return upload.title?.trim() || upload.file_name || null;
}
