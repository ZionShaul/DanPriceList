"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishUpload, deleteUpload } from "@/lib/actions/uploads";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { UploadStatus } from "@/lib/types";

export interface UploadHistoryRow {
  id: string;
  file_name: string;
  status: UploadStatus;
  uploaded_at: string;
  published_at: string | null;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  uploader: { full_name: string } | null;
}

const STATUS_LABEL: Record<UploadStatus, string> = {
  published: "פעילה",
  historical: "היסטורית",
  draft: "טיוטה",
};

export default function HistoryManager({ uploads }: { uploads: UploadHistoryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function restore(id: string) {
    if (!confirm("לשחזר טעינה זו ולהפוך אותה לפעילה? הקובץ הפעיל הנוכחי יהפוך להיסטורי.")) return;
    setBusy(id);
    setError(null);
    const res = await publishUpload(id);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("למחוק טעינה זו לצמיתות? פעולה בלתי הפיכה.")) return;
    setBusy(id);
    setError(null);
    const res = await deleteUpload(id);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-ink">היסטוריית טעינות</h1>
      {error && (
        <p className="rounded-xl bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger">{error}</p>
      )}

      <div className="table-scroll rounded-2xl border border-brand-line bg-brand-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-brand-primary-light text-brand-primary-dark">
            <tr>
              <th className="px-3 py-2 text-right">קובץ</th>
              <th className="px-3 py-2 text-right">נטען</th>
              <th className="px-3 py-2 text-right">על ידי</th>
              <th className="px-3 py-2 text-right">תקינות</th>
              <th className="px-3 py-2 text-right">חריגות</th>
              <th className="px-3 py-2 text-right">סטטוס</th>
              <th className="px-3 py-2 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id} className="border-t border-brand-line/60">
                <td className="px-3 py-2 text-brand-ink">{u.file_name}</td>
                <td className="px-3 py-2 text-brand-muted">{formatDateTime(u.uploaded_at)}</td>
                <td className="px-3 py-2 text-brand-muted">{u.uploader?.full_name ?? "—"}</td>
                <td className="px-3 py-2" dir="ltr">
                  {formatNumber(u.valid_rows)}
                </td>
                <td className="px-3 py-2" dir="ltr">
                  {formatNumber(u.rejected_rows)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.status === "published"
                        ? "bg-brand-primary-light text-brand-primary-dark"
                        : "bg-brand-bg text-brand-muted"
                    }`}
                  >
                    {STATUS_LABEL[u.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {u.status !== "published" && (
                      <button
                        onClick={() => restore(u.id)}
                        disabled={busy === u.id}
                        className="rounded-lg border border-brand-primary px-2 py-1 text-xs font-semibold text-brand-primary disabled:opacity-50"
                      >
                        שחזור והפעלה
                      </button>
                    )}
                    {u.status !== "published" && (
                      <button
                        onClick={() => remove(u.id)}
                        disabled={busy === u.id}
                        className="rounded-lg border border-brand-danger px-2 py-1 text-xs text-brand-danger disabled:opacity-50"
                      >
                        מחיקה
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {uploads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-brand-muted">
                  עדיין אין טעינות.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
