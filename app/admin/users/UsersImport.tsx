"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importUsers, type ImportUsersResult } from "@/lib/actions/users";

export default function UsersImport() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<ImportUsersResult, { ok: true }> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPending(true);
    const res = await importUsers(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res);
    setFileName(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-brand-line bg-brand-surface p-5">
      <h2 className="mb-1 text-base font-semibold text-brand-ink">טעינת משתמשים מאקסל</h2>
      <p className="mb-3 text-sm text-brand-muted">
        עמודות: <span className="font-medium">שם מלא</span>, אימייל, טלפון, ארגון, תפקיד. ארגון חדש
        ייווצר אוטומטית לפי שמו.{" "}
        <a href="/templates/users-template.xlsx" download className="text-brand-primary underline">
          הורדת תבנית
        </a>
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-line bg-brand-bg px-4 py-5 text-center text-sm">
          <span aria-hidden>👥</span>
          <span className="font-medium text-brand-ink">
            {fileName ?? "בחר/י קובץ משתמשים (.xlsx / .xls)"}
          </span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            required
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        {error && <p className="text-sm text-brand-danger">{error}</p>}
        {result && (
          <div className="rounded-xl bg-brand-primary-light px-4 py-2 text-sm text-brand-primary-dark">
            <p>
              נוצרו {result.created} משתמשים, דולגו {result.skipped}.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pr-5 text-xs text-brand-danger">
                {result.errors.map((er, i) => (
                  <li key={i}>{er}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "טוען..." : "טעינת משתמשים"}
        </button>
      </form>
    </section>
  );
}
