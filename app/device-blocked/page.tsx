import Link from "next/link";

export const metadata = { title: "גישה חסומה - מחירון משקי דן" };

// דף חסימה עצמאי (מחוץ לקבוצת (app) כדי שלא ייחסם בעצמו).
export default function DeviceBlockedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-brand-line bg-brand-surface p-6 text-center shadow-sm">
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
    </main>
  );
}
