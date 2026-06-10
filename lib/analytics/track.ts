import { createClient } from "@/lib/supabase/client";

// ===== שכבת תיעוד אירועים בצד הלקוח (fire-and-forget) =====
// כל הקריאות בטוחות: כשל בתיעוד לעולם לא חוסם או שובר את ה-UI.

type SupabaseBrowserClient = ReturnType<typeof createClient>;

let identity: { userId: string | null; orgId: string | null } = { userId: null, orgId: null };
let cachedClient: SupabaseBrowserClient | null = null;

function client(): SupabaseBrowserClient {
  if (!cachedClient) cachedClient = createClient();
  return cachedClient;
}

/** מגדיר את זהות המשתמש הנוכחי (נקרא מ-AnalyticsTracker). */
export function setIdentity(userId: string | null, orgId: string | null) {
  identity = { userId, orgId };
}

/** מתעד אירוע. מתעלם בשקט אם אין משתמש מזוהה או אם הכתיבה נכשלת. */
export function track(
  eventType: string,
  properties: Record<string, unknown> = {},
  path?: string,
) {
  try {
    if (!identity.userId) return; // מתעדים רק משתמשים מזוהים
    const resolvedPath =
      path ?? (typeof window !== "undefined" ? window.location.pathname : null);
    void client()
      .from("analytics_events")
      .insert({
        user_id: identity.userId,
        organization_id: identity.orgId,
        event_type: eventType,
        properties,
        path: resolvedPath,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    /* התעלמות מכוונת – תיעוד לא קריטי */
  }
}
