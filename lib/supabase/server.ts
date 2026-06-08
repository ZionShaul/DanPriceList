import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * קליינט Supabase לצד השרת (Server Components, Server Actions, Route Handlers).
 * משתמש ב-cookies כדי לשמר את ה-session ולרענן אותו אוטומטית.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // נקרא מתוך Server Component – הרענון יתבצע ב-middleware.
          }
        },
      },
    },
  );
}
