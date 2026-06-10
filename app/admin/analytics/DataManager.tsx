"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  purgeAnalyticsBefore,
  purgeAnalyticsRange,
  purgeAnalyticsForUser,
  type PurgeResult,
} from "@/lib/actions/analytics";

type UserOption = { id: string; name: string };

function formatBytes(bytes: number): string {
  if (!bytes) return "0";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function DataManager({
  users,
  rowCount,
  totalBytes,
  warnRows,
}: {
  users: UserOption[];
  rowCount: number;
  totalBytes: number;
  warnRows: number;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [beforeDate, setBeforeDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [userId, setUserId] = useState("");

  const overLimit = rowCount >= warnRows;

  async function run(label: string, fn: () => Promise<PurgeResult>) {
    if (!confirm(`${label}\n\nפעולה זו בלתי הפיכה. להמשיך?`)) return;
    setError(null);
    setMsg(null);
    setPending(true);
    const res = await fn();
    setPending(false);
    if (!res.ok) return setError(res.error);
    setMsg(`נמחקו ${res.deleted} אירועים.`);
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-brand-line bg-brand-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-ink">ניהול נתונים</h2>
        <span className="text-xs text-brand-muted">
          {rowCount.toLocaleString("he-IL")} אירועים · {formatBytes(totalBytes)}
        </span>
      </div>

      {overLimit && (
        <div className="rounded-xl border border-brand-warning/40 bg-brand-warning/10 px-4 py-3 text-sm text-brand-warning">
          ⚠️ טבלת הסטטיסטיקה חצתה את סף הגודל ({warnRows.toLocaleString("he-IL")} שורות).
          מומלץ למחוק היסטוריה ישנה כדי לשמור על ביצועים וגודל מסד הנתונים.
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger">{error}</p>
      )}
      {msg && (
        <p className="rounded-xl bg-brand-primary-light px-4 py-2 text-sm text-brand-primary-dark">
          {msg}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* מחיקה לפי תאריך */}
        <div className="rounded-xl border border-brand-line bg-brand-bg p-4">
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">מחיקת היסטוריה ישנה</h3>
          <label className="mb-2 block text-xs text-brand-muted">מחק אירועים שלפני התאריך:</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={beforeDate}
              onChange={(e) => setBeforeDate(e.target.value)}
              className="flex-1 rounded-lg border border-brand-line bg-white px-3 py-2 text-sm"
            />
            <button
              disabled={pending || !beforeDate}
              onClick={() =>
                run(`מחיקת כל האירועים שלפני ${beforeDate}`, () =>
                  purgeAnalyticsBefore(new Date(beforeDate).toISOString()),
                )
              }
              className="rounded-lg bg-brand-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              מחק
            </button>
          </div>
        </div>

        {/* מחיקה לפי טווח */}
        <div className="rounded-xl border border-brand-line bg-brand-bg p-4">
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">מחיקה לפי טווח תאריכים</h3>
          <div className="mb-2 flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="flex-1 rounded-lg border border-brand-line bg-white px-2 py-2 text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="flex-1 rounded-lg border border-brand-line bg-white px-2 py-2 text-sm"
            />
          </div>
          <button
            disabled={pending || !fromDate || !toDate}
            onClick={() =>
              run(`מחיקת אירועים בטווח ${fromDate} – ${toDate}`, () =>
                purgeAnalyticsRange(
                  new Date(fromDate).toISOString(),
                  new Date(toDate + "T23:59:59").toISOString(),
                ),
              )
            }
            className="w-full rounded-lg bg-brand-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            מחק טווח
          </button>
        </div>

        {/* מחיקה לפי משתמש */}
        <div className="rounded-xl border border-brand-line bg-brand-bg p-4 sm:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">
            מחיקת היסטוריית משתמש (לבקשת משתמש)
          </h3>
          <div className="flex gap-2">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1 rounded-lg border border-brand-line bg-white px-3 py-2 text-sm"
            >
              <option value="">בחר/י משתמש…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              disabled={pending || !userId}
              onClick={() => {
                const name = users.find((u) => u.id === userId)?.name ?? "";
                run(`מחיקת כל היסטוריית הפעילות של ${name}`, () => purgeAnalyticsForUser(userId));
              }}
              className="rounded-lg bg-brand-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              מחק היסטוריה
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
