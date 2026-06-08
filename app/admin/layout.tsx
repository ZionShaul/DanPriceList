import { requireAdmin } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export const metadata = { title: "ניהול - מחירון משקי דן" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-brand-line bg-brand-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
              דן
            </div>
            <div className="text-base font-bold">ניהול מערכת - מחירון משקי דן</div>
          </div>
          <div className="text-xs text-white/80">{profile.full_name}</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="rounded-2xl border border-brand-line bg-brand-surface p-2 lg:sticky lg:top-4">
            <AdminNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
