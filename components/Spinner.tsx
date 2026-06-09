// אינדיקטור טעינה (שעון/עיגול מסתובב)
export default function Spinner({ label = "טוען…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-brand-muted">
      <div
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-line border-t-brand-primary"
        role="status"
        aria-label={label}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
