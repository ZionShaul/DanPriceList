import { createClient } from "@/lib/supabase/server";
import type { SystemSettings } from "@/lib/types";

/** מחזיר את הגדרות המערכת (קישור קליקסנס וכו'). */
export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("*").eq("id", 1).single();
  return (
    (data as SystemSettings) ?? {
      id: 1,
      clicksense_url: null,
      clicksense_enabled: false,
      registration_url: null,
      registration_enabled: false,
      whatsapp_number: null,
      whatsapp_message: null,
      whatsapp_enabled: false,
    }
  );
}
