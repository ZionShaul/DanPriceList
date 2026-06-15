"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { verifyDevice } from "@/lib/actions/device";

const KEY = "dan_device_id";

function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id || id.length < 10) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * שומר שכל חשבון רגיל ישמש ממכשיר אחד בלבד.
 * רץ פעם אחת בטעינה; אם המכשיר חסום – מנתק ומציג חסימה. מנהלים פטורים (צד שרת).
 * כל שגיאה זמנית לא חוסמת משתמש תקין (ברירת מחדל: לא חוסם).
 */
export default function DeviceGuard() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deviceId = getDeviceId();
        const label =
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "device";
        const res = await verifyDevice(deviceId, label);
        if (cancelled) return;
        if (res.status === "blocked") {
          try {
            await createClient().auth.signOut();
          } catch {
            /* התעלמות */
          }
          setBlocked(true);
        }
      } catch {
        /* כשל זמני – לא חוסמים משתמש תקין */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/95 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-brand-line bg-brand-surface p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-danger/10 text-2xl">
          🔒
        </div>
        <h1 className="mb-2 text-xl font-bold text-brand-danger">החשבון משויך למכשיר אחר</h1>
        <p className="mb-6 text-sm text-brand-muted">
          חשבון זה כבר בשימוש במכשיר אחר. לקבלת גישה ממכשיר זה פנה/י למנהל המערכת.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-xl border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
        >
          חזרה למסך ההתחברות
        </Link>
      </div>
    </div>
  );
}
