// באנר "מחירון פעיל" – מציג למשתמש לאיזה חודש/טעינה מתייחס המחירון הנוכחי (סעיף 6).
export default function ActivePricelistBanner({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-primary-light px-4 py-2 text-center text-sm text-brand-primary-dark">
      <span aria-hidden>🗓️</span>
      <span>
        מחירון פעיל: <span className="font-semibold">{label}</span>
      </span>
    </div>
  );
}
