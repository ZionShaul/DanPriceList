// כותרת עליונה משותפת למסכי המשתמש
export default function AppHeader({
  org,
}: {
  org?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-line bg-brand-primary text-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        {/* לוגו משקי דן – על רקע לבן לניגודיות מול הכותרת הירוקה */}
        <div className="flex h-10 items-center justify-center rounded-lg bg-white px-2.5 py-1 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/dan-farms.png"
            alt="משקי דן"
            className="h-7 w-auto"
          />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold">מחירון הדברה ודשן</div>
          {org && <div className="text-xs text-white/80">{org}</div>}
        </div>
      </div>
    </header>
  );
}
