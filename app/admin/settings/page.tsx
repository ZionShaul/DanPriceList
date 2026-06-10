import { getSystemSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";
import RegistrationForm from "./RegistrationForm";

export default async function AdminSettingsPage() {
  const settings = await getSystemSettings();
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-brand-ink">הגדרות מערכת</h1>
      <SettingsForm
        url={settings.clicksense_url ?? ""}
        enabled={settings.clicksense_enabled}
      />
      <RegistrationForm
        url={settings.registration_url ?? ""}
        enabled={settings.registration_enabled}
      />
    </div>
  );
}
