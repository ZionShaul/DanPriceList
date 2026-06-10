import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import AnalyticsTracker from "@/components/AnalyticsTracker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={null}>
        <AnalyticsTracker userId={profile.id} orgId={profile.organization_id} />
      </Suspense>
      <AppHeader org={profile.organization?.name} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">{children}</main>
      <BottomNav isAdmin={profile.role === "admin"} />
    </div>
  );
}
