import SearchBox from "@/components/SearchBox";
import ClickSenseButton from "@/components/ClickSenseButton";
import ActivePricelistBanner from "@/components/ActivePricelistBanner";
import InstallButton from "@/components/InstallButton";
import { getSystemSettings } from "@/lib/settings";
import { getActiveUpload, activeUploadLabel } from "@/lib/activeUpload";

export default async function HomePage() {
  const settings = await getSystemSettings();
  const activeUpload = await getActiveUpload();
  return (
    <div className="space-y-6">
      <ActivePricelistBanner label={activeUploadLabel(activeUpload)} />

      <div className="pt-2 text-center">
        <h1 className="text-xl font-bold text-brand-ink">חיפוש מחירון</h1>
        <p className="mt-1 text-sm text-brand-muted">
          חפש/י חומר כדי לראות מחיר נמוך, ממוצע משוקלל וגבוה
        </p>
      </div>

      <SearchBox />

      <ClickSenseButton url={settings.clicksense_url} enabled={settings.clicksense_enabled} />

      <InstallButton />
    </div>
  );
}
