import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * קליינט Supabase עם Service Role – לפעולות מנהליות בלבד בצד השרת
 * (יצירת משתמשים, עקיפת RLS לפרסום וכו'). אסור לחשוף לדפדפן.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
