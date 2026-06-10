import { createClient } from "@/lib/supabase/server";
import { formatNumber, formatDateTime } from "@/lib/format";
import DataManager from "./DataManager";

export const metadata = { title: "סטטיסטיקה - מחירון משקי דן" };

const WARN_ROWS = 100000; // סף התרעה על גודל הטבלה

const EVENT_LABELS: Record<string, string> = {
  search: "חיפוש",
  select_material: "בחירת מוצר",
  open_all_list: "פתיחת כל הרשימה",
  click_edan: "לחיצת e-dan",
  click_install: "לחיצת התקנה",
  install_outcome: "תוצאת התקנה",
  view_screen: "צפיית מסך",
  login: "כניסה",
};

type CountRow = { event_type: string; count: number; distinct_users: number };
type SearchRow = { query: string; searches: number; avg_results: number };
type ZeroRow = { query: string; searches: number };
type MaterialRow = { material_key: string; display_name: string; views: number };
type UserRow = {
  user_id: string;
  full_name: string | null;
  org_name: string | null;
  event_count: number;
  last_event: string;
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [counts, searches, zeros, materials, activeUsers, stats, profiles] = await Promise.all([
    supabase.rpc("analytics_event_counts"),
    supabase.rpc("analytics_top_searches"),
    supabase.rpc("analytics_zero_searches"),
    supabase.rpc("analytics_top_materials"),
    supabase.rpc("analytics_active_users"),
    supabase.rpc("analytics_table_stats"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const countRows = (counts.data as CountRow[] | null) ?? [];
  const searchRows = (searches.data as SearchRow[] | null) ?? [];
  const zeroRows = (zeros.data as ZeroRow[] | null) ?? [];
  const materialRows = (materials.data as MaterialRow[] | null) ?? [];
  const userRows = (activeUsers.data as UserRow[] | null) ?? [];
  const stat = ((stats.data as { row_count: number; total_bytes: number }[] | null) ?? [])[0] ?? {
    row_count: 0,
    total_bytes: 0,
  };
  const userOptions = ((profiles.data as { id: string; full_name: string }[] | null) ?? []).map(
    (p) => ({ id: p.id, name: p.full_name }),
  );

  const countOf = (t: string) => countRows.find((c) => c.event_type === t)?.count ?? 0;
  const totalEvents = countRows.reduce((s, c) => s + Number(c.count), 0);
  const zeroTotal = zeroRows.reduce((s, z) => s + Number(z.searches), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-ink">סטטיסטיקת שימוש</h1>
        <p className="mt-0.5 text-sm text-brand-muted">30 הימים האחרונים</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="סך אירועים" value={formatNumber(totalEvents)} />
        <Kpi label="משתמשים פעילים" value={formatNumber(userRows.length)} />
        <Kpi label="חיפושים" value={formatNumber(countOf("search"))} />
        <Kpi label="חיפושים ללא תוצאות" value={formatNumber(zeroTotal)} tone="warn" />
        <Kpi label="לחיצות e-dan" value={formatNumber(countOf("click_edan"))} />
        <Kpi label="לחיצות התקנה" value={formatNumber(countOf("click_install"))} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* חיפושים ללא תוצאות */}
        <Panel title="חיפושים ללא תוצאות (פערים בקטלוג)">
          <SimpleTable
            head={["חיפוש", "פעמים"]}
            rows={zeroRows.map((z) => [z.query, formatNumber(z.searches)])}
            empty="אין חיפושים ללא תוצאות."
          />
        </Panel>

        {/* חיפושים מובילים */}
        <Panel title="חיפושים מובילים">
          <SimpleTable
            head={["חיפוש", "פעמים", "תוצאות בממוצע"]}
            rows={searchRows.map((s) => [s.query, formatNumber(s.searches), formatNumber(s.avg_results)])}
            empty="אין נתוני חיפוש עדיין."
          />
        </Panel>

        {/* מוצרים נצפים */}
        <Panel title="מוצרים נצפים מובילים">
          <SimpleTable
            head={["מוצר", "צפיות"]}
            rows={materialRows.map((m) => [m.display_name || m.material_key, formatNumber(m.views)])}
            empty="אין צפיות במוצרים עדיין."
          />
        </Panel>

        {/* אירועים לפי סוג */}
        <Panel title="אירועים לפי סוג">
          <SimpleTable
            head={["סוג", "פעמים", "משתמשים"]}
            rows={countRows.map((c) => [
              EVENT_LABELS[c.event_type] ?? c.event_type,
              formatNumber(c.count),
              formatNumber(c.distinct_users),
            ])}
            empty="אין אירועים עדיין."
          />
        </Panel>
      </div>

      {/* משתמשים פעילים */}
      <Panel title="משתמשים פעילים">
        <SimpleTable
          head={["שם", "ארגון", "פעולות", "פעילות אחרונה"]}
          rows={userRows.map((u) => [
            u.full_name ?? "—",
            u.org_name ?? "—",
            formatNumber(u.event_count),
            formatDateTime(u.last_event),
          ])}
          empty="אין פעילות משתמשים עדיין."
        />
      </Panel>

      {/* ניהול נתונים + התרעת סף */}
      <DataManager
        users={userOptions}
        rowCount={Number(stat.row_count)}
        totalBytes={Number(stat.total_bytes)}
        warnRows={WARN_ROWS}
      />
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div
      className={`rounded-2xl border px-2 py-3 text-center ${
        tone === "warn"
          ? "border-brand-warning/30 bg-brand-warning/5"
          : "border-brand-line bg-brand-surface"
      }`}
    >
      <div className="text-xs text-brand-muted">{label}</div>
      <div className="mt-1 text-lg font-bold leading-tight text-brand-ink tabular-nums">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-line bg-brand-surface p-5">
      <h2 className="mb-3 text-base font-semibold text-brand-ink">{title}</h2>
      {children}
    </section>
  );
}

function SimpleTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-brand-muted">{empty}</p>;
  }
  return (
    <div className="table-scroll">
      <table className="w-full text-sm">
        <thead className="bg-brand-primary-light text-brand-primary-dark">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-right font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-brand-line/60">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-right text-brand-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
