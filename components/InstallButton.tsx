"use client";

import { useEffect, useState } from "react";

// אירוע ההתקנה של כרום (אינו בטיפוסי ה-DOM הסטנדרטיים)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * כפתור "הוספה למסך הבית" (PWA) — סעיף 13.
 * אנדרואיד/כרום: שימוש ב-beforeinstallprompt. iOS/Safari: הצגת הוראות ידניות.
 * מוסתר כשהאפליקציה כבר מותקנת (מצב standalone).
 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // זיהוי סביבה ראשוני (נדחה כדי לא לקרוא ל-setState ישירות בגוף ה-effect)
    const id = window.setTimeout(() => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone) {
        setInstalled(true);
        return;
      }
      const ua = window.navigator.userAgent;
      const ios = /iphone|ipad|ipod/i.test(ua);
      // ב-iPad חדש ה-UA הוא של מק; בדיקה משלימה למסך מגע
      const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
      setIsIOS(ios || iPadOS);
    }, 0);

    return () => {
      clearTimeout(id);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (isIOS) setShowIosHelp((s) => !s);
  }

  // מוסתר אם מותקן, או אם אין דרך להתקין (לא כרום-מתקין ולא iOS)
  if (installed) return null;
  if (!deferred && !isIOS) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-primary bg-brand-primary-light px-4 py-3 text-sm font-semibold text-brand-primary-dark"
      >
        <span aria-hidden>📲</span>
        הוספת קיצור דרך למסך הבית
      </button>

      {showIosHelp && (
        <div className="rounded-xl border border-brand-line bg-brand-surface p-3 text-sm text-brand-ink">
          <p className="mb-1 font-semibold">להוספה במכשיר iPhone / iPad:</p>
          <ol className="list-decimal space-y-1 pr-5 text-brand-muted">
            <li>
              לחצו על כפתור השיתוף <span aria-hidden>⬆️</span> בתחתית הדפדפן (Safari).
            </li>
            <li>
              בחרו <span className="font-medium text-brand-ink">״הוספה למסך הבית״</span>.
            </li>
            <li>אשרו והסמליל יופיע כאפליקציה במכשיר.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
