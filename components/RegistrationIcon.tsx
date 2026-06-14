"use client";

import { track } from "@/lib/analytics/track";

// אייקון "בקשת צירוף עובדים" בכותרת המשתמש – מוצג כשהוגדר קישור פעיל.
export default function RegistrationIcon({
  url,
  enabled,
}: {
  url: string | null;
  enabled: boolean;
}) {
  if (!enabled || !url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("click_registration", { url })}
      aria-label="בקשת צירוף עובדים"
      title="בקשת צירוף עובדים"
      className="btn flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
        {/* משתמש */}
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
        {/* פלוס */}
        <path d="M18.5 7.5v5M16 10h5" strokeLinecap="round" />
      </svg>
    </a>
  );
}
