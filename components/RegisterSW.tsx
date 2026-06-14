"use client";

import { useEffect } from "react";

// רישום ה-service worker לאפשר הוספה למסך הבית (PWA) – בייצור בלבד.
// בפיתוח רושמים ביטול ל-SW קיים כדי למנוע הפרעות ל-HMR ודפים ריקים.
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* התעלמות – אינו חוסם את האפליקציה */
      });
    } else {
      // פיתוח: הסרת SW קיים שעלול לשרת דף ריק מהמטמון
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);
  return null;
}
