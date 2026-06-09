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
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-brand-line bg-brand-surface px-4 py-5 shadow-sm transition hover:border-brand-primary hover:shadow"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/edan.png"
        alt="e-dan"
        className="h-12 w-auto max-w-[200px] object-contain"
      />
      <span className="flex items-center gap-1 text-sm font-semibold text-brand-primary-dark">
        לפירוט מלא ונתונים היסטוריים
        <span aria-hidden>↗</span>
      </span>
    </a>
  );
}
