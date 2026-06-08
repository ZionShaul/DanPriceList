"use client";

import { useEffect } from "react";

// רישום ה-service worker לאפשר הוספה למסך הבית (PWA).
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* התעלמות – אינו חוסם את האפליקציה */
      });
    }
  }, []);
  return null;
}
