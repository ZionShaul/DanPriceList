import SearchBox from "@/components/SearchBox";
import ClickSenseButton from "@/components/ClickSenseButton";
import { getSystemSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = await getSystemSettings();
  return (
    <div className="space-y-6">
      <div className="pt-2 text-center">
        <h1 className="text-xl font-bold text-brand-ink">חיפוש מחירון</h1>
        <p className="mt-1 text-sm text-brand-muted">
          חפש/י חומר כדי לראות מחיר נמוך, ממוצע משוקלל וגבוה
        </p>
      </div>

      <SearchBox />

      <ClickSenseButton url={settings.clicksense_url} enabled={settings.clicksense_enabled} />
    </div>
  );
}
