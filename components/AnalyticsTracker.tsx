"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { setIdentity, track } from "@/lib/analytics/track";

// רכיב תיעוד שקוף: מגדיר זהות, מתעד כניסה (פעם לסשן) וצפיות מסך.
export default function AnalyticsTracker({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string | null;
}) {
  // הגדרת זהות מיד בזמן render, כדי שקריאות track מרכיבי הילד יזוהו.
  setIdentity(userId, orgId);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIdentity(userId, orgId);
    try {
      if (!sessionStorage.getItem("analytics_login")) {
        sessionStorage.setItem("analytics_login", "1");
        track("login", {});
      }
    } catch {
      /* התעלמות */
    }
  }, [userId, orgId]);

  useEffect(() => {
    const key = searchParams.get("key");
    track("view_screen", { path: pathname, ...(key ? { key } : {}) }, pathname);
  }, [pathname, searchParams]);

  return null;
}
