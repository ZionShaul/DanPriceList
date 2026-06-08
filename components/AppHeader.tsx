// כותרת עליונה משותפת למסכי המשתמש
export default function AppHeader({
  org,
}: {
  org?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-line bg-brand-primary text-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
          דן
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold">משקי דן - מחירון הדברה ודשן</div>
          {org && <div className="text-xs text-white/80">{org}</div>}
        </div>
      </div>
    </header>
  );
}
