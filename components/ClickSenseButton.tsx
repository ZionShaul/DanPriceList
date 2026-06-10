"use client";

import { track } from "@/lib/analytics/track";

// כפתור "לפירוט מלא ונתונים היסטוריים" → מערכת e-dan (סעיף 12).
// מציג את לוגו e-dan ומתחתיו מלל. מוצג רק אם הוגדר קישור פעיל. נפתח בלשונית חדשה.
export default function ClickSenseButton({
  url,
  enabled,
}: {
  url: string | null;
  enabled: boolean;
}) {
  if (!enabled || !url) return null;
  return (
    <div className="flex justify-center">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("click_edan", { url })}
        className="btn inline-flex items-center gap-2 rounded-xl border border-brand-line bg-brand-surface px-3 py-1.5 shadow-sm transition hover:border-brand-primary hover:shadow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/edan.png" alt="e-dan" className="h-5 w-auto object-contain" />
        <span className="flex items-center gap-1 text-xs font-semibold text-brand-primary-dark">
          לפירוט מלא ונתונים היסטוריים
          <span aria-hidden>↗</span>
        </span>
      </a>
    </div>
  );
}
