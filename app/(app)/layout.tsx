import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import WhatsAppFab from "@/components/WhatsAppFab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  const settings = await getSystemSettings();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={null}>
        <AnalyticsTracker userId={profile.id} orgId={profile.organization_id} />
      </Suspense>
      <AppHeader
        org={profile.organization?.name}
        registrationUrl={settings.registration_url}
        registrationEnabled={settings.registration_enabled}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">{children}</main>
      <WhatsAppFab
        number={settings.whatsapp_number}
        message={settings.whatsapp_message}
        enabled={settings.whatsapp_enabled}
      />
      <BottomNav
        isAdmin={profile.role === "admin"}
        showMyPurchases={profile.show_my_purchases !== false}
      />
    </div>
  );
}
