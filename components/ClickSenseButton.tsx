// כפתור "לפירוט מלא ונתונים היסטוריים" → קליקסנס (סעיף 12).
// מוצג רק אם הוגדר קישור פעיל. נפתח בלשונית חדשה.
export default function ClickSenseButton({
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
      className="btn flex w-full items-center justify-center gap-2 rounded-xl border border-brand-primary bg-brand-primary-light px-4 py-3 text-sm font-semibold text-brand-primary-dark"
    >
      לפירוט מלא ונתונים היסטוריים
      <span aria-hidden>↗</span>
    </a>
  );
}
